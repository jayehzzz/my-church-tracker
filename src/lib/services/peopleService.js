import { api } from "../../../convex/_generated/api.js";
import { mockPeople, mockEvangelismContacts, getPersonById as getMockPersonById } from "../data/mockData.js";
import { getConvexHttpClient, isDemoMode, unavailableError } from "$lib/convex.js";

export { getMockPersonById };

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
    return isDemoMode() ? { data: mockPeople.map(mapDoc), error: null } : unavailable();
  }

  try {
    const data = await withTimeout(client.query(api.people.getAll), 3500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return isDemoMode() ? { data: mockPeople.map(mapDoc), error: null } : { data: null, error };
  }
}

export async function getById(id) {
  const client = getClient();
  if (!client || !isConvexId(id)) {
    if (!isDemoMode()) return unavailable();
    const mock = getMockPersonById(id);
    return { data: mock ? mapDoc(mock) : null, error: null };
  }

  try {
    const data = await withTimeout(client.query(api.people.getById, { id }), 2500);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Empty optional fields mean "clear this saved value" on updates. Convex does
// not preserve `undefined` across a network request, so send explicit intent.
const CLEARABLE_FIELDS = new Set([
  "email", "phone", "address", "city", "state", "zip_code", "preferred_name",
  "birthday", "date_of_birth", "gender", "marital_status", "employment_status",
  "degree_status", "basontas", "church_role", "role", "activity_status", "leader_id",
  "contact_category", "contact_date", "contact_method", "invited_by_id", "entry_point",
  "notes", "first_visit_date", "membership_date", "is_baptised", "is_tither",
  "completed_schools", "lat", "lng", "avatar_url",
]);

export function preparePersonPayload(obj, { forUpdate = false } = {}) {
  const payload = {};
  const clearFields = [];
  for (const [rawKey, rawValue] of Object.entries(obj || {})) {
    const key = rawKey === "date_of_birth" ? "birthday" : rawKey;
    const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
    if (value === null || value === undefined || value === "") {
      if (forUpdate && CLEARABLE_FIELDS.has(rawKey)) clearFields.push(key);
      continue;
    }
    payload[key] = value;
  }
  if (forUpdate && clearFields.length) payload.clear_fields = [...new Set(clearFields)];
  return payload;
}

export async function create(personData) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const newPerson = { ...personData, id: `mock-${Date.now()}` };
    mockPeople.push(newPerson);
    return { data: mapDoc(newPerson), error: null };
  }

  try {
    const data = await withTimeout(client.mutation(api.people.create, preparePersonPayload(personData)), 5000);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function update(id, personData) {
  const client = getClient();
  const payload = preparePersonPayload(personData, { forUpdate: true });
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const index = mockPeople.findIndex(p => String(p.id) === String(id));
    if (index !== -1) {
      const next = { ...mockPeople[index], ...payload };
      for (const field of payload.clear_fields || []) delete next[field];
      delete next.clear_fields;
      mockPeople[index] = next;
      return { data: mapDoc(mockPeople[index]), error: null };
    }
    const cIndex = mockEvangelismContacts.findIndex(c => String(c.id) === String(id));
    if (cIndex !== -1) {
      const next = { ...mockEvangelismContacts[cIndex], ...payload };
      for (const field of payload.clear_fields || []) delete next[field];
      delete next.clear_fields;
      mockEvangelismContacts[cIndex] = next;
      return { data: getMockPersonById(id), error: null };
    }
    return { data: null, error: new Error('Person not found in mock data') };
  }

  try {
    const data = await withTimeout(client.mutation(api.people.update, { id, ...payload }), 5000);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function remove(id) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return { error: unavailableError() };
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

export async function archive(id) {
  const client = getClient();
  if (!client) return update(id, { member_status: "archived" });
  try {
    const data = await withTimeout(client.mutation(api.people.archive, { id }), 5000);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function findDuplicates({ email, phone, excludeId } = {}) {
  const client = getClient();
  if (!client) return { data: [], error: null };
  try {
    const data = await withTimeout(client.query(api.people.findDuplicates, { email, phone, excludeId }), 3500);
    return { data: data || [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getMergePreview(sourceId, targetId) {
  const client = getClient();
  if (!client) return { data: null, error: new Error("Merging requires a connected church database") };
  try {
    const data = await withTimeout(client.query(api.people.getMergePreview, { sourceId, targetId }), 5000);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function mergeReviewed(preview) {
  const client = getClient();
  if (!client) return { data: null, error: new Error("Merging requires a connected church database") };
  try {
    const data = await withTimeout(client.mutation(api.people.mergeReviewed, {
      sourceId: preview.source.id,
      targetId: preview.target.id,
      sourceUpdatedAt: preview.sourceUpdatedAt,
      targetUpdatedAt: preview.targetUpdatedAt,
    }), 8000);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getByStatus(status) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const filtered = mockPeople.filter((person) => matchesStatus(person, status));
    return { data: filtered.map(mapDoc), error: null };
  }

  try {
    const data = await withTimeout(client.query(api.people.getByStatus, { status }), 3500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function search(searchTerm) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
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
