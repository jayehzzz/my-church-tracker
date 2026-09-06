import { api } from "../../../convex/_generated/api.js";
import { mockServices, mockAttendance, mockPeople, getServiceById as getMockServiceById } from "../data/mockData.js";
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
    return isDemoMode() ? { data: mockServices.map(mapDoc), error: null } : unavailable();
  }

  try {
    const data = await withTimeout(client.query(api.services.getAll), 3500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return isDemoMode() ? { data: mockServices.map(mapDoc), error: null } : { data: null, error };
  }
}

export async function getById(id) {
  const client = getClient();
  if (!client || !isConvexId(id)) {
    if (!isDemoMode()) return unavailable();
    const mock = getMockServiceById(id);
    return { data: mock ? mapDoc(mock) : null, error: null };
  }

  try {
    const data = await withTimeout(client.query(api.services.getById, { id }), 2500);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function create(serviceData) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const newService = { ...serviceData, id: `mock-${Date.now()}` };
    mockServices.unshift(newService);
    return { data: newService, error: null };
  }

  try {
    const data = await withTimeout(client.mutation(api.services.create, cleanData(serviceData)), 5000);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function update(id, serviceData) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const index = mockServices.findIndex(s => s.id === id);
    if (index !== -1) {
      mockServices[index] = { ...mockServices[index], ...serviceData };
      return { data: mockServices[index], error: null };
    }
    return { data: null, error: new Error('Service not found in mock data') };
  }

  try {
    const data = await withTimeout(client.mutation(api.services.update, { id, ...cleanData(serviceData) }), 5000);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function record(recordData) {
  if (isDemoMode()) return { data: null, error: new Error("Connected attendance and care recording requires the live backend. Demo records are read-only.") };
  const { id, attendanceData = [], ...serviceData } = recordData;
  const client = getClient();

  if (!client || (id && !isConvexId(id))) {
    if (!isDemoMode()) return unavailable();
    const serviceId = id || `mock-${Date.now()}`;
    const individuals = attendanceData
      .map((record) => mockPeople.find((person) => String(person.id || person._id) === String(record.person_id)))
      .filter(Boolean);
    const saved = { ...serviceData, id: serviceId, individuals };
    const index = mockServices.findIndex((service) => String(service.id || service._id) === String(serviceId));
    if (index === -1) mockServices.unshift(saved);
    else mockServices[index] = { ...mockServices[index], ...saved };

    for (let index = mockAttendance.length - 1; index >= 0; index -= 1) {
      if (String(mockAttendance[index].service_id) === String(serviceId)) mockAttendance.splice(index, 1);
    }
    mockAttendance.push(...attendanceData.map((record, attendanceIndex) => ({
      ...record,
      id: `mock-attendance-${Date.now()}-${attendanceIndex}`,
      service_id: serviceId,
      created_at: new Date().toISOString(),
    })));
    return { data: mockServices.find((service) => String(service.id || service._id) === String(serviceId)), error: null };
  }

  try {
    const data = await withTimeout(client.mutation(api.services.record, cleanData({ id, ...serviceData, attendanceData })), 8000);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function remove(id) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return { error: unavailableError() };
    const index = mockServices.findIndex(s => s.id === id);
    if (index !== -1) mockServices.splice(index, 1);
    return { error: null };
  }

  try {
    await withTimeout(client.mutation(api.services.remove, { id }), 5000);
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getByDateRange(startDate, endDate) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const filtered = mockServices.filter(s => s.service_date >= startDate && s.service_date <= endDate);
    return { data: filtered.map(mapDoc), error: null };
  }

  try {
    const data = await withTimeout(client.query(api.services.getByDateRange, { startDate, endDate }), 3500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}
