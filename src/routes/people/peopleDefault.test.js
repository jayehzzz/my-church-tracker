import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('$app/navigation', () => ({ goto: vi.fn(), replaceState: vi.fn() }));
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/people') } }));
vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$lib/components/layout/DashboardLayout.svelte', async () => ({ default: (await import('../pipeline/TestLayout.svelte')).default }));
vi.mock('$lib/convex.js', () => ({ getConfigurationError: () => '', getDataSource: () => 'convex', isDemoMode: () => false }));
const fixtures = vi.hoisted(() => ({ returned: null }));
vi.mock('$lib/components/drilldown/peopleReturnState.js', () => ({ takePeopleDirectory: () => fixtures.returned, savePeopleDirectory: vi.fn() }));
vi.mock('$lib/services/peopleService', async importOriginal => ({ ...(await importOriginal()), getAll: async () => ({ data: [
  { id: 'member', first_name: 'Practice Member', member_status: 'member' },
  { id: 'leader', first_name: 'Practice Leader', member_status: 'leader' },
  { id: 'guest', first_name: 'Practice Guest', member_status: 'guest' },
  { id: 'contact', first_name: 'Practice Contact', member_status: 'contact' },
] }) }));
afterEach(() => { cleanup(); fixtures.returned = null; });
it('opens with members and leaders, and lets the user choose the wider directory', async () => {
  const { default: Page } = await import('./+page.svelte');
  const view = render(Page);
  expect(view.getByLabelText('Church Journey:')).toHaveValue('church_family');
  await waitFor(() => expect(view.getByText('Practice Member')).toBeInTheDocument());
  expect(view.getByText('Practice Leader')).toBeInTheDocument();
  expect(view.queryByText('Practice Guest')).not.toBeInTheDocument();
  expect(view.queryByText('Practice Contact')).not.toBeInTheDocument();
  await fireEvent.change(view.getByLabelText('Church Journey:'), { target: { value: 'all' } });
  expect(view.getByText('Practice Guest')).toBeInTheDocument();
  expect(view.getByText('Practice Contact')).toBeInTheDocument();
});
it('retains an explicit filter when returning from a person profile', async () => {
  fixtures.returned = { statusFilter: 'guest', roleFilter: 'all', activityFilter: 'all' };
  const { default: Page } = await import('./+page.svelte');
  const view = render(Page);
  expect(view.getByLabelText('Church Journey:')).toHaveValue('guest');
  await waitFor(() => expect(view.getByText('Practice Guest')).toBeInTheDocument());
  expect(view.queryByText('Practice Member')).not.toBeInTheDocument();
});
