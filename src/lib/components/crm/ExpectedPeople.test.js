import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import ExpectedPeople from './ExpectedPeople.svelte';
afterEach(cleanup);

const person = { id: 'p1', first_name: 'Ama', last_name: 'Mensah', assigned_leader: { first_name: 'Kojo', last_name: 'Leader' } };
const guest = { id: 'g1', name_unknown: true, inviter_name: 'Layla', friend_number: 2, state: 'coming', leader_name: 'Kojo Leader' };
const workspace = {
  service_date: '2026-10-18', attendance_roster: [person],
  sunday_commitments: [{ person_id: 'p1', person, response: 'yes', resolution: 'pending' }],
  guest_invitations: [guest, { id: 'g2', person_id: 'p1', person, state: 'coming' }, { id: 'tentative', first_name: 'Tentative', state: 'tentative' }],
  attendance_forecast: { expected_total: 2, expected_person_ids: ['p1'], expected_guest_invitation_ids: ['g1'] },
};

it('shows each forecast person once with confirmation provenance and opens relevant details', async () => {
  const onOpen = vi.fn(), onManageInvitation = vi.fn();
  const view = render(ExpectedPeople, { workspace, onOpen, onManageInvitation });
  expect(view.getAllByRole('listitem')).toHaveLength(2);
  expect(view.getByText('Personally confirmed')).toBeInTheDocument();
  expect(view.getByText('Reported coming')).toBeInTheDocument();
  expect(view.queryByText('Tentative')).not.toBeInTheDocument();
  await fireEvent.click(view.getByRole('button', { name: 'Ama Mensah' }));
  expect(onOpen).toHaveBeenCalledWith(person);
  await fireEvent.click(view.getByRole('button', { name: "Layla's friend 2" }));
  expect(view.getByText('Name and details pending.')).toBeInTheDocument();
  await fireEvent.click(view.getByRole('button', { name: 'Edit invitation' }));
  expect(onManageInvitation).toHaveBeenCalledWith(expect.objectContaining({ id: 'g1' }));
});

it('updates the list and count as search, Sunday and shared data change', async () => {
  const onNext = vi.fn(), onDateChange = vi.fn();
  const view = render(ExpectedPeople, { workspace, onNext, onDateChange });
  await fireEvent.input(view.getByRole('searchbox'), { target: { value: 'Layla' } });
  expect(view.getByRole('status', { name: 'Expected people count' })).toHaveTextContent('1 of 2 people expected');
  expect(view.queryByRole('button', { name: 'Ama Mensah' })).not.toBeInTheDocument();
  await fireEvent.click(view.getByRole('button', { name: 'Next Sunday' }));
  expect(onNext).toHaveBeenCalledOnce();
  await fireEvent.change(view.getByLabelText('Expected Sunday date'), { target: { value: '2026-10-25' } });
  expect(onDateChange).toHaveBeenCalledWith('2026-10-25');
  await view.rerender({ workspace: { ...workspace, guest_invitations: [], attendance_forecast: { expected_total: 1, expected_person_ids: ['p1'], expected_guest_invitation_ids: [] } } });
  await fireEvent.input(view.getByRole('searchbox'), { target: { value: '' } });
  expect(view.getByRole('status', { name: 'Expected people count' })).toHaveTextContent('1 person expected');
  expect(view.queryByRole('button', { name: "Layla's friend 2" })).not.toBeInTheDocument();
});

it('shows unavailable forecast evidence honestly and never offers a fabricated profile', () => {
  const view = render(ExpectedPeople, { workspace: {} });
  expect(view.getByRole('alert')).toHaveTextContent('could not be verified');
  expect(view.queryByRole('button', { name: 'View person' })).not.toBeInTheDocument();
});
