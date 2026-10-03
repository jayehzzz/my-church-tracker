import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import SundayConfirmationList from './SundayConfirmationList.svelte';

const rows = [
  { _id: 'member', name: 'Ama Member', member_status: 'member', assigned_leader_id: 'leader', assigned_leader_name: 'Kojo Leader', sunday_response: 'not_contacted' },
  { _id: 'guest', name: 'Grace Contact', member_status: 'contact', assigned_leader_id: 'leader', assigned_leader_name: 'Kojo Leader', sunday_response: 'maybe', response_note: 'Checking transport', response_note_at: '2026-10-02T10:00:00Z' },
  { _id: 'unassigned', name: 'Unassigned Member', member_status: 'member', sunday_response: 'not_contacted' },
];
describe('Sunday responsibility list', () => {
  it('shows responses and owner assignment gaps, and filters people who still need contact', async () => {
    const onAssignments = vi.fn();
    const { getByText, getByRole, queryByRole } = render(SundayConfirmationList, { rows, serviceDate: '2026-10-04', canDelegate: true, onAssignments });
    expect(getByText('Not contacted: 2')).toBeDefined();
    expect(getByText('Maybe: 1')).toBeDefined();
    expect(getByText('Needs assignment: 1')).toBeDefined();
    expect(getByText(/2 Oct 2026 · Checking transport/)).toBeDefined();
    await fireEvent.change(getByRole('combobox', { name: 'Sunday response filter' }), { target: { value: 'not_contacted' } });
    expect(queryByRole('button', { name: 'Grace Contact' })).toBeNull();
    expect(queryByRole('button', { name: 'Record response for Unassigned Member' })).toBeNull();
    await fireEvent.click(getByRole('button', { name: 'Review assignments' })); expect(onAssignments).toHaveBeenCalled();
  });
  it('records a dated Maybe with a note, retains save errors and offers history/correction separately', async () => {
    const onRespond = vi.fn().mockResolvedValueOnce({ error: new Error('Assignment changed. Reload.') }).mockResolvedValueOnce({ error: null });
    const { getByRole, getByText, queryByRole } = render(SundayConfirmationList, { rows, serviceDate: '2026-10-04', onRespond });
    await fireEvent.click(getByRole('button', { name: 'Record response for Ama Member' }));
    await fireEvent.change(getByRole('combobox', { name: 'Response' }), { target: { value: 'maybe' } });
    await fireEvent.input(getByRole('textbox', { name: 'Note or reason (optional)' }), { target: { value: 'May be working' } });
    await fireEvent.click(getByRole('button', { name: 'Save response' }));
    await waitFor(() => expect(getByText('Assignment changed. Reload.')).toBeDefined());
    expect(onRespond).toHaveBeenCalledWith(rows[0], 'maybe', 'May be working');
    expect(queryByRole('button', { name: 'Attended' })).toBeNull();
    await fireEvent.click(getByRole('button', { name: 'Save response' }));
    await waitFor(() => expect(queryByRole('dialog')).toBeNull());
  });
  it('prevents responses for resolved and restricted people without exposing owner controls to leaders', () => {
    const { queryByRole, getByText } = render(SundayConfirmationList, { rows: [
      { ...rows[0], actual_result: 'attended', sunday_response: 'yes' },
      { ...rows[1], contact_blocked: true },
    ], serviceDate: '2026-10-04' });
    expect(queryByRole('button', { name: /Record response/ })).toBeNull();
    expect(queryByRole('button', { name: 'Review assignments' })).toBeNull();
    expect(getByText(/Actual result: Attended/)).toBeDefined();
    expect(getByText('Asked not to be contacted.')).toBeDefined();
  });
});
