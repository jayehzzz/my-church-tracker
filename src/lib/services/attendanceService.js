import { api } from "../../../convex/_generated/api.js";
import {
  mockAttendance,
  getAttendanceByService as getMockAttendanceByService,
  getAttendanceByPerson as getMockAttendanceByPerson
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

export async function getAll() {
  const client = getClient();
  if (!client) {
    return isDemoMode() ? { data: mockAttendance.map(mapDoc), error: null } : unavailable();
  }

  try {
    const data = await withTimeout(client.query(api.attendance.getAll), 3500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return isDemoMode() ? { data: mockAttendance.map(mapDoc), error: null } : { data: null, error };
  }
}

export async function getById(id) {
  const client = getClient();
  if (!client || !isConvexId(id)) {
    if (!isDemoMode()) return unavailable();
    const mock = mockAttendance.find(a => String(a.id) === String(id));
    return { data: mock ? mapDoc(mock) : null, error: null };
  }

  try {
    const data = await withTimeout(client.query(api.attendance.getById, { id }), 2500);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function create(attendanceData) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const newRecord = { ...attendanceData, id: `mock-${Date.now()}` };
    mockAttendance.unshift(newRecord);
    return { data: newRecord, error: null };
  }

  try {
    const data = await client.mutation(api.attendance.create, attendanceData);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function update(id, attendanceData) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const index = mockAttendance.findIndex(a => a.id === id);
    if (index !== -1) {
      mockAttendance[index] = { ...mockAttendance[index], ...attendanceData };
      return { data: mockAttendance[index], error: null };
    }
    return { data: null, error: new Error('Attendance record not found in mock data') };
  }

  try {
    const data = await client.mutation(api.attendance.update, { id, ...attendanceData });
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function remove(id) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return { error: unavailableError() };
    const index = mockAttendance.findIndex(a => a.id === id);
    if (index !== -1) mockAttendance.splice(index, 1);
    return { error: null };
  }

  try {
    await client.mutation(api.attendance.remove, { id });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getByService(serviceId) {
  const client = getClient();
  if (!client || !isConvexId(serviceId)) {
    if (!isDemoMode()) return unavailable();
    const filtered = getMockAttendanceByService(serviceId);
    return { data: filtered.map(mapDoc), error: null };
  }

  try {
    const data = await withTimeout(client.query(api.attendance.getByService, { serviceId }), 2500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getByPerson(personId) {
  const client = getClient();
  if (!client || !isConvexId(personId)) {
    if (!isDemoMode()) return unavailable();
    const filtered = getMockAttendanceByPerson(personId);
    return { data: filtered.map(mapDoc), error: null };
  }

  try {
    const data = await withTimeout(client.query(api.attendance.getByPerson, { personId }), 2500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function bulkCreate(records) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const created = records.map((r, i) => ({ ...r, id: `mock-${Date.now()}-${i}` }));
    mockAttendance.push(...created);
    return { data: created, error: null };
  }

  try {
    const data = await withTimeout(client.mutation(api.attendance.bulkCreate, { records }), 5000);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function syncAttendance(serviceId, attendanceData) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return { error: unavailableError() };
    return { error: null };
  }

  try {
    const result = await withTimeout(client.mutation(api.attendance.syncAttendance, { serviceId, attendanceData }), 5000);
    return result;
  } catch (error) {
    return { error };
  }
}

export async function getAttendanceHistory(personIds, beforeDate) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const ids = new Set(personIds);
    const filtered = mockAttendance.filter(a => ids.has(a.person_id));
    return { data: Object.fromEntries(personIds.map(id => [id, filtered.some(r => r.person_id === id)])), error: null };
  }

  try {
    const data = await withTimeout(client.query(api.attendance.getAttendanceHistory, { personIds, ...(beforeDate ? { beforeDate } : {}) }), 3500);
    return { data: data || {}, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
