import { sundayConfirmationRows, latestSundayCommitments, sundayResponseVersion } from "./sundayConfirmationLogic.js";
import { extendGuestForecast, guestInvitationName, guestInvitationVersion } from "./expectedGuestLogic.js";
import { assertDate, validatePersonInput, normalizeEmail, normalizePhone } from "../../../convex/peopleValidation.ts";
import { canFollowUp, isOutreachTask, isDelegatedFollowUpTask } from "../../../convex/lib/contactPolicy.ts";
import { api } from "../../../convex/_generated/api.js";
import { browser } from "$app/environment";
import { getConvexClient, getConvexHttpClient, isDemoMode, unavailableError } from "$lib/convex.js";
import {
  mockEvangelismContacts,
  mockMeetings,
  mockPeople,
  mockServices,
  mockAttendance,
  mockVisitations,
} from "$lib/data/mockData.js";
import {
  buildAttendanceForecast,
  deriveCandidateSignals,
  deriveTeamStats,
  nextTaskPlanForOutcome,
  nextSunday,
  quarterlyReengagementCandidates,
  sortTasks,
} from "$lib/services/followUpCrmLogic.js";
import { summarizeSundayCommitments } from "$lib/utils/sundayReliability.js";

const STORAGE_KEY = "church-tracker-follow-up-crm-v1";
const STORAGE_VERSION = 1;
const QUARTERLY_ACTIVE_LIMIT_PER_LEADER = 10;

function getClient() {
  return getConvexHttpClient();
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

function outreachMemberStatus(person = {}) {
  const explicit = person.member_status || person.status;
  if (["member", "leader", "archived"].includes(explicit)) return explicit;
  if (person.first_visit_date || person.attended_church || Number(person.attended_meetings || person.promises_kept || 0) > 0) {
    return "guest";
  }
  return explicit === "guest" ? "guest" : "contact";
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
      reason: "Welcome visit after a recent attendance",
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
    member_status: outreachMemberStatus(contact),
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

  const [firstDemoMember, secondDemoMember] = mockPeople.filter(
    (person) => ["member", "leader"].includes(person.member_status),
  );
  const attendancePlans = [];
  if (firstDemoMember && leaders[0]) {
    attendancePlans.push({
      _id: "demo-plan-away",
      person_id: firstDemoMember.id || firstDemoMember._id,
      leader_id: leaders[0].id || leaders[0]._id,
      service_date: sunday,
      status: "away",
      notes: "Known absence",
    });
  }
  if (secondDemoMember && leaders[0]) {
    attendancePlans.push({
      _id: "demo-plan-confirmed",
      person_id: secondDemoMember.id || secondDemoMember._id,
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
    const memberStatus = outreachMemberStatus(contact);
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
      member_status: outreachMemberStatus(source),
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

let inMemoryState = null;

function readLocalState() {
  if (!isDemoMode()) throw unavailableError();
  if (!browser || typeof window === "undefined" || !window.localStorage) {
    if (!inMemoryState) inMemoryState = seedLocalState();
    return inMemoryState;
  }
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
  if (!isDemoMode()) throw unavailableError();
  if (!browser || typeof window === "undefined" || !window.localStorage) {
    inMemoryState = state;
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Could not save local CRM workspace:", error);
  }
}

function currentOwnerFor(state, personId) {
  return state.assignments.filter(row => row.status === "active" && String(row.person_id) === String(personId))
    .sort((a,b) => String(b.assigned_at).localeCompare(String(a.assigned_at)) || (b._creationTime || 0) - (a._creationTime || 0))[0]?.assigned_leader_id;
}

function allLocalPeople(state) {
  const byId = new Map();
  [...mockPeople, ...state.people, ...state.contacts].forEach((person) => {
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

function syncLocalLaterReviews(state, today = dateOnly()) {
  const dueContacts = state.contacts.filter((contact) =>
    contact.follow_up_status === "later"
    && canFollowUp(contact)
    && contact.resume_date
    && contact.resume_date <= today
  );
  let created = 0;
  for (const contact of dueContacts) {
    const assignment = state.assignments
      .filter((item) => String(item.person_id) === String(contact._id) && item.status === "active")
      .sort((a, b) => String(b.assigned_at).localeCompare(String(a.assigned_at)))[0];
    if (!assignment) continue;
    contact.follow_up_status = "active";
    contact.pipeline_stage = "review";
    contact.moved_to_later_at = undefined;
    contact.resume_date = undefined;
    if (!state.tasks.some((task) => String(task.person_id) === String(contact._id) && task.status === "open")) {
      const now = new Date().toISOString();
      state.tasks.push({
        _id: makeId("local-task"),
        person_id: contact._id,
        assigned_leader_id: assignment.assigned_leader_id,
        task_type: "reengagement",
        due_date: today,
        status: "open",
        priority: "normal",
        reason: "90-day review — decide whether to restart follow-up",
        automation_key: "later_review",
        created_at: now,
        updated_at: now,
      });
      created += 1;
    }
  }
  if (created) writeLocalState(state);
  return created;
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

function buildLocalDashboard({ leaderId, serviceDate, periodStart, periodEnd } = {}, suppliedState = null) {
  const state = suppliedState || readLocalState();
  const today = dateOnly();
  syncLocalLaterReviews(state, today);
  const quarterlySync = syncLocalQuarterlyReengagement(state, today);
  const targetSunday = serviceDate || nextSunday(today);
  const weekEnd = addDays(today, 7);
  const leaders = state.people.filter((person) => person.member_status === "leader");
  const openTasks = state.tasks
    .filter((task) => task.status === "open")
    .filter((task) => !leaderId || String(task.assigned_leader_id) === String(leaderId))
    .map((task) => enrichTask(task, state));
  const memberCareTasks = openTasks.filter((task) => task.task_type === "member_care");
  const visitationTasks = openTasks.filter((task) => task.task_type === "visitation");
  const actionTasks = openTasks.filter((task) => !["member_care", "visitation"].includes(task.task_type));
  const confirmedCommitments = latestSundayCommitments(state.commitments)
    .filter(
      (commitment) =>
        commitment.gathering_type === "sunday_service" &&
        commitment.gathering_date === targetSunday &&
        commitment.response === "yes" &&
        commitment.resolution === "pending",
    )
    .filter((commitment) => !leaderId || String(state.assignments.filter(row => String(row.person_id) === String(commitment.person_id) && row.status === "active").sort((a,b) => b.assigned_at.localeCompare(a.assigned_at))[0]?.assigned_leader_id || commitment.leader_id) === String(leaderId))
    .map((commitment) => enrichCommitment(commitment, state));
  const sundayCommitments = latestSundayCommitments(state.commitments)
    .filter(
      (commitment) =>
        commitment.gathering_type === "sunday_service" &&
        commitment.gathering_date === targetSunday &&
        commitment.response === "yes",
    )
    .filter((commitment) => !leaderId || String(state.assignments.filter(row => String(row.person_id) === String(commitment.person_id) && row.status === "active").sort((a,b) => b.assigned_at.localeCompare(a.assigned_at))[0]?.assigned_leader_id || commitment.leader_id) === String(leaderId))
    .map((commitment) => enrichCommitment(commitment, state));
  const upcomingCommitments = state.commitments
    .filter((commitment) =>
      commitment.gathering_date >= today
      && commitment.gathering_date <= weekEnd
      && commitment.response === "yes"
      && commitment.resolution === "pending",
    )
    .filter((commitment) => !leaderId || String(state.assignments.filter(row => String(row.person_id) === String(commitment.person_id) && row.status === "active").sort((a,b) => b.assigned_at.localeCompare(a.assigned_at))[0]?.assigned_leader_id || commitment.leader_id) === String(leaderId))
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

  const guestInvitations = (state.guestInvitations || []).filter(row => row.service_date === targetSunday && (!leaderId || String(row.responsible_leader_id) === String(leaderId))).map(row => {
    const person = allLocalPeople(state).find(person => String(person._id || person.id) === String(row.person_id)) || null;
    const leader = allLocalPeople(state).find(person => String(person._id || person.id) === String(row.responsible_leader_id));
    return { ...row, person, person_archived: person?.member_status === "archived", display_name: guestInvitationName({ ...row, person }), leader_name: leader ? fullName(leader) : null, version: guestInvitationVersion(row) };
  });
  const forecast = extendGuestForecast(buildAttendanceForecast({
    people: allLocalPeople(state).filter(person => !leaderId || String(currentOwnerFor(state, person._id || person.id)) === String(leaderId)),
    attendancePlans: state.attendancePlans,
    commitments: latestSundayCommitments(state.commitments),
    serviceDate: targetSunday,
  }), guestInvitations);
  const attendanceRoster = allLocalPeople(state)
    .filter((person) => ["member", "leader"].includes(person.member_status))
    .filter(person => !leaderId || String(currentOwnerFor(state, person._id || person.id)) === String(leaderId))
    .map((person) => ({
      ...person,
      attendance_plan: state.attendancePlans.find(
          (plan) =>
            String(plan.person_id) === String(person._id || person.id) &&
            plan.service_date === targetSunday,
        ) || null,
      default_expected: false,
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
    .filter((contact) => !["member", "leader", "archived"].includes(contact.member_status))
    .map((contact) => {
      const contactId = String(contact._id || contact.id);
      const assignment = activeAssignmentByPerson.get(contactId);
      const nextTask = state.tasks
        .filter((task) => String(task.person_id) === contactId && task.status === "open")
        .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0] || null;
      return {
        ...contact,
        ...deriveCandidateSignals({ contact, followUps: state.followUps, commitments: state.commitments }),
        sunday_reliability: summarizeSundayCommitments(
          state.commitments.filter((commitment) => String(commitment.person_id) === contactId),
        ),
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
    periodStart,
    periodEnd,
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
    visitation_tasks: sortTasks(visitationTasks, today),
    confirmed_commitments: confirmedCommitments,
    sunday_commitments: sundayCommitments,
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
    guest_invitations: guestInvitations,
    attendance_roster: attendanceRoster,
    sunday_confirmation_roster: sundayConfirmationRows({ people: allLocalPeople(state), assignments: state.assignments, commitments: state.commitments, plans: state.attendancePlans, serviceDate: targetSunday, leaderId }),
    recent_sunday_results: state.commitments
      .filter((commitment) => commitment.gathering_type === "sunday_service" && commitment.resolution !== "pending")
      .filter((commitment) => !leaderId || String(commitment.leader_id) === String(leaderId))
      .map((commitment) => enrichCommitment(commitment, state))
      .sort((a, b) => String(b.gathering_date).localeCompare(String(a.gathering_date)))
      .slice(0, 40),
    sunday_missed_history: buildLocalMissedSundayHistory(state, leaderId),
    service_date: targetSunday,
    source: "local",
  };
}

function buildLocalMissedSundayHistory(state, leaderId) {
  const people = allLocalPeople(state);
  const peopleById = new Map(people.map(person => [String(person._id || person.id), person]));
  const owners = new Map(state.assignments
    .filter(assignment => assignment.status === "active")
    .sort((a, b) => String(a.assigned_at).localeCompare(String(b.assigned_at)))
    .map(assignment => [String(assignment.person_id), String(assignment.assigned_leader_id)]));
  const byPerson = new Map();
  for (const commitment of state.commitments || []) {
    if (commitment.gathering_type !== "sunday_service" || commitment.response !== "yes") continue;
    const id = String(commitment.person_id);
    const rows = byPerson.get(id) || [];
    rows.push(commitment);
    byPerson.set(id, rows);
  }
  const ranks = { pending: 0, cancelled: 1, no_show: 2, attended: 3 };
  const openTasks = (state.tasks || []).filter(task => task.status === "open");
  return [...byPerson.entries()].flatMap(([id, rows]) => {
    const person = peopleById.get(id);
    if (!person || person.member_status === "archived") return [];
    const byDate = new Map();
    for (const row of rows) {
      const previous = byDate.get(row.gathering_date);
      if (!previous || (ranks[row.resolution] || 0) > (ranks[previous.resolution] || 0)) byDate.set(row.gathering_date, row);
    }
    const resolved = [...byDate.values()].filter(row => ["attended", "no_show"].includes(row.resolution));
    const missed = [...byDate.values()].filter(row => row.resolution === "no_show").sort((a, b) => String(b.gathering_date).localeCompare(String(a.gathering_date)));
    if (!missed.length) return [];
    const workerId = owners.get(id) || missed[0].leader_id;
    if (leaderId && String(workerId) !== String(leaderId)) return [];
    const worker = peopleById.get(String(workerId)) || null;
    const nextTask = openTasks.filter(task => String(task.person_id) === id).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0] || null;
    return [{
      person_id: id,
      person,
      assigned_leader_id: workerId,
      assigned_leader: worker,
      missed_count: missed.length,
      decided_count: resolved.length,
      missed_sundays: missed.map(row => ({ ...enrichCommitment(row, state), person })),
      next_task: nextTask ? enrichTask(nextTask, state) : null,
    }];
  }).sort((a, b) => String(b.missed_sundays[0].gathering_date).localeCompare(String(a.missed_sundays[0].gathering_date)));
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
    visitation_tasks:
      data?.visitation_tasks || (data?.open_tasks || []).filter((task) => task.task_type === "visitation"),
    confirmed_commitments: data?.confirmed_commitments || [],
    sunday_commitments: data?.sunday_commitments || data?.confirmed_commitments || [],
    upcoming_commitments: data?.upcoming_commitments || data?.confirmed_commitments || [],
    visitation_follow_ups: data?.visitation_follow_ups || [],
    quarterly_backlog_count: data?.quarterly_backlog_count || 0,
    quarterly_active_limit: data?.quarterly_active_limit || QUARTERLY_ACTIVE_LIMIT_PER_LEADER,
    unassigned_contacts: data?.unassigned_contacts || [],
    later_contacts: data?.later_contacts || [],
    contacts: data?.contacts || data?.crm_contacts || [],
    team_stats: (data?.team_stats || []).map((stat) => ({
      ...stat,
      confirmed_non_members: stat.confirmed_non_members ?? stat.confirmed_guests ?? stat.confirmed_this_sunday ?? 0,
      confirmed_guests: stat.confirmed_guests ?? stat.confirmed_non_members ?? stat.confirmed_this_sunday ?? 0,
    })),
    attendance_roster: data?.attendance_roster || [],
    guest_invitations: data?.guest_invitations ?? null,
    sunday_confirmation_roster: data?.sunday_confirmation_roster ?? null,
    recent_sunday_results: data?.recent_sunday_results || [],
    sunday_missed_history: data?.sunday_missed_history || [],
    attendance_forecast: {
      ...forecast,
      service_date: forecast.service_date || data?.service_date,
      known_away: forecast.known_away ?? forecast.regular_away ?? 0,
      expected_total: forecast.expected_total ?? forecast.total_expected ?? 0,
      confirmed_regular: forecast.confirmed_regular ?? 0,
      confirmed_members: forecast.confirmed_members ?? ((forecast.confirmed_regular ?? 0) + (forecast.confirmed_irregular ?? 0)),
      confirmed_non_members: forecast.confirmed_non_members ?? forecast.confirmed_guests ?? 0,
      confirmed_total:
        forecast.confirmed_total
        ?? ((forecast.confirmed_members ?? ((forecast.confirmed_regular ?? 0) + (forecast.confirmed_irregular ?? 0)))
          + (forecast.confirmed_non_members ?? forecast.confirmed_guests ?? 0)),
    },
    source,
  };
}

async function runRemoteOrLocal(remoteCall, localCall) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return { data: null, error: unavailableError(), source: "unavailable" };
    return { data: normalizeDashboard(localCall(), "demo"), error: null, source: "demo" };
  }
  try {
    const data = await withTimeout(remoteCall(client));
    return { data: normalizeDashboard(data, "convex"), error: null, source: "convex" };
  } catch (error) {
    return { data: null, error, source: "convex" };
  }
}

export async function getDashboard(options = {}) {
  const args = {
    ...(options.leaderId ? { leaderId: options.leaderId } : {}),
    ...(options.serviceDate ? { serviceDate: options.serviceDate } : {}),
    ...(options.periodStart ? { periodStart: options.periodStart } : {}),
    ...(options.periodEnd ? { periodEnd: options.periodEnd } : {}),
  };
  return await runRemoteOrLocal(
    async (client) => await client.query(api.crm.getDashboard, args),
    () => buildLocalDashboard(options),
  );
}

export async function getJourneyOverview(options = {}) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return { data: null, error: unavailableError(), source: "unavailable" };
    const eventsByPerson = new Map();
    const peopleById = new Map(mockPeople.map(person => [String(person._id || person.id), person]));
    for (const row of mockAttendance) {
      const service = mockServices.find(item => String(item._id || item.id) === String(row.service_id));
      const person = peopleById.get(String(row.person_id));
      if (!service || !person) continue;
      const events = eventsByPerson.get(String(row.person_id)) || [];
      events.push({ id: service.id, date: service.service_date, label: service.service_type.replaceAll("_", " "), time: service.service_time, location: service.location });
      eventsByPerson.set(String(row.person_id), events);
    }
    for (const meeting of mockMeetings) {
      for (const id of meeting.attendees || []) {
        const events = eventsByPerson.get(String(id)) || [];
        events.push({ id: meeting.id, date: meeting.meeting_date, label: meeting.title || meeting.meeting_type.replaceAll("_", " "), time: meeting.start_time, location: meeting.location });
        eventsByPerson.set(String(id), events);
      }
    }
    const firstTimers = [...eventsByPerson.entries()].flatMap(([id, events]) => {
      const person = peopleById.get(id);
      const first = events.sort((a, b) => a.date.localeCompare(b.date))[0];
      if (!person || !first) return [];
      return [{ person: { id, first_name: person.first_name, last_name: person.last_name, phone: person.phone, email: person.email, member_status: person.member_status }, events: [first], assigned_worker: null, date_only: false }];
    });
    return {
      data: {
        first_timers: options.leaderId ? [] : firstTimers,
        new_converts: [],
        unnamed_decisions: options.leaderId ? [] : mockServices.filter(service => service.salvation_decisions > 0).map(service => ({ date: service.service_date, label: service.service_type.replaceAll("_", " "), count: service.salvation_decisions })),
        unnamed_decisions_available: !options.leaderId,
      }, error: null, source: "demo",
    };
  }
  try {
    const data = await withTimeout(client.query(api.crm.getJourneyOverview, options.leaderId ? { leaderId: options.leaderId } : {}), 10000);
    return { data, error: null, source: "convex" };
  } catch (error) {
    return { data: null, error, source: "convex" };
  }
}

// Convex subscriptions give active workers timely shared updates. The caller
// owns the returned cleanup function so switching a filter or leaving the page
// stops the old subscription rather than leaving a background poll running.
export async function watchDashboard(options = {}, { onUpdate, onError } = {}) {
  if (isDemoMode()) return () => {};
  try {
    const client = await getConvexClient();
    if (!client) {
      onError?.(unavailableError());
      return () => {};
    }
    const args = {
      ...(options.leaderId ? { leaderId: options.leaderId } : {}),
      ...(options.serviceDate ? { serviceDate: options.serviceDate } : {}),
      ...(options.periodStart ? { periodStart: options.periodStart } : {}),
      ...(options.periodEnd ? { periodEnd: options.periodEnd } : {}),
    };
    return client.onUpdate(
      api.crm.getDashboard,
      args,
      (data) => onUpdate?.(normalizeDashboard(data, "convex")),
      (error) => onError?.(error),
    );
  } catch (error) {
    onError?.(error);
    return () => {};
  }
}

export function getDemoDashboard(options = {}) {
  if (!isDemoMode()) return null;
  return normalizeDashboard(buildLocalDashboard(options, seedLocalState()), "demo");
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
    guest_invitations: (state.guestInvitations || []).filter(row => String(row.person_id) === String(personId)),
    sunday_reliability: summarizeSundayCommitments(
      state.commitments.filter((commitment) => String(commitment.person_id) === String(personId)),
    ),
    active_assignment: activeAssignment ? {
      ...activeAssignment,
      assigned_leader: leaderFor(activeAssignment.assigned_leader_id),
    } : null,
    assignment_history: state.assignments.filter(row => String(row.person_id) === String(personId)).map(row => ({ ...row, assigned_leader_name: fullName(leaderFor(row.assigned_leader_id)) })),
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
  const localId = !isRemoteId(personId);
  if (client && !localId) {
    try {
      const data = await withTimeout(client.query(api.crm.getContactProfile, { personId }));
      return { data: { ...data, source: "convex" }, error: null, source: "convex" };
    } catch (error) {
      return { data: null, error, source: "convex" };
    }
  }
  if (!isDemoMode()) return { data: null, error: unavailableError(), source: "unavailable" };
  try {
    return { data: buildLocalContactProfile(personId), error: null, source: "local" };
  } catch (error) {
    return { data: null, error, source: "local" };
  }
}

export async function getSundayCommitments() {
  const client = getClient();
  if (client) {
    try {
      const data = await withTimeout(client.query(api.crm.getSundayCommitments, {}));
      return { data: data || [], error: null, source: "convex" };
    } catch (error) {
      return { data: null, error, source: "convex" };
    }
  }
  if (!isDemoMode()) return { data: null, error: unavailableError(), source: "unavailable" };
  try {
    const state = readLocalState();
    return {
      data: (state.commitments || [])
        .filter((commitment) => commitment.gathering_type === "sunday_service" && commitment.response === "yes")
        .sort((a, b) => String(b.gathering_date).localeCompare(String(a.gathering_date))),
      error: null,
      source: "demo",
    };
  } catch (error) {
    return { data: null, error, source: "demo" };
  }
}

export async function getAssignmentDirectory() {
  const client = getClient();
  if (client) {
    try { return { data: await withTimeout(client.query(api.crm.getAssignmentDirectory, {})), error: null, source: "convex" }; }
    catch (error) { return { data: null, error, source: "convex" }; }
  }
  if (!isDemoMode()) return { data: null, error: unavailableError(), source: "unavailable" };
  const state = readLocalState();
  const people = new Map(allLocalPeople(state).map(person => [String(person._id || person.id), person]));
  const owners = new Map(state.assignments.filter(row => row.status === "active").sort((a,b) => a.assigned_at.localeCompare(b.assigned_at)).map(row => [String(row.person_id), row]));
  const data = [...people.values()].filter(person => person.member_status !== "archived").map(person => {
    const id = person._id || person.id;
    const owner = owners.get(String(id));
    return { ...person, _id: id, name: fullName(person),
      assignment_id: owner?._id ?? null, assigned_leader_id: owner?.assigned_leader_id ?? null,
      assigned_leader_name: owner ? fullName(people.get(String(owner.assigned_leader_id))) : null,
      blocked_reason: person.contact_category === "do_not_contact" ? "Asked not to be contacted" : person.is_paused ? "Follow-up paused — reactivate explicitly first" : null,
      open_follow_up_count: state.tasks.filter(task => String(task.person_id) === String(id) && task.status === "open" && isDelegatedFollowUpTask(task)).length,
    };
  }).sort((a,b) => a.name.localeCompare(b.name));
  return { data, error: null, source: "demo" };
}

// This path has an explicit demo implementation; connected request failures
// always return their error and never substitute local invitations.
export async function saveExpectedGuest(action, args) {
  const client = getClient();
  if (client) {
    try { return { data: await client.mutation(api.expectedGuests[action], args), error: null, source: "convex" }; }
    catch (error) { return { data: null, error, source: "convex" }; }
  }
  if (!isDemoMode()) return { data: null, error: unavailableError(), source: "unavailable" };
  try {
    if (action === "attendance") throw new Error("Demo invitations do not create check-ins. Record actual attendance through the connected church register.");
    const state = structuredClone(readLocalState());
    state.guestInvitations ||= [];
    const people = allLocalPeople(state), at = new Date().toISOString();
    let row = state.guestInvitations.find(row => row._id === args.invitationId);
    if (action !== "create" && (!row || guestInvitationVersion(row) !== args.expectedVersion)) throw new Error("Invitation changed. Reload before saving");
    if (action !== "create" && (!args.changeReason?.trim() || args.changeReason.length > 500)) throw new Error("Add a correction reason of 1–500 characters");
    const before = row ? { ...row, history: undefined } : null;
    if (["create", "update"].includes(action)) {
      if (action === "create" && !["tentative", "coming"].includes(args.state)) throw new Error("Add an invitation as tentative or coming");
      if (row?.person_id && args.nameUnknown) throw new Error("This invitation is already linked to a known person");
      assertDate("Sunday", args.serviceDate);
      if (new Date(`${args.serviceDate}T12:00:00Z`).getUTCDay() !== 0) throw new Error("Choose a Sunday date");
      if (args.nameUnknown && (!args.inviterId || args.reportSource !== "inviter_report")) throw new Error("An unnamed guest needs an inviter and an inviter report");
      const inviter = people.find(person => String(person._id || person.id) === String(args.inviterId));
      if (args.reportSource === "inviter_report" && !inviter) throw new Error("Choose the inviter");
      const firstName = args.firstName?.trim() || undefined;
      if (args.nameUnknown && (firstName || args.lastName?.trim())) throw new Error("Leave the guest name blank while it is not known");
      if ([firstName, args.lastName].some(value => value?.length > 100) || (args.note?.length || 0) > 2000) throw new Error("Names must be at most 100 characters and notes at most 2000");
      validatePersonInput({ ...(args.nameUnknown ? {} : { first_name: firstName }), phone: args.phone || undefined, email: args.email || undefined }, !args.nameUnknown);
      if (args.state === "no_show" && args.serviceDate >= dateOnly()) throw new Error("Record non-arrival only after the Sunday");
      if (args.state === "no_show" && !["coming", "no_show"].includes(row?.state)) throw new Error("A tentative invitation is not a missed confirmation. Cancel it instead");
      const data = { service_date: args.serviceDate, name_unknown: args.nameUnknown, first_name: firstName, last_name: args.lastName?.trim() || undefined,
        inviter_id: args.inviterId, inviter_name: inviter ? fullName(inviter) : undefined, responsible_leader_id: args.leaderId,
        phone: args.phone || undefined, email: normalizeEmail(args.email), state: args.state, report_source: args.reportSource, note: args.note?.trim() || undefined, entered_in_error: args.enteredInError || false };
      if (action === "create") {
        row = { ...data, _id: makeId("demo-invitation"), friend_number: Math.max(0, ...state.guestInvitations.filter(item => item.inviter_id === args.inviterId && item.service_date === args.serviceDate).map(item => item.friend_number)) + 1, revision: 0, history: [], created_at: at, updated_at: at };
        state.guestInvitations.push(row);
      } else {
        if (row.inviter_id !== data.inviter_id || row.service_date !== data.service_date) row.friend_number = Math.max(0, ...state.guestInvitations.filter(item => item._id !== row._id && item.inviter_id === data.inviter_id && item.service_date === data.service_date).map(item => item.friend_number)) + 1;
        Object.assign(row, data);
      }
    } else if (action === "link") {
      if (row.entered_in_error) throw new Error("Correct the invalidated invitation before linking it");
      if (Boolean(args.personId) === Boolean(args.createPerson)) throw new Error("Choose an existing person or explicitly create one");
      let person = people.find(person => String(person._id || person.id) === String(args.personId));
      if (args.createPerson) {
        if (row.person_id || row.name_unknown || !row.first_name) throw new Error("Add the real name before creating a person, and do not create another linked person");
        if (people.some(person => person.member_status !== "archived" && ((normalizeEmail(row.email) && normalizeEmail(row.email) === normalizeEmail(person.email)) || (normalizePhone(row.phone) && normalizePhone(row.phone) === normalizePhone(person.phone))))) throw new Error("An existing person has matching contact details. Link them instead");
        person = { _id: makeId("demo-person"), first_name: row.first_name, last_name: row.last_name || "", member_status: "guest", phone: row.phone, email: row.email, invited_by_id: row.inviter_id, created_at: at, updated_at: at };
        state.people.push(person);
      }
      if (!person || person.member_status === "archived" || person.contact_category === "do_not_contact" || person.is_paused) throw new Error("Choose an active, unrestricted person");
      if (String(person._id || person.id) === String(row.inviter_id)) throw new Error("The guest cannot be their own inviter");
      Object.assign(row, { person_id: person._id || person.id, name_unknown: false, first_name: person.first_name, last_name: person.last_name || undefined });
    } else throw new Error("Unsupported invitation action");
    row.history.push({ at, action: action === "link" ? args.createPerson ? "known_person_created_and_linked" : "existing_person_linked" : action === "create" ? "invitation_added" : "invitation_corrected", change_reason: args.changeReason, before, after: { ...row, history: undefined } });
    if (action !== "create") row.revision++;
    row.updated_at = at;
    writeLocalState(state);
    return { data: row, error: null, source: "demo" };
  } catch (error) { return { data: null, error, source: "demo" }; }
}

export async function assignContact(personId, leaderId, dueDate = dateOnly(), options = {}) {
  const createFirstContactTask = options.createFirstContactTask !== false;
  const client = getClient();
  if (client) {
    try {
      const data = await client.mutation(api.crm.assignContact, {
        personId, assignedLeaderId: leaderId, firstContactDueDate: dueDate,
        createFirstContactTask,
        ...(options.reason ? { reason: options.reason } : {}),
        ...(options.expectedAssignmentId !== undefined ? { expectedAssignmentId: options.expectedAssignmentId } : {}),
      });
      return { data, error: null, source: "convex" };
    } catch (error) { return { data: null, error, source: "convex" }; }
  }
  if (!isDemoMode()) return { data: null, error: unavailableError(), source: "unavailable" };
  const state = readLocalState();
  const person = [...state.contacts, ...state.people].find(person => String(person._id || person.id) === String(personId));
  const leader = state.people.find(person => String(person._id || person.id) === String(leaderId));
  if (!person) return { data: null, error: new Error("Person not found"), source: "local" };
  if (!canFollowUp(person)) return { data: null, error: new Error("Follow-up is paused or this person has requested no contact."), source: "local" };
  if (!leader || leader.member_status !== "leader") return { data: null, error: new Error("Choose a valid leader"), source: "local" };
  const history = state.assignments.filter(row => String(row.person_id) === String(personId));
  const active = history.filter(row => row.status === "active").sort((a,b) => b.assigned_at.localeCompare(a.assigned_at));
  if (options.expectedAssignmentId !== undefined && (active[0]?._id ?? null) !== options.expectedAssignmentId)
    return { data: null, error: new Error("Assignment changed since this list was loaded. Refresh and try again."), source: "local" };
  const now = new Date().toISOString();
  const current = active.find(row => String(row.assigned_leader_id) === String(leaderId));
  active.forEach(row => { if (row !== current) Object.assign(row, { status: "ended", ended_at: now, updated_at: now }); });
  const assignment = current || { _id: makeId("local-assignment"), person_id: personId, assigned_leader_id: leaderId, status: "active", assigned_at: now, created_at: now, updated_at: now };
  if (!current) state.assignments.push(assignment);
  for (const task of state.tasks) {
    if (String(task.person_id) !== String(personId) || task.status !== "open" || !isDelegatedFollowUpTask(task) || String(task.assigned_leader_id) === String(leaderId)) continue;
    task.ownership_history = [...(task.ownership_history || []), { from_leader_id: task.assigned_leader_id, to_leader_id: leaderId, assignment_id: assignment._id, at: now }];
    task.assigned_leader_id = leaderId; task.updated_at = now;
  }
  const outreach = !["member", "leader", "archived"].includes(person.member_status)
    && (["contact", "guest", "visitor", "new_believer"].includes(person.member_status) || person.entry_point === "evangelism" || Boolean(person.contact_date));
  const task = !history.length && createFirstContactTask && outreach && !state.tasks.some(row => String(row.person_id) === String(personId) && row.task_type === "first_contact") ? {
    _id: makeId("local-task"), person_id: personId, assigned_leader_id: leaderId,
    task_type: "first_contact", due_date: dueDate, status: "open", priority: "high",
    reason: options.reason || "Make the first follow-up contact", created_at: now, updated_at: now,
  } : null;
  if (task) state.tasks.push(task);
  writeLocalState(state);
  return { data: { assignment, task }, error: null, source: "local" };
}

export async function batchAssignContacts(personIds, leaderId, dueDate = dateOnly(), options = {}) {
  const results = [], errors = [], succeededPersonIds = [];
  let source = "unavailable";
  for (const personId of new Set(personIds)) {
    const res = await assignContact(personId, leaderId, dueDate, {
      ...options,
      ...(options.expectedAssignments && Object.hasOwn(options.expectedAssignments, personId) ? { expectedAssignmentId: options.expectedAssignments[personId] } : {}),
    });
    source = res.source;
    if (res.error) errors.push({ personId, error: res.error });
    else { results.push(res.data); succeededPersonIds.push(personId); }
  }
  return { data: results, errors, succeededPersonIds,
    error: errors.length ? new Error(`${results.length} assigned; ${errors.length} failed`) : null, source };
}

export async function captureLocalEvangelismContact(contact) {
  const state = readLocalState();
  const personId = contact._id || contact.id;
  const existingIndex = state.contacts.findIndex(
    (candidate) => String(candidate._id) === String(personId),
  );
  const previous = existingIndex >= 0 ? state.contacts[existingIndex] : null;
  const category = contact.response ?? contact.contact_category ?? previous?.contact_category ?? "not_assessed";
  const closed = ["do_not_contact", "has_church", "wrong_number"].includes(category);
  const normalized = {
    ...previous,
    ...contact,
    _id: personId,
    member_status: outreachMemberStatus({ ...previous, ...contact }),
    response: category,
    contact_category: category,
    follow_up_status: closed ? "closed" : previous?.follow_up_status || "active",
  };
  const reintroduced = Boolean(
    previous?.contact_date
    && normalized.contact_date
    && normalized.contact_date > previous.contact_date,
  );
  if (existingIndex >= 0) state.contacts[existingIndex] = normalized;
  else state.contacts.unshift(normalized);
  if (category === "do_not_contact") {
    for (const task of state.tasks) {
      if (String(task.person_id) === String(personId) && task.status === "open"
        && isOutreachTask(task)) {
        task.status = "cancelled";
        task.outcome = "do_not_contact";
        task.updated_at = new Date().toISOString();
      }
    }
  }
  writeLocalState(state);

  if (!closed && !previous && contact.assigned_leader_id) {
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
  if (!canFollowUp(person)) return { data: null, error: new Error("Follow-up is paused or this person has requested no contact."), source: "local" };
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
  const person = allLocalPeople(state).find(p => String(p._id || p.id) === String(task.person_id));
  if (person && !canFollowUp(person)) return { data: null, error: new Error("Follow-up is paused or this person has requested no contact."), source: "local" };
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
    const commitmentNote = String(details.commitmentNote || details.notes || "").trim() || undefined;
    const commitmentAt = new Date().toISOString();
    commitment.response = details.attendanceResponse;
    commitment.resolution = "pending";
    if (details.attendanceResponse === "yes" && commitmentNote) commitment.confirmation_note = commitmentNote;
    commitment.history = [...(commitment.history || []), { at: commitmentAt, leader_id: details.leaderId || task.assigned_leader_id, action: details.attendanceResponse === "yes" ? "confirmed" : `response_${details.attendanceResponse}`, ...(commitmentNote ? { note: commitmentNote } : {}) }];
    commitment.updated_at = commitmentAt;
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
      contact.later_reason = details.nextReason || details.notes || "Moved after follow-up";
      contact.resume_date = details.resumeDate || addDays(today, 90);
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
    if (details.closeContact) {
      contact.follow_up_status = "closed";
      contact.pipeline_stage = "closed";
      contact.closed_reason = details.closeReason || details.nextReason || details.notes || "Follow-up closed";
      contact.closed_at = new Date().toISOString();
      contact.moved_to_later_at = undefined;
      contact.resume_date = undefined;
      if (details.closeReason === "do_not_contact") {
        contact.contact_category = "do_not_contact";
        contact.response = "do_not_contact";
        const outreachRecord = mockEvangelismContacts.find(item => String(item._id || item.id) === String(task.person_id));
        if (outreachRecord) {
          outreachRecord.contact_category = "do_not_contact";
          outreachRecord.response = "do_not_contact";
        }
      }
      state.tasks.forEach((openTask) => {
        if (String(openTask.person_id) === String(task.person_id) && openTask.status === "open"
          && (details.closeReason !== "do_not_contact" || isOutreachTask(openTask))) {
          openTask.status = "cancelled";
          openTask.outcome = "contact_closed";
          openTask.updated_at = new Date().toISOString();
        }
      });
    }
  }
  writeLocalState(state);
  return { data: enrichTask(task, state), error: null, source: "local" };
}

export async function quickLogNoAnswer(taskId, leaderId) {
  const nextDate = addDays(dateOnly(), 2);
  return await completeTask(taskId, {
    leaderId,
    method: "call",
    outcome: "no_response",
    nextActionDate: nextDate,
    nextTaskType: "follow_up",
    skipAutomaticNextTask: true,
  });
}

export async function resolveCommitment(commitmentId, resolution, gathering = {}) {
  const client = getClient();
  if (client && !String(commitmentId).startsWith("demo-") && !String(commitmentId).startsWith("local-")) {
    try {
      const data = await client.mutation(api.crm.resolveCommitment, {
        commitmentId,
        resolution,
        ...gathering,
      });
      return { data, error: null, source: "convex" };
    } catch (error) {
      return { data: null, error, source: "convex" };
    }
  }
  if (resolution === "attended") return { data: null, error: new Error("Connected attendance recording requires the live backend. Demo expectations do not create check-ins.") };
  const state = readLocalState();
  const commitment = state.commitments.find((item) => String(item._id) === String(commitmentId));
  if (!commitment) {
    return { data: null, error: new Error("Commitment not found"), source: "local" };
  }
  const resolutionAt = new Date().toISOString();
  const resolutionNote = String(gathering?.note || "").trim() || undefined;
  const resolutionLeaderId = gathering?.leaderId || commitment.leader_id;
  commitment.resolution = resolution;
  commitment.resolution_note = resolutionNote;
  commitment.history = [...(commitment.history || []), { at: resolutionAt, leader_id: resolutionLeaderId, action: resolution, ...(resolutionNote ? { note: resolutionNote } : {}) }];
  commitment.resolved_at = resolutionAt;
  commitment.updated_at = resolutionAt;

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
    const contact = state.contacts.find((item) => String(item._id) === String(commitment.person_id));
    if (contact) {
      contact.sunday_no_show_count = noShowCount;
      contact.pipeline_stage = "no_show";
    }
  }
  if (resolution === "attended") {
    const contact = state.contacts.find((item) => String(item._id) === String(commitment.person_id));
    if (contact) {
      contact.pipeline_stage = "showed_up";
      contact.first_visit_date = contact.first_visit_date || commitment.gathering_date;
    }
    const assignment = state.assignments
      .filter((item) => String(item.person_id) === String(commitment.person_id) && item.status === "active")
      .sort((a, b) => String(b.assigned_at).localeCompare(String(a.assigned_at)))[0];
    const leaderId = assignment?.assigned_leader_id || commitment.leader_id;
    if (leaderId && !state.tasks.some((task) => String(task.person_id) === String(commitment.person_id) && task.status === "open")) {
      const now = new Date().toISOString();
      state.tasks.push({
        _id: makeId("local-task"),
        person_id: commitment.person_id,
        assigned_leader_id: leaderId,
        task_type: "follow_up",
        due_date: addDays(dateOnly(), 2),
        status: "open",
        priority: "high",
        reason: "Welcome them after attending and plan their next connection",
        created_at: now,
        updated_at: now,
      });
    }
  }
  writeLocalState(state);
  return { data: enrichCommitment(commitment, state), error: null, source: "local" };
}

export async function updateMissedSundayReason(commitmentId, note) {
  const client = getClient();
  if (client && isRemoteId(commitmentId)) {
    try {
      const data = await client.mutation(api.crm.updateMissedSundayReason, { commitmentId, note: String(note ?? "") });
      return { data, error: null, source: "convex" };
    } catch (error) {
      return { data: null, error, source: "convex" };
    }
  }
  const state = readLocalState();
  const commitment = state.commitments.find(row => String(row._id || row.id) === String(commitmentId));
  if (!commitment || commitment.gathering_type !== "sunday_service" || commitment.response !== "yes" || commitment.resolution !== "no_show") {
    return { data: null, error: new Error("This missed Sunday could not be found."), source: "local" };
  }
  const cleanNote = String(note ?? "").trim();
  if (cleanNote.length > 500) return { data: null, error: new Error("Keep the reason to 500 characters or fewer."), source: "local" };
  const now = new Date().toISOString();
  const leaderId = state.assignments
    .filter(assignment => String(assignment.person_id) === String(commitment.person_id) && assignment.status === "active")
    .sort((a, b) => String(b.assigned_at).localeCompare(String(a.assigned_at)))[0]?.assigned_leader_id || commitment.leader_id;
  const hadReason = Boolean(commitment.resolution_note && commitment.resolution_note !== "Not in the recorded Sunday attendance.");
  commitment.resolution_note = cleanNote || undefined;
  commitment.history = [...(commitment.history || []), {
    at: now,
    ...(leaderId ? { leader_id: leaderId } : {}),
    action: cleanNote ? (hadReason ? "reason_updated" : "reason_added") : "reason_cleared",
    ...(cleanNote ? { note: cleanNote } : {}),
  }];
  commitment.updated_at = now;
  writeLocalState(state);
  return { data: enrichCommitment(commitment, state), error: null, source: "local" };
}

export async function moveToLater(personId, options = {}) {
  const reason = options.reason || "Not ready for active weekly follow-up";
  const resumeDate = options.resumeDate || addDays(dateOnly(), 90);
  const client = getClient();
  if (client && isRemoteId(personId)) {
    try {
      const data = await client.mutation(api.crm.moveToLater, { personId, reason, resumeDate });
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
  contact.later_reason = reason;
  contact.resume_date = resumeDate;
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
  if (client && isRemoteId(personId)) {
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
  if (contact.contact_category === "do_not_contact") return { data: null, error: new Error("This person has requested no contact."), source: "local" };
  contact.is_paused = false;
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

export async function setAttendancePlan(personId, leaderId, serviceDate, status, notes, gathering = {}) {
  const client = getClient();
  if (client && isRemoteId(personId)) {
    try {
      const data = await client.mutation(api.crm.setAttendancePlan, {
        personId,
        leaderId,
        serviceDate,
        status,
        ...gathering,
        ...(notes ? { notes } : {}),
      });
      return { data, error: null, source: "convex" };
    } catch (error) {
      return { data: null, error, source: "convex" };
    }
  }
  if (status === "attended") return { data: null, error: new Error("Connected attendance recording requires the live backend.") };
  const state = readLocalState();
  const existing = state.attendancePlans.find(
    (plan) => String(plan.person_id) === String(personId) && plan.service_date === serviceDate,
  );
  const previousStatus = existing?.status;
  const cleanNote = String(notes || "").trim() || undefined;
  let commitment = state.commitments.find((item) => String(item.person_id) === String(personId) && item.gathering_type === "sunday_service" && item.gathering_date === serviceDate);
  const changedAt = new Date().toISOString();
  if (status === "confirmed") {
    if (!commitment) { commitment = { _id: makeId("local-commitment"), person_id: personId, leader_id: leaderId, gathering_type: "sunday_service", gathering_date: serviceDate, response: "yes", resolution: "pending", created_at: changedAt }; state.commitments.push(commitment); }
    commitment.response = "yes"; commitment.resolution = "pending"; commitment.confirmation_note = cleanNote || commitment.confirmation_note; commitment.resolution_note = undefined; commitment.resolved_at = undefined; commitment.history = [...(commitment.history || []), { at: changedAt, leader_id: leaderId, action: previousStatus === "confirmed" ? "confirmation_updated" : "confirmed", ...(cleanNote ? { note: cleanNote } : {}) }]; commitment.updated_at = changedAt;
  } else if (previousStatus === "confirmed" && commitment?.response === "yes" && commitment.resolution === "pending" && ["expected", "away", "absent"].includes(status)) {
    const resolution = status === "absent" ? "no_show" : "cancelled"; commitment.resolution = resolution; commitment.resolution_note = cleanNote; commitment.history = [...(commitment.history || []), { at: changedAt, leader_id: leaderId, action: resolution, ...(cleanNote ? { note: cleanNote } : {}) }]; commitment.resolved_at = changedAt; commitment.updated_at = changedAt;
  }
  const plan = existing || {
    _id: makeId("local-plan"),
    person_id: personId,
    leader_id: leaderId,
    service_date: serviceDate,
  };
  plan.status = status;
  plan.notes = cleanNote;
  plan.updated_at = changedAt;
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

export async function getGatheringChoices(gatheringType, gatheringDate) {
  const client = getClient();
  if (!client) return { data: null, error: new Error("Actual attendance requires a connected backend and an administrator account.") };
  try { return { data: await client.query(api.crm.getGatheringChoices, { gatheringType, gatheringDate }), error: null }; }
  catch (error) { return { data: null, error }; }
}

export async function previewFollowUpCorrection(followUpId) {
  const client = getClient();
  if (!client || !isRemoteId(followUpId)) return { data: null, error: unavailableError('Follow-up corrections require the connected church database.') };
  try {
    return { data: await client.query(api.corrections.previewFollowUp, { followUpId }), error: null };
  } catch (error) { return { data: null, error }; }
}

export async function correctFollowUp(details) {
  const client = getClient();
  if (!client || !isRemoteId(details.followUpId)) return { data: null, error: unavailableError('Follow-up corrections require the connected church database.') };
  try {
    return { data: await client.mutation(api.corrections.correctFollowUp, details), error: null };
  } catch (error) { return { data: null, error }; }
}

export async function correctCommitment(details) {
  const client = getClient();
  if (!client || !isRemoteId(details.commitmentId)) return { data: null, error: unavailableError('Confirmation corrections require the connected church database.') };
  try {
    return { data: await client.mutation(api.corrections.correctCommitment, details), error: null };
  } catch (error) { return { data: null, error }; }
}

export async function previewCommitmentCorrection(commitmentId) {
  const client = getClient();
  if (!client || !isRemoteId(commitmentId)) return { data: null, error: unavailableError('Confirmation corrections require the connected church database.') };
  try {
    return { data: await client.query(api.corrections.previewCommitment, { commitmentId }), error: null };
  } catch (error) { return { data: null, error }; }
}

export async function recordSundayResponse(person, serviceDate, response, note) {
  const args = {
    personId: person._id || person.id, leaderId: person.assigned_leader_id, serviceDate, response,
    expectedAssignmentId: person.assignment_id,
    expectedResponseVersion: sundayResponseVersion(person.sunday_commitment, person.attendance_plan),
    ...(note?.trim() ? { note: note.trim() } : {}),
  };
  const client = getClient();
  if (client) {
    try { return { data: await client.mutation(api.crm.recordSundayResponse, args), error: null, source: "convex" }; }
    catch (error) { return { data: null, error, source: "convex" }; }
  }
  if (!isDemoMode()) return { data: null, error: unavailableError() };
  const state = readLocalState();
  const fresh = sundayConfirmationRows({ people: allLocalPeople(state), assignments: state.assignments, commitments: state.commitments, plans: state.attendancePlans, serviceDate })
    .find(row => String(row._id || row.id) === String(args.personId));
  if (!fresh || fresh.contact_blocked || fresh.assignment_id !== args.expectedAssignmentId || !fresh.assigned_leader_id || fresh.assigned_leader_id !== args.leaderId
      || sundayResponseVersion(fresh.sunday_commitment, fresh.attendance_plan) !== args.expectedResponseVersion || fresh.actual_result) return { data: null, error: new Error("Sunday response or assignment changed, or this person cannot be contacted. Reload the list.") };
  const when = new Date().toISOString();
  let commitment = fresh.sunday_commitment;
  if (!commitment) {
    commitment = { _id: makeId("local-commitment"), person_id: args.personId, leader_id: args.leaderId, gathering_type: "sunday_service", gathering_date: serviceDate, response, resolution: "pending", created_at: when, history: [] };
    state.commitments.push(commitment);
  } else if (commitment.response === "yes" && response !== "yes" && commitment.resolution === "pending") {
    commitment.resolution = "cancelled";
    commitment.resolved_at = when;
    commitment.history = [...(commitment.history || []), { at: when, leader_id: args.leaderId, action: "cancelled", ...(args.note ? { note: args.note } : {}) }];
  } else if (response === "yes" && commitment.resolution === "cancelled") {
    commitment.resolution = "pending"; commitment.resolved_at = undefined;
  }
  Object.assign(commitment, { response, leader_id: args.leaderId, confirmation_note: args.note, updated_at: when });
  commitment.history = [...(commitment.history || []), { at: when, leader_id: args.leaderId, action: `response_${response}`, ...(args.note ? { note: args.note } : {}) }];
  if (["member", "leader"].includes(person.member_status)) {
    const plan = fresh.attendance_plan || { _id: makeId("local-plan"), person_id: args.personId, service_date: serviceDate, created_at: when };
    if (!fresh.attendance_plan) state.attendancePlans.push(plan);
    Object.assign(plan, { leader_id: args.leaderId, status: response === "yes" ? "confirmed" : response === "no" ? "away" : "expected", notes: args.note, updated_at: when });
  }
  writeLocalState(state);
  return { data: commitment, error: null, source: "demo" };
}
