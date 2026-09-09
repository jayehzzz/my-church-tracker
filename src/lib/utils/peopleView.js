import { isCompletedService, isHeldMeeting } from './reportingMetrics.js';

export function hasMapLocation(person) {
  return Number.isFinite(person?.lat) && Math.abs(person.lat) <= 90
    && Number.isFinite(person?.lng) && Math.abs(person.lng) <= 180;
}

export function personAddress(person) {
  return [person?.address, person?.city, person?.state, person?.zip_code]
    .filter(Boolean).join(', ');
}

export function attendanceDate(record) {
  return record.meeting?.meeting_date || record.services?.service_date || record.service_date || record.date || '';
}

export function recordedAttendance(records, now = new Date()) {
  return (records || []).filter((record) => {
    if (record.present === false || record.attended === false || (record.status && record.status !== 'present')) return false;
    return record.meeting ? isHeldMeeting(record.meeting, now)
      : isCompletedService(record.services || { ...record, service_date: attendanceDate(record) }, now);
  }).sort((a, b) => attendanceDate(b).localeCompare(attendanceDate(a)));
}

/** A rejected, timed-out or failed request stays unavailable, never sample/empty success. */
export async function profileRequest(request, timeoutMs = 10000) {
  let timer;
  try {
    const result = await Promise.race([
      request,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Request timed out')), timeoutMs); }),
    ]);
    if (result?.error) throw result.error;
    if (result?.data == null) throw new Error('No data returned');
    return result.data;
  } finally {
    clearTimeout(timer);
  }
}
