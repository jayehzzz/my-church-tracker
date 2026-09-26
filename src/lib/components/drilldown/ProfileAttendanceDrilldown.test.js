import { it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/svelte';
import ProfileAttendanceDrilldown from './ProfileAttendanceDrilldown.svelte';
import { openDrilldown, pushDrilldown } from './selection.js';

afterEach(cleanup);

it('shows the selected person’s meeting evidence before full event details and returns to history', async () => {
  const person = { id: 'p1', first_name: 'Ama', last_name: 'Mensah' };
  const meeting = { id: 'm1', meeting_date: '2026-09-06', title: 'Prayer', status: 'completed', total_attendance: 3, unnamed_guests_count: 2, attendance_records: [{ person_id: 'p1', status: 'present', first_timer: true }] };
  const record = { id: 'r1', meeting, person_id: 'p1', first_timer: true };
  const state = pushDrilldown(openDrilldown({ kind: 'history', title: 'Attendance history' }), { kind: 'event', title: 'Prayer', record });
  const ui = render(ProfileAttendanceDrilldown, { state, history: [record], person, event: meeting, attendees: [{ person_id: 'p1', people: person, status: 'present' }], status: 'ready' });
  expect(ui.getByText('Ama Mensah · recorded participation')).toBeDefined();
  expect(ui.getByText(/First recorded church visit/)).toBeDefined();
  expect(ui.getByText('Unnamed headcount')).toBeDefined();
  await fireEvent.click(ui.getByRole('button', { name: 'Back to previous details' }));
  expect(ui.getByText(/1 recorded gatherings/)).toBeDefined();
});
