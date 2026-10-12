import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
const fixture = vi.hoisted(() => ({
  services: [
    { id: 's1', service_date: '2026-09-06', service_type: 'sunday_service', total_attendance: 1, first_timers: 1, individuals: ['p1'] },
    { id: 's2', service_date: '2026-09-13', service_type: 'sunday_service', total_attendance: 1, first_timers: 1, individuals: ['p2'] },
  ],
  first_timers: [
    { person: { id: 'p1', first_name: 'Ama', last_name: 'Mensah' }, events: [{ id: 's1', date: '2026-09-06' }] },
    { person: { id: 'p2', first_name: 'Kofi', last_name: 'Owusu' }, events: [{ id: 's2', date: '2026-09-13' }] },
  ],
  watch: null,
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/services') } }));
vi.mock('svelte/transition', () => ({ fade: () => ({}), fly: () => ({}), scale: () => ({}) }));
vi.mock('$lib/components/layout/DashboardLayout.svelte', async () => ({ default: (await import('../pipeline/TestLayout.svelte')).default }));
vi.mock('$lib/convex.js', () => ({ isDemoMode: () => false, getConvexHttpClient: () => null, getConvexClient: async () => null }));
vi.mock('$lib/auth/session.js', () => ({ session: writable({ status: 'authenticated', user: { role: 'owner' } }) }));
vi.mock('$lib/stores/filterStore', () => ({ dateRange: writable({ startDate: '2026-09-01', endDate: '2026-09-30' }) }));
vi.mock('$lib/services/servicesService', () => ({ getAll: async () => ({ data: fixture.services }), watchServiceWorkspace: async () => () => {} }));
vi.mock('$lib/services/peopleService', () => ({ getAll: async () => ({ data: fixture.first_timers.map(row => row.person) }), formatJourneyStatus: () => 'Guest' }));
vi.mock('$lib/services/attendanceService', () => ({ getAll: async () => ({ data: [] }) }));
vi.mock('$lib/services/followUpCrmService.js', () => ({
  getSundayCommitments: async () => ({ data: [] }),
  getJourneyOverview: async () => ({ data: { first_timers: fixture.first_timers } }),
  watchJourneyOverview: async (_, callbacks) => { fixture.watch = callbacks; return () => {}; },
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('opens the actual first-timer people from the service KPI, follows the period and links to profiles', async () => {
  vi.stubGlobal('scrollTo', vi.fn());
  const { default: Page } = await import('./+page.svelte');
  const view = render(Page);
  await waitFor(() => expect(view.getByRole('button', { name: 'View first timer people' })).toBeInTheDocument());
  await fireEvent.click(view.getByRole('button', { name: 'View first timer people' }));
  expect(view.getByRole('button', { name: 'Ama Mensah' })).toBeInTheDocument();
  expect(view.getByRole('button', { name: 'Kofi Owusu' })).toBeInTheDocument();
  expect(view.queryByRole('dialog')).not.toBeInTheDocument();
  const { dateRange } = await import('$lib/stores/filterStore');
  dateRange.set({ startDate: '2026-09-13', endDate: '2026-09-13' });
  await waitFor(() => expect(view.queryByRole('button', { name: 'Ama Mensah' })).not.toBeInTheDocument());
  expect(view.getByRole('status')).toHaveTextContent('1 person');
  await fireEvent.click(view.getByRole('button', { name: 'Kofi Owusu' }));
  const { goto } = await import('$app/navigation');
  expect(goto).toHaveBeenCalledWith('/people/p2');
  fixture.watch.onUpdate({ first_timers: [] });
  await waitFor(() => expect(view.queryByRole('button', { name: 'Kofi Owusu' })).not.toBeInTheDocument());
  expect(view.getByRole('status')).toHaveTextContent('0 people');
});
