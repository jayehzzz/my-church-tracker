import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

const mocks = vi.hoisted(() => ({
  Auth0Client: vi.fn(), query: vi.fn(), mutation: vi.fn(), configure: vi.fn(), clear: vi.fn(),
  auth: { checkSession: vi.fn(), isAuthenticated: vi.fn(), handleRedirectCallback: vi.fn(), getTokenSilently: vi.fn(), loginWithRedirect: vi.fn(), logout: vi.fn() },
}));
vi.mock('@auth0/auth0-spa-js', () => ({ Auth0Client: mocks.Auth0Client }));
vi.mock('$lib/convex.js', () => ({ configureConvexAuth: mocks.configure, clearConvexAuth: mocks.clear,
  getConvexHttpClient: () => ({ query: mocks.query, mutation: mocks.mutation }), getConfigurationError: () => null, isDemoMode: () => false }));
vi.mock('$lib/stores/notificationStore.js', () => ({ notificationStore: { clearSession: vi.fn() } }));
vi.mock('$lib/stores/searchStore.js', () => ({ closeSearch: vi.fn() }));
let controller;
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks(); vi.useFakeTimers();
  vi.stubEnv('VITE_AUTH0_DOMAIN', 'identity.example'); vi.stubEnv('VITE_AUTH0_CLIENT_ID', 'public-client-id');
  vi.stubGlobal('BroadcastChannel', undefined);
  window.history.replaceState({}, '', '/');
  const storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
  });
  mocks.Auth0Client.mockImplementation(() => mocks.auth);
  mocks.auth.checkSession.mockResolvedValue(undefined);
  mocks.auth.isAuthenticated.mockResolvedValue(true);
  mocks.auth.getTokenSilently.mockResolvedValue({ id_token: 'verified-by-convex', access_token: 'not-the-id-token' });
  mocks.query.mockResolvedValue({ id: 'account', name: 'Alex', role: 'leader' });
  mocks.mutation.mockResolvedValue({ state: 'pending' });
});
afterEach(async () => {
  await controller?.signOut();
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals();
});
describe('sign-in session lifecycle (mocked provider)', () => {
  it('restores the provider session, checks backend approval and supplies the ID token', async () => {
    controller = await import('./session.js');
    await controller.initializeSession();
    expect(get(controller.session)).toMatchObject({ status: 'authenticated', user: { name: 'Alex' } });
    expect(mocks.query).toHaveBeenCalledTimes(1);
    const fetchToken = mocks.configure.mock.calls[0][0];
    expect(await fetchToken({ forceRefreshToken: true })).toBe('verified-by-convex');
    expect(mocks.auth.getTokenSilently).toHaveBeenCalledWith({ detailedResponse: true, cacheMode: 'off' });
    expect(mocks.Auth0Client.mock.calls[0][0].cacheLocation).toBe('memory');
  });
  it('does not expose the app for an unapproved account and permits a verified approval request', async () => {
    mocks.query.mockRejectedValue(new Error('ACCOUNT_NOT_APPROVED'));
    controller = await import('./session.js');
    await controller.initializeSession();
    expect(get(controller.session)).toMatchObject({ status: 'approval-required', user: null });
    expect(mocks.clear).not.toHaveBeenCalled();
    await controller.requestAccess();
    expect(mocks.mutation).toHaveBeenCalledTimes(1);
    expect(get(controller.session)).toMatchObject({ status: 'approval-required', error: expect.stringContaining('sent') });
  });
  it('uses Google and removes access immediately even if provider logout fails', async () => {
    controller = await import('./session.js');
    await controller.initializeSession();
    await controller.signIn();
    expect(mocks.auth.loginWithRedirect).toHaveBeenCalledWith({ authorizationParams: { connection: 'google-oauth2', prompt: 'select_account' } });
    mocks.auth.logout.mockRejectedValue(new Error('offline'));
    await controller.signOut();
    expect(get(controller.session)).toMatchObject({ status: 'signed-out', user: null });
    expect(mocks.clear).toHaveBeenCalled();
  });
  it('removes the app when token refresh expires', async () => {
    controller = await import('./session.js');
    await controller.initializeSession();
    mocks.auth.getTokenSilently.mockRejectedValue(new Error('login_required'));
    expect(await mocks.configure.mock.calls[0][0]({ forceRefreshToken: true })).toBeNull();
    expect(get(controller.session)).toMatchObject({ status: 'signed-out', user: null });
  });
  it('keeps an explicit sign-out across reload even when the provider session survives', async () => {
    window.localStorage.setItem('church-tracker-session-state', 'signed-out');
    controller = await import('./session.js');
    await controller.initializeSession();
    expect(get(controller.session)).toMatchObject({ status: 'signed-out', user: null });
    expect(mocks.query).not.toHaveBeenCalled();
    await controller.signIn();
    expect(window.localStorage.getItem('church-tracker-session-state')).toBe('signing-in');
    expect(mocks.auth.loginWithRedirect).toHaveBeenCalled();
  });
  it('explains when the provider cannot restore a previously approved session', async () => {
    window.localStorage.setItem('church-tracker-session-state', 'signed-in');
    mocks.auth.isAuthenticated.mockResolvedValue(false);
    controller = await import('./session.js');
    await controller.initializeSession();
    expect(get(controller.session)).toMatchObject({ status: 'signed-out', user: null, error: expect.stringContaining('needs verification') });
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it('clears access when another tab signs out using the storage fallback', async () => {
    controller = await import('./session.js');
    await controller.initializeSession();
    window.dispatchEvent(new StorageEvent('storage', { key: 'church-tracker-session-state', newValue: 'signed-out' }));
    expect(get(controller.session)).toMatchObject({ status: 'signed-out', user: null });
  });
  it('cleans the OAuth callback and blocks access when callback validation fails', async () => {
    window.history.replaceState({}, '', '/?code=invalid&state=invalid');
    mocks.auth.handleRedirectCallback.mockRejectedValue(new Error('state mismatch'));
    controller = await import('./session.js');
    await controller.initializeSession();
    expect(window.location.search).toBe('');
    expect(mocks.query).not.toHaveBeenCalled();
    expect(get(controller.session)).toMatchObject({ status: 'access-denied', user: null });
  });
});
