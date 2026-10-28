import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';

vi.mock('$app/navigation', () => ({ goto: vi.fn(), replaceState: vi.fn(), beforeNavigate: vi.fn(), afterNavigate: vi.fn() }));
vi.mock('svelte/transition', () => ({ fade: () => ({}), fly: () => ({}), scale: () => ({}) }));
vi.mock('$lib/components/layout/DashboardLayout.svelte', async () => ({ default: (await import('./pipeline/TestLayout.svelte')).default }));
vi.mock('$lib/stores/filterStore.js', async importOriginal => ({ ...(await importOriginal()), dateRange: writable({ label: 'September', startDate: '2026-09-01', endDate: '2026-09-30' }) }));
vi.mock('$lib/auth/session.js', () => ({ session: writable({ status: 'authenticated', user: { id: 'owner', role: 'owner', canViewConfidential: true } }) }));
const services = [
  { id: 'sun-1', service_type: 'sunday_service', service_date: '2026-09-06', total_attendance: 8, guests_count: 1, sermon_topic: 'First Sunday' },
  { id: 'sun-2', service_type: 'sunday_service', service_date: '2026-09-13', total_attendance: 12, guests_count: 2, sermon_topic: 'Second Sunday' },
];
vi.mock('$lib/services/dashboardService.js', () => ({
  getDashboardKPIs: async () => ({ kpis: [{ id: 'attendance', title: 'Avg attendance', value: 10 }], sources: { currentSundays: services, currentServices: services, attendanceRows: [], people: [] } }),
  getAttendanceChartData: async () => ({ data: services.map(service => ({ id: service.id, date: service.service_date, attendance: service.total_attendance, guests: service.guests_count, service })), contextLabel: 'September' }),
  getRecentActivities: async () => [],
}));
vi.mock('$lib/services/followUpCrmService.js', () => ({ getDashboard: async () => ({ data: { tasks: [], member_care_tasks: [], unassigned_contacts: [] } }), getDemoDashboard: () => ({ tasks: [], member_care_tasks: [], unassigned_contacts: [] }) }));
afterEach(cleanup);

it('opens the dashboard average from its exact Sunday sources and restores it after page return', async () => {
  const { default: Page } = await import('./+page.svelte');
  const first = render(Page);
  await waitFor(() => expect(first.getByRole('button', { name: 'Inspect Avg attendance' })).toBeInTheDocument());
  await fireEvent.click(first.getByRole('button', { name: 'Inspect Avg attendance' }));
  expect(first.getByRole('dialog')).toHaveTextContent('20 across 2 services ≈ 10 per service');
  await fireEvent.click(first.getAllByRole('button', { name: 'View service' })[0]);
  expect(first.getByRole('dialog')).toHaveTextContent('First Sunday');
  await fireEvent.click(first.getByRole('button', { name: 'Back to previous details' }));
  const saved = first.component.snapshot.capture();
  expect(JSON.stringify(saved)).not.toContain('First Sunday');
  first.unmount();
  const returned = render(Page);
  returned.component.snapshot.restore(saved);
  await waitFor(() => expect(returned.getByRole('dialog')).toHaveTextContent('20 across 2 services ≈ 10 per service'));
  await fireEvent.click(returned.getByRole('button', { name: 'Close modal' }));
  await fireEvent.change(returned.getByRole('combobox', { name: 'Chart time scale' }), { target: { value: 'month' } });
  await fireEvent.change(returned.getByRole('combobox', { name: 'Compare attendance with' }), { target: { value: 'guests' } });
  await fireEvent.click(returned.getByRole('button', { name: 'View Sept 2026 details' }));
  await fireEvent.click(returned.getByRole('button', { name: /Series B · Non-member visits/ }));
  expect(returned.getByRole('dialog')).toHaveTextContent('3 across 2 services');
  expect(returned.getByRole('dialog')).toHaveTextContent('2 services included');
  expect(returned.getByRole('dialog')).toHaveTextContent('Non-member visits: 1');
}, 15000);

it('can show special services on their own without dropping their source records', async () => {
  services.push({ id: 'special', service_type: 'special_service', service_date: '2026-09-16', total_attendance: 20, guests_count: 4, sermon_topic: 'Practice Special Wednesday' });
  try {
    const { default: Page } = await import('./+page.svelte');
    const view = render(Page);
    await waitFor(() => expect(view.getByRole('combobox', { name: /Services shown/ })).toBeInTheDocument());
    await fireEvent.change(view.getByRole('combobox', { name: /Services shown/ }), { target: { value: 'special' } });
    await fireEvent.click(view.getByRole('button', { name: 'View 2026-09-16 details' }));
    expect(view.getByRole('dialog')).toHaveTextContent('20 across 1 services');
    expect(view.getByRole('dialog')).toHaveTextContent('Practice Special Wednesday');
    expect(view.getByRole('dialog')).not.toHaveTextContent('First Sunday');
    expect(view.getByRole('dialog')).not.toHaveTextContent('Second Sunday');
  } finally { services.pop(); }
});
