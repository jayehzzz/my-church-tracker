import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import OutreachDrilldown from './OutreachDrilldown.svelte';
import CareDrilldown from './CareDrilldown.svelte';
import { createChoice, createSelection, openDrilldown } from './selection.js';
import { careContributions } from './careAdapter.js';
import { outreachContributions } from './outreachAdapter.js';

afterEach(cleanup);
const contacts = [
  { id: 'one', full_name: 'Alice One', contact_date: '2026-01-10', outreach_salvation_decision: true, first_visit_date: '2026-03-02', reached_by_name: 'Ada, Bea' },
  { id: 'two', full_name: 'Bob Two', contact_date: '2026-03-12', member_status: 'member' },
];
const bounds = { startDate: '2026-01-01', endDate: '2026-03-31' };
const choice = (metricKey, mode, role = 'A') => createChoice({ domain: 'contact', metricKey, mode, role,
  point: { date: '2026-03-01', bucketStart: '2026-03-01', bucketEnd: '2026-03-31' }, scopeBounds: mode === 'average' ? bounds : undefined });

describe('outreach drilldown', () => {
  it('keeps A/B metric identity and lists only the selected month cohort', async () => {
    const selection = createSelection([choice('count', 'total', 'A'), choice('joined', 'total', 'B')]);
    const { getByRole, queryByText } = render(OutreachDrilldown, { state: openDrilldown({ kind: 'selection', title: 'Outreach', selection }), rows: contacts });
    await fireEvent.click(getByRole('button', { name: /Series B · Joined church/ }));
    expect(getByRole('dialog')).toHaveTextContent('Bob Two');
    expect(queryByText('Alice One')).toBeNull();
    await fireEvent.click(getByRole('button', { name: 'View contact' }));
    expect(getByRole('dialog')).toHaveTextContent('Church statusmember');
    await fireEvent.click(getByRole('button', { name: 'Back to previous details' }));
    expect(getByRole('dialog')).toHaveTextContent('Bob Two');
  });
  it('explains the period average with a zero month, partial scope and later outcome', () => {
    const result = outreachContributions(contacts, choice('visited', 'average'));
    expect(result.months.map(month => month.visited || 0)).toEqual([1, 0, 0]);
    expect(result.denominator).toBe(3);
    expect(result.total).toBe(1);
    expect(result.displayed).toBe(0.3);
    expect(result.matches.map(row => row.id)).toEqual(['one']);
  });
  it('shows exact missing record and unavailable states without a fallback contact', () => {
    const { getByRole, rerender } = render(OutreachDrilldown, { state: openDrilldown({ kind: 'contact', id: 'missing', title: 'Contact' }), rows: contacts });
    expect(getByRole('status')).toHaveTextContent('unavailable or restricted');
    rerender({ status: 'unavailable', error: 'Contact read failed', onretry: vi.fn() });
    expect(getByRole('status')).toHaveTextContent('Contact read failed');
  });
  it('loads the selected inviter contact context and exposes permitted record links', async () => {
    const oncontact = vi.fn();
    const { getByRole, getByText } = render(OutreachDrilldown, { state: openDrilldown({ kind: 'inviter', title: 'Inviter', rows: [contacts[0]], periodLabel: 'Quarter' }), rows: contacts, oncontact,
      profile: { tasks: [{ status: 'open', task_type: 'call', due_date: '2026-04-01' }], commitments: [], meeting_attendance: [{ meeting: { _id: 'meeting-1', title: 'Prayer', meeting_date: '2026-04-02' } }], visitations: [{ _id: 'care-1', visit_date: '2026-04-03', outcome: 'welcomed_encouraged' }] } });
    await fireEvent.click(getByRole('button', { name: 'View contact' }));
    expect(oncontact).toHaveBeenCalledWith('one');
    expect(getByText(/due 2026-04-01/)).toBeTruthy();
    await fireEvent.click(getByText(/Meeting attendance/));
    expect(getByRole('link', { name: 'View meeting' }).getAttribute('href')).toBe('/meetings?meeting=meeting-1');
    await fireEvent.click(getByText(/Care interactions/));
    expect(getByRole('link', { name: 'View care record' }).getAttribute('href')).toBe('/visitation?care=care-1');
  });
  it('uses current authorized contact rows after an inviter return', () => {
    const saved = { id: 'one', full_name: 'Old private name', contact_date: '2026-01-10' };
    const state = openDrilldown({ kind: 'inviter', title: 'Inviter', rows: [saved, { id: 'removed', full_name: 'Removed person' }], periodLabel: 'Quarter' });
    const ui = render(OutreachDrilldown, { state, rows: [{ id: 'one', full_name: 'Current permitted name', contact_date: '2026-01-10' }] });
    expect(ui.getByRole('dialog')).toHaveTextContent('Current permitted name');
    expect(ui.getByRole('dialog')).not.toHaveTextContent('Old private name');
    expect(ui.getByRole('dialog')).not.toHaveTextContent('Removed person');
    expect(ui.getByRole('dialog')).toHaveTextContent('1 matching contacts');
  });
});

const visits = [
  { id: 'care-1', person_visited_name: 'Alice', visit_date: '2026-03-01', follow_up_required: true, outcome: 'prayer_request_received', notes: 'Private permitted note' },
  { id: 'care-2', person_visited_name: 'Bob', visit_date: '2026-03-01', follow_up_required: false },
];
describe('care drilldown', () => {
  it('moves day to dedicated detail and Back in one dialog', async () => {
    const { getByRole, getAllByRole, queryByText } = render(CareDrilldown, { state: openDrilldown({ kind: 'day', date: '2026-03-01', title: 'Care on 1 March' }), visits });
    expect(getAllByRole('dialog')).toHaveLength(1);
    await fireEvent.click(getAllByRole('button', { name: 'View care record' })[0]);
    expect(getAllByRole('dialog')).toHaveLength(1);
    expect(getByRole('dialog')).toHaveTextContent('Private permitted note');
    expect(queryByText('Bob')).toBeNull();
    await fireEvent.click(getByRole('button', { name: 'Back to previous details' }));
    expect(getByRole('dialog')).toHaveTextContent('Bob');
  });
  it('uses the follow-up flag and eligible elapsed-day denominator', () => {
    const selected = careContributions(visits, { metricKey: 'followUp', mode: 'average', scopeBounds: { startDate: '2026-03-01', endDate: '2026-03-03' } }, '2026-03-03');
    expect(selected.rows.map(row => row.id)).toEqual(['care-1']);
    expect(selected.denominator).toBe(3);
    expect(selected.displayed).toBe(0.3);
  });
  it('rejects a missing exact care ID', () => {
    const { getByRole } = render(CareDrilldown, { state: openDrilldown({ kind: 'care', id: 'missing', title: 'Care' }), visits });
    expect(getByRole('status')).toHaveTextContent('unavailable or restricted');
  });
});
