import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), setAuth: vi.fn() }));
vi.mock('convex/browser', () => ({
  ConvexHttpClient: class { query = mocks.query; setAuth = mocks.setAuth; }, ConvexClient: class {},
}));
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks();
  vi.stubEnv('VITE_APP_ENV', 'development'); vi.stubEnv('VITE_APP_MODE', 'live');
  vi.stubEnv('VITE_CONVEX_URL', 'https://example.convex.cloud');
});
afterEach(() => vi.unstubAllEnvs());
it('never sends an unauthenticated data request', async () => {
  const config = await import('$lib/convex.js');
  await expect(config.getConvexHttpClient().query('people')).rejects.toThrow('UNAUTHENTICATED');
  expect(mocks.query).not.toHaveBeenCalled();
});
it('discards an in-flight response after sign-out', async () => {
  const config = await import('$lib/convex.js');
  config.configureConvexAuth(async () => 'token');
  let resolve;
  mocks.query.mockImplementation(() => new Promise(done => { resolve = done; }));
  const pending = config.getConvexHttpClient().query('people');
  await vi.waitFor(() => expect(mocks.query).toHaveBeenCalled());
  config.clearConvexAuth();
  resolve([{ first_name: 'Private' }]);
  await expect(pending).rejects.toThrow('SESSION_CHANGED');
});
it('does not revoke a new session when an old request is rejected', async () => {
  const config = await import('$lib/convex.js');
  config.configureConvexAuth(async () => 'old-token');
  let reject;
  mocks.query.mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
  const pending = config.getConvexHttpClient().query('people');
  await vi.waitFor(() => expect(mocks.query).toHaveBeenCalled());
  const accessLost = vi.fn();
  config.configureConvexAuth(async () => 'new-token', accessLost);
  reject(new Error('ACCOUNT_NOT_APPROVED'));
  await expect(pending).rejects.toThrow('ACCOUNT_NOT_APPROVED');
  expect(accessLost).not.toHaveBeenCalled();
});
