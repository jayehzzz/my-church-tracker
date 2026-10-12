import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ServiceForm from './ServiceForm.svelte';
import { suggestedSundayDate } from '$lib/utils/serviceRecording.js';
import * as followUpCrm from '$lib/services/followUpCrmService.js';
import * as attendance from '$lib/services/attendanceService';
import * as services from '$lib/services/servicesService';
import * as templates from '$lib/services/serviceTemplatesService.js';

vi.mock('svelte/transition', () => ({ fade: () => ({}), fly: () => ({}), scale: () => ({}) }));
vi.mock('$lib/services/followUpCrmService.js', () => ({ getDashboard: vi.fn() }));
vi.mock('$lib/services/servicesService', () => ({ record: vi.fn() }));
vi.mock('$lib/services/serviceTemplatesService.js', () => ({ get: vi.fn() }));
vi.mock('$lib/services/peopleService', () => ({ getAll: vi.fn(async () => ({ data: [{ id: 'usual', first_name: 'Usual', last_name: 'Guest', member_status: 'guest' }, { id: 'other', first_name: 'Other', last_name: 'Member', member_status: 'member' }] })) }));
vi.mock('$lib/services/attendanceService', () => ({ getAttendanceHistory: vi.fn(async () => ({ data: {} })), getByService: vi.fn(async () => ({ data: [] })) }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  templates.get.mockResolvedValue({ data: null });
  followUpCrm.getDashboard.mockReset();
  attendance.getByService.mockReset();
  followUpCrm.getDashboard.mockResolvedValue({ data: { attendance_forecast: { expected_person_ids: [] } } });
  attendance.getByService.mockResolvedValue({ data: [] });
  services.record.mockResolvedValue({ data: { id: 'saved' } });
});

it('opens a new Sunday service form without entering a reactive update loop', async () => {
  const { getByLabelText, getByRole, queryByText } = render(ServiceForm, { isOpen: true });
  expect(getByRole('heading', { name: 'Set up the service' })).toBeInTheDocument();
  expect(getByLabelText(/Service Date/)).toHaveValue(suggestedSundayDate());
  expect(getByLabelText('Service Type')).toHaveValue('sunday_service');
  await waitFor(() => expect(queryByText('Loading Sunday defaults…')).not.toBeInTheDocument());
});

it('loads Sunday setup and keeps the usual list available without checking it in automatically', async () => {
  templates.get.mockResolvedValue({ data: { service_time: '10:30', location: 'Usual hall', expected_person_ids: ['usual'] } });
  const view = render(ServiceForm, { isOpen: true });
  await waitFor(() => expect(view.getByLabelText('Location')).toHaveValue('Usual hall'));
  expect(view.getByLabelText('Start Time')).toHaveValue('10:30');
  await fireEvent.click(view.getByRole('button', { name: /2 Attendance/ }));
  await waitFor(() => expect(view.getByRole('button', { name: 'Review service', exact: true })).toBeEnabled());
  await fireEvent.click(view.getByRole('button', { name: 'Usual people' }));
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

it('preselects the confirmed checklist, allows unticking, and saves only the final actual attendees', async () => {
  followUpCrm.getDashboard.mockResolvedValue({ data: { attendance_forecast: { expected_person_ids: ['usual', 'other', 'usual', 'unavailable'] } } });
  const view = render(ServiceForm, { isOpen: true });
  await waitFor(() => expect(view.queryByText('Loading Sunday defaults…')).not.toBeInTheDocument());
  const day = view.getByLabelText(/Service Date/).value;
  await fireEvent.click(view.getByRole('button', { name: /2 Attendance/ }));
  const guest = await view.findByRole('button', { name: 'Usual Guest Non-member profile' });
  expect(followUpCrm.getDashboard).toHaveBeenCalledWith({ serviceDate: day });
  expect(guest).toHaveAttribute('aria-pressed', 'true');
  expect(view.getByRole('button', { name: 'Other Member Member' })).toHaveAttribute('aria-pressed', 'true');
  expect(view.getByRole('button', { name: 'Confirmed (2)' })).toBeInTheDocument();
  expect(services.record).not.toHaveBeenCalled();
  await fireEvent.click(guest);
  await fireEvent.click(view.getByRole('button', { name: 'Review service', exact: true }));
  await fireEvent.click(view.getByRole('button', { name: 'Record service', exact: true }));
  await waitFor(() => expect(services.record).toHaveBeenCalledWith(expect.objectContaining({ service_date: day, total_attendance: 1, guests_count: 0, attendanceData: [{ person_id: 'other', gave_tithe: false, made_salvation_decision: false, first_timer: false, explicit_first_visit: false }] })));
});

it('preserves saved actual check-ins when editing instead of applying Sunday confirmations', async () => {
  attendance.getByService.mockResolvedValue({ data: [{ person_id: 'other', gave_tithe: true }] });
  const view = render(ServiceForm, { isOpen: true, service: { id: 'existing', service_date: '2026-10-11', total_attendance: 1, guests_count: 0, tithers_count: 1 } });
  await fireEvent.click(view.getByRole('button', { name: /2 Attendance/ }));
  expect(await view.findByRole('button', { name: 'Other Member Member' })).toHaveAttribute('aria-pressed', 'true');
  expect(followUpCrm.getDashboard).not.toHaveBeenCalled();
  expect(view.queryByRole('button', { name: 'Confirmed (0)' })).not.toBeInTheDocument();
  await fireEvent.click(view.getByRole('button', { name: 'Review service', exact: true }));
  await fireEvent.click(view.getByRole('button', { name: 'Save service record', exact: true }));
  await waitFor(() => expect(services.record).toHaveBeenCalledWith(expect.objectContaining({ id: 'existing', attendanceData: [expect.objectContaining({ person_id: 'other', gave_tithe: true })] })));
});

it('reloads confirmations for a changed Sunday and clears the earlier draft selection', async () => {
  followUpCrm.getDashboard.mockResolvedValueOnce({ data: { attendance_forecast: { expected_person_ids: ['usual'] } } }).mockResolvedValueOnce({ data: { attendance_forecast: { expected_person_ids: ['other'] } } });
  const view = render(ServiceForm, { isOpen: true });
  await waitFor(() => expect(view.queryByText('Loading Sunday defaults…')).not.toBeInTheDocument());
  await fireEvent.click(view.getByRole('button', { name: /2 Attendance/ }));
  expect(await view.findByRole('button', { name: 'Usual Guest Non-member profile' })).toHaveAttribute('aria-pressed', 'true');
  await fireEvent.click(view.getByRole('button', { name: /Setup/ }));
  await fireEvent.input(view.getByLabelText(/Service Date/), { target: { value: '2026-10-04' } });
  await fireEvent.change(view.getByLabelText(/Service Date/));
  await fireEvent.click(view.getByRole('button', { name: /2 Attendance/ }));
  expect(await view.findByRole('button', { name: 'Other Member Member' })).toHaveAttribute('aria-pressed', 'true');
  expect(followUpCrm.getDashboard).toHaveBeenLastCalledWith({ serviceDate: '2026-10-04' });
  await fireEvent.click(view.getByRole('button', { name: 'Everyone', exact: true }));
  expect(view.getByRole('button', { name: 'Usual Guest Non-member profile' })).toHaveAttribute('aria-pressed', 'false');
});

it('reports a confirmation failure and leaves an unselected directory for manual recording', async () => {
  followUpCrm.getDashboard.mockResolvedValue({ error: new Error('offline') });
  const view = render(ServiceForm, { isOpen: true });
  await waitFor(() => expect(view.queryByText('Loading Sunday defaults…')).not.toBeInTheDocument());
  await fireEvent.click(view.getByRole('button', { name: /2 Attendance/ }));
  expect(await view.findByText('Sunday confirmations could not be loaded. No one has been preselected.')).toBeInTheDocument();
  expect(view.getByRole('button', { name: 'Usual Guest Non-member profile' })).toHaveAttribute('aria-pressed', 'false');
});

it('waits for the confirmation checklist before allowing review and save', async () => {
  let finish;
  followUpCrm.getDashboard.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const view = render(ServiceForm, { isOpen: true });
  await waitFor(() => expect(view.queryByText('Loading Sunday defaults…')).not.toBeInTheDocument());
  await fireEvent.click(view.getByRole('button', { name: /2 Attendance/ }));
  await waitFor(() => expect(followUpCrm.getDashboard).toHaveBeenCalled());
  expect(view.getByRole('button', { name: 'Review service', exact: true })).toBeDisabled();
  await fireEvent.click(view.getByRole('button', { name: /3 Review & save/ }));
  expect(view.queryByRole('button', { name: 'Record service', exact: true })).not.toBeInTheDocument();
  finish({ data: { attendance_forecast: { expected_person_ids: ['other'] } } });
  expect(await view.findByRole('button', { name: 'Other Member Member' })).toHaveAttribute('aria-pressed', 'true');
});

it('blocks saving when existing attendance fails to load and supports retry', async () => {
  attendance.getByService.mockResolvedValueOnce({ error: new Error('offline') }).mockResolvedValueOnce({ data: [{ person_id: 'other' }] });
  const view = render(ServiceForm, { isOpen: true, service: { id: 'existing', service_date: '2026-10-11' } });
  await fireEvent.click(view.getByRole('button', { name: /3 Review & save/ }));
  expect(await view.findByRole('button', { name: 'Retry attendance' })).toBeInTheDocument();
  expect(view.queryByRole('button', { name: 'Save service record' })).not.toBeInTheDocument();
  expect(services.record).not.toHaveBeenCalled();
  await fireEvent.click(view.getByRole('button', { name: 'Retry attendance' }));
  expect(await view.findByRole('button', { name: 'Other Member Member' })).toHaveAttribute('aria-pressed', 'true');
});
