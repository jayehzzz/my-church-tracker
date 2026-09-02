import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api.js";
import { browser } from "$app/environment";
import {
  mockEvangelismContacts,
  mockMeetings,
  mockPeople,
  mockVisitations,
} from "$lib/data/mockData.js";
import {
  buildAttendanceForecast,
  deriveTeamStats,
  nextTaskPlanForOutcome,
  nextSunday,
  quarterlyReengagementCandidates,
  sortTasks,
} from "$lib/services/followUpCrmLogic.js";

const STORAGE_KEY = "church-tracker-follow-up-crm-v1";
const STORAGE_VERSION = 1;
const QUARTERLY_ACTIVE_LIMIT_PER_LEADER = 10;

function getClient() {
  const convexUrl = import.meta.env?.VITE_CONVEX_URL_PROD || import.meta.env?.VITE_CONVEX_URL;
  return convexUrl ? new ConvexHttpClient(convexUrl) : null;
}

function withTimeout(promise, timeoutMs = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("CRM request timed out")), timeoutMs),
    ),
  ]);
}

function dateOnly(value = new Date()) {
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value, amount) {
  const [year, month, day] = dateOnly(value).split("-").map(Number);
  const result = new Date(year, month - 1, day);
  result.setDate(result.getDate() + amount);
  return dateOnly(result);
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isRemoteId(value) {
  if (!value || typeof value !== "string") return false;
  if (value.startsWith("mock-") || value.startsWith("demo-") || value.startsWith("local-")) return false;
  return /^[0-9a-z_-]{15,}$/i.test(value);
}

function fullName(person) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(" ") || "Unknown person";
}

function buildDemoCareTasks(people = mockPeople, today = dateOnly()) {
  const peopleById = new Map(
    people.map((person) => [String(person._id || person.id), person]),
  );
  const leaders = people.filter((person) => person.member_status === "leader");
  const fallbackRecipients = people.filter(
    (person) => !["leader", "archived"].includes(person.member_status),
  );
  const definitions = [
    {
      id: "demo-care-overdue-welfare",
      personId: "22",
      leaderId: "1",
      taskType: "visitation",
      dueOffset: -4,
      priority: "urgent",
      reason: "Missed two Sunday services — home visit and welfare check",
    },
    {
      id: "demo-care-prayer-followup",
      personId: "28",
      leaderId: "2",
      taskType: "member_care",
      dueOffset: -1,
      priority: "high",
      reason: "Follow up after a prayer request and offer practical support",
    },
    {
      id: "demo-care-welcome",
      personId: "30",
      leaderId: "3",
      taskType: "visitation",
      dueOffset: 0,
      priority: "high",
      reason: "Welcome visit for a recent guest",
    },
    {
      id: "demo-care-irregular",
      personId: "21",
      leaderId: "4",
      taskType: "visitation",
      dueOffset: 2,
      priority: "normal",
      reason: "Pastoral check-in after irregular attendance",
    },
    {
      id: "demo-care-support",
      personId: "27",
      leaderId: "5",
      taskType: "member_care",
      dueOffset: 6,
      priority: "normal",
      reason: "Continue the care plan and confirm the support promised",
    },
  ];

  return definitions.map((definition, index) => {
    const person = peopleById.get(definition.personId) || fallbackRecipients[index];
    const leader = peopleById.get(definition.leaderId) || leaders[index % leaders.length];
    if (!person || !leader) return null;
    return {
      _id: definition.id,
      person_id: person._id || person.id,
      assigned_leader_id: leader._id || leader.id,
      task_type: definition.taskType,
      due_date: addDays(today, definition.dueOffset),
      status: "open",
      priority: definition.priority,
      reason: definition.reason,
      created_at: `${today}T08:00:00.000Z`,
      updated_at: `${today}T08:00:00.000Z`,
    };
  }).filter(Boolean);
}

function ensureDemoCareTasks(state, today = dateOnly()) {
  const existingIds = new Set((state.tasks || []).map((task) => String(task._id || task.id)));
  const people = state.people?.length ? state.people : mockPeople;
  const missingTasks = buildDemoCareTasks(people, today)
    .filter((task) => !existingIds.has(String(task._id)));
  return {
    ...state,
    tasks: [...(state.tasks || []), ...missingTasks],
  };
}

function seedLocalState() {
  const today = dateOnly();
  const sunday = nextSunday(today);
  const leaders = mockPeople.filter((person) => person.member_status === "leader");
  const contacts = mockEvangelismContacts.slice(0, 80).map((contact) => ({
    ...contact,
    _id: contact._id || contact.id,
    member_status: contact.member_status || contact.status || "guest",
    contact_category: contact.contact_category || contact.response,
    follow_up_status:
      contact.response === "do_not_contact" || contact.response === "has_church"
        ? "closed"
        : "inactive",
  }));

  const assignments = [];
  const tasks = [];
  const eligibleFresh = contacts.filter((contact) => {
    if (!contact.contact_date || contact.contact_date < addDays(today, -14)) return false;
    if (["member", "leader", "archived"].includes(contact.member_status)) return false;
    return !["do_not_contact", "has_church"].includes(contact.contact_category);
  });
  eligibleFresh.forEach((contact, index) => {
    const invitedLeader = leaders.find(
      (leader) => String(leader.id || leader._id) === String(contact.invited_by_id),
    );
    const leader = invitedLeader || leaders[index % Math.max(leaders.length, 1)];
    if (!leader) return;
    const leaderId = leader._id || leader.id;
    contact.follow_up_status = "active";
    assignments.push({
      _id: `demo-assignment-${contact._id}`,
      person_id: contact._id,
      assigned_leader_id: leaderId,
      status: "active",
      assigned_at: `${today}T09:00:00.000Z`,
      created_at: `${today}T09:00:00.000Z`,
      updated_at: `${today}T09:00:00.000Z`,
    });
    tasks.push({
      _id: `demo-task-${contact._id}`,
      person_id: contact._id,
      assigned_leader_id: leaderId,
      task_type: "first_contact",
      due_date: addDays(contact.contact_date || today, 1),
      status: "open",
      priority: index < 3 ? "high" : "normal",
      reason: "Fresh evangelism contact — make the first personal follow-up",
      created_at: `${today}T09:00:00.000Z`,
      updated_at: `${today}T09:00:00.000Z`,
    });
  });

  const confirmedContacts = eligibleFresh
    .filter((contact) => contact.contact_category === "responsive" || contact.response === "responsive")
    .slice(0, 2);
  const commitments = confirmedContacts.map((contact, index) => {
    const assignment = assignments.find((item) => item.person_id === contact._id);
    return {
      _id: `demo-commitment-${contact._id}`,
      person_id: contact._id,
      leader_id: assignment?.assigned_leader_id || leaders[index]?._id || leaders[index]?.id,
      gathering_type: "sunday_service",
      gathering_date: sunday,
      response: "yes",
      resolution: "pending",
      created_at: `${today}T12:00:00.000Z`,
      updated_at: `${today}T12:00:00.000Z`,
    };
  });

  const regularMembers = mockPeople.filter(
    (person) =>
      ["member", "leader"].includes(person.member_status) && person.activity_status === "regular",
  );
  const irregularMembers = mockPeople.filter(
    (person) =>
      ["member", "leader"].includes(person.member_status) && person.activity_status !== "regular",
  );
  const attendancePlans = [];
  if (regularMembers[0] && leaders[0]) {
    attendancePlans.push({
      _id: "demo-plan-away",
      person_id: regularMembers[0].id || regularMembers[0]._id,
      leader_id: leaders[0].id || leaders[0]._id,
      service_date: sunday,
      status: "away",
      notes: "Known absence",
    });
  }
  if (irregularMembers[0] && leaders[0]) {
    attendancePlans.push({
      _id: "demo-plan-confirmed",
      person_id: irregularMembers[0].id || irregularMembers[0]._id,
      leader_id: leaders[0].id || leaders[0]._id,
      service_date: sunday,
      status: "confirmed",
    });
  }

  tasks.push(...buildDemoCareTasks(mockPeople, today));

  return {
    version: STORAGE_VERSION,
    people: mockPeople.map((person) => ({ ...person, _id: person._id || person.id })),
    contacts,
    assignments,
    tasks,
    commitments,
    attendancePlans,
    followUps: [],
  };
}

function normalizeLocalState(state) {
  let legacyLaterCount = 0;
  const contacts = (state.contacts || []).map((contact) => {
    const currentStatus = contact.member_status;
    const memberStatus = ["member", "leader", "archived"].includes(currentStatus)
      ? currentStatus
      : "guest";
    let followUpStatus = contact.follow_up_status
      || (["do_not_contact", "has_church"].includes(contact.contact_category || contact.response)
        ? "closed"
        : "inactive");
    if (followUpStatus === "later" && !contact.moved_to_later_at
      && !contact.sunday_no_show_count && !contact.later_reason) {
      const isAlternativeGatheringContact = ["events_only", "big_events_only", "bacenta_mainly"]
        .includes(contact.contact_category || contact.response);
      followUpStatus = isAlternativeGatheringContact && legacyLaterCount < 6 ? "later" : "inactive";
      if (followUpStatus === "later") legacyLaterCount += 1;
    }
    return {
      ...contact,
      _id: contact._id || contact.id,
      member_status: memberStatus,
      contact_category: contact.contact_category || contact.response,
      follow_up_status: followUpStatus,
    };
  });
  const knownContactIds = new Set(contacts.map((contact) => String(contact._id || contact.id)));
  for (const source of mockEvangelismContacts) {
    const sourceId = source._id || source.id;
    if (knownContactIds.has(String(sourceId))) continue;
    const category = source.contact_category || source.response;
    contacts.push({
      ...source,
      _id: sourceId,
      member_status: source.member_status || source.status || "guest",
      contact_category: category,
      follow_up_status: ["do_not_contact", "has_church"].includes(category) ? "closed" : "active",
    });
  }
  const normalized = {
    ...state,
    version: STORAGE_VERSION,
    people: state.people || [],
    contacts,
    assignments: state.assignments || [],
    tasks: state.tasks || [],
    commitments: state.commitments || [],
    attendancePlans: state.attendancePlans || [],
    followUps: state.followUps || [],
  };
  return ensureDemoCareTasks(normalized);
}

function readLocalState() {
  if (!browser || typeof window === "undefined" || !window.localStorage) return seedLocalState();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.version === STORAGE_VERSION) {
        const normalized = normalizeLocalState(parsed);
        writeLocalState(normalized);
        return normalized;
      }
    }
  } catch (error) {
    console.warn("Could not read local CRM workspace:", error);
  }
  const seeded = seedLocalState();
  writeLocalState(seeded);
  return seeded;
}

function writeLocalState(state) {
  if (!browser || typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Could not save local CRM workspace:", error);
  }
}

function allLocalPeople(state) {
  const byId = new Map();
  [...state.people, ...state.contacts].forEach((person) => {
    byId.set(String(person._id || person.id), person);
  });
  return [...byId.values()];
}

function syncLocalQuarterlyReengagement(state, today = dateOnly()) {
  const candidates = quarterlyReengagementCandidates({
    contacts: state.contacts,
    assignments: state.assignments,
    tasks: state.tasks,
    followUps: state.followUps,
    today,
  });
  if (!candidates.length) {
    return { created: 0, waiting: 0, active_limit: QUARTERLY_ACTIVE_LIMIT_PER_LEADER };
  }

  const now = new Date().toISOString();
  const activeByLeader = new Map();
  state.tasks
    .filter((task) => task.status === "open" && task.automation_key === "quarterly_reengagement")
    .forEach((task) => {
      const key = String(task.assigned_leader_id);
      activeByLeader.set(key, (activeByLeader.get(key) || 0) + 1);
    });
  let created = 0;
  let waiting = 0;
  for (const candidate of candidates) {
    const leaderKey = String(candidate.leader_id);
    const active = activeByLeader.get(leaderKey) || 0;
    if (active >= QUARTERLY_ACTIVE_LIMIT_PER_LEADER) {
      waiting += 1;
      continue;
    }
    state.tasks.push({
      _id: makeId("local-task"),
      person_id: candidate.person_id,
      assigned_leader_id: candidate.leader_id,
      task_type: candidate.task_type,
      due_date: candidate.due_date,
      status: "open",
      priority: candidate.priority,
      reason: candidate.reason,
      automation_key: candidate.automation_key,
      created_at: now,
      updated_at: now,
    });
    created += 1;
    activeByLeader.set(leaderKey, active + 1);
  }
  if (created) writeLocalState(state);
  return { created, waiting, active_limit: QUARTERLY_ACTIVE_LIMIT_PER_LEADER };
}

function enrichTask(task, state) {
  const people = allLocalPeople(state);
  return {
    ...task,
    person: people.find((person) => String(person._id || person.id) === String(task.person_id)),
    assigned_leader: people.find(
      (person) => String(person._id || person.id) === String(task.assigned_leader_id),
    ),
  };
}

function enrichCommitment(commitment, state) {
  const people = allLocalPeople(state);
  return {
    ...commitment,
    person: people.find(
      (person) => String(person._id || person.id) === String(commitment.person_id),
    ),
    leader: people.find(
      (person) => String(person._id || person.id) === String(commitment.leader_id),
    ),
  };
}

function buildLocalDashboard({ leaderId, serviceDate } = {}, suppliedState = null) {
  const state = suppliedState || readLocalState();
  const today = dateOnly();
  const quarterlySync = syncLocalQuarterlyReengagement(state, today);
  const targetSunday = serviceDate || nextSunday(today);
  const weekEnd = addDays(today, 7);
  const leaders = state.people.filter((person) => person.member_status === "leader");
  const openTasks = state.tasks
    .filter((task) => task.status === "open")
    .filter((task) => !leaderId || String(task.assigned_leader_id) === String(leaderId))
    .map((task) => enrichTask(task, state));
  const memberCareTasks = openTasks.filter((task) => task.task_type === "member_care");
  const actionTasks = openTasks.filter((task) => task.task_type !== "member_care");
  const confirmedCommitments = state.commitments
    .filter(
      (commitment) =>
        commitment.gathering_type === "sunday_service" &&
        commitment.gathering_date === targetSunday &&
        commitment.response === "yes" &&
        commitment.resolution === "pending",
    )
    .filter((commitment) => !leaderId || String(commitment.leader_id) === String(leaderId))
    .map((commitment) => enrichCommitment(commitment, state));
  const upcomingCommitments = state.commitments
    .filter((commitment) =>
      commitment.gathering_date >= today
      && commitment.gathering_date <= weekEnd
      && commitment.response === "yes"
      && commitment.resolution === "pending",
    )
    .filter((commitment) => !leaderId || String(commitment.leader_id) === String(leaderId))
    .map((commitment) => enrichCommitment(commitment, state))
    .sort((a, b) => String(a.gathering_date).localeCompare(String(b.gathering_date)));
  const laterContacts = state.contacts
    .filter((contact) => contact.follow_up_status === "later")
    .filter((contact) => {
      if (!leaderId) return true;
      const assignment = state.assignments.find(
        (item) => item.person_id === contact._id && item.status === "active",
      );
      return String(assignment?.assigned_leader_id) === String(leaderId);
    });

  const forecast = buildAttendanceForecast({
    people: allLocalPeople(state),
    attendancePlans: state.attendancePlans,
    commitments: state.commitments,
    serviceDate: targetSunday,
  });
  const attendanceRoster = state.people
    .filter((person) => ["member", "leader"].includes(person.member_status))
    .map((person) => ({
      ...person,
      attendance_plan: state.attendancePlans.find(
          (plan) =>
            String(plan.person_id) === String(person._id || person.id) &&
            plan.service_date === targetSunday,
        ) || null,
      default_expected: person.activity_status === "regular",
      expected: forecast.expected_person_ids.includes(String(person._id || person.id))
        || forecast.expected_person_ids.includes(person._id || person.id),
    }))
    .map((person) => ({
      ...person,
      forecast_status: person.attendance_plan?.status
        || (person.default_expected ? "expected" : "not_expected"),
    }))
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  const people = allLocalPeople(state);
  const activeAssignmentByPerson = new Map(
    state.assignments
      .filter((assignment) => assignment.status === "active")
      .sort((a, b) => String(a.assigned_at).localeCompare(String(b.assigned_at)))
      .map((assignment) => [String(assignment.person_id), assignment]),
  );
  const crmContacts = state.contacts
    .map((contact) => {
      const contactId = String(contact._id || contact.id);
      const assignment = activeAssignmentByPerson.get(contactId);
      const nextTask = state.tasks
        .filter((task) => String(task.person_id) === contactId && task.status === "open")
        .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0] || null;
      return {
        ...contact,
        assigned_leader_id: assignment?.assigned_leader_id || null,
        assigned_leader: people.find(
          (person) => String(person._id || person.id) === String(assignment?.assigned_leader_id),
        ) || null,
        next_task: nextTask,
      };
    })
    .filter((contact) => !leaderId || String(contact.assigned_leader_id) === String(leaderId))
    .sort((a, b) => String(b.contact_date || b.created_at).localeCompare(String(a.contact_date || a.created_at)));
  const teamStats = deriveTeamStats({
    leaders,
    people: allLocalPeople(state),
    assignments: state.assignments,
    tasks: state.tasks,
    followUps: state.followUps,
    commitments: state.commitments,
    today,
  });
  const visitationFollowUps = mockVisitations
    .filter((visitation) => visitation.follow_up_required)
    .filter((visitation) => !visitation.follow_up_date || visitation.follow_up_date <= weekEnd)
    .filter((visitation) => !leaderId || String(visitation.visited_by_id) === String(leaderId))
    .map((visitation) => ({
      ...visitation,
      person: people.find((person) => String(person._id || person.id) === String(visitation.person_id)) || null,
    }));

  return {
    leaders,
    active_assignments: state.assignments
      .filter((assignment) => assignment.status === "active")
      .filter((assignment) => !leaderId || String(assignment.assigned_leader_id) === String(leaderId))
      .map((assignment) => ({
        ...assignment,
        person: allLocalPeople(state).find(
          (person) => String(person._id || person.id) === String(assignment.person_id),
        ),
        assigned_leader: allLocalPeople(state).find(
          (person) => String(person._id || person.id) === String(assignment.assigned_leader_id),
        ),
      })),
    tasks: sortTasks(actionTasks, today),
    member_care_tasks: sortTasks(memberCareTasks, today),
    confirmed_commitments: confirmedCommitments,
    upcoming_commitments: upcomingCommitments,
    visitation_follow_ups: visitationFollowUps,
    quarterly_backlog_count: quarterlySync.waiting,
    quarterly_active_limit: quarterlySync.active_limit,
    unassigned_contacts: state.contacts
      .filter((contact) => contact.follow_up_status === "active")
      .filter((contact) => !state.assignments.some(
        (assignment) => String(assignment.person_id) === String(contact._id)
          && assignment.status === "active",
      )),
    later_contacts: laterContacts,
    contacts: crmContacts,
    team_stats: teamStats,
    attendance_forecast: forecast,
    attendance_roster: attendanceRoster,
    service_date: targetSunday,
    source: "local",
  };
}

function normalizeDashboard(data, source) {
  const forecast = data?.attendance_forecast || {};
  return {
    ...data,
    leaders: data?.leaders || [],
    active_assignments: data?.active_assignments || [],
    tasks: data?.tasks || (data?.open_tasks || []).filter((task) => task.task_type !== "member_care"),
    member_care_tasks:
      data?.member_care_tasks || (data?.open_tasks || []).filter((task) => task.task_type === "member_care"),
    confirmed_commitments: data?.confirmed_commitments || [],
    upcoming_commitments: data?.upcoming_commitments || data?.confirmed_commitments || [],
    visitation_follow_ups: data?.visitation_follow_ups || [],
    quarterly_backlog_count: data?.quarterly_backlog_count || 0,
    quarterly_active_limit: data?.quarterly_active_limit || QUARTERLY_ACTIVE_LIMIT_PER_LEADER,
    unassigned_contacts: data?.unassigned_contacts || [],
    later_contacts: data?.later_contacts || [],
    contacts: data?.contacts || data?.crm_contacts || [],
    team_stats: (data?.team_stats || []).map((stat) => ({
      ...stat,
      confirmed_guests: stat.confirmed_guests ?? stat.confirmed_this_sunday ?? 0,
    })),
    attendance_roster: data?.attendance_roster || [],
    attendance_forecast: {
      ...forecast,
      service_date: forecast.service_date || data?.service_date,
      known_away: forecast.known_away ?? forecast.regular_away ?? 0,
      expected_total: forecast.expected_total ?? forecast.total_expected ?? 0,
      confirmed_regular: forecast.confirmed_regular ?? 0,
      confirmed_total:
        forecast.confirmed_total
        ?? ((forecast.confirmed_regular ?? 0)
          + (forecast.confirmed_irregular ?? 0)
          + (forecast.confirmed_guests ?? 0)),
    },
    source,
  };
}

async function runRemoteOrLocal(remoteCall, localCall) {
  const client = getClient();
  if (!client) return { data: normalizeDashboard(localCall(), "local"), error: null, source: "local" };
  try {
    const data = await withTimeout(remoteCall(client));
    return { data: normalizeDashboard(data, "convex"), error: null, source: "convex" };
  } catch (error) {
    console.warn("CRM backend unavailable; using the on-device workspace:", error);
    return { data: normalizeDashboard(localCall(), "local"), error: null, source: "local" };
  }
}

export async function getDashboard(options = {}) {
  const args = {
    ...(options.leaderId ? { leaderId: options.leaderId } : {}),
    ...(options.serviceDate ? { serviceDate: options.serviceDate } : {}),
  };
  return await runRemoteOrLocal(
    async (client) => {
      const sync = await client.mutation(api.crm.syncQuarterlyReengagement, { asOfDate: dateOnly() });
      const dashboard = await client.query(api.crm.getDashboard, args);
      return {
        ...dashboard,
        quarterly_backlog_count: sync?.waiting || 0,
        quarterly_active_limit: sync?.active_limit || QUARTERLY_ACTIVE_LIMIT_PER_LEADER,
      };
    },
    () => buildLocalDashboard(options),
  );
}

export function getDemoDashboard(options = {}) {
  return normalizeDashboard(buildLocalDashboard(options, seedLocalState()), "local");
}

function buildLocalContactProfile(personId) {
  const state = readLocalState();
  const people = allLocalPeople(state);
  const person = people.find((item) => String(item._id || item.id) === String(personId));
  if (!person) throw new Error("Contact not found");
  const leaderFor = (leaderId) => people.find(
    (item) => String(item._id || item.id) === String(leaderId),
  ) || null;
  const activeAssignment = state.assignments
    .filter((assignment) =>
      String(assignment.person_id) === String(personId) && assignment.status === "active",
    )
    .sort((a, b) => String(b.assigned_at).localeCompare(String(a.assigned_at)))[0] || null;
  return {
    person,
    active_assignment: activeAssignment ? {
      ...activeAssignment,
      assigned_leader: leaderFor(activeAssignment.assigned_leader_id),
    } : null,
    tasks: state.tasks
      .filter((task) => String(task.person_id) === String(personId))
      .map((task) => ({ ...task, assigned_leader: leaderFor(task.assigned_leader_id) }))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
    follow_ups: state.followUps
      .filter((followUp) => String(followUp.contact_id) === String(personId))
      .map((followUp) => ({ ...followUp, leader: leaderFor(followUp.leader_id) }))
      .sort((a, b) => String(b.follow_up_date).localeCompare(String(a.follow_up_date))),
    commitments: state.commitments
      .filter((commitment) => String(commitment.person_id) === String(personId))
      .map((commitment) => ({ ...commitment, leader: leaderFor(commitment.leader_id) }))
      .sort((a, b) => String(b.gathering_date).localeCompare(String(a.gathering_date))),
    meeting_attendance: mockMeetings
      .filter((meeting) => (meeting.attendees || []).some((id) => String(id) === String(personId)))
      .map((meeting) => ({
        _id: `local-meeting-attendance-${meeting.id}-${personId}`,
        person_id: personId,
        status: "present",
        attended: true,
        meeting,
      }))
      .sort((a, b) => String(b.meeting.meeting_date).localeCompare(String(a.meeting.meeting_date))),
    visitations: mockVisitations
      .filter((visitation) => String(visitation.person_id) === String(personId))
      .sort((a, b) => String(b.visit_date).localeCompare(String(a.visit_date))),
    source: "local",
  };
}

export async function getContactProfile(personId) {
  const client = getClient();
  const localId = String(personId).startsWith("e")
    || String(personId).startsWith("mock-")
    || String(personId).startsWith("demo-");
  if (client && !localId) {
    try {
      const data = await withTimeout(client.query(api.crm.getContactProfile, { personId }));
      return { data: { ...data, source: "convex" }, error: null, source: "convex" };
    } catch (error) {
      try {
        return { data: buildLocalContactProfile(personId), error: null, source: "local" };
      } catch {
        return { data: null, error, source: "convex" };
      }
    }
  }
  try {
    return { data: buildLocalContactProfile(personId), error: null, source: "local" };
  } catch (error) {
    return { data: null, error, source: "local" };
  }
}

export async function assignContact(personId, leaderId, dueDate = dateOnly(), options = {}) {
  const createFirstContactTask = options.createFirstContactTask !== false;
  const reason = options.reason || "Fresh evangelism contact — make the first personal follow-up";
  const client = getClient();
  if (client && !String(personId).startsWith("e") && !String(personId).startsWith("mock-")) {
    try {
      const data = await client.mutation(api.crm.assignContact, {
        personId,
        assignedLeaderId: leaderId,
        firstContactDueDate: dueDate,
        createFirstContactTask,
        reason,
      });
      return { data, error: null, source: "convex" };
    } catch (error) {
      return { data: null, error, source: "convex" };
    }
  }

  const state = readLocalState();
  const person = state.contacts.find((contact) => String(contact._id) === String(personId));
  const leader = state.people.find((candidate) => String(candidate._id) === String(leaderId));
  if (!person) return { data: null, error: new Error("Contact not found"), source: "local" };
  if (!leader || leader.member_status !== "leader") {
    return { data: null, error: new Error("Choose a valid leader"), source: "local" };
  }

  const now = new Date().toISOString();
  state.assignments.forEach((assignment) => {
    if (String(assignment.person_id) === String(personId) && assignment.status === "active") {
      assignment.status = "ended";
      assignment.ended_at = now;
      assignment.updated_at = now;
    }
  });
  const assignment = {
    _id: makeId("local-assignment"),
    person_id: personId,
    assigned_leader_id: leaderId,
    status: "active",
    assigned_at: now,
    created_at: now,
    updated_at: now,
  };
  const task = createFirstContactTask ? {
    _id: makeId("local-task"), person_id: personId, assigned_leader_id: leaderId,
    task_type: "first_contact", due_date: dueDate, status: "open", priority: "high",
    reason, created_at: now, updated_at: now,
  } : null;
  state.assignments.push(assignment);
  if (task) state.tasks.push(task);
  person.follow_up_status = "active";
  writeLocalState(state);
  return { data: { assignment, task }, error: null, source: "local" };
}

export async function captureLocalEvangelismContact(contact) {
  const state = readLocalState();
  const personId = contact._id || contact.id;
  const closed = ["do_not_contact", "has_church"].includes(
    contact.contact_category || contact.response,
  );
  const normalized = {
    ...contact,
    _id: personId,
    member_status: contact.member_status || contact.status || "guest",
    contact_category: contact.contact_category || contact.response,
    follow_up_status: closed ? "closed" : "active",
  };
  const existingIndex = state.contacts.findIndex(
    (candidate) => String(candidate._id) === String(personId),
  );
  const previous = existingIndex >= 0 ? state.contacts[existingIndex] : null;
  const reintroduced = Boolean(
    previous?.contact_date
    && normalized.contact_date
    && normalized.contact_date > previous.contact_date,
  );
  if (existingIndex >= 0) state.contacts[existingIndex] = normalized;
  else state.contacts.unshift(normalized);
  writeLocalState(state);

  if (!closed && contact.assigned_leader_id) {
    return await assignContact(
      personId,
      contact.assigned_leader_id,
      contact.follow_up_date || contact.contact_date || dateOnly(),
    );
  }
  if (!closed && reintroduced) {
    const owner = state.assignments
      .filter((assignment) => String(assignment.person_id) === String(personId) && assignment.status === "active")
      .sort((a, b) => String(b.assigned_at).localeCompare(String(a.assigned_at)))[0];
    if (owner && !state.tasks.some((task) => String(task.person_id) === String(personId) && task.status === "open")) {
      return await reactivateContact(personId, owner.assigned_leader_id, normalized.contact_date);
    }
  }
  return { data: normalized, error: null, source: "local" };
}

export async function createTask({
  personId,
  assignedLeaderId,
  dueDate,
  taskType = "visitation",
  priority = "normal",
  reason,
  createdById,
}) {
  const client = getClient();
  if (client && isRemoteId(personId) && isRemoteId(assignedLeaderId)) {
    try {
      const data = await client.mutation(api.crm.createTask, {
        personId,
        assignedLeaderId,
        ...(createdById && isRemoteId(createdById) ? { createdById } : {}),
        dueDate,
        taskType,
        priority,
        ...(reason ? { reason } : {}),
      });
      return { data, error: null, source: "convex" };
    } catch (error) {
      return { data: null, error, source: "convex" };
    }
  }

  const state = readLocalState();
  const people = allLocalPeople(state);
  const person = people.find((candidate) =>
    String(candidate._id || candidate.id) === String(personId),
  );
  const leader = people.find((candidate) =>
    String(candidate._id || candidate.id) === String(assignedLeaderId),
  );
  if (!person) return { data: null, error: new Error("Choose a valid person"), source: "local" };
  if (!leader || leader.member_status !== "leader") {
    return { data: null, error: new Error("Choose a valid care leader"), source: "local" };
  }

  const now = new Date().toISOString();
  const task = {
    _id: makeId("local-task"),
    person_id: personId,
    assigned_leader_id: assignedLeaderId,
    created_by_id: createdById || assignedLeaderId,
    due_date: dueDate,
    status: "open",
    task_type: taskType,
    priority,
    reason: reason || "Pastoral care visit",
    created_at: now,
    updated_at: now,
  };
  state.tasks.push(task);
  writeLocalState(state);
  return { data: enrichTask(task, state), error: null, source: "local" };
}

export async function completeTask(taskId, details) {
  const client = getClient();
  if (client && isRemoteId(taskId)) {
    try {
      const data = await client.mutation(api.crm.completeTask, { taskId, ...details });
      return { data, error: null, source: "convex" };
    } catch (error) {
      return { data: null, error, source: "convex" };
    }
  }

  const state = readLocalState();
  const task = state.tasks.find((item) => String(item._id) === String(taskId));
  if (!task) return { data: null, error: new Error("Task not found"), source: "local" };
  const today = dateOnly();
  const automaticPlan = !details.skipAutomaticNextTask && !details.nextActionDate
    ? nextTaskPlanForOutcome(details.outcome, today)
    : null;
  const nextActionDate = details.nextActionDate || automaticPlan?.due_date;
  const nextTaskType = details.nextTaskType || automaticPlan?.task_type || "follow_up";
  const nextReason = details.nextReason || automaticPlan?.reason || "Planned next follow-up";
  task.status = "completed";
  task.outcome = details.outcome;
  task.notes = details.notes;
  task.completed_at = new Date().toISOString();
  task.completed_by_id = details.leaderId || task.assigned_leader_id;
  task.updated_at = new Date().toISOString();

  state.followUps.push({
    _id: makeId("local-follow-up"),
    contact_id: task.person_id,
    leader_id: details.leaderId || task.assigned_leader_id,
    follow_up_date: today,
    method: details.method || "call",
    outcome: details.outcome || "positive_conversation",
    next_action_date: nextActionDate || undefined,
    gathering_type: details.gatheringType || undefined,
    gathering_date: details.gatheringDate || undefined,
    attendance_response: details.attendanceResponse || undefined,
    notes: details.notes || undefined,
    created_at: new Date().toISOString(),
  });

  if (details.attendanceResponse && details.gatheringType && details.gatheringDate) {
    const existing = state.commitments.find(
      (item) =>
        String(item.person_id) === String(task.person_id) &&
        item.gathering_type === details.gatheringType &&
        item.gathering_date === details.gatheringDate,
    );
    const commitment = existing || {
      _id: makeId("local-commitment"),
      person_id: task.person_id,
      leader_id: details.leaderId || task.assigned_leader_id,
      gathering_type: details.gatheringType,
      gathering_date: details.gatheringDate,
      created_at: new Date().toISOString(),
    };
    commitment.response = details.attendanceResponse;
    commitment.resolution = "pending";
    commitment.updated_at = new Date().toISOString();
    if (!existing) state.commitments.push(commitment);
  }

  if (nextActionDate) {
    state.tasks.push({
      _id: makeId("local-task"),
      person_id: task.person_id,
      assigned_leader_id: details.leaderId || task.assigned_leader_id,
      task_type: nextTaskType,
      due_date: nextActionDate,
      status: "open",
      priority: details.nextPriority || "normal",
      reason: nextReason,
      gathering_type: details.gatheringType || undefined,
      gathering_date: details.gatheringDate || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  if (details.moveToLater) {
    const contact = state.contacts.find((item) => String(item._id) === String(task.person_id));
    if (contact) {
      contact.follow_up_status = "later";
      contact.moved_to_later_at = new Date().toISOString();
      contact.later_reason = "Moved after follow-up";
    }
  }
  const contact = state.contacts.find((item) => String(item._id) === String(task.person_id));
  if (contact) {
    contact.last_follow_up_date = today;
    if (details.outcome === "wrong_number") {
      contact.contact_category = "wrong_number";
      contact.response = "wrong_number";
      contact.follow_up_status = "closed";
    }
  }
  writeLocalState(state);
  return { data: enrichTask(task, state), error: null, source: "local" };
}

export async function resolveCommitment(commitmentId, resolution) {
  const client = getClient();
  if (client && !String(commitmentId).startsWith("demo-") && !String(commitmentId).startsWith("local-")) {
    try {
      const data = await client.mutation(api.crm.resolveCommitment, {
        commitmentId,
        resolution,
      });
      return { data, error: null, source: "convex" };
    } catch (error) {
      return { data: null, error, source: "convex" };
    }
  }
  const state = readLocalState();
  const commitment = state.commitments.find((item) => String(item._id) === String(commitmentId));
  if (!commitment) {
    return { data: null, error: new Error("Commitment not found"), source: "local" };
  }
  commitment.resolution = resolution;
  commitment.resolved_at = new Date().toISOString();
  commitment.updated_at = new Date().toISOString();

  if (resolution === "no_show") {
    const noShowCount = new Set(
      state.commitments
        .filter(
          (item) =>
            String(item.person_id) === String(commitment.person_id) &&
            item.gathering_type === "sunday_service" &&
            item.response === "yes" &&
            item.resolution === "no_show",
        )
        .map((item) => item.gathering_date),
    ).size;
    if (noShowCount >= 2) {
      const contact = state.contacts.find(
        (item) => String(item._id) === String(commitment.person_id),
      );
      if (contact) {
        const dueDate = addDays(dateOnly(), 30);
        const assignment = state.assignments
          .filter((item) => String(item.person_id) === String(commitment.person_id) && item.status === "active")
          .sort((a, b) => String(b.assigned_at).localeCompare(String(a.assigned_at)))[0];
        const leaderId = assignment?.assigned_leader_id || commitment.leader_id;
        contact.follow_up_status = "active";
        contact.sunday_no_show_count = noShowCount;
        contact.pipeline_stage = "cooling_off";
        contact.moved_to_later_at = undefined;
        contact.later_reason = undefined;
        state.tasks.forEach((task) => {
          if (String(task.person_id) !== String(commitment.person_id) || task.status !== "open") return;
          if (["bacenta", "special_event"].includes(task.gathering_type)) return;
          task.status = "cancelled";
          task.outcome = "cooling_off_after_no_shows";
          task.updated_at = new Date().toISOString();
        });
        if (leaderId && !state.tasks.some((task) =>
          String(task.person_id) === String(commitment.person_id)
          && task.status === "open"
          && task.task_type === "reengagement"
          && task.due_date === dueDate
        )) {
          state.tasks.push({
            _id: makeId("local-task"),
            person_id: commitment.person_id,
            assigned_leader_id: leaderId,
            task_type: "reengagement",
            due_date: dueDate,
            status: "open",
            priority: "normal",
            reason: "Two confirmed Sunday no-shows — reconnect after one month",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    }
  }
  writeLocalState(state);
  return { data: enrichCommitment(commitment, state), error: null, source: "local" };
}

export async function moveToLater(personId) {
  const client = getClient();
  if (client && !String(personId).startsWith("e")) {
    try {
      const data = await client.mutation(api.crm.moveToLater, { personId });
      return { data, error: null, source: "convex" };
    } catch (error) {
      return { data: null, error, source: "convex" };
    }
  }
  const state = readLocalState();
  const contact = state.contacts.find((item) => String(item._id) === String(personId));
  if (!contact) return { data: null, error: new Error("Contact not found"), source: "local" };
  contact.follow_up_status = "later";
  contact.moved_to_later_at = new Date().toISOString();
  contact.later_reason = "Moved after follow-up";
  state.tasks.forEach((task) => {
    if (String(task.person_id) === String(personId) && task.status === "open") {
      task.status = "cancelled";
      task.updated_at = new Date().toISOString();
    }
  });
  writeLocalState(state);
  return { data: contact, error: null, source: "local" };
}

export async function reactivateContact(personId, leaderId, dueDate = dateOnly()) {
  const client = getClient();
  if (client && !String(personId).startsWith("e")) {
    try {
      const data = await client.mutation(api.crm.reactivateContact, {
        personId,
        assignedLeaderId: leaderId,
        dueDate,
      });
      return { data, error: null, source: "convex" };
    } catch (error) {
      return { data: null, error, source: "convex" };
    }
  }
  const state = readLocalState();
  const contact = state.contacts.find((item) => String(item._id) === String(personId));
  if (!contact) return { data: null, error: new Error("Contact not found"), source: "local" };
  contact.follow_up_status = "active";
  contact.moved_to_later_at = undefined;
  contact.later_reason = undefined;
  state.tasks.push({
    _id: makeId("local-task"),
    person_id: personId,
    assigned_leader_id: leaderId,
    task_type: "reengagement",
    due_date: dueDate,
    status: "open",
    priority: "normal",
    reason: "Reactivated for follow-up",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  writeLocalState(state);
  return { data: contact, error: null, source: "local" };
}

export async function setAttendancePlan(personId, leaderId, serviceDate, status, notes) {
  const client = getClient();
  if (client && !String(personId).startsWith("e") && String(personId).length > 12) {
    try {
      const data = await client.mutation(api.crm.setAttendancePlan, {
        personId,
        leaderId,
        serviceDate,
        status,
        ...(notes ? { notes } : {}),
      });
      return { data, error: null, source: "convex" };
    } catch (error) {
      return { data: null, error, source: "convex" };
    }
  }
  const state = readLocalState();
  const existing = state.attendancePlans.find(
    (plan) => String(plan.person_id) === String(personId) && plan.service_date === serviceDate,
  );
  const plan = existing || {
    _id: makeId("local-plan"),
    person_id: personId,
    leader_id: leaderId,
    service_date: serviceDate,
  };
  plan.status = status;
  plan.notes = notes;
  plan.updated_at = new Date().toISOString();
  if (!existing) state.attendancePlans.push(plan);
  writeLocalState(state);
  return { data: plan, error: null, source: "local" };
}

export function resetLocalWorkspace() {
  if (browser && typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export { fullName };
