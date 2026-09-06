import { writable } from 'svelte/store';
import { configureConvexAuth, clearConvexAuth, getConvexHttpClient, getConfigurationError, isDemoMode } from '$lib/convex.js';
import { api } from '../../../convex/_generated/api.js';
import { notificationStore } from '$lib/stores/notificationStore.js';
import { closeSearch } from '$lib/stores/searchStore.js';

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
        ? 'Your session needs verification. Please continue with Google to sign in again.' : '');
      return;
    }
    configureConvexAuth(async ({ forceRefreshToken } = {}) => {
      try {
        const response = await authClient.getTokenSilently({ detailedResponse: true, cacheMode: forceRefreshToken ? 'off' : 'on' });
        return response.id_token;
      } catch {
        signedOut('signed-out', 'Your session ended. Please sign in again.');
        return null;
      }
    }, (error) => {
      // An authenticated but unapproved Google account needs to be able to
      // submit its verified identity for owner review. Other auth failures
      // still remove local access immediately.
      if (!/ACCOUNT_NOT_APPROVED/.test(String(error))) {
        signedOut('access-denied', 'This account has not been approved, or its access has been removed.');
      }
    });
    let user;
    try {
      user = await getConvexHttpClient().query(api.access.me, {});
    } catch (error) {
      if (/ACCOUNT_NOT_APPROVED/.test(String(error))) {
        session.set({ status: 'approval-required', user: null, error: 'This Google account has not been approved yet.' });
        return;
      }
      throw error;
    }
    if (current !== generation) return;
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
  } catch (error) {
    if (current === generation) signedOut('access-denied', /ACCOUNT_NOT_APPROVED/.test(String(error))
      ? 'This Google account needs approval from your church administrator.'
      : 'Sign-in could not be completed. Please try again or contact your administrator.');
  }
}

export async function signIn() {
  await initializeSession();
  if (!authClient) return;
  sessionHint('signing-in');
  await authClient.loginWithRedirect({ authorizationParams: { connection: 'google-oauth2', prompt: 'select_account' } });
}

export async function requestAccess() {
  if (!authClient) return;
  session.set({ status: 'requesting-approval', user: null, error: '' });
  try {
    const result = await getConvexHttpClient().mutation(api.access.requestAccess, {});
    if (result.state === 'approved') {
      session.set({ status: 'approval-required', user: null, error: 'Your access was approved. Reload this page to continue.' });
    } else if (result.state === 'inactive') {
      session.set({ status: 'approval-required', user: null, error: 'This account is inactive. Please contact a church owner.' });
    } else {
      session.set({ status: 'approval-required', user: null, error: 'Your verified Google identity has been sent to a church owner for approval.' });
    }
  } catch {
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
