import { recordedAttendance, attendanceDate } from './peopleView.js';
import { isPrayerMeeting } from './reportingMetrics.js';
import { normalizeCompletedSchools } from './personMetrics.js';

const DAY = 86400000;
const dateKey = date => date.toISOString().slice(0, 10);
const parseDate = value => {
  const key = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return '';
  const parsed = new Date(`${key}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && dateKey(parsed) === key ? key : '';
};

export function isChurchWorker(person) {
  return person?.member_status !== 'archived' && Boolean(
    person?.member_status === 'leader' || person?.church_role === 'basonta'
    || ['basonta_leader', 'bacenta_leader'].includes(person?.role)
    || person?.basontas?.length,
  );
}

/** Whole Monday–Sunday weeks, excluding the current incomplete week. */
export function participationPeriod(now = new Date(), weeks = 12) {
  const monday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const start = new Date(monday.getTime() - weeks * 7 * DAY);
  return { start: dateKey(start), end: dateKey(new Date(monday.getTime() - DAY)), weeks };
}

export function buildParticipationProfile({ attendance = [], contacts = [], person = {}, errors = {}, now = new Date(), weeks = 12 } = {}) {
  const period = participationPeriod(now, weeks);
  const inPeriod = value => {
    const date = parseDate(value);
    return Boolean(date && date >= period.start && date <= period.end);
  };
  const weekOf = value => Math.floor((Date.parse(`${parseDate(value)}T00:00:00Z`) - Date.parse(`${period.start}T00:00:00Z`)) / (7 * DAY));
  const records = recordedAttendance(attendance, now).filter(record => inPeriod(attendanceDate(record)));
  const axes = [
    { key: 'sunday', label: 'Sunday services', shortLabel: 'Sunday', matches: r => !r.meeting && (r.services?.service_type === 'sunday_service' || (r.services?.service_type === 'special_service' && new Date(`${attendanceDate(r)}T00:00:00Z`).getUTCDay() === 0)) },
    { key: 'prayer', label: 'Prayer meetings', shortLabel: 'Prayer', matches: r => Boolean(r.meeting && isPrayerMeeting(r.meeting)) },
    { key: 'bacenta', label: 'Bacenta meetings', shortLabel: 'Bacenta', matches: r => Boolean(r.meeting && (r.meeting.program?.category === 'bacenta' || r.meeting.category === 'bacenta' || r.meeting.meeting_type === 'bacenta')) },
    { key: 'workers', label: 'Workers’ meetings', shortLabel: 'Workers', matches: r => Boolean(r.meeting && (r.meeting.program?.category === 'workers' || r.meeting.category === 'workers' || r.meeting.meeting_type === 'workers_meeting')) },
  ].map(({ matches, ...axis }) => {
    const matching = records.filter(matches);
    const count = new Set(matching.map(r => weekOf(attendanceDate(r)))).size;
    return { ...axis, weeks: errors.attendance ? null : count, events: errors.attendance ? null : matching.length, lastDate: matching.length ? attendanceDate(matching[0]) : null };
  });
  // An inviter link is evidence of a recorded contact, not proof of a subsequent church attendance.
  const invitations = [...new Map(contacts.map((c, index) => [c.id || c._id || `row-${index}`, c])).values()]
    .filter(contact => inPeriod(contact.contact_date));
  const titheDates = [...new Set(records.filter(r => r.gave_tithe === true).map(attendanceDate))].sort();
  return {
    period, axes,
    invitations: errors.outreach ? null : { people: invitations.length, weeks: new Set(invitations.map(c => weekOf(c.contact_date))).size, undated: contacts.filter(c => !parseDate(c.contact_date)).length },
    tithing: errors.attendance ? null : { dates: titheDates, months: new Set(titheDates.map(date => date.slice(0, 7))).size },
    schools: normalizeCompletedSchools(person.completed_schools || []),
  };
}
