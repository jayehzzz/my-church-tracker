/**
 * Meetings Service - Convex Backend
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
    const data = await client.query(api.meetings.getAll);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getById(id) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.meetings.getById, { id });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function create(meetingData) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.mutation(api.meetings.create, meetingData);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function update(id, meetingData) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.mutation(api.meetings.update, { id, ...meetingData });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function remove(id) {
  const client = getClient();
  if (!client) return { error: new Error('Convex not configured') };

  try {
    await client.mutation(api.meetings.remove, { id });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getByType(meetingType) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.meetings.getByType, { meetingType });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getByDateRange(startDate, endDate) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.meetings.getByDateRange, { startDate, endDate });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function addAttendee(meetingId, personId) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.mutation(api.meetings.addAttendee, { meetingId, personId });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAttendees(meetingId) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.meetings.getAttendees, { meetingId });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}