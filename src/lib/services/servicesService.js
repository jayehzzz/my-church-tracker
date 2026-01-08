/**
 * Services Service - Convex Backend
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
    const data = await client.query(api.services.getAll);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getById(id) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.services.getById, { id });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function create(serviceData) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.mutation(api.services.create, serviceData);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function update(id, serviceData) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.mutation(api.services.update, { id, ...serviceData });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function remove(id) {
  const client = getClient();
  if (!client) return { error: new Error('Convex not configured') };

  try {
    await client.mutation(api.services.remove, { id });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getByDateRange(startDate, endDate) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.services.getByDateRange, { startDate, endDate });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}