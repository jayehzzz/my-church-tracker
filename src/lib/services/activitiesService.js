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

function withTimeout(promise, timeoutMs = 3500) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Convex request timed out")), timeoutMs)
    )
  ]);
}

const notConfigured = () => ({ data: null, error: new Error('Convex not configured') });

export async function getAll() {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await withTimeout(client.query(api.activities.getAll), 3500);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getById(id) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await withTimeout(client.query(api.activities.getById, { id }), 3500);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function create(activityData) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await withTimeout(client.mutation(api.activities.create, activityData), 5000);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getByType(activityType) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await withTimeout(client.query(api.activities.getByType, { activityType }), 3500);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getByDateRange(startDate, endDate) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await withTimeout(client.query(api.activities.getByDateRange, { startDate, endDate }), 3500);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getRecent(limit = 10) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await withTimeout(client.query(api.activities.getRecent, { limit }), 3500);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}