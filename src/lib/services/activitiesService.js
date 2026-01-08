/**
 * Activities Service - Convex Backend
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
    const data = await client.query(api.activities.getAll);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getById(id) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.activities.getById, { id });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function create(activityData) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.mutation(api.activities.create, activityData);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getByType(activityType) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.activities.getByType, { activityType });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getByDateRange(startDate, endDate) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.activities.getByDateRange, { startDate, endDate });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getRecent(limit = 10) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.activities.getRecent, { limit });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}