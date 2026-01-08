/**
 * Attendance Service - Convex Backend
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api.js";

function getClient() {
  const convexUrl = import.meta.env?.VITE_CONVEX_URL;
  if (!convexUrl) return null;
  return new ConvexHttpClient(convexUrl);
}

const notConfigured = () => ({ data: null, error: new Error('Convex not configured') });

export async function getAll() {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.attendance.getAll);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getById(id) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.attendance.getById, { id });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function create(attendanceData) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.mutation(api.attendance.create, attendanceData);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function update(id, attendanceData) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.mutation(api.attendance.update, { id, ...attendanceData });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function remove(id) {
  const client = getClient();
  if (!client) return { error: new Error('Convex not configured') };

  try {
    await client.mutation(api.attendance.remove, { id });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getByService(serviceId) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.attendance.getByService, { serviceId });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getByPerson(personId) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.attendance.getByPerson, { personId });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function bulkCreate(records) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.mutation(api.attendance.bulkCreate, { records });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function syncAttendance(serviceId, personIds) {
  const client = getClient();
  if (!client) return { error: new Error('Convex not configured') };

  try {
    const result = await client.mutation(api.attendance.syncAttendance, { serviceId, personIds });
    return result;
  } catch (error) {
    return { error };
  }
}