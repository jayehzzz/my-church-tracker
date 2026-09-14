import { describe, expect, it, vi } from "vitest";
import {
  buildGeocodingAddress,
  externalMapLookupUrl,
  extractUkPostcode,
  formatUkPostcode,
  geocodeAddress,
  isValidUkPostcode,
  mapFuzzySearchCandidate,
  mapSearchCandidate,
  normalizeGeocodingAddress,
  searchAddressCandidates,
} from "./geocodingService.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("geocodingService", () => {
  it("normalizes whitespace before looking up an address", () => {
    expect(normalizeGeocodingAddress("  Castle House,   Milton Keynes  ")).toBe("Castle House, Milton Keynes");
    expect(extractUkPostcode("86 St Catherines Ave, Luton LU3 1QQ")).toBe("LU3 1QQ");
  });

  it("formats and validates UK postcodes used by the person form", () => {
    expect(formatUkPostcode("lu31qq")).toBe("LU3 1QQ");
    expect(isValidUkPostcode("LU3 1QQ")).toBe(true);
    expect(isValidUkPostcode("LU3")).toBe(false);
    expect(buildGeocodingAddress({ address: "86 St Catherines Ave", city: "Luton", zip_code: "lu31qq" }))
      .toBe("86 St Catherines Ave, Luton, LU3 1QQ");
  });

  it("builds opt-in Google Maps and Waze searches", () => {
    expect(externalMapLookupUrl("google", "86 St Catherines Ave, Luton LU3 1QQ"))
      .toBe("https://www.google.com/maps/search/?api=1&query=86%20St%20Catherines%20Ave%2C%20Luton%20LU3%201QQ");
    expect(externalMapLookupUrl("waze", "Barnfield, LU3"))
      .toBe("https://www.waze.com/ul?q=Barnfield%2C%20LU3&navigate=yes");
    expect(externalMapLookupUrl("google", "")).toBe("");
  });

  it("maps structured online-search results into editable UK address fields", () => {
    expect(mapSearchCandidate({
      display_name: "86, St Catherines Avenue, Luton, LU3 1QQ, United Kingdom",
      lat: "51.8989",
      lon: "-0.4328",
      address: {
        house_number: "86",
        road: "St Catherines Avenue",
        town: "Luton",
        county: "Luton",
        postcode: "lu3 1qq",
      },
    })).toEqual({
      label: "86, St Catherines Avenue, Luton, LU3 1QQ, United Kingdom",
      address: "86 St Catherines Avenue",
      city: "Luton",
      state: "Luton",
      zip_code: "LU3 1QQ",
      lat: 51.8989,
      lng: -0.4328,
      matchType: "address",
      houseNumberVerified: true,
      source: "nominatim",
      countryCode: "",
    });
  });

  it("maps fuzzy street suggestions without claiming the house number was verified", () => {
    expect(mapFuzzySearchCandidate({
      geometry: { coordinates: [-0.405, 51.889] },
      properties: {
        type: "street",
        name: "Walcot Avenue",
        city: "Luton",
        county: "Luton",
        state: "England",
        country: "United Kingdom",
        countrycode: "GB",
        postcode: "LU2 0PU",
      },
    })).toMatchObject({
      label: "Walcot Avenue, Luton, LU2 0PU, United Kingdom",
      address: "Walcot Avenue",
      city: "Luton",
      zip_code: "LU2 0PU",
      lat: 51.889,
      lng: -0.405,
      matchType: "street",
      houseNumberVerified: false,
      source: "photon",
      countryCode: "GB",
    });
  });

  it("returns several explicit search choices instead of silently picking one", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          display_name: "16 Tythe Road, Luton, LU4 9JE, United Kingdom",
          lat: "51.9",
          lon: "-0.47",
          address: { house_number: "16", road: "Tythe Road", town: "Luton", postcode: "LU4 9JE" },
        },
        {
          display_name: "Tythe Road, Dunstable, LU6, United Kingdom",
          lat: "51.88",
          lon: "-0.52",
          address: { road: "Tythe Road", town: "Dunstable" },
        },
      ],
    });

    const results = await searchAddressCandidates("16 tythe road luton", {
      fetchImpl,
      minIntervalMs: 0,
      endpoint: "https://example.test/search",
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ address: "16 Tythe Road", city: "Luton", zip_code: "LU4 9JE" });
    expect(fetchImpl.mock.calls[0][0].searchParams.get("q")).toBe("16 tythe road luton");
    expect(fetchImpl.mock.calls[0][0].searchParams.get("addressdetails")).toBe("1");
    expect(fetchImpl.mock.calls[0][0].searchParams.get("limit")).toBe("6");
  });

  it("falls back to fuzzy UK suggestions when an exact address with a house number is not found", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              geometry: { coordinates: [-0.405, 51.889] },
              properties: {
                type: "street",
                name: "Walcot Avenue",
                city: "Luton",
                county: "Luton",
                state: "England",
                country: "United Kingdom",
                countrycode: "GB",
                postcode: "LU2 0PU",
              },
            },
            {
              geometry: { coordinates: [151.2, -33.8] },
              properties: {
                type: "street",
                name: "Luton Avenue",
                city: "Sydney",
                country: "Australia",
                countrycode: "AU",
                postcode: "2000",
              },
            },
          ],
        }),
      });

    const results = await searchAddressCandidates("89 walcolt avenue luton lu2 0pp", {
      fetchImpl,
      minIntervalMs: 0,
      endpoint: "https://exact.example.test/search",
      fuzzyEndpoint: "https://fuzzy.example.test/api/",
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1][0].searchParams.get("q")).toBe("89 walcolt avenue luton lu2 0pp");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      address: "Walcot Avenue",
      city: "Luton",
      zip_code: "LU2 0PU",
      matchType: "street",
      houseNumberVerified: false,
      source: "photon",
    });
  });

  it("converts a geocoder result to numeric coordinates and caches it", async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "51.999", lon: "-0.731" }],
    });
    const options = { fetchImpl, storage, minIntervalMs: 0, endpoint: "https://example.test/search" };

    await expect(geocodeAddress("MK1 1QT", options)).resolves.toEqual({ lat: 51.999, lng: -0.731 });
    await expect(geocodeAddress("MK1 1QT", options)).resolves.toEqual({ lat: 51.999, lng: -0.731 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0].searchParams.get("countrycodes")).toBe("gb");
  });

  it("uses only the UK postcode when a full street address contains one", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "52.00948", lon: "-0.7282" }],
    });
    await geocodeAddress("Castle House, Dawson Road, Bletchley, Milton Keynes, MK1 1QT", {
      fetchImpl,
      storage: null,
      minIntervalMs: 0,
      endpoint: "https://example.test/search",
    });
    expect(fetchImpl.mock.calls[0][0].searchParams.get("q")).toBe("MK1 1QT");
  });

  it("returns null when the address cannot be resolved", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    await expect(geocodeAddress("Unknown place", {
      fetchImpl,
      storage: null,
      minIntervalMs: 0,
      endpoint: "https://example.test/search",
    })).resolves.toBeNull();
  });
});
