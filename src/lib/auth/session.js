import { writable } from 'svelte/store';
import { configureConvexAuth, clearConvexAuth, getConvexHttpClient, getConfigurationError, isDemoMode } from '$lib/convex.js';
import { api } from '../../../convex/_generated/api.js';
import { notificationStore } from '$lib/stores/notificationStore.js';
import { closeSearch } from '$lib/stores/searchStore.js';
import { accessErrorCode } from './errors.js';

export const session = writable({ status: 'loading', user: null, error: '' });
let authClient;
let initialization;
let unsubscribeAccount;
let generation = 0;
let channel;
const sessionHintKey = 'church-tracker-session-state';
// This hint contains no identity or credentials. It prevents an unsuccessful
// provider logout from silently restoring access on reload or in another tab.
function sessionHint(value) {
  try {
    if (value !== undefined) window.localStorage.setItem(sessionHintKey, value);
    return window.localStorage.getItem(sessionHintKey);
  } catch { return null; }
}

function signedOut(status = 'signed-out', error = '') {
  generation++;
  clearConvexAuth();
  notificationStore.clearSession();
  closeSearch();
  unsubscribeAccount?.();
  unsubscribeAccount = undefined;
  session.set({ status, user: null, error });
}

export function initializeSession() {
  if (!initialization) initialization = startSession();
  return initialization;
}

async function startSession() {
  if (isDemoMode()) {
    session.set({ status: 'demo', user: { name: 'Demo session', role: 'demo' }, error: '' });
    return;
  }
  notificationStore.clearSession();
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  if (getConfigurationError() || !domain || !clientId) {
    signedOut('configuration-required', 'Sign-in is not configured yet. Your administrator needs to connect the church’s sign-in service and database.');
    return;
  }
  const current = generation;
  try {
    const { Auth0Client } = await import('@auth0/auth0-spa-js');
    authClient = new Auth0Client({
      domain, clientId, cacheLocation: 'memory',
      authorizationParams: { redirect_uri: window.location.origin, scope: 'openid profile email' },
    });
    // createAuth0Client() waits for checkSession() before returning a client.
    // A blocked/slow provider endpoint formerly left local development on
    // “Checking your session…” indefinitely, with no way to start sign-in.
    // Keep restoration when available, but continue to an explicit sign-in
    // after a short bounded wait.
    await Promise.race([
      authClient.checkSession().catch(() => undefined),
      new Promise(resolve => window.setTimeout(resolve, 4_000)),
    ]);
    const params = new URLSearchParams(window.location.search);
    if (params.has('state') && (params.has('code') || params.has('error'))) {
      try { await authClient.handleRedirectCallback(); }
      finally { window.history.replaceState({}, '', window.location.pathname); }
    }
    if (current !== generation) return;
    if (typeof BroadcastChannel !== 'undefined' && !channel) {
      channel = new BroadcastChannel('church-tracker-session');
      channel.onmessage = event => { if (event.data === 'sign-out') signedOut(); };
    }
    window.addEventListener('storage', event => {
      if (event.key === sessionHintKey && event.newValue === 'signed-out') signedOut();
    });
    if (sessionHint() === 'signed-out') { signedOut(); return; }
    if (!await authClient.isAuthenticated()) {
      signedOut('signed-out', sessionHint() === 'signed-in'
        ? 'Your session needs verification. Please sign in again.' : '');
      return;
    }
    configureConvexAuth(async ({ forceRefreshToken } = {}) => {
      // Starting a live subscription requests renewal even with a valid
      // token. Forced Auth0 iframe renewal fails when third-party cookies
      // are blocked, and Auth0's library internally clears the cache on
      // login_required. Reuse an unexpired token before attempting an
      // off-cache network refresh.
      if (forceRefreshToken && current === generation) {
        try {
          const cached = await authClient.getTokenSilently({ detailedResponse: true, cacheMode: 'cache-only' });
          const claims = (cached?.id_token ? await authClient.getIdTokenClaims() : null) || await authClient.getIdTokenClaims();
          const unexpired = current === generation && claims?.exp && claims.exp > Date.now() / 1000 + 30;
          if (unexpired && claims?.__raw === cached?.id_token) {
            return cached.id_token;
          }
          if (unexpired && claims?.__raw) {
            return claims.__raw;
          }
        } catch { /* No usable cached token: continue to network refresh */ }
      }
      try {
        const response = await authClient.getTokenSilently({ detailedResponse: true, cacheMode: forceRefreshToken ? 'off' : 'on' });
        return response.id_token;
      } catch {
        if (current === generation) signedOut('signed-out', 'Your session ended. Please sign in again.');
        return null;
      }
    }, (error) => {
      // An authenticated but unapproved account needs to be able to
      // submit its verified identity for owner review. Other auth failures
      // still remove local access immediately.
      if (accessErrorCode(error) === 'EMAIL_VERIFICATION_REQUIRED') {
        signedOut('verification-required', 'Verify your email using the message from the sign-in service, then sign in again.');
      } else if (accessErrorCode(error) !== 'ACCOUNT_NOT_APPROVED') {
        signedOut('access-denied', 'This account has not been approved, or its access has been removed.');
      }
    });
    let user;
    try {
      user = await getConvexHttpClient().query(api.access.me, {});
    } catch (error) {
      if (accessErrorCode(error) === 'ACCOUNT_NOT_APPROVED') {
        session.set({ status: 'approval-required', user: null, error: 'This account has not been approved yet.' });
        return;
      }
      throw error;
    }
    activateApprovedSession(user, current);
  } catch (error) {
    if (current === generation && accessErrorCode(error) === 'EMAIL_VERIFICATION_REQUIRED') {
      signedOut('verification-required', 'Verify your email using the message from the sign-in service, then sign in again.');
      return;
    }
    if (current === generation) signedOut('access-denied', accessErrorCode(error) === 'ACCOUNT_NOT_APPROVED'
      ? 'This account needs approval from your church administrator.'
      : 'Sign-in could not be completed. Please try again or contact your administrator.');
  }
}

function activateApprovedSession(user, current) {
  if (current !== generation) return;
  unsubscribeAccount?.();
  sessionHint('signed-in');
  session.set({ status: 'authenticated', user, error: '' });
  // Re-check account approval periodically and on focus. Backend requests
  // always check it independently; this also removes cached UI after revocation.
  const refresh = async () => {
    try {
      const next = await getConvexHttpClient().query(api.access.me, {});
      if (current === generation) {
        session.set({ status: 'authenticated', user: next, error: '' });
      }
    } catch { if (current === generation) signedOut('access-denied', 'Access could not be verified. Please sign in again.'); }
  };
  const timer = window.setInterval(refresh, 60_000);
  window.addEventListener('focus', refresh);
  unsubscribeAccount = () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
}

export async function signIn() {
  await initializeSession();
  if (!authClient) return;
  sessionHint('signing-in');
  // Universal Login offers the enabled password connection and preserves existing
  // provider accounts during migration. Never bind access by email alone.
  await authClient.loginWithRedirect({ authorizationParams: { prompt: 'login' } });
}

export async function requestAccess() {
  if (!authClient) return;
  const current = generation;
  session.set({ status: 'requesting-approval', user: null, error: '' });
  try {
    const result = await getConvexHttpClient().mutation(api.access.requestAccess, {});
    if (current !== generation) return;
    if (result.state === 'approved') {
      const user = await getConvexHttpClient().query(api.access.me, {});
      activateApprovedSession(user, current);
    } else if (result.state === 'inactive') {
      session.set({ status: 'approval-required', user: null, error: 'This account is inactive. Please contact a church owner.' });
    } else {
      session.set({ status: 'approval-required', user: null, error: 'Your verified identity has been sent to a church owner for approval.' });
    }
  } catch {
    if (current !== generation) return;
    session.set({ status: 'approval-required', user: null, error: 'We could not submit your access request. Please try again or contact a church owner.' });
  }
}

export async function signOut() {
  sessionHint('signed-out');
  signedOut(); // Remove data access and mounted pages before contacting Auth0.
  channel?.postMessage('sign-out');
  if (authClient) {
    try { await authClient.logout({ logoutParams: { returnTo: window.location.origin } }); }
    catch { session.set({ status: 'signed-out', user: null, error: 'Signed out here. The sign-in provider could not be reached.' }); }
  }
}
