import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api.js";
import { mockPeople, mockEvangelismContacts, getPersonById as getMockPersonById } from "../data/mockData.js";

export { getMockPersonById };

function getClient() {
  const convexUrl = import.meta.env?.VITE_CONVEX_URL;
  if (!convexUrl) return null;
  return new ConvexHttpClient(convexUrl);
}

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

// Helper to map _id to id
function mapDoc(doc) {
  if (!doc) return null;
  return {
    ...doc,
    id: doc._id || doc.id,
    member_status:
      doc.member_status === "visitor" ? "guest" : doc.member_status,
  };
}

function matchesStatus(person, status) {
  if (status === "guest") {
    return (
      person.member_status === "guest" || person.member_status === "visitor"
    );
  }
  return person.member_status === status;
}

export async function getAll() {
  const client = getClient();
  if (!client) {
    return { data: mockPeople.map(mapDoc), error: null };
  }

  try {
    const data = await withTimeout(client.query(api.people.getAll), 3500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    console.warn("Convex query failed, falling back to mock data:", error);
    return { data: mockPeople.map(mapDoc), error: null };
  }
}

export async function getById(id) {
  const client = getClient();
  if (!client || !isConvexId(id)) {
    const mock = getMockPersonById(id);
    return { data: mock ? mapDoc(mock) : null, error: null };
  }

  try {
    const data = await withTimeout(client.query(api.people.getById, { id }), 2500);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    const mock = getMockPersonById(id);
    if (mock) return { data: mapDoc(mock), error: null };
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
  if (!client) {
    const newPerson = { ...personData, id: `mock-${Date.now()}` };
    mockPeople.push(newPerson);
    return { data: mapDoc(newPerson), error: null };
  }

  try {
    const data = await withTimeout(client.mutation(api.people.create, cleanData(personData)), 5000);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function update(id, personData) {
  const client = getClient();
  if (!client) {
    const index = mockPeople.findIndex(p => String(p.id) === String(id));
    if (index !== -1) {
      mockPeople[index] = { ...mockPeople[index], ...personData };
      return { data: mapDoc(mockPeople[index]), error: null };
    }
    const cIndex = mockEvangelismContacts.findIndex(c => String(c.id) === String(id));
    if (cIndex !== -1) {
      mockEvangelismContacts[cIndex] = { ...mockEvangelismContacts[cIndex], ...personData };
      return { data: getMockPersonById(id), error: null };
    }
    return { data: null, error: new Error('Person not found in mock data') };
  }

  try {
    const data = await withTimeout(client.mutation(api.people.update, { id, ...cleanData(personData) }), 5000);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function remove(id) {
  const client = getClient();
  if (!client) {
    const index = mockPeople.findIndex(p => String(p.id) === String(id));
    if (index !== -1) mockPeople.splice(index, 1);
    const cIndex = mockEvangelismContacts.findIndex(c => String(c.id) === String(id));
    if (cIndex !== -1) mockEvangelismContacts.splice(cIndex, 1);
    return { error: null };
  }

  try {
    await withTimeout(client.mutation(api.people.remove, { id }), 5000);
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getByStatus(status) {
  const client = getClient();
  if (!client) {
    const filtered = mockPeople.filter((person) => matchesStatus(person, status));
    return { data: filtered.map(mapDoc), error: null };
  }

  try {
    const data = await withTimeout(client.query(api.people.getByStatus, { status }), 3500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    const filtered = mockPeople.filter((person) => matchesStatus(person, status));
    return { data: filtered.map(mapDoc), error: null };
  }
}

export async function search(searchTerm) {
  const client = getClient();
  if (!client) {
    const term = (searchTerm || '').toLowerCase();
    const filtered = mockPeople.filter(p =>
      `${p.first_name || ''} ${p.last_name || ''} ${p.email || ''}`.toLowerCase().includes(term)
    );
    return { data: filtered.map(mapDoc), error: null };
  }

  try {
    const data = await withTimeout(client.query(api.people.search, { searchTerm }), 3500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}
