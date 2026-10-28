import { isCompletedService } from './reportingMetrics.js';

const id = value => String(value?.id ?? value?._id ?? value ?? '');
const date = value => String(value || '').slice(0, 10);
export const isAttendanceAbsence = status => ['missed', 'no-show'].includes(status.state);

/** A register absence is distinct from an explicitly resolved Sunday promise. */
export function weeklyAttendanceStatus(person, service, services = [], commitments = [], now = new Date()) {
  const personId = id(person);
  const attended = item => (item.individuals || []).some(attendee => id(attendee) === personId);
  let state = 'not-expected';
  if (isCompletedService(service, now)) {
    if (attended(service)) state = 'present';
    else if (commitments.some(row => id(row.person_id) === personId && row.gathering_type === 'sunday_service'
      && row.gathering_date === date(service.service_date) && row.response === 'yes' && row.resolution === 'no_show')) state = 'no-show';
    else if (service.individuals?.length) {
      // Imports often have a recent created_at but much older attendance. Prefer
      // membership or recorded visit evidence; never infer pre-joining absences.
      const firstRecordedVisit = services.filter(item => isCompletedService(item, now) && attended(item)).map(item => date(item.service_date)).sort()[0];
      const trackedSince = date(person.membership_date) || [date(person.first_visit_date), firstRecordedVisit].filter(Boolean).sort()[0] || date(person.created_at);
      if (trackedSince && date(service.service_date) >= trackedSince) state = 'missed';
    }
  }
  return { state, service };
}
