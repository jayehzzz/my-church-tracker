import { api } from "../../../convex/_generated/api.js";
import { mockEvangelismContacts, getContactsByInviter as getMockContactsByInviter } from "../data/mockData.js";
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
  const explicitStatus = doc.member_status || doc.status;
  const memberStatus = ["contact", "guest", "member", "leader", "archived"].includes(explicitStatus)
    ? explicitStatus
    : doc.converted
      ? "member"
      : (doc.first_visit_date || doc.attended_church ? "guest" : "contact");
  const outreachSalvationDecision = doc.outreach_salvation_decision ?? doc.salvation_decision;
  return {
    ...doc,
    id: doc._id || doc.id,
    member_status: memberStatus,
    ...(doc.membership_date || doc.conversion_date
      ? { membership_date: doc.membership_date || doc.conversion_date }
      : {}),
    ...(outreachSalvationDecision !== undefined
      ? { outreach_salvation_decision: outreachSalvationDecision }
      : {}),
    ...(doc.outreach_salvation_date || (outreachSalvationDecision && doc.contact_date)
      ? { outreach_salvation_date: doc.outreach_salvation_date || doc.contact_date }
      : {}),
  };
}

export async function getAll() {
  const client = getClient();
  if (!client) {
    return isDemoMode() ? { data: mockEvangelismContacts.map(mapDoc), error: null } : unavailable();
  }

  try {
    const data = await withTimeout(client.query(api.evangelism.getAll), 3500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getById(id) {
  const client = getClient();
  if (!client || !isConvexId(id)) {
    if (!isDemoMode()) return unavailable();
    const mock = mockEvangelismContacts.find(c => String(c.id) === String(id));
    return { data: mock ? mapDoc(mock) : null, error: null };
  }

  try {
    const data = await withTimeout(client.query(api.evangelism.getById, { id }), 2500);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function create(contactData) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const newContact = { response: "not_assessed", ...contactData, id: `mock-${Date.now()}` };
    const crmService = await import("./followUpCrmService.js");
    await crmService.captureLocalEvangelismContact(newContact);
    mockEvangelismContacts.unshift(newContact);
    return { data: mapDoc(newContact), error: null };
  }

  try {
    const data = await client.mutation(api.evangelism.create, contactData);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function update(id, contactData) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const index = mockEvangelismContacts.findIndex(c => c.id === id);
    if (index !== -1) {
      mockEvangelismContacts[index] = {
        ...mockEvangelismContacts[index], ...contactData,
        ...(contactData.response !== undefined ? { contact_category: contactData.response } : {}),
      };
      const crmService = await import("./followUpCrmService.js");
      await crmService.captureLocalEvangelismContact(mockEvangelismContacts[index]);
      return { data: mapDoc(mockEvangelismContacts[index]), error: null };
    }
    return { data: null, error: new Error('Contact not found in mock data') };
  }

  try {
    const data = await client.mutation(api.evangelism.update, { id, ...contactData });
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function remove(id) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return { error: unavailableError() };
    const index = mockEvangelismContacts.findIndex(c => c.id === id);
    if (index !== -1) mockEvangelismContacts.splice(index, 1);
    return { error: null };
  }

  try {
    await client.mutation(api.evangelism.remove, { id });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getByResponse(response) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const filtered = mockEvangelismContacts.filter(c => c.response === response);
    return { data: filtered.map(mapDoc), error: null };
  }

  try {
    const data = await withTimeout(client.query(api.evangelism.getByResponse, { response }), 3500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getRequiringFollowUp() {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const filtered = mockEvangelismContacts.map(mapDoc).filter(c =>
      ["contact", "guest"].includes(c.member_status)
      && !["do_not_contact", "has_church", "wrong_number"].includes(c.response || c.contact_category)
      && !c.is_paused && c.pipeline_stage !== "closed" && c.follow_up_status !== "closed"
      && (!c.first_visit_date || c.first_visit_date < cutoff.toISOString().slice(0, 10))
    );
    return { data: filtered.map(mapDoc), error: null };
  }

  try {
    const data = await withTimeout(client.query(api.evangelism.getRequiringFollowUp), 3500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getJoinedChurch() {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const filtered = mockEvangelismContacts.filter(c =>
      ["member", "leader"].includes(c.member_status || c.status)
      || (c.member_status == null && c.status == null && c.converted)
    );
    return { data: filtered.map(mapDoc), error: null };
  }

  try {
    // Backend query keeps the legacy name for compatibility.
    const data = await withTimeout(client.query(api.evangelism.getConverted), 3500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/** @deprecated Use getJoinedChurch(). */
export const getConverted = getJoinedChurch;

export async function getByDateRange(startDate, endDate) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const filtered = mockEvangelismContacts.filter(c => c.contact_date >= startDate && c.contact_date <= endDate);
    return { data: filtered.map(mapDoc), error: null };
  }

  try {
    const data = await withTimeout(client.query(api.evangelism.getByDateRange, { startDate, endDate }), 3500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function markAsJoinedChurch(id) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const contact = mockEvangelismContacts.find(c => c.id === id);
    if (contact) {
      contact.member_status = "member";
      contact.status = "member";
      contact.membership_date = new Date().toISOString().slice(0, 10);
      return { data: mapDoc(contact), error: null };
    }
    return { data: null, error: new Error('Contact not found') };
  }

  try {
    const data = await withTimeout(client.mutation(api.evangelism.markAsJoinedChurch, { id }), 5000);
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/** @deprecated Use markAsJoinedChurch(). */
export async function markAsConverted(id) {
  return markAsJoinedChurch(id);
}

export async function getByInviter(personId) {
  const client = getClient();
  if (!client || !isConvexId(personId)) {
    if (!isDemoMode()) return unavailable();
    const filtered = getMockContactsByInviter(personId);
    return { data: filtered.map(mapDoc), error: null };
  }

  try {
    const data = await withTimeout(client.query(api.evangelism.getByInviter, { personId }), 2500);
    return { data: data ? data.map(mapDoc) : [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}
