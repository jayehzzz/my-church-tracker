/**
 * Evangelism Service - Convex Backend
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
    const data = await client.query(api.evangelism.getAll);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getById(id) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.evangelism.getById, { id });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function create(contactData) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.mutation(api.evangelism.create, contactData);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function update(id, contactData) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.mutation(api.evangelism.update, { id, ...contactData });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function remove(id) {
  const client = getClient();
  if (!client) return { error: new Error('Convex not configured') };

  try {
    await client.mutation(api.evangelism.remove, { id });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getByResponse(response) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.evangelism.getByResponse, { response });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getRequiringFollowUp() {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.evangelism.getRequiringFollowUp);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getConverted() {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.evangelism.getConverted);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getByDateRange(startDate, endDate) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.evangelism.getByDateRange, { startDate, endDate });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function markAsConverted(id, addToPeople = false) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.mutation(api.evangelism.markAsConverted, { id, addToPeople });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getByInviter(personId) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.evangelism.getByInviter, { personId });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}