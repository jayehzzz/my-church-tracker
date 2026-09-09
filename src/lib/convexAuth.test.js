import { afterEach, expect, it, vi } from 'vitest';
const clients = vi.hoisted(() => []);
vi.mock('convex/browser', () => ({
  ConvexClient: class {
    constructor() { this.setAuth = vi.fn(); this.close = vi.fn(async () => {}); clients.push(this); }
  },
  ConvexHttpClient: class {},
}));
afterEach(() => vi.unstubAllEnvs());
it('closes subscriptions on sign-out and creates a fresh client for the next session', async () => {
  vi.resetModules();
  vi.stubEnv('VITE_APP_ENV', 'staging');
  vi.stubEnv('VITE_APP_MODE', 'live');
  vi.stubEnv('VITE_CONVEX_URL', 'https://example.convex.cloud');
  const auth = await import('./convex.js');
  auth.configureConvexAuth(async () => 'first-session');
  const first = await auth.getConvexClient();
  expect(() => auth.clearConvexAuth()).not.toThrow();
  expect(first.close).toHaveBeenCalledOnce();
  auth.configureConvexAuth(async () => 'next-session');
  const next = await auth.getConvexClient();
  expect(next).not.toBe(first);
  expect(await next.setAuth.mock.calls[0][0]()).toBe('next-session');
});
