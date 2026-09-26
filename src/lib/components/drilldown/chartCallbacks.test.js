import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import AttendanceTrend from '$lib/components/charts/AttendanceTrend.svelte';
import MeetingAttendanceComparison from '$lib/components/charts/MeetingAttendanceComparison.svelte';
import OutreachTrend from '$lib/components/charts/OutreachTrend.svelte';

afterEach(cleanup);

it('passes both metrics and all same-month service IDs from a shared hit area', async () => {
  const received = [];
  const view = render(AttendanceTrend, { data: [
    { id: 's1', date: '2026-08-30', total: 38, firstTimers: 2 },
    { id: 's2', date: '2026-08-30', total: 44, firstTimers: 1 },
  ], comparisonOptions: [{ key: 'firstTimers', label: 'First timers' }], onDrilldown: selection => received.push(selection) });
  await fireEvent.change(view.getByRole('combobox', { name: 'Chart time scale' }), { target: { value: 'month' } });
  await fireEvent.change(view.getByRole('combobox', { name: 'Compare attendance with' }), { target: { value: 'firstTimers' } });
  await fireEvent.change(view.getByRole('combobox', { name: 'Comparison calculation' }), { target: { value: 'total' } });
  await fireEvent.click(view.getByRole('button', { name: 'View Aug 2026 details' }));
  expect(received[0].selectedRole).toBeNull();
  expect(received[0].choices.map(choice => [choice.role, choice.metricKey, choice.mode, choice.sourceIds])).toEqual([
    ['A', 'total', 'average', ['s1', 's2']], ['B', 'firstTimers', 'total', ['s1', 's2']],
  ]);
});

it('retains the clicked meeting comparison series and its own grouping', async () => {
  const received = [];
  const view = render(MeetingAttendanceComparison, { series: [
    { id: 'prayer', label: 'Prayer', points: [{ id: 'm1', date: '2026-09-09', total: 30 }] },
    { id: 'bacenta', label: 'Bacenta', points: [{ id: 'm2', date: '2026-09-06', total: 20 }, { id: 'm3', date: '2026-09-13', total: 40 }] },
  ], onDrilldown: selection => received.push(selection) });
  await fireEvent.change(view.getByRole('combobox', { name: 'Chart time scale' }), { target: { value: 'month' } });
  await fireEvent.click(view.getByRole('button', { name: 'Bar' }));
  await fireEvent.click(view.getByRole('button', { name: 'Bacenta, Sept 2026, 30 average attendance per meeting' }));
  expect(received[0].selectedRole).toBe('B');
  expect(received[0].choices[0]).toMatchObject({ seriesId: 'bacenta', programmeId: 'bacenta', mode: 'average', sourceIds: ['m2', 'm3'] });
});

it('keeps clicked month separate from period-wide outreach average and both series', async () => {
  const received = [];
  const view = render(OutreachTrend, { data: [
    { year: 2025, month: '7', count: 31, saved: 4 },
  ], periodRange: { startDate: '2025-07-01', endDate: '2025-09-30' },
  onDrilldown: selection => received.push(selection) });
  await fireEvent.change(view.getByRole('combobox', { name: 'Compare outreach with' }), { target: { value: 'count' } });
  await fireEvent.click(view.getByRole('button', { name: 'Jul: 31 Contacts reached · actual monthly count, 10 Contacts reached · period average per month' }));
  expect(received[0].selectedRole).toBeNull();
  expect(received[0].choices[1]).toMatchObject({ metricKey: 'count', mode: 'average',
    pointBounds: { startDate: '2025-07-01', endDate: '2025-07-31' },
    scopeBounds: { startDate: '2025-07-01', endDate: '2025-09-30' } });
  expect(received[0].choices[1].sourcePoints).toHaveLength(3);
});

it('carries the exact outreach contact IDs for the clicked month and the full average period', async () => {
  const received = [];
  const view = render(OutreachTrend, { data: [
    { year: 2026, month: '1', count: 1, saved: 1 },
    { year: 2026, month: '3', count: 1, saved: 0 },
  ], rows: [
    { id: 'jan-contact', contact_date: '2026-01-10' },
    { id: 'mar-contact', contact_date: '2026-03-10' },
  ], periodRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
  onDrilldown: selection => received.push(selection) });
  await fireEvent.change(view.getByRole('combobox', { name: 'Compare outreach with' }), { target: { value: 'count' } });
  await fireEvent.click(view.getByRole('button', { name: /Jan: 1 Contacts reached/ }));
  expect(received[0].choices[0].sourceIds).toEqual(['jan-contact']);
  expect(received[0].choices[1].sourceIds).toEqual(['jan-contact', 'mar-contact']);
  expect(received[0].choices[1].sourcePoints).toHaveLength(3);
});
