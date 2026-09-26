import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/svelte';
vi.mock('$app/stores', async () => {
  const { writable } = await import('svelte/store');
  return { page: writable({ url: new URL('http://localhost/visitation'), params: {} }) };
});
vi.mock('$app/navigation', () => ({ goto: vi.fn(), replaceState: vi.fn(), beforeNavigate: vi.fn(), afterNavigate: vi.fn() }));
vi.mock('svelte/transition', () => ({ fade: () => ({}), fly: () => ({}), scale: () => ({}) }));
vi.mock('$lib/convex.js', () => ({
  isDemoMode: () => false,
  isRehearsalMode: () => false,
  getConvexHttpClient: () => null,
  getConvexClient: async () => null,
}));
vi.mock('$lib/services/peopleService.js', () => ({ getAll: async () => ({ data: [], error: null }) }));
vi.mock('$lib/services/visitationsService.js', () => ({ getAll: async () => ({ data: null, error: new Error('Live backend unavailable') }) }));
vi.mock('$lib/services/attendanceService.js', () => ({ getAll: async () => ({ data: [], error: null }) }));
vi.mock('$lib/services/servicesService.js', () => ({ getAll: async () => ({ data: [], error: null }) }));
vi.mock('$lib/services/followUpCrmService.js', () => ({ getDemoDashboard: () => null, getDashboard: async () => ({ data: null, error: null }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/visitation'); });
beforeEach(() => {
  const storage = new Map();
  vi.stubGlobal('localStorage', { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) });
});
it('opens in live mode without a demo workspace and shows a recoverable load failure', async () => {
  const { default: Page } = await import('./+page.svelte');
  const view = render(Page);
  expect(view.getByRole('heading', { name: 'Pastoral Care', exact: true })).toBeInTheDocument();
  await waitFor(() => expect(view.getByRole('alert')).toHaveTextContent('Live backend unavailable'));
  expect(view.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  expect(view.queryByText('Samuel')).not.toBeInTheDocument();
});
it('keeps an exact care deep link in an unavailable state after a failed live read', async () => {
  window.history.replaceState({}, '', '/visitation?care=missing');
  const { default: Page } = await import('./+page.svelte');
  const view = render(Page);
  await waitFor(() => expect(view.getByRole('dialog', { name: 'Care details' })).toHaveTextContent('Live backend unavailable'));
  expect(view.queryByText('Samuel')).not.toBeInTheDocument();
});
