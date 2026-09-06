/** Shared definitions for operational reporting. Dates are calendar dates, not instants. */
const UNSUCCESSFUL_CARE_OUTCOMES = new Set(["not_home", "declined", "cancelled"]);
const PRAYER_MEETING_TYPES = new Set([
  "acts_prayer",
  "farley_prayer",
  "shemen_prayer",
  "flow_prayer",
]);

export function dateOnly(value) {
  return value ? String(value).slice(0, 10) : "";
}

export function todayDate(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isWithinReportingRange(value, range = {}) {
  const date = dateOnly(value);
  if (!date) return false;
  return (!range.startDate || date >= range.startDate)
    && (!range.endDate || date <= range.endDate);
}

export function isCompletedService(service, now = new Date()) {
  const date = dateOnly(service?.service_date);
  return Boolean(date && date <= todayDate(now) && service?.status !== "cancelled");
}

/** A held meeting has had attendance completed; scheduled and pending records are not actuals. */
export function isHeldMeeting(meeting, now = new Date()) {
  const date = dateOnly(meeting?.meeting_date);
  if (!date || date > todayDate(now)) return false;
  // Older records did not have a status; retain their historical actuals.
  return !meeting?.status || meeting.status === "completed";
}

export function isPrayerMeeting(meeting) {
  return meeting?.program?.category === "prayer"
    || meeting?.category === "prayer"
    || PRAYER_MEETING_TYPES.has(meeting?.meeting_type);
}

/** Successful care excludes explicitly unsuccessful/cancelled records and legacy no-answer outcomes. */
export function isSuccessfulCare(visitation) {
  if (visitation?.status) return visitation.status === "completed";
  return !UNSUCCESSFUL_CARE_OUTCOMES.has(visitation?.outcome);
}

export function prayerHours(meetings, now = new Date()) {
  const minutes = (meetings || [])
    .filter((meeting) => isHeldMeeting(meeting, now) && isPrayerMeeting(meeting))
    .reduce((sum, meeting) => sum + (Number(meeting.duration_minutes) || 0), 0);
  return Math.round((minutes / 60) * 10) / 10;
}

export function completedCareCount(visitations) {
  return (visitations || []).filter(isSuccessfulCare).length;
}
