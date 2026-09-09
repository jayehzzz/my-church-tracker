import { ConvexClient, ConvexHttpClient } from "convex/browser";
import { accessErrorCode } from './auth/errors.js';

const environment = import.meta.env?.VITE_APP_ENV || (import.meta.env?.DEV ? "development" : "production");
const requestedMode = import.meta.env?.VITE_APP_MODE || "live";
const convexUrl = import.meta.env?.VITE_CONVEX_URL?.trim();
const validEnvironments = new Set(["development", "staging", "production"]);

let configurationError = null;
if (!validEnvironments.has(environment)) {
  configurationError = `VITE_APP_ENV must be development, staging, or production (received "${environment}").`;
} else if (!["live", "demo"].includes(requestedMode)) {
  configurationError = 'VITE_APP_MODE must be "live" or "demo".';
} else if (requestedMode === "demo" && environment !== "development") {
  configurationError = "Demo mode is allowed only in the development environment.";
} else if (requestedMode === "live" && !convexUrl) {
  configurationError = "No Convex deployment is configured. Set VITE_CONVEX_URL for this environment, or explicitly start local demo mode.";
}

/** Demo is intentionally local-only and never creates a Convex client. */
export const isDemoMode = () => requestedMode === "demo" && !configurationError;
export const isConvexConfigured = () => !configurationError && !isDemoMode() && Boolean(convexUrl);
export const getConfigurationError = () => configurationError;
export const getDataSource = () => (isDemoMode() ? "demo" : isConvexConfigured() ? "convex" : "unavailable");

export function unavailableError() {
  return new Error(configurationError || "The configured Convex backend is unavailable.");
}

let httpClient = null;
let browserClient = null;
let fetchToken = async () => null;
let sessionGeneration = 0;
let onAccessLost = () => {};

export function configureConvexAuth(tokenFetcher, accessLost = () => {}) {
  fetchToken = tokenFetcher;
  onAccessLost = accessLost;
  sessionGeneration++;
  if (browserClient) browserClient.setAuth(fetchToken);
}

export function clearConvexAuth() {
  fetchToken = async () => null;
  sessionGeneration++;
  // ConvexClient has no clearAuth() method. Closing removes subscriptions and
  // cached results immediately; the next session gets a fresh client.
  const previous = browserClient;
  browserClient = null;
  if (previous) void previous.close().catch(() => {});
}

async function authenticatedRequest(method, args) {
  const generation = sessionGeneration;
  const token = await fetchToken({ forceRefreshToken: false });
  if (!token || generation !== sessionGeneration) throw new Error('UNAUTHENTICATED');
  // A request owns its client/token so a pending request cannot reuse a token
  // from an account that subsequently signed in on this browser.
  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  try {
    const result = await client[method](...args);
    if (generation !== sessionGeneration) throw new Error('SESSION_CHANGED');
    return result;
  } catch (error) {
    if (generation === sessionGeneration && accessErrorCode(error)) onAccessLost(error);
    throw error;
  }
}

/** All HTTP services share this single, validated deployment selection. */
export function getConvexHttpClient() {
  if (!isConvexConfigured()) return null;
  if (!httpClient) httpClient = Object.fromEntries(['query', 'mutation', 'action'].map(method =>
    [method, (...args) => authenticatedRequest(method, args)]));
  return httpClient;
}

export async function getConvexClient() {
  if (!isConvexConfigured()) return null;
  if (!browserClient) {
    browserClient = new ConvexClient(convexUrl, { initialAuthTokenReuse: true });
    browserClient.setAuth(fetchToken);
  }
  return browserClient;
}

export const convex = null;
