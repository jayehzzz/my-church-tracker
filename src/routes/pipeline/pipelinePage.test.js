import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';

const historicalPerson = { id: 'historical', first_name: 'Historical', last_name: 'Person', member_status: 'contact' };
const oldWorker = {
  leader_id: 'worker-old', leader_name: 'Old Worker', period_unique_contacts: 1,
  evidence: { period_unique_contacts: [{ person_id: 'historical', person_name: 'Historical Person' }] },
};
const workspace = {
  leaders: [{ id: 'worker-old', first_name: 'Old', last_name: 'Worker' }],
  tasks: [], member_care_tasks: [], contacts: [{ id: 'current', first_name: 'Current', last_name: 'Person' }],
  unassigned_contacts: [], attendance_roster: [], sunday_commitments: [], later_contacts: [],
  team_stats: [oldWorker], attendance_forecast: { expected_total: 0, expected_person_ids: [] },
  service_date: '2026-09-27',
};
vi.mock('$lib/auth/session.js', () => ({ session: writable({ status: 'authenticated', user: { id: 'account', role: 'owner', canViewConfidential: true } }) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/components/layout/DashboardLayout.svelte', async () => ({ default: (await import('./TestLayout.svelte')).default }));
vi.mock('svelte/transition', () => ({ fade: () => ({}), fly: () => ({}), scale: () => ({}) }));
vi.mock('$lib/convex.js', () => ({ isDemoMode: () => false, isRehearsalMode: () => false, getConvexHttpClient: () => null, getConvexClient: async () => null }));
vi.mock('$lib/stores/notificationStore.js', () => ({ notificationStore: { upsertNotification: vi.fn(), removeNotification: vi.fn() }, refreshLiveNotifications: vi.fn() }));
vi.mock('$lib/services/followUpCrmService.js', () => ({
  getDashboard: async () => ({ data: workspace, error: null }),
  watchDashboard: async () => () => {},
  getContactProfile: async () => ({ data: { person: historicalPerson, follow_ups: [], commitments: [] }, error: null }),
  assignContact: vi.fn(), batchAssignContacts: vi.fn(), completeTask: vi.fn(), createTask: vi.fn(), quickLogNoAnswer: vi.fn(),
  reactivateContact: vi.fn(), resolveCommitment: vi.fn(), setAttendancePlan: vi.fn(),
  updateMissedSundayReason: vi.fn(),
}));

beforeEach(() => {
  workspace.unassigned_contacts = [];
  const storage = new Map();
  vi.stubGlobal('localStorage', { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/pipeline'); });

it('opens the selected worker metric from historical evidence rather than current assigned contacts', async () => {
  const { default: Page } = await import('./+page.svelte');
  const view = render(Page);
  await waitFor(() => expect(view.getByRole('button', { name: 'Workers' })).toBeInTheDocument());
  await fireEvent.click(view.getByRole('button', { name: 'Workers' }));
  await fireEvent.click(view.getByRole('button', { name: '1 person worked by Old Worker' }));
  const evidence = view.getByRole('region', { name: 'Worker metric evidence' });
  expect(evidence).toHaveTextContent('Historical Person');
  expect(evidence).not.toHaveTextContent('Current Person');
  await fireEvent.click(view.getByRole('button', { name: 'View person' }));
  await waitFor(() => expect(view.getByRole('dialog', { name: 'Historical Person' })).toBeInTheDocument());
  await fireEvent.click(view.getByRole('link', { name: /View full directory profile/ }));
  const { goto } = await import('$app/navigation');
  expect(goto).toHaveBeenCalledWith('/people/historical');
  view.unmount();
  const returned = render(Page);
  await waitFor(() => expect(returned.getByRole('region', { name: 'Worker metric evidence' })).toHaveTextContent('Historical Person'));
});


it('keeps named partial batch errors visible after the weekly workspace refresh', async () => {
  workspace.unassigned_contacts = [
    {id:'saved-person',first_name:'Saved',last_name:'Person'},
    {id:'failed-person',first_name:'Failed',last_name:'Person'},
  ];
  const { batchAssignContacts } = await import('$lib/services/followUpCrmService.js');
  batchAssignContacts.mockResolvedValue({data:[{assignment:{person_id:'saved-person'}}],succeededPersonIds:['saved-person'],errors:[{personId:'failed-person',error:new Error('Assignment changed. Refresh and try again.')}],error:new Error('1 assigned; 1 failed')});
  const { default: Page } = await import('./+page.svelte');
  const view = render(Page);
  await waitFor(() => expect(view.getByLabelText('Select Saved Person')).toBeInTheDocument());
  await fireEvent.click(view.getByLabelText('Select Saved Person'));
  await fireEvent.click(view.getByLabelText('Select Failed Person'));
  await fireEvent.click(view.getByRole('button',{name:'Assign 2 contacts'}));
  await waitFor(() => expect(view.getByRole('alert')).toHaveTextContent('Failed Person: Assignment changed. Refresh and try again.'));
  expect(view.getByText('Assigned 1 person to Old Worker.')).toBeInTheDocument();
  expect(view.getByLabelText('Select Failed Person')).toBeChecked();
  expect(view.getByLabelText('Select Saved Person')).not.toBeChecked();
});
