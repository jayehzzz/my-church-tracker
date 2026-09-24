import { roundedAverage } from '$lib/utils/comparisonMetrics.js';
/**
 * Dashboard Service
 * Combines church health reporting with the lightweight activity feed used by
 * the action-first home dashboard.
 */
import * as peopleService from "./peopleService.js";
import * as servicesService from "./servicesService.js";
import * as attendanceService from "./attendanceService.js";
import * as evangelismService from "./evangelismService.js";
import * as visitationsService from "./visitationsService.js";
import * as meetingsService from "./meetingsService.js";
import { serviceAttendanceMetrics, summarizeServicePeriod } from "$lib/utils/serviceAnalytics.js";

function parseDate(value) {
  if (!value) return null;
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayISO() {
  return formatDateISO(new Date());
}

function previousRange(dateRange) {
  const start = parseDate(dateRange?.startDate);
  let end = parseDate(dateRange?.endDate);
  if (!start || !end) return null;
  const today = parseDate(todayISO());
  if (today && start <= today && end > today) end = today;
  const span = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - span + 1);
  return {
    startDate: formatDateISO(previousStart),
    endDate: formatDateISO(previousEnd),
  };
}

function isCompleted(item, field) {
  const value = item?.[field];
  return !value || value <= todayISO();
}

function isSundayService(service) {
  const type = String(service?.service_type || "").toLowerCase();
  return type === "sunday" || type.includes("sunday");
}

function attendanceCount(service) {
  if (Number(service?.total_attendance) > 0) return Number(service.total_attendance);
  if (Number(service?.attendance_count) > 0) return Number(service.attendance_count);
  return Array.isArray(service?.individuals) ? service.individuals.length : 0;
}

function averageAttendance(services) {
  if (!services.length) return 0;
  return roundedAverage(services.reduce((sum, service) => sum + attendanceCount(service), 0), services.length);
}

function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Church-health metrics for the selected reporting period, including a
 * like-for-like comparison with the immediately preceding period.
 */
export async function getDashboardKPIs(dateRange) {
  const prior = previousRange(dateRange);
  const hasRange = dateRange?.startDate && dateRange?.endDate;

  const [membersResult, leadersResult, currentResult, previousResult, attendanceResult] = await Promise.all([
    peopleService.getByStatus("member"),
    peopleService.getByStatus("leader"),
    hasRange
      ? servicesService.getByDateRange(dateRange.startDate, dateRange.endDate)
      : servicesService.getAll(),
    prior
      ? servicesService.getByDateRange(prior.startDate, prior.endDate)
      : Promise.resolve({ data: [] }),
    attendanceService.getAll(),
  ]);

  const currentServices = (currentResult.data || []).filter((service) => isCompleted(service, "service_date"));
  const previousServices = (previousResult.data || []).filter((service) => isCompleted(service, "service_date"));
  const currentSundays = currentServices.filter(isSundayService);
  const previousSundays = previousServices.filter(isSundayService);
  const attendanceRows = attendanceResult.data || [];

  const currentSundaySummary = summarizeServicePeriod(currentSundays, attendanceRows);
  const previousSundaySummary = summarizeServicePeriod(previousSundays, attendanceRows);
  const currentSummary = summarizeServicePeriod(currentServices, attendanceRows);
  const previousSummary = summarizeServicePeriod(previousServices, attendanceRows);
  const attendance = currentSundaySummary.serviceCount
    ? roundedAverage(currentSundaySummary.totalAttendance, currentSundaySummary.serviceCount)
    : 0;
  const previousAttendance = previousSundaySummary.serviceCount
    ? roundedAverage(previousSundaySummary.totalAttendance, previousSundaySummary.serviceCount)
    : 0;
  const guests = currentSummary.guestAttendance;
  const previousGuests = previousSummary.guestAttendance;
  const salvations = currentSummary.decisions;
  const previousSalvations = previousSummary.decisions;
  const churchFamily = (membersResult.data?.length || 0) + (leadersResult.data?.length || 0);

  return {
    periodLabel: formatPeriodLabel(dateRange),
    kpis: [
      {
        id: "attendance",
        title: "Avg Sunday attendance",
        value: attendance,
        trend: percentChange(attendance, previousAttendance),
        format: "number",
        description: `${currentSundays.length} completed service${currentSundays.length === 1 ? "" : "s"}`,
        href: "/services",
        icon: "chart",
        variant: "info",
      },
      {
        id: "guests",
        title: "Non-member visits",
        value: guests,
        trend: percentChange(guests, previousGuests),
        format: "number",
        description: "First timers + returning guests",
        href: "/services",
        icon: "user-plus",
        variant: "default",
      },
      {
        id: "salvations",
        title: "Salvation decisions",
        value: salvations,
        trend: percentChange(salvations, previousSalvations),
        format: "number",
        description: "Recorded during services",
        href: "/services",
        icon: "heart",
        variant: "success",
      },
      {
        id: "family",
        title: "Church family",
        value: churchFamily,
        trend: null,
        format: "number",
        description: "Members, including leaders",
        href: "/people",
        icon: "users",
        variant: "default",
      },
    ],
  };
}

/**
 * Returns weekly points for shorter periods and monthly points for longer
 * reports. Future service records are deliberately excluded.
 */
export async function getAttendanceChartData(dateRange) {
  const hasRange = dateRange?.startDate && dateRange?.endDate;
  const [result, attendanceResult] = await Promise.all([
    hasRange
      ? servicesService.getByDateRange(dateRange.startDate, dateRange.endDate)
      : servicesService.getAll(),
    attendanceService.getAll(),
  ]);
  const attendanceRows = attendanceResult.data || [];
  let services = (result.data || [])
    .filter(isSundayService)
    .filter((service) => isCompleted(service, "service_date"))
    .sort((a, b) => String(a.service_date).localeCompare(String(b.service_date)));

  let contextLabel = dateRange?.label || formatPeriodLabel(dateRange) || "All completed Sundays";
  let isFallback = false;

  if (!services.length && hasRange) {
    const allResult = await servicesService.getAll();
    services = (allResult.data || [])
      .filter(isSundayService)
      .filter((service) => isCompleted(service, "service_date"))
      .sort((a, b) => String(a.service_date).localeCompare(String(b.service_date)))
      .slice(-8);
    if (services.length) {
      contextLabel = "Latest 8 completed Sundays · no service in selected period";
      isFallback = true;
    }
  }

  if (!services.length) return { data: [], contextLabel, isFallback };

  return {
    contextLabel,
    isFallback,
    data: services.map((service) => {
      const metrics = serviceAttendanceMetrics(service, attendanceRows);
      return {
        id: service._id || service.id || null,
        date: service.service_date,
        label: parseDate(service.service_date)?.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) || service.service_date,
        attendance: metrics.totalAttendance,
        guests: metrics.guestAttendance,
        firstTimers: metrics.firstTimers,
        decisions: metrics.decisions,
        tithers: metrics.tithers,
      };
    }),
  };
}

/**
 * Recent completed activity across church domains. Future-dated meetings and
 * services are excluded so they never appear as "1m ago".
 */
export async function getRecentActivities(limit = 50) {
  const [evangelismResult, visitationsResult, servicesResult, meetingsResult] = await Promise.all([
    evangelismService.getAll(),
    visitationsService.getAll(),
    servicesService.getAll(),
    meetingsService.getAll(),
  ]);

  const activities = [];

  for (const contact of evangelismResult.data || []) {
    const person = contact.people;
    const name = person
      ? `${person.first_name} ${person.last_name}`
      : [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.person_name || "Unknown contact";
    const isSalvation = Boolean(contact.outreach_salvation_decision ?? contact.salvation_decision);
    activities.push({
      id: `evangelism-${contact._id || contact.id}`,
      type: isSalvation ? "salvation" : "contact",
      description: isSalvation ? `${name} was saved during outreach` : `${name} was contacted`,
      person: name,
      personId: person?._id || person?.id || contact._id || contact.id || null,
      action: isSalvation
        ? "Saved on outreach"
        : `Response: ${String(contact.response || "Pending").replace(/_/g, " ")}`,
      timestamp: isSalvation ? (contact.outreach_salvation_date || contact.contact_date || contact.created_at) : (contact.contact_date || contact.created_at),
      statusOrOutcome: isSalvation ? "Saved on outreach" : contact.response || contact.status || "Pending",
      notes: contact.notes || (Array.isArray(contact.comments) ? contact.comments.join(", ") : null),
      phone: person?.phone || contact.phone || null,
      email: person?.email || contact.email || null,
      address: person?.address || contact.address || null,
      recordedBy: contact.invited_by_name || null,
      route: "/evangelism",
      routeLabel: "Evangelism Hub",
    });
  }

  for (const visit of visitationsResult.data || []) {
    const person = visit.people;
    const name = person
      ? `${person.first_name} ${person.last_name}`
      : visit.person_visited_name || "Unknown member";
    activities.push({
      id: `visitation-${visit._id || visit.id}`,
      type: "visitation",
      description: `${name} was visited`,
      person: name,
      personId: person?._id || person?.id || visit.person_id || null,
      action: `Outcome: ${String(visit.outcome || "Not recorded").replace(/_/g, " ")}`,
      timestamp: visit.visit_date || visit.created_at,
      statusOrOutcome: visit.outcome || "Not recorded",
      notes: visit.notes || null,
      recordedBy: visit.visited_by_name || null,
      followUpRequired: visit.follow_up_required || false,
      followUpDate: visit.follow_up_date || null,
      route: "/visitation",
      routeLabel: "Pastoral Care",
    });
  }

  for (const service of servicesResult.data || []) {
    const serviceName = service.name || String(service.service_type || "Church service")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const leader = service.preacher || service.sermon_speaker || service.speaker || service.leader_name || "Pastoral team";
    const count = attendanceCount(service);
    activities.push({
      id: `service-${service._id || service.id}`,
      type: "service",
      description: `${serviceName} conducted`,
      person: leader,
      personId: service.leader_id || service.speaker_id || null,
      action: `${count} ${count === 1 ? "attendee" : "attendees"} recorded`,
      timestamp: service.service_date || service.date || service.created_at,
      statusOrOutcome: serviceName,
      notes: service.notes || (service.sermon_topic ? `Theme: “${service.sermon_topic}”` : null),
      recordedBy: leader,
      attendeeCount: count,
      route: "/services",
      routeLabel: "Services",
    });
  }

  for (const meeting of meetingsResult.data || []) {
    const meetingName = meeting.name || String(meeting.meeting_type || "Ministry meeting")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const leader = meeting.leader_name || (meeting.leader
      ? `${meeting.leader.first_name} ${meeting.leader.last_name}`
      : "Meeting facilitator");
    const count = Number(meeting.attendance_count) || meeting.attendees?.length || 0;
    activities.push({
      id: `meeting-${meeting._id || meeting.id}`,
      type: "meeting",
      description: `${meetingName} completed`,
      person: leader,
      personId: meeting.leader_id || null,
      action: `${count} ${count === 1 ? "attendee" : "attendees"} attended`,
      timestamp: meeting.meeting_date || meeting.date || meeting.created_at,
      statusOrOutcome: meetingName,
      notes: meeting.notes || (meeting.agenda ? `Agenda: ${meeting.agenda}` : null),
      recordedBy: leader,
      attendeeCount: count,
      route: "/meetings",
      routeLabel: "Meetings",
    });
  }

  const now = Date.now();
  return activities
    .filter((activity) => {
      const date = parseDate(activity.timestamp);
      return date && date.getTime() <= now;
    })
    .sort((a, b) => parseDate(b.timestamp) - parseDate(a.timestamp))
    .slice(0, limit);
}

function formatPeriodLabel(dateRange) {
  if (!dateRange?.startDate || !dateRange?.endDate) return "";
  const start = parseDate(dateRange.startDate);
  const end = parseDate(dateRange.endDate);
  if (!start || !end) return "";
  const month = new Intl.DateTimeFormat("en-GB", { month: "short" });
  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) return `${month.format(start)} ${start.getFullYear()}`;
    return `${month.format(start)} – ${month.format(end)} ${end.getFullYear()}`;
  }
  return `${month.format(start)} ${start.getFullYear()} – ${month.format(end)} ${end.getFullYear()}`;
}
