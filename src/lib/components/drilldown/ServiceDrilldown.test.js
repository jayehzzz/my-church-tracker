import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import ServiceDrilldown from './ServiceDrilldown.svelte';
import { openDrilldown } from './selection.js';
import { periodServiceSelection } from './serviceSelection.js';

vi.mock('$lib/auth/session.js', () => ({ session: writable({ status: 'authenticated', user: { canViewConfidential: false } }) }));
afterEach(cleanup);
const services = [
  { id: 's1', service_date: '2026-09-06', total_attendance: 41, guests_count: 1, sermon_topic: 'Morning gathering' },
  { id: 's2', service_date: '2026-09-13', total_attendance: 42, guests_count: 0, sermon_topic: 'Second gathering' }
];

describe('service dialog interaction', () => {
  it('opens a KPI source list, a service and returns to the same two-record list', async () => {
    const selection = periodServiceSelection('total', services, { mode: 'average', range: { startDate: '2026-09-01', endDate: '2026-09-30' } });
    const state = openDrilldown({ kind: 'selection', title: 'Average attendance', selection });
    const ui = render(ServiceDrilldown, { state, services, attendance: [], people: [], wholeNumberAverages: true });
    expect(ui.getByText(/83 across 2 services ≈ 42 per service \(rounded to a whole person\)/)).toBeDefined();
    expect(ui.getByRole('dialog').textContent).not.toContain('41.5');
    expect(ui.getByText('2 services included')).toBeDefined();
    expect(ui.getByText('Attendance: 41')).toBeDefined();
    await fireEvent.click(ui.getAllByRole('button', { name: 'View service' })[0]);
    await waitFor(() => expect(ui.getByText('Linked names available')).toBeDefined());
    await fireEvent.click(ui.getByRole('button', { name: 'Back to previous details' }));
    expect(ui.getByText('2 services included')).toBeDefined();
  });
  it('keeps a missed Sunday in matrix history and restores focus at the root', async () => {
    const state = openDrilldown({ kind: 'history', title: 'Sunday history', personId: 'p1', statuses: [
      { service: services[0], state: 'present' }, { service: services[1], state: 'missed' }
    ] });
    const ui = render(ServiceDrilldown, { state, services, attendance: [], people: [] });
    expect(ui.getByText('Missed')).toBeDefined();
    await fireEvent.click(ui.getAllByRole('button', { name: 'View service' })[1]);
    await fireEvent.click(ui.getByRole('button', { name: 'Back to previous details' }));
    expect(ui.getByText('Missed')).toBeDefined();
    expect(document.activeElement).toBe(ui.getAllByRole('button', { name: 'View service' })[1]);
  });
  it('focuses the dialog content when Back reaches a root with no saved trigger', async () => {
    const root = { kind: 'list', title: 'Services', choice: periodServiceSelection('total', services, { range: { startDate: '2026-09-01', endDate: '2026-09-30' } }).choices[0], scrollTop: 0, focusKey: null };
    const ui = render(ServiceDrilldown, { state: { current: { kind: 'service', title: 'Morning gathering', id: 's1' }, history: [root] }, services });
    await fireEvent.click(ui.getByRole('button', { name: 'Back to previous details' }));
    expect(document.activeElement).toBe(ui.getByRole('dialog').querySelector('[data-drilldown-scroll]'));
  });
});
