import { serviceAttendanceMetrics } from '$lib/utils/serviceAnalytics.js';

export const serviceId = value => String(value?.id ?? value?._id ?? value ?? '');
export const metricKeys = {
  total: 'totalAttendance', attendance: 'totalAttendance', guests: 'guestAttendance', returningGuests: 'returningGuestAttendance',
  returning: 'returningGuestAttendance', firstTimers: 'firstTimers', first: 'firstTimers',
  unclassifiedNonMembers: 'unclassifiedNonMemberAttendance', unknown: 'unclassifiedNonMemberAttendance',
  members: 'memberAttendance', decisions: 'decisions', tithers: 'tithers'
};
export const metricLabels = {
  total: 'Attendance', attendance: 'Attendance', guests: 'Non-member visits', returningGuests: 'Returning guest visits',
  returning: 'Returning guest visits', firstTimers: 'First-timer visits', first: 'First-timer visits',
  unclassifiedNonMembers: 'Unclassified non-member visits', unknown: 'Unclassified non-member visits', members: 'Member attendances',
  decisions: 'Salvation decisions', tithers: 'Tither attendances'
};

export function serviceContribution(service, metricKey, attendance = [], people = []) {
  return serviceAttendanceMetrics(service, attendance, people)[metricKeys[metricKey] || metricKey] ?? 0;
}

export function selectServiceContributions(services, choice, attendance = [], people = []) {
  const ids = new Set((choice?.sourceIds || []).map(serviceId));
  const bounds = choice?.scopeBounds || choice?.pointBounds;
  const selected = services.filter(service => Array.isArray(choice?.sourceIds)
    ? ids.has(serviceId(service))
    : !bounds?.startDate || (String(service.service_date).slice(0, 10) >= bounds.startDate && String(service.service_date).slice(0, 10) <= bounds.endDate));
  const rows = selected.map(service => ({ service, contribution: serviceContribution(service, choice.metricKey, attendance, people) }));
  const total = rows.reduce((sum, row) => sum + row.contribution, 0);
  const displayed = choice.mode === 'average' ? (rows.length ? Math.round((total / rows.length) * 10) / 10 : 0) : total;
  return { rows, total, displayed, denominator: rows.length };
}

export function namedServicePeople(service, metricKey, attendance = [], people = [], canViewConfidential = false) {
  const id = serviceId(service);
  const byId = new Map(people.map(person => [serviceId(person), person]));
  const rows = new Map();
  for (const row of attendance.filter(row => serviceId(row.service_id) === id)) rows.set(serviceId(row.person_id), row);
  const named = new Set([...(service.individuals || []).map(serviceId), ...rows.keys()]);
  return [...named].map(personId => {
    const row = rows.get(personId);
    const person = row?.people || byId.get(personId) || (service.individuals || []).find(item => serviceId(item) === personId && typeof item === 'object');
    return { id: personId, person, row };
  }).filter(item => {
    const status = item.person?.member_status;
    switch (metricKey) {
      case 'first': case 'firstTimers': return item.row?.first_timer === true;
      case 'decisions': return item.row?.made_salvation_decision === true;
      case 'tithers': return canViewConfidential && item.row?.gave_tithe === true;
      case 'returning': case 'returningGuests': return !!item.row && item.row?.first_timer !== true && ['guest', 'visitor', 'contact'].includes(status);
      case 'members': return !!item.row && item.row?.first_timer !== true && ['member', 'leader'].includes(status);
      case 'guests': return !!item.row && (item.row?.first_timer === true || ['guest', 'visitor', 'contact'].includes(status));
      case 'unknown': case 'unclassifiedNonMembers': return false;
      default: return true;
    }
  }).filter(item => item.person);
}
