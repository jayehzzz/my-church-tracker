import { api } from "../../../convex/_generated/api.js";
import {
  mockVisitations,
  getPersonById as getMockPersonById,
  getVisitationsByPerson as getMockVisitationsByPerson,
} from "../data/mockData.js";
import { getConvexHttpClient, isDemoMode, unavailableError } from "$lib/convex.js";

function getClient() {
  return getConvexHttpClient();
}

const unavailable = () => ({ data: null, error: unavailableError() });

function isConvexId(id) {
  if (!id || typeof id !== "string") return false;
  if (id.startsWith("mock-") || id.length < 15) return false;
  return /^[0-9a-z_-]{15,}$/i.test(id);
}

function withTimeout(promise, timeoutMs = 3500) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Convex request timed out")), timeoutMs)
    )
  ]);
}

// Helper to map _id to id for consistent frontend usage
function mapDoc(doc) {
  if (!doc) return null;
  return { ...doc, id: doc._id || doc.id };
}

// Helper to remove null/undefined values - Convex expects undefined (absent) not null
function cleanData(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined && v !== '')
  );
}

export async function getAll() {
  const client = getClient();
  if (!client) {
    return isDemoMode() ? { data: mockVisitations.map(mapDoc), error: null } : unavailable();
  }

  try {
    const data = await withTimeout(client.query(api.visitations.getAll), 3500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getById(id) {
  const client = getClient();
  if (!client || !isConvexId(id)) {
    if (!isDemoMode()) return unavailable();
    const mock = mockVisitations.find(v => String(v.id) === String(id));
    return { data: mock ? mapDoc(mock) : null, error: null };
  }

  try {
    const data = await withTimeout(client.query(api.visitations.getById, { id }), 2500);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function create(visitationData) {
  if (isDemoMode()) return { data: null, error: new Error("Connected attendance and care recording requires the live backend. Demo records are read-only.") };
  const client = getClient();
  const linkedIds = [
    visitationData.person_id,
    visitationData.visited_by_id,
    visitationData.source_task_id,
  ].filter(Boolean);
  if (!client || linkedIds.some((id) => !isConvexId(id))) {
    if (!isDemoMode()) return unavailable();
    const person = getMockPersonById(visitationData.person_id);
    const visitor = getMockPersonById(visitationData.visited_by_id);
    const newVisit = {
      ...visitationData,
      id: `mock-${Date.now()}`,
      person_visited_name: visitationData.person_visited_name
        || [person?.first_name, person?.last_name].filter(Boolean).join(" "),
      visited_by_name: visitationData.visited_by_name
        || [visitor?.first_name, visitor?.last_name].filter(Boolean).join(" "),
      status: visitationData.status
        || (["not_home", "declined"].includes(visitationData.outcome) ? "unsuccessful" : "completed"),
      interaction_type: visitationData.interaction_type || "home_visit",
      purpose: visitationData.purpose || "general_care",
      created_at: new Date().toISOString(),
    };
    mockVisitations.unshift(newVisit);

    if (visitationData.source_task_id) {
      const crm = await import("$lib/services/followUpCrmService.js");
      const completed = await crm.completeTask(visitationData.source_task_id, {
        leaderId: visitationData.visited_by_id,
        followUpDate: visitationData.visit_date,
        method: visitationData.interaction_type === "phone_call" ? "call" : "in_person",
        outcome: visitationData.outcome,
        notes: visitationData.notes,
        nextActionDate: visitationData.follow_up_required
          ? visitationData.follow_up_date
          : undefined,
        nextTaskType: "member_care",
        nextReason: visitationData.follow_up_required
          ? `Continue pastoral care after ${visitationData.visit_date}`
          : undefined,
        skipAutomaticNextTask: true,
      });
      if (completed.error) {
        const index = mockVisitations.findIndex((visit) => visit.id === newVisit.id);
        if (index >= 0) mockVisitations.splice(index, 1);
        return { data: null, error: completed.error };
      }
      if (visitationData.follow_up_required && visitationData.follow_up_date) {
        const dashboard = await crm.getDashboard();
        const nextTask = [
          ...(dashboard.data?.tasks || []),
          ...(dashboard.data?.member_care_tasks || []),
        ].find((task) =>
          String(task.person_id) === String(visitationData.person_id)
          && task.status === "open"
          && task.due_date === visitationData.follow_up_date
          && task.task_type === "member_care",
        );
        newVisit.next_task_id = nextTask?._id || nextTask?.id;
        newVisit.next_task = nextTask || null;
      }
    } else if (
      visitationData.follow_up_required
      && visitationData.follow_up_date
      && visitationData.person_id
      && visitationData.visited_by_id
    ) {
      const crm = await import("$lib/services/followUpCrmService.js");
      const nextTask = await crm.createTask({
        personId: visitationData.person_id,
        assignedLeaderId: visitationData.visited_by_id,
        dueDate: visitationData.follow_up_date,
        taskType: "member_care",
        priority: ["concerns_shared", "prayer_request_received"].includes(visitationData.outcome)
          ? "high"
          : "normal",
        reason: `Continue pastoral care after ${visitationData.visit_date}`,
      });
      if (nextTask.error) {
        const index = mockVisitations.findIndex((visit) => visit.id === newVisit.id);
        if (index >= 0) mockVisitations.splice(index, 1);
        return { data: null, error: nextTask.error };
      }
      newVisit.next_task_id = nextTask.data?._id || nextTask.data?.id;
    }
    return { data: newVisit, error: null };
  }

  try {
    const data = await withTimeout(client.mutation(api.visitations.create, cleanData(visitationData)), 5000);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function update(id, visitationData) {
  if (isDemoMode()) return { data: null, error: new Error("Connected attendance and care recording requires the live backend. Demo records are read-only.") };
  const client = getClient();
  if (!client || !isConvexId(id)) {
    if (!isDemoMode()) return unavailable();
    const index = mockVisitations.findIndex(v => v.id === id);
    if (index !== -1) {
      mockVisitations[index] = { ...mockVisitations[index], ...visitationData };
      const visit = mockVisitations[index];
      if (
        visit.follow_up_required
        && visit.follow_up_date
        && visit.person_id
        && visit.visited_by_id
        && !visit.next_task_id
      ) {
        const crm = await import("$lib/services/followUpCrmService.js");
        const nextTask = await crm.createTask({
          personId: visit.person_id,
          assignedLeaderId: visit.visited_by_id,
          dueDate: visit.follow_up_date,
          taskType: "member_care",
          priority: ["concerns_shared", "prayer_request_received"].includes(visit.outcome)
            ? "high"
            : "normal",
          reason: `Continue pastoral care after ${visit.visit_date}`,
        });
        if (nextTask.error) return { data: null, error: nextTask.error };
        visit.next_task_id = nextTask.data?._id || nextTask.data?.id;
        visit.next_task = nextTask.data;
      }
      return { data: mockVisitations[index], error: null };
    }
    return { data: null, error: new Error('Visitation not found in mock data') };
  }

  try {
    const data = await withTimeout(client.mutation(api.visitations.update, { id, ...cleanData(visitationData), ...(visitationData.notes !== undefined ? { notes: visitationData.notes } : {}) }), 5000);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function remove(id) {
  if (isDemoMode()) return { data: null, error: new Error("Connected attendance and care recording requires the live backend. Demo records are read-only.") };
  const client = getClient();
  if (!client || !isConvexId(id)) {
    if (!isDemoMode()) return { error: unavailableError() };
    const index = mockVisitations.findIndex(v => v.id === id);
    if (index !== -1) mockVisitations.splice(index, 1);
    return { error: null };
  }

  try {
    await withTimeout(client.mutation(api.visitations.remove, { id }), 5000);
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getByPerson(personId) {
  const client = getClient();
  if (!client || !isConvexId(personId)) {
    if (!isDemoMode()) return unavailable();
    const filtered = getMockVisitationsByPerson(personId);
    return { data: filtered.map(mapDoc), error: null };
  }

  try {
    const data = await withTimeout(client.query(api.visitations.getByPerson, { personId }), 2500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getRequiringFollowUp() {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const crm = await import("$lib/services/followUpCrmService.js");
    const dashboard = await crm.getDashboard();
    const openTaskIds = new Set([
      ...(dashboard.data?.tasks || []),
      ...(dashboard.data?.member_care_tasks || []),
    ].map((task) => String(task._id || task.id)));
    const filtered = mockVisitations.filter((visit) =>
      visit.follow_up_required
      && (!visit.next_task_id || openTaskIds.has(String(visit.next_task_id))),
    );
    return { data: filtered.map(mapDoc), error: null };
  }

  try {
    const data = await withTimeout(client.query(api.visitations.getRequiringFollowUp), 3500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getByDateRange(startDate, endDate) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const filtered = mockVisitations.filter(v => v.visit_date >= startDate && v.visit_date <= endDate);
    return { data: filtered.map(mapDoc), error: null };
  }

  try {
    const data = await withTimeout(client.query(api.visitations.getByDateRange, { startDate, endDate }), 3500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}
