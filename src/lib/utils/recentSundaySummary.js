import { isCompletedService } from './reportingMetrics.js';

/** A count of recorded visits, not a judgement about missed services. */
export function recentSundaySummary(services, attendance, now = new Date()) {
  if (!Array.isArray(services) || !Array.isArray(attendance)) return 'Recent Sunday attendance is unavailable.';
  const recent = services
    .filter((service) => service.service_type === 'sunday_service' && isCompletedService(service, now))
    .sort((a, b) => b.service_date.localeCompare(a.service_date))
    .slice(0, 6);
  if (!recent.length) return 'No past Sunday services recorded yet.';
  const ids = new Set(recent.map((service) => String(service._id || service.id)));
  const visits = new Set(attendance
    .filter((record) => !record.meeting && ids.has(String(record.service_id || record.services?._id || record.services?.id)))
    .map((record) => String(record.service_id || record.services?._id || record.services?.id)));
  return `${visits.size} recorded Sunday ${visits.size === 1 ? 'visit' : 'visits'} in the last ${recent.length} past ${recent.length === 1 ? 'service' : 'services'}.`;
}
