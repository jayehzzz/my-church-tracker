import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ServiceForm from './ServiceForm.svelte';
import { suggestedSundayDate } from '$lib/utils/serviceRecording.js';
import * as templates from '$lib/services/serviceTemplatesService.js';

vi.mock('svelte/transition', () => ({ fade: () => ({}), fly: () => ({}), scale: () => ({}) }));
vi.mock('$lib/services/serviceTemplatesService.js', () => ({ get: vi.fn() }));
vi.mock('$lib/services/peopleService', () => ({ getAll: vi.fn(async () => ({ data: [{ id: 'usual', first_name: 'Usual', last_name: 'Guest', member_status: 'guest' }, { id: 'other', first_name: 'Other', last_name: 'Member', member_status: 'member' }] })) }));
vi.mock('$lib/services/attendanceService', () => ({ getAttendanceHistory: vi.fn(async () => ({ data: {} })), getByService: vi.fn(async () => ({ data: [] })) }));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); templates.get.mockResolvedValue({ data: null }); });

it('opens a new Sunday service form without entering a reactive update loop', async () => {
  const { getByLabelText, getByRole, queryByText } = render(ServiceForm, { isOpen: true });
  expect(getByRole('heading', { name: 'Set up the service' })).toBeInTheDocument();
  expect(getByLabelText(/Service Date/)).toHaveValue(suggestedSundayDate());
  expect(getByLabelText('Service Type')).toHaveValue('sunday_service');
  await waitFor(() => expect(queryByText('Loading Sunday defaults…')).not.toBeInTheDocument());
});

it('loads usual guests and setup without checking anyone in, and allows the full directory', async () => {
  templates.get.mockResolvedValue({ data: { service_time: '10:30', location: 'Usual hall', expected_person_ids: ['usual'] } });
  const view = render(ServiceForm, { isOpen: true });
  await waitFor(() => expect(view.getByLabelText('Location')).toHaveValue('Usual hall'));
  expect(view.getByLabelText('Start Time')).toHaveValue('10:30');
  await fireEvent.click(view.getByRole('button', { name: /2 Attendance/ }));
  const guest = await view.findByRole('button', { name: 'Usual Guest Non-member profile' });
  expect(guest).toHaveAttribute('aria-pressed', 'false');
  expect(view.queryByRole('button', { name: /Other Member Member/ })).not.toBeInTheDocument();
  await fireEvent.click(guest);
  expect(guest).toHaveAttribute('aria-pressed', 'true');
  await fireEvent.click(view.getByRole('button', { name: 'Everyone', exact: true }));
  expect(view.getByRole('button', { name: 'Other Member Member' })).toBeInTheDocument();
});

it('keeps an existing service setup when Sunday defaults are changed', () => {
  const view = render(ServiceForm, { isOpen: true, service: { id: 'existing', service_date: '2026-10-04', service_time: '08:00', location: 'Original venue' } });
  expect(view.getByLabelText('Location')).toHaveValue('Original venue');
  expect(view.getByLabelText('Start Time')).toHaveValue('08:00');
  expect(templates.get).not.toHaveBeenCalled();
});

it('suggests the next Sunday when the most recent Sunday is already recorded', async () => {
  const sunday = suggestedSundayDate();
  const view = render(ServiceForm, { isOpen: true, serviceRecords: [{ service_type: 'sunday_service', service_date: sunday }] });
  expect(view.getByLabelText(/Service Date/)).toHaveValue(suggestedSundayDate([{ service_type: 'sunday_service', service_date: sunday }]));
  await waitFor(() => expect(view.queryByText('Loading Sunday defaults…')).not.toBeInTheDocument());
});

it('keeps an accidental weekday record editable and asks for a Sunday', async () => {
  const view = render(ServiceForm, { isOpen: true, service: { id: 'existing', service_date: '2026-10-12' } });
  await fireEvent.click(view.getByRole('button', { name: /2 Attendance/ }));
  expect(view.getByText('Choose a Sunday for a Sunday service')).toBeInTheDocument();
  await fireEvent.input(view.getByLabelText(/Service Date/), { target: { value: '2026-10-11' } });
  await fireEvent.click(view.getByRole('button', { name: /2 Attendance/ }));
  expect(await view.findByRole('heading', { name: 'Record named attendance' })).toBeInTheDocument();
});
