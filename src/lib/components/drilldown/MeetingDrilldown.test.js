import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import MeetingBarChart from '../charts/MeetingBarChart.svelte';
import MeetingDrilldown from './MeetingDrilldown.svelte';
import { createChoice, createSelection, openDrilldown } from './selection.js';
import { buildMeetingAnalytics } from '$lib/utils/meetingAnalytics.js';
import { resolveExactMeeting } from './meetingAdapter.js';

afterEach(cleanup);
const people = [
  { id: 'p1', first_name: 'Ama', last_name: 'Mensah' },
  { id: 'p2', first_name: 'Ben', last_name: 'Cole' },
  { id: 'p3', first_name: 'Cara', last_name: 'Jones' },
];
const meetings = [
  { id: 'm1', program_id: 'prayer', meeting_date: '2026-09-06', status: 'completed', total_attendance: 4, unnamed_guests_count: 2, attendance_records: [{ person_id: 'p1', status: 'present', first_timer: true }, { person_id: 'p2', status: 'present' }] },
  { id: 'm2', program_id: 'prayer', meeting_date: '2026-09-13', status: 'completed', total_attendance: 2, attendance_records: [{ person_id: 'p1', status: 'present' }, { person_id: 'p2', status: 'present' }] },
  { id: 'm3', program_id: 'bacenta', meeting_date: '2026-09-20', status: 'completed', total_attendance: 1, attendance_records: [{ person_id: 'p3', status: 'present' }] },
];
const programs = [{ id: 'prayer', name: 'Prayer' }, { id: 'bacenta', name: 'Bacenta' }];

describe('meeting chart to dialog', () => {
  it('keeps selected programme IDs and distinguishes held meetings from unique people', async () => {
    const onDrilldown = vi.fn();
    const ui = render(MeetingBarChart, { data: buildMeetingAnalytics(meetings, programs).programmeData, metricOptions: [
      { key: 'uniquePeople', label: 'Unique people' }, { key: 'meetingCount', label: 'Meetings held' }
    ], onDrilldown });
    await fireEvent.change(ui.getByLabelText('Primary metric'), { target: { value: 'meetingCount' } });
    await fireEvent.click(ui.getByRole('button', { name: /Prayer.*View meeting comparison details/ }));
    const heldChoice = onDrilldown.mock.lastCall[0].choices[0];
    expect(heldChoice.sourceIds).toEqual(['m1', 'm2']);
    let dialog = render(MeetingDrilldown, { state: openDrilldown({ kind: 'selection', title: 'Meetings held', selection: createSelection([heldChoice], 'A') }), meetings, people });
    expect(dialog.getByText('2 held meetings across 2 held meetings')).toBeDefined();
    expect(dialog.getByText('2 matching records')).toBeDefined();
    await fireEvent.click(dialog.getAllByRole('button', { name: 'View meeting' })[0]);
    await waitFor(() => expect(dialog.getByText('Unnamed headcount')).toBeDefined());
    await fireEvent.click(dialog.getByRole('button', { name: 'Back to previous details' }));
    expect(dialog.getByText('2 matching records')).toBeDefined();
    dialog.unmount();

    await fireEvent.change(ui.getByLabelText('Primary metric'), { target: { value: 'uniquePeople' } });
    await fireEvent.click(ui.getByRole('button', { name: /Prayer.*View meeting comparison details/ }));
    const uniqueChoice = onDrilldown.mock.lastCall[0].choices[0];
    dialog = render(MeetingDrilldown, { state: openDrilldown({ kind: 'selection', title: 'Unique people', selection: createSelection([uniqueChoice], 'A') }), meetings, people });
    expect(dialog.getByText('2 distinct linked people across 2 held meetings')).toBeDefined();
    expect(dialog.getAllByText(/2 recorded meetings · last/)).toHaveLength(2);
    expect(dialog.queryByText('Cara Jones')).toBeNull();
  });

  it('renders only first-timer evidence for the canonical firstTimers choice', () => {
    const choice = createChoice({ domain: 'meeting', metricKey: 'firstTimers', point: { date: '2026-09-01', sourcePoints: meetings.map(meeting => ({ id: meeting.id })) } });
    const ui = render(MeetingDrilldown, { state: openDrilldown({ kind: 'selection', title: 'First timers', selection: createSelection([choice], 'A') }), meetings, people });
    expect(ui.getByText('Ama Mensah')).toBeDefined();
    expect(ui.getByText(/evidence: 6 Sept 2026/)).toBeDefined();
    expect(ui.queryByText('Ben Cole')).toBeNull();
    expect(ui.queryByText('Cara Jones')).toBeNull();
  });

  it('rejects invalid or restricted exact links without showing another meeting', async () => {
    const getById = vi.fn(async () => ({ data: null, error: null }));
    const invalid = await resolveExactMeeting('bad!', getById);
    expect(getById).not.toHaveBeenCalled();
    expect(invalid.error).toBe('Invalid meeting link.');
    const missing = await resolveExactMeeting('missing-id', getById);
    expect(missing.status).toBe('unavailable');
    const ui = render(MeetingDrilldown, { state: openDrilldown({ kind: 'meeting', title: 'Meeting details', id: 'missing-id' }), meetings, people, status: missing.status, error: missing.error });
    expect(ui.getByRole('status')).toHaveTextContent('Meeting unavailable or restricted.');
    expect(ui.queryByText('Unnamed headcount')).toBeNull();
  });
});
