import { it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import { session } from '$lib/auth/session.js';
import PersonForm from '../forms/PersonForm.svelte';
import * as peopleService from '$lib/services/peopleService';
vi.mock('$lib/services/peopleService', () => ({
  findDuplicates: vi.fn(async () => ({ data: [], error: null })),
  update: vi.fn(async (id, data) => ({ data: { id, ...data }, error: null })),
}));
vi.mock("svelte/transition", () => ({ fade: () => ({}), fly: () => ({}), scale: () => ({}) }));
beforeEach(() => { vi.clearAllMocks(); session.set({ status: 'authenticated', user: { role: 'owner', canViewConfidential: true } }); });
afterEach(cleanup);

it('saves profile notes through the person service while retaining existing contact details', async () => {
  const person = { id: '1', first_name: 'Anne', last_name: 'Jones', email: 'anne@example.com', phone: '07700123456', notes: 'Original note' };
  const onsave = vi.fn();
  const { getByLabelText, getByRole } = render(PersonForm, { isOpen: true, person, onsave });
  expect(getByLabelText('Email').value).toBe(person.email);
  expect(getByLabelText('Phone').value).toBe(person.phone);
  await fireEvent.input(getByLabelText('Notes'), { target: { value: 'Updated note' } });
  await fireEvent.click(getByRole('button', { name: 'Save Changes' }));
  await waitFor(() => expect(peopleService.update).toHaveBeenCalledWith('1', expect.objectContaining({ notes: 'Updated note', email: person.email, phone: person.phone })));
  expect(onsave).toHaveBeenCalled();
});


it('does not display or submit giving and private notes for a restricted leader', async () => {
  session.set({ status: 'authenticated', user: { role: 'leader', canViewConfidential: false } });
  const person = { id: '2', first_name: 'Anne', last_name: 'Jones', phone: '07700123456' };
  const { queryByLabelText, queryByText, getByRole } = render(PersonForm, { isOpen: true, person });
  expect(queryByLabelText('Notes')).toBeNull();
  expect(queryByText('Tithe Payer')).toBeNull();
  await fireEvent.click(getByRole('button', { name: 'Save Changes' }));
  await waitFor(() => expect(peopleService.update).toHaveBeenCalled());
  const payload = peopleService.update.mock.calls[0][1];
  expect(payload).not.toHaveProperty('is_tither');
  expect(payload).not.toHaveProperty('notes');
});
