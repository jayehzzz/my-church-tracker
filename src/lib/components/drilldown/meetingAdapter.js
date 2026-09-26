import { attendanceRecords, attendeeIds, meetingAttendance } from '$lib/utils/meetingAnalytics.js';

export const meetingId = value => String(value?.id ?? value?._id ?? value ?? '');
export const meetingName = meeting => meeting.title || meeting.program?.name || String(meeting.meeting_type || 'Meeting').replaceAll('_', ' ');
export const meetingMetricLabel = key => ({ attendance: 'Attendance', meetingCount: 'Meetings held', uniquePeople: 'Unique named people', firstTimers: 'First timers' })[key] || key;
const recordPersonId = record => String(record.person_id ?? record.person?._id ?? record.person?.id ?? '');

export async function resolveExactMeeting(id, getById) {
  if (!id || !/^[\w-]{1,128}$/.test(id)) return { status: 'unavailable', error: 'Invalid meeting link.', meeting: null };
  const result = await getById(id);
  if (result.error || !result.data || meetingId(result.data) !== id) return { status: 'unavailable', error: result.error?.message || 'Meeting unavailable or restricted.', meeting: null };
  return { status: 'ready', error: '', meeting: result.data };
}

export function selectMeetingContributions(meetings, choice) {
  const ids = new Set((choice?.sourceIds || []).map(String));
  const bounds = choice?.pointBounds || choice?.scopeBounds;
  const rows = meetings.filter(meeting => Array.isArray(choice?.sourceIds)
    ? ids.has(meetingId(meeting))
    : (!choice?.programmeId || choice.programmeId === 'all' || String(meeting.program_id || 'one_off') === String(choice.programmeId)) &&
      (!bounds?.startDate || String(meeting.meeting_date).slice(0, 10) >= bounds.startDate) &&
      (!bounds?.endDate || String(meeting.meeting_date).slice(0, 10) <= bounds.endDate));
  const personIds = [...new Set(rows.flatMap(attendeeIds))];
  const attendanceTotal = rows.reduce((sum, meeting) => sum + meetingAttendance(meeting), 0);
  const total = choice?.metricKey === 'meetingCount' ? rows.length : choice?.metricKey === 'uniquePeople' ? personIds.length : choice?.metricKey === 'firstTimers'
    ? [...new Set(rows.flatMap(meeting => attendanceRecords(meeting).filter(record => record.first_timer).map(recordPersonId).filter(Boolean)))].length : attendanceTotal;
  return { rows, personIds, total, attendanceTotal, displayed: choice?.mode === 'average' && choice?.metricKey === 'attendance' ? (rows.length ? Math.round(attendanceTotal / rows.length * 10) / 10 : 0) : total, denominator: rows.length };
}

export function meetingPeople(meetings, people, metricKey = 'uniquePeople', qualifyingIds = null) {
  const ids = new Set((qualifyingIds || meetings.flatMap(attendeeIds)).map(String));
  return people.filter(person => ids.has(meetingId(person))).map(person => {
    const attended = meetings.filter(meeting => attendeeIds(meeting).includes(meetingId(person)));
    const evidence = attended.flatMap(meeting => attendanceRecords(meeting).filter(record => recordPersonId(record) === meetingId(person)).map(record => ({ meeting, record })));
    const relevant = metricKey === 'firstTimers' || metricKey === 'first_timers' ? evidence.filter(({ record }) => record.first_timer)
      : metricKey === 'programme_firsts' ? evidence.filter(({ record }) => record.first_program_attendance && !record.first_timer)
      : metricKey === 'established' ? evidence.filter(({ record }) => !record.first_timer && !record.first_program_attendance) : evidence;
    return { person, count: attended.length, lastDate: attended.map(meeting => meeting.meeting_date).sort().at(-1), evidence: relevant };
  }).filter(item => !['firstTimers', 'first_timers', 'programme_firsts', 'established'].includes(metricKey) || item.evidence.length);
}
