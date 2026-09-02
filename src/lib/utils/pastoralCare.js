const CARE_TASK_TYPES = new Set(["visitation", "member_care"]);
const CLOSED_TASK_STATUSES = new Set(["completed", "cancelled", "canceled", "done"]);
const CARE_SIGNAL_COOLDOWN_DAYS = 7;

export const CARE_SIGNAL_DEFINITIONS = [
  {
    id: "dormant",
    label: "No attendance",
    trigger: "A member or leader attended 0 of the last 6 recorded Sunday services.",
  },
  {
    id: "irregular",
    label: "Low attendance",
    trigger: "A member or leader attended 1–3 of the last 6 recorded Sunday services.",
  },
  {
    id: "missed_sundays",
    label: "Missed Sundays",
    trigger: "A member or leader attended at least 4 of the last 6 Sundays but missed the latest 2.",
  },
  {
    id: "new_guest",
    label: "New guest",
    trigger: "A guest’s first visit was at least three days ago and no welcome care has been recorded.",
  },
];

export function recordId(record) {
  return record?._id || record?.id || "";
}

export function fullName(person) {
  return [person?.preferred_name || person?.first_name, person?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || "Unknown person";
}

export function localDate(value = new Date()) {
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isOpenCareTask(task) {
  return Boolean(
    task
      && CARE_TASK_TYPES.has(task.task_type)
      && !task.completed_at
      && !CLOSED_TASK_STATUSES.has(String(task.status || "open").toLowerCase()),
  );
}

export function enrichCareTasks(tasks = [], people = []) {
  const peopleById = new Map(people.map((person) => [String(recordId(person)), person]));
  return tasks
    .filter(isOpenCareTask)
    .map((task) => ({
      ...task,
      person: task.person || peopleById.get(String(task.person_id)) || null,
      assigned_leader:
        task.assigned_leader || peopleById.get(String(task.assigned_leader_id)) || null,
    }));
}

export function findConsecutiveAbsences({
  people = [],
  services = [],
  attendance = [],
  today = localDate(),
  serviceCount = 2,
} = {}) {
  const recentServices = services
    .filter((service) => service.service_type === "sunday_service")
    .filter((service) => service.service_date && service.service_date <= today)
    .slice()
    .sort((a, b) => b.service_date.localeCompare(a.service_date))
    .slice(0, serviceCount);
  if (recentServices.length < serviceCount) return [];

  const attendeesByService = new Map(
    recentServices.map((service) => [String(recordId(service)), new Set()]),
  );
  attendance.forEach((record) => {
    const attendees = attendeesByService.get(String(record.service_id));
    if (attendees && record.person_id) attendees.add(String(record.person_id));
  });

  return people
    .filter((person) => ["member", "leader"].includes(person.member_status))
    .filter((person) => person.activity_status === "regular")
    .filter((person) =>
      recentServices.every((service) =>
        !attendeesByService.get(String(recordId(service)))?.has(String(recordId(person))),
      ),
    )
    .map((person) => recordId(person));
}

export function buildAttendanceCareSignals({
  people = [],
  services = [],
  attendance = [],
  today = localDate(),
  serviceCount = 6,
} = {}) {
  const recentServices = services
    .filter((service) => service.service_type === "sunday_service")
    .filter((service) => service.service_date && service.service_date <= today)
    .slice()
    .sort((a, b) => b.service_date.localeCompare(a.service_date))
    .slice(0, serviceCount);
  if (recentServices.length < serviceCount) return [];

  const attendeesByService = new Map(
    recentServices.map((service) => [String(recordId(service)), new Set()]),
  );
  attendance.forEach((record) => {
    if (record.attended === false || String(record.status || "").toLowerCase() === "absent") return;
    const attendees = attendeesByService.get(String(record.service_id));
    if (attendees && record.person_id) attendees.add(String(record.person_id));
  });

  const latestTwo = recentServices.slice(0, 2);
  return people
    .filter((person) => ["member", "leader"].includes(person.member_status))
    .map((person) => {
      const personId = String(recordId(person));
      const attendedCount = recentServices.filter((service) =>
        attendeesByService.get(String(recordId(service)))?.has(personId),
      ).length;
      const missedLatestTwo = latestTwo.every((service) =>
        !attendeesByService.get(String(recordId(service)))?.has(personId),
      );
      let signalType = null;
      if (attendedCount === 0) signalType = "dormant";
      else if (attendedCount <= Math.floor(serviceCount / 2)) signalType = "irregular";
      else if (missedLatestTwo) signalType = "missed_sundays";
      if (!signalType) return null;
      return {
        person_id: recordId(person),
        signal_type: signalType,
        attended_count: attendedCount,
        service_count: recentServices.length,
        missed_latest_two: missedLatestTwo,
      };
    })
    .filter(Boolean);
}

function dayDifference(today, earlier) {
  if (!earlier) return null;
  const start = new Date(`${earlier.slice(0, 10)}T00:00:00`);
  const end = new Date(`${today.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}

export function buildCareCandidates({
  people = [],
  visitations = [],
  tasks = [],
  attendanceSignals = [],
  recentAbsencePersonIds = [],
  today = localDate(),
} = {}) {
  const openPersonIds = new Set(
    tasks.filter(isOpenCareTask).map((task) => String(task.person_id)),
  );
  const recentAbsences = new Set(recentAbsencePersonIds.map(String));
  const attendanceSignalByPerson = new Map(
    attendanceSignals.map((signal) => [String(signal.person_id), signal]),
  );
  const lastVisitByPerson = new Map();
  visitations.forEach((visit) => {
    if (!visit.person_id || !visit.visit_date) return;
    const key = String(visit.person_id);
    const current = lastVisitByPerson.get(key);
    if (!current || visit.visit_date > current.visit_date) lastVisitByPerson.set(key, visit);
  });

  return people
    .filter((person) => person.member_status !== "archived")
    .filter((person) => !openPersonIds.has(String(recordId(person))))
    .map((person) => {
      const id = recordId(person);
      const lastVisit = lastVisitByPerson.get(String(id)) || null;
      const baselineDate = lastVisit?.visit_date || person.first_visit_date || person.contact_date || person.created_at;
      const daysSinceCare = dayDifference(today, baselineDate);
      const attendanceSignal = attendanceSignalByPerson.get(String(id))
        || (recentAbsences.has(String(id)) ? {
          signal_type: "missed_sundays",
          attended_count: null,
          service_count: 2,
        } : null);

      if (lastVisit && daysSinceCare !== null && daysSinceCare < CARE_SIGNAL_COOLDOWN_DAYS) {
        return null;
      }

      if (attendanceSignal?.signal_type === "dormant") {
        return {
          person,
          person_id: id,
          signal_type: "dormant",
          reason: `Attended 0 of the last ${attendanceSignal.service_count} Sunday services — arrange a personal visit`,
          priority: "urgent",
          purpose: "attendance_concern",
          attendance_count: 0,
          service_count: attendanceSignal.service_count,
          days_since_care: daysSinceCare,
          last_visit: lastVisit,
        };
      }
      if (attendanceSignal?.signal_type === "irregular") {
        return {
          person,
          person_id: id,
          signal_type: "irregular",
          reason: `Attended ${attendanceSignal.attended_count} of the last ${attendanceSignal.service_count} Sunday services — check in and understand what support is needed`,
          priority: "high",
          purpose: "attendance_concern",
          attendance_count: attendanceSignal.attended_count,
          service_count: attendanceSignal.service_count,
          days_since_care: daysSinceCare,
          last_visit: lastVisit,
        };
      }
      if (attendanceSignal?.signal_type === "missed_sundays") {
        const overallAttendance = attendanceSignal.attended_count === null
          ? ""
          : `; attended ${attendanceSignal.attended_count} of ${attendanceSignal.service_count} overall`;
        return {
          person,
          person_id: id,
          signal_type: "missed_sundays",
          reason: `Missed the two most recent Sunday services${overallAttendance} — arrange a personal check-in`,
          priority: "high",
          purpose: "attendance_concern",
          attendance_count: attendanceSignal.attended_count,
          service_count: attendanceSignal.service_count,
          days_since_care: daysSinceCare,
          last_visit: lastVisit,
        };
      }
      if (
        person.member_status === "guest"
        && !lastVisit
        && (person.first_visit_date || person.attended_church)
      ) {
        const daysSinceFirstVisit = dayDifference(today, person.first_visit_date || person.contact_date || person.created_at);
        if (daysSinceFirstVisit === null || daysSinceFirstVisit < 3) return null;
        return {
          person,
          person_id: id,
          signal_type: "new_guest",
          reason: "New guest without a recorded welcome visit",
          priority: daysSinceFirstVisit >= 14 ? "high" : "normal",
          purpose: "new_guest",
          days_since_care: daysSinceFirstVisit,
          last_visit: null,
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const priority = { urgent: 0, high: 1, normal: 2, low: 3 };
      return (priority[a.priority] ?? 2) - (priority[b.priority] ?? 2)
        || (b.days_since_care ?? -1) - (a.days_since_care ?? -1)
        || fullName(a.person).localeCompare(fullName(b.person));
    });
}

export function splitCareTasks(tasks = [], today = localDate()) {
  const open = tasks.filter(isOpenCareTask);
  return {
    overdue: open.filter((task) => task.due_date && task.due_date < today),
    dueToday: open.filter((task) => !task.due_date || task.due_date === today),
    upcoming: open
      .filter((task) => task.due_date && task.due_date > today)
      .sort((a, b) => a.due_date.localeCompare(b.due_date)),
  };
}

export function formatOutcome(value) {
  const labels = {
    welcomed_encouraged: "Welcomed & encouraged",
    prayer_request_received: "Prayer request",
    invited_to_service: "Invited to service",
    concerns_shared: "Concerns shared",
    follow_up_needed: "Follow-up needed",
    not_home: "Not home",
    declined: "Declined",
    encouraged: "Encouraged",
    prayed_for: "Prayed for",
    recommitted: "Recommitted",
  };
  return labels[value] || String(value || "Unknown").replace(/[_-]+/g, " ");
}

export function formatInteraction(value) {
  const labels = {
    home_visit: "Home visit",
    hospital_visit: "Hospital visit",
    church_meeting: "Church conversation",
    phone_call: "Phone call",
    message: "Message",
    practical_support: "Practical support",
    other: "Other",
  };
  return labels[value] || "Home visit";
}

export function formatPurpose(value) {
  const labels = {
    new_guest: "New guest care",
    attendance_concern: "Attendance concern",
    welfare: "Welfare",
    prayer: "Prayer",
    bereavement: "Bereavement",
    membership: "Membership",
    general_care: "General care",
    other: "Other",
  };
  return labels[value] || "General care";
}
