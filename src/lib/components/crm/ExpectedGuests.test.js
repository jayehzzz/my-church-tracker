import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import ExpectedGuests from './ExpectedGuests.svelte';
import { getAssignmentDirectory, saveExpectedGuest, getGatheringChoices } from '$lib/services/followUpCrmService.js';
vi.mock('$lib/services/followUpCrmService.js', () => ({ getAssignmentDirectory: vi.fn(), saveExpectedGuest: vi.fn(), getGatheringChoices: vi.fn() }));
const row = { _id: 'invite', version: '0:stamp', service_date: '2026-10-04', name_unknown: true, inviter_id: 'layla', inviter_name: 'Practice Layla', display_name: "Practice Layla's friend", friend_number: 1, report_source: 'inviter_report', state: 'coming', history: [{ at: '2026-10-03', action: 'invitation_added' }] };
beforeEach(() => {
  getAssignmentDirectory.mockResolvedValue({ data: [{ _id: 'layla', name: 'Practice Layla', member_status: 'member' }, { _id: 'nia', name: 'Practice Nia', member_status: 'guest' }, { _id: 'leader', name: 'Practice Leader', member_status: 'leader' }] });
  saveExpectedGuest.mockResolvedValue({ data: { _id: 'saved' } }); getGatheringChoices.mockResolvedValue({ data: [] });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('expected guest invitations', () => {
  it('saves an unknown friend as an inviter report without invented names or contact date', async () => {
    const changed = vi.fn();
    render(ExpectedGuests, { rows: [], serviceDate: '2026-10-04', canManage: true, today: '2026-10-03', onChanged: changed });
    await fireEvent.click(screen.getByRole('button', { name: 'Add expected guest' }));
    await screen.findByRole('option', { name: 'Practice Layla' });
    await fireEvent.click(screen.getByLabelText('Name not known yet'));
    expect(screen.queryByLabelText('Guest first name')).not.toBeInTheDocument();
    await fireEvent.change(screen.getByLabelText('Inviter'), { target: { value: 'layla' } });
    await fireEvent.change(screen.getByLabelText('Invitation status'), { target: { value: 'coming' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save invitation' }));
    await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
    expect(saveExpectedGuest).toHaveBeenCalledWith('create', expect.objectContaining({ nameUnknown: true, inviterId: 'layla', firstName: undefined, lastName: undefined, serviceDate: '2026-10-04', state: 'coming', reportSource: 'inviter_report' }));
    expect(saveExpectedGuest.mock.calls[0][1]).not.toHaveProperty('contactDate');
  });
  it('shows distinct source and tentative counts, preserves history, and hides actual attendance for an unknown guest', async () => {
    render(ExpectedGuests, { rows: [row, { ...row, _id: 'second', friend_number: 2, display_name: "Practice Layla's friend 2", state: 'tentative' }], serviceDate: '2026-10-04', today: '2026-10-11', canManage: true, forecast: { tentative_guest_count: 1, additional_expected_guests: 1 } });
    expect(screen.getByText("Practice Layla's friend")).toBeInTheDocument();
    expect(screen.getByText("Practice Layla's friend 2")).toBeInTheDocument();
    expect(screen.getByText(/1 reported coming · 1 tentative/)).toBeInTheDocument();
    expect(screen.getAllByText(/this invitation records no conversation with the guest/)).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Record actual attendance' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Invitation history (1)')).toHaveLength(2);
  });
  it('links an existing person using the reviewed invitation version and retains a failed request for retry', async () => {
    saveExpectedGuest.mockResolvedValueOnce({ error: new Error('Invitation changed. Reload before saving') });
    render(ExpectedGuests, { rows: [row], serviceDate: '2026-10-04', canManage: true });
    await fireEvent.click(screen.getByRole('button', { name: 'Link or create person' }));
    await screen.findByRole('option', { name: 'Practice Nia' });
    expect(screen.queryByRole('option', { name: /Create a person/ })).not.toBeInTheDocument();
    await fireEvent.change(screen.getByLabelText('Existing person or new record'), { target: { value: 'nia' } });
    await fireEvent.input(screen.getByLabelText('Reason for this change'), { target: { value: 'Owner identified the existing guest' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save change' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invitation changed');
    expect(saveExpectedGuest).toHaveBeenCalledWith('link', { invitationId: 'invite', expectedVersion: '0:stamp', personId: 'nia', changeReason: 'Owner identified the existing guest' });
  });
  it('gives a leader a read-only invitation list and reports an unavailable backend explicitly', () => {
    const { rerender } = render(ExpectedGuests, { rows: [row], serviceDate: '2026-10-04' });
    expect(screen.queryByRole('button', { name: 'Add expected guest' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit details or status' })).not.toBeInTheDocument();
    return rerender({ rows: null }).then(() => expect(screen.getByRole('alert')).toHaveTextContent('unavailable'));
  });
});
