import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/svelte';
vi.mock('$app/stores', async () => {
  const { writable } = await import('svelte/store');
  return { page: writable({ url: new URL('http://localhost/evangelism'), params: {} }) };
});
vi.mock('$app/navigation', () => ({ goto: vi.fn(), replaceState: vi.fn(), beforeNavigate: vi.fn(), afterNavigate: vi.fn() }));
vi.mock('svelte/transition', () => ({ fade: () => ({}), fly: () => ({}), scale: () => ({}) }));
vi.mock('$lib/convex.js', () => ({ isDemoMode: () => false, isRehearsalMode: () => false, getConvexHttpClient: () => null, getConvexClient: async () => null }));
vi.mock('$lib/services/evangelismService.js', () => ({ getAll: async () => ({ data: [], error: null }) }));
vi.mock('$lib/services/peopleService.js', () => ({ getAll: async () => ({ data: [], error: null }) }));
vi.mock('$lib/services/followUpCrmService.js', () => ({ getDashboard: async () => ({ data: { contacts: [], leaders: [], tasks: [], active_assignments: [] }, error: null }), getContactProfile: async () => ({ data: null, error: new Error('No contact') }), assignContact: vi.fn() }));
beforeEach(() => {
  const storage = new Map();
  vi.stubGlobal('localStorage', { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/evangelism'); });
it('resolves an exact missing contact only after live reads and never opens a sample contact', async () => {
  window.history.replaceState({}, '', '/evangelism?contact=missing');
  const { default: Page } = await import('./+page.svelte');
  const view = render(Page);
  await waitFor(() => expect(view.getByRole('dialog', { name: 'Contact details' })).toHaveTextContent('unavailable or restricted'));
  expect(view.queryByText('Samuel')).not.toBeInTheDocument();
});
