import { it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import { session } from '$lib/auth/session.js';
import PersonForm from '../forms/PersonForm.svelte';
import * as peopleService from '$lib/services/peopleService';
vi.mock('$lib/services/peopleService', () => ({
  findDuplicates: vi.fn(async () => ({ data: [], error: null })),
  create: vi.fn(async (data) => ({ data: { id: 'created', ...data }, error: null })),
  update: vi.fn(async (id, data) => ({ data: { id, ...data }, error: null })),
}));
vi.mock("svelte/transition", () => ({ fade: () => ({}), fly: () => ({}), scale: () => ({}) }));
beforeEach(() => { vi.clearAllMocks(); session.set({ status: 'authenticated', user: { role: 'owner', canViewConfidential: true } }); });
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

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

it('keeps first capture short and leaves unassessed tither status unrecorded', async () => {
  const { getByLabelText, getByRole, queryByLabelText } = render(PersonForm, { isOpen: true });
  expect(getByLabelText(/First Name/)).toBeTruthy();
  expect(getByLabelText('Email')).toBeTruthy();
  expect(getByLabelText('Church status')).toBeTruthy();
  expect(queryByLabelText('Employment Status')).toBeNull();
  expect(queryByLabelText('Manually recorded tither status')).toBeNull();

  await fireEvent.input(getByLabelText(/First Name/), { target: { value: 'Grace' } });
  await fireEvent.click(getByRole('button', { name: /Add optional profile details/ }));
  expect(getByLabelText('Employment Status')).toBeTruthy();
  expect(getByLabelText('Manually recorded tither status').value).toBe('');
  await fireEvent.click(getByRole('button', { name: 'Add Person' }));
  await waitFor(() => expect(peopleService.create).toHaveBeenCalledWith(expect.objectContaining({ first_name: 'Grace', is_tither: null })));
});

it('keeps first timer out of persistent journey status and separates leadership from Basonta membership', () => {
  const person = { id: 'journey', first_name: 'Anne', last_name: 'Jones', member_status: 'contact' };
  const { getByLabelText, getByText, queryByText } = render(PersonForm, { isOpen: true, person });
  expect(getByLabelText('Church status')).toBeTruthy();
  expect(getByLabelText('Basonta Membership')).toBeTruthy();
  expect(getByText(/Attendance records mark the first visit as First timer/i)).toBeTruthy();
  expect(getByText(/Bacenta Leader and Basonta Leader are leadership roles/i)).toBeTruthy();
  expect(queryByText(/^First Timer$/i)).toBeNull();
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

it('uses an in-app discard confirmation instead of blocking window.confirm', async () => {
  const person = { id: '3', first_name: 'Anne', last_name: 'Jones', address: '1 Old Road', city: 'Luton', zip_code: 'LU1 1AA' };
  const oncancel = vi.fn();
  const confirmSpy = vi.spyOn(window, 'confirm');
  const { getByLabelText, getByRole, queryByRole } = render(PersonForm, { isOpen: true, person, oncancel });

  await fireEvent.input(getByLabelText('House number & street'), { target: { value: '2 New Road' } });
  await fireEvent.click(getByRole('button', { name: 'Cancel' }));

  expect(confirmSpy).not.toHaveBeenCalled();
  expect(getByRole('button', { name: 'Discard changes' })).toBeTruthy();
  expect(getByRole('button', { name: 'Keep editing' })).toBeTruthy();

  await fireEvent.click(getByRole('button', { name: 'Discard changes' }));
  await waitFor(() => expect(queryByRole('dialog')).toBeNull());
  expect(oncancel).toHaveBeenCalledTimes(1);
});

it('searches for an address in-app, applies a chosen result, and saves its map coordinates', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => [{
      display_name: '86, St Catherines Avenue, Luton, LU3 1QQ, United Kingdom',
      lat: '51.8989366',
      lon: '-0.4328127',
      address: {
        house_number: '86',
        road: 'St Catherines Avenue',
        town: 'Luton',
        county: 'Luton',
        postcode: 'LU3 1QQ',
      },
    }],
  })));
  const person = { id: '4', first_name: 'Giselle', last_name: 'Lewis', address: 'St Catherines', city: 'Luton' };
  const onsave = vi.fn();
  const { getByLabelText, getByRole, getByText } = render(PersonForm, { isOpen: true, person, onsave });

  const search = getByLabelText('Search for the correct address');
  await fireEvent.input(search, { target: { value: '86 St Catherines Ave Luton' } });
  await fireEvent.click(getByRole('button', { name: 'Search addresses' }));

  await waitFor(() => expect(getByText('86, St Catherines Avenue, Luton, LU3 1QQ, United Kingdom')).toBeTruthy());
  await fireEvent.click(getByRole('button', { name: 'Use this address' }));

  expect(getByLabelText('House number & street').value).toBe('86 St Catherines Avenue');
  expect(getByLabelText('Town / City').value).toBe('Luton');
  expect(getByLabelText('Postcode').value).toBe('LU3 1QQ');

  await fireEvent.click(getByRole('button', { name: 'Save Changes' }));
  await waitFor(() => expect(peopleService.update).toHaveBeenCalledWith('4', expect.objectContaining({
    address: '86 St Catherines Avenue',
    city: 'Luton',
    zip_code: 'LU3 1QQ',
    lat: 51.8989366,
    lng: -0.4328127,
  })));
  expect(onsave).toHaveBeenCalled();
});

it('offers a fuzzy street correction, keeps the searched house number, and warns that it was not verified', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [{
          geometry: { coordinates: [-0.405, 51.889] },
          properties: {
            type: 'street',
            name: 'Walcot Avenue',
            city: 'Luton',
            county: 'Luton',
            state: 'England',
            country: 'United Kingdom',
            countrycode: 'GB',
            postcode: 'LU2 0PU',
          },
        }],
      }),
    }));

  const person = { id: '5', first_name: 'Anne', last_name: 'Jones' };
  const { getByLabelText, getByRole, getByText } = render(PersonForm, { isOpen: true, person });

  const search = getByLabelText('Search for the correct address');
  await fireEvent.input(search, { target: { value: '89 walcolt avenue luton lu2 0pp' } });
  await fireEvent.click(getByRole('button', { name: 'Search addresses' }));

  await waitFor(() => expect(getByText('Walcot Avenue, Luton, LU2 0PU, United Kingdom')).toBeTruthy());
  expect(getByText('Suggested correction · Street match — house number not verified')).toBeTruthy();

  await fireEvent.click(getByRole('button', { name: 'Use this address' }));

  expect(getByLabelText('House number & street').value).toBe('89 Walcot Avenue');
  expect(getByLabelText('Town / City').value).toBe('Luton');
  expect(getByLabelText('Postcode').value).toBe('LU2 0PU');
  expect(getByText(/house number was kept from your search but was not verified/i)).toBeTruthy();

  await fireEvent.click(getByRole('button', { name: 'Save Changes' }));
  await waitFor(() => expect(peopleService.update).toHaveBeenCalledWith('5', expect.objectContaining({
    address: '89 Walcot Avenue',
    city: 'Luton',
    zip_code: 'LU2 0PU',
    lat: 51.889,
    lng: -0.405,
  })));
});
