import { browser } from "$app/environment";

const DEFAULT_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const DEFAULT_FUZZY_ENDPOINT = "https://photon.komoot.io/api/";
const CACHE_PREFIX = "church-tracker:geocode:v1:";
const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const DEFAULT_MIN_INTERVAL_MS = 1100;

let requestChain = Promise.resolve();
let nextRequestAt = 0;

export function normalizeGeocodingAddress(address) {
  return String(address || "").trim().replace(/\s+/g, " ");
}

export function extractUkPostcode(address) {
  const match = normalizeGeocodingAddress(address).match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i);
  if (!match) return "";
  const compact = match[0].toUpperCase().replace(/\s+/g, "");
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function formatUkPostcode(value) {
  const compact = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!compact) return "";
  return compact.length > 3 ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : compact;
}

export function isValidUkPostcode(value) {
  const postcode = formatUkPostcode(value);
  return /^(GIR 0AA|[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2})$/.test(postcode);
}

export function buildGeocodingAddress({ address, city, state, zip_code } = {}) {
  return normalizeGeocodingAddress([
    address,
    city,
    state,
    formatUkPostcode(zip_code),
  ].filter(Boolean).join(", "));
}

export function externalMapLookupUrl(provider, address) {
  const query = normalizeGeocodingAddress(address);
  if (!query) return "";
  if (provider === "google") {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  if (provider === "waze") {
    return `https://www.waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;
  }
  return "";
}

function firstAddressValue(address = {}, keys = []) {
  for (const key of keys) {
    const value = normalizeGeocodingAddress(address?.[key]);
    if (value) return value;
  }
  return "";
}

export function mapSearchCandidate(result = {}) {
  const details = result.address || {};
  const road = firstAddressValue(details, [
    "road",
    "pedestrian",
    "residential",
    "footway",
    "path",
  ]);
  const houseNumber = normalizeGeocodingAddress(details.house_number);
  const street = normalizeGeocodingAddress([houseNumber, road].filter(Boolean).join(" "));
  const city = firstAddressValue(details, [
    "city",
    "town",
    "village",
    "hamlet",
    "municipality",
    "suburb",
  ]);
  const state = firstAddressValue(details, ["county", "state"]);
  const zip_code = formatUkPostcode(
    details.postcode || extractUkPostcode(result.display_name),
  );
  const lat = Number(result.lat);
  const lng = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const resultType = normalizeGeocodingAddress(result.addresstype || result.type).toLowerCase();
  const matchType = houseNumber
    ? "address"
    : road || ["road", "street", "residential"].includes(resultType)
      ? "street"
      : "area";
  return {
    label: normalizeGeocodingAddress(result.display_name) || buildGeocodingAddress({
      address: street,
      city,
      state,
      zip_code,
    }),
    address: street,
    city,
    state,
    zip_code,
    lat,
    lng,
    matchType,
    houseNumberVerified: Boolean(houseNumber),
    source: "nominatim",
    countryCode: normalizeGeocodingAddress(details.country_code).toUpperCase(),
  };
}

export function mapFuzzySearchCandidate(feature = {}) {
  const details = feature.properties || {};
  const coordinates = feature.geometry?.coordinates || [];
  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const resultType = normalizeGeocodingAddress(details.type).toLowerCase();
  const houseNumber = normalizeGeocodingAddress(details.housenumber || details.house_number);
  const namedStreet = resultType === "street" ? details.name : "";
  const road = normalizeGeocodingAddress(details.street || namedStreet);
  const street = normalizeGeocodingAddress([houseNumber, road].filter(Boolean).join(" "));
  const city = firstAddressValue(details, ["city", "town", "village", "municipality", "district"]);
  const state = firstAddressValue(details, ["county", "state"]);
  const zip_code = formatUkPostcode(details.postcode);
  const country = normalizeGeocodingAddress(details.country);
  const countryCode = normalizeGeocodingAddress(details.countrycode).toUpperCase();
  const fallbackName = normalizeGeocodingAddress(details.name);
  const matchType = houseNumber
    ? "address"
    : road || resultType === "street"
      ? "street"
      : "area";

  return {
    label: normalizeGeocodingAddress([
      street || fallbackName,
      city,
      zip_code,
      country,
    ].filter(Boolean).join(", ")),
    address: street || (matchType === "street" ? fallbackName : ""),
    city,
    state,
    zip_code,
    lat,
    lng,
    matchType,
    houseNumberVerified: Boolean(houseNumber),
    source: "photon",
    countryCode,
  };
}

function requestedHouseNumber(query) {
  return normalizeGeocodingAddress(query).match(/^\d+[A-Z]?(?:-\d+[A-Z]?)?\b/i)?.[0] || "";
}

function candidateKey(candidate) {
  return [candidate.address, candidate.city, candidate.zip_code]
    .map((value) => normalizeGeocodingAddress(value).toLowerCase())
    .filter(Boolean)
    .join("|") || normalizeGeocodingAddress(candidate.label).toLowerCase();
}

function uniqueCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = candidateKey(candidate);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countryMatches(candidate, countryCodes) {
  if (!countryCodes) return true;
  const allowed = String(countryCodes)
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
  if (!allowed.length) return true;
  if (candidate.countryCode) return allowed.includes(candidate.countryCode);
  return allowed.includes("GB") && /united kingdom|england|scotland|wales|northern ireland/i.test(candidate.label);
}

function fuzzyCandidateScore(candidate, query) {
  const normalizedQuery = normalizeGeocodingAddress(query).toLowerCase();
  const queryPostcode = extractUkPostcode(query);
  const candidatePostcode = formatUkPostcode(candidate.zip_code);
  let score = 0;
  if (candidate.city && normalizedQuery.includes(candidate.city.toLowerCase())) score += 5;
  if (queryPostcode && candidatePostcode === queryPostcode) score += 8;
  if (queryPostcode && candidatePostcode && candidatePostcode.split(" ")[0] === queryPostcode.split(" ")[0]) score += 4;
  if (candidate.matchType === "address") score += 2;
  if (candidate.matchType === "street") score += 1;
  return score;
}

function safeStorage(storage) {
  if (storage !== undefined) return storage;
  if (!browser) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readCache(storage, key) {
  if (!storage) return null;
  try {
    const cached = JSON.parse(storage.getItem(key) || "null");
    if (!cached || Date.now() - cached.savedAt > CACHE_TTL_MS) return null;
    if (!Number.isFinite(cached.lat) || !Number.isFinite(cached.lng)) return null;
    return { lat: cached.lat, lng: cached.lng };
  } catch {
    return null;
  }
}

function writeCache(storage, key, location) {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify({ ...location, savedAt: Date.now() }));
  } catch {
    // Mapping must still work when browser storage is unavailable.
  }
}

function scheduleRequest(task, minIntervalMs) {
  const scheduled = requestChain.then(async () => {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      return await task();
    } finally {
      nextRequestAt = Date.now() + minIntervalMs;
    }
  });
  requestChain = scheduled.catch(() => undefined);
  return scheduled;
}

/**
 * Explicit, user-triggered address search. This intentionally runs only after
 * a Search action rather than on each keystroke. It returns several candidates
 * with structured address fields so a user can choose the correct one in-app.
 */
export async function searchAddressCandidates(query, options = {}) {
  const normalized = normalizeGeocodingAddress(query);
  if (!normalized) return [];

  const fetchImpl = options.fetchImpl || fetch;
  const endpoint = options.endpoint || import.meta.env?.VITE_GEOCODER_URL || DEFAULT_ENDPOINT;
  const fuzzyEndpoint = options.fuzzyEndpoint || import.meta.env?.VITE_FUZZY_GEOCODER_URL || DEFAULT_FUZZY_ENDPOINT;
  const countryCodes = options.countryCodes === undefined
    ? (import.meta.env?.VITE_GEOCODER_COUNTRY_CODES || "gb")
    : options.countryCodes;
  const minIntervalMs = options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
  const limit = Math.min(Math.max(Number(options.limit) || 6, 1), 8);

  return scheduleRequest(async () => {
    const url = new URL(endpoint);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("q", normalized);
    if (countryCodes) url.searchParams.set("countrycodes", countryCodes);

    const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Address search failed (${response.status})`);
    const rows = await response.json();
    const exactCandidates = (Array.isArray(rows) ? rows : [])
      .map(mapSearchCandidate)
      .filter(Boolean);

    const houseNumber = requestedHouseNumber(normalized);
    const hasVerifiedHouse = exactCandidates.some((candidate) => candidate.houseNumberVerified);
    const shouldTryFuzzy = exactCandidates.length === 0 || (houseNumber && !hasVerifiedHouse);
    if (!shouldTryFuzzy) return uniqueCandidates(exactCandidates).slice(0, limit);

    try {
      const fuzzyUrl = new URL(fuzzyEndpoint);
      fuzzyUrl.searchParams.set("q", normalized);
      fuzzyUrl.searchParams.set("limit", String(Math.max(limit * 2, 10)));
      const fuzzyResponse = await fetchImpl(fuzzyUrl, { headers: { Accept: "application/json" } });
      if (!fuzzyResponse.ok) return uniqueCandidates(exactCandidates).slice(0, limit);
      const fuzzyJson = await fuzzyResponse.json();
      const fuzzyCandidates = (Array.isArray(fuzzyJson?.features) ? fuzzyJson.features : [])
        .map(mapFuzzySearchCandidate)
        .filter(Boolean)
        .filter((candidate) => countryMatches(candidate, countryCodes))
        .map((candidate, index) => ({ candidate, index, score: fuzzyCandidateScore(candidate, normalized) }))
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map(({ candidate }) => candidate);
      return uniqueCandidates([...exactCandidates, ...fuzzyCandidates]).slice(0, limit);
    } catch {
      return uniqueCandidates(exactCandidates).slice(0, limit);
    }
  }, minIntervalMs);
}

/**
 * Resolve a written address to map coordinates. Results are cached locally and
 * requests are serialized so the default public geocoder is not flooded when
 * a directory contains several addresses without saved coordinates.
 */
export async function geocodeAddress(address, options = {}) {
  const normalized = normalizeGeocodingAddress(address);
  if (!normalized) return null;

  const storage = safeStorage(options.storage);
  const cacheKey = `${CACHE_PREFIX}${normalized.toLowerCase()}`;
  const cached = readCache(storage, cacheKey);
  if (cached) return cached;

  const fetchImpl = options.fetchImpl || fetch;
  const endpoint = options.endpoint || import.meta.env?.VITE_GEOCODER_URL || DEFAULT_ENDPOINT;
  const countryCodes = options.countryCodes === undefined
    ? (import.meta.env?.VITE_GEOCODER_COUNTRY_CODES || "gb")
    : options.countryCodes;
  const minIntervalMs = options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
  const postcode = countryCodes?.includes("gb") ? extractUkPostcode(normalized) : "";

  const location = await scheduleRequest(async () => {
    const url = new URL(endpoint);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    // A UK postcode is enough for a pastoral directory pin and avoids sending
    // the full street address when the imported record already contains one.
    url.searchParams.set("q", postcode || normalized);
    if (countryCodes) url.searchParams.set("countrycodes", countryCodes);

    const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Geocoding request failed (${response.status})`);
    const first = (await response.json())?.[0];
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, minIntervalMs);

  if (location) writeCache(storage, cacheKey, location);
  return location;
}
