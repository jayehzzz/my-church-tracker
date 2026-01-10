/**
 * People Service - Convex Backend
 * 
 * Uses ConvexHttpClient for server-side compatible requests.
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api.js";

function getClient() {
  const convexUrl = import.meta.env?.VITE_CONVEX_URL;
  if (!convexUrl) return null;
  return new ConvexHttpClient(convexUrl);
}

const notConfigured = () => ({ data: null, error: new Error('Convex not configured') });

// Helper to map _id to id
function mapDoc(doc) {
  if (!doc) return null;
  return { ...doc, id: doc._id };
}

export async function getAll() {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.people.getAll);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getById(id) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.people.getById, { id });
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Helper to remove null/undefined values - Convex expects undefined (absent) not null
function cleanData(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined && v !== '')
  );
}

export async function create(personData) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.mutation(api.people.create, cleanData(personData));
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function update(id, personData) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.mutation(api.people.update, { id, ...cleanData(personData) });
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function remove(id) {
  const client = getClient();
  if (!client) return { error: new Error('Convex not configured') };

  try {
    await client.mutation(api.people.remove, { id });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getByStatus(status) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.people.getByStatus, { status });
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function search(searchTerm) {
  const client = getClient();
  if (!client) return notConfigured();

  try {
    const data = await client.query(api.people.search, { searchTerm });
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}