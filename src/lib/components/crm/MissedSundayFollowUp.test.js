import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import MissedSundayFollowUp from './MissedSundayFollowUp.svelte';

const person = { _id: 'person-1', name: 'Jamie Person', member_status: 'guest' };
const worker = { name: 'Worker One' };
const history = [{
  person_id: 'person-1', person, assigned_leader: worker, assigned_leader_id: 'worker-1',
  missed_count: 2, decided_count: 3,
  missed_sundays: [
    { _id: 'miss-1', gathering_date: '2026-09-20', resolution_note: 'Not in the recorded Sunday attendance.' },
    { _id: 'miss-2', gathering_date: '2026-09-06', resolution_note: 'Transport fell through' },
  ],
  next_task: { _id: 'task-1', task_type: 'follow_up', due_date: '2026-09-25' },
}];

describe('MissedSundayFollowUp', () => {
  it('shows recent pattern, recorded context, assigned worker, and existing task without another schedule action', async () => {
    const onEditReason = vi.fn();
    const view = render(MissedSundayFollowUp, { history, today: '2026-09-24', onEditReason });
    expect(view.getByText(/Missed 2 Sundays in the last four completed Sundays/)).toBeInTheDocument();
    expect(view.getByText('Reason: Reason not recorded')).toBeInTheDocument();
    expect(view.getByText(/Worker: Worker One · follow up due 25 Sept 2026/)).toBeInTheDocument();
    expect(view.queryByRole('button', { name: 'Plan a call' })).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Add reason' }));
    expect(onEditReason).toHaveBeenCalledWith(history[0].missed_sundays[0]);
  });

  it('filters repeated misses by distinct Sundays in the recent window', async () => {
    const oneMiss = { ...history[0], person_id: 'person-2', person: { name: 'Alex Person' }, missed_sundays: [{ _id: 'miss-3', gathering_date: '2026-09-20' }] };
    const view = render(MissedSundayFollowUp, { history: [history[0], oneMiss], today: '2026-09-24' });
    await fireEvent.click(view.getByRole('button', { name: 'Repeated misses' }));
    expect(view.getByRole('button', { name: 'Jamie Person' })).toBeInTheDocument();
    expect(view.queryByRole('button', { name: 'Alex Person' })).toBeNull();
  });

  it('searches older missed Sundays by person and date and lets the worker plan an optional call', async () => {
    const onPlanCall = vi.fn();
    const rows = [{ ...history[0], next_task: null }];
    const view = render(MissedSundayFollowUp, { history: rows, today: '2026-09-24', onPlanCall });
    await fireEvent.click(view.getByRole('button', { name: 'History' }));
    await fireEvent.input(view.getByRole('searchbox', { name: 'Search missed Sunday history' }), { target: { value: '2026-09-06' } });
    await waitFor(() => expect(view.queryByText('Reason: Reason not recorded')).toBeNull());
    expect(view.getByText('Reason: Transport fell through')).toBeInTheDocument();
    expect(view.queryByText('Reason: Reason not recorded')).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Recent' }));
    await fireEvent.click(view.getByRole('button', { name: 'Plan a call' }));
    expect(onPlanCall).toHaveBeenCalledWith(rows[0]);
  });
});
