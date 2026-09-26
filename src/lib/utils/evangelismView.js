import { sundayReliabilityLabel } from "$lib/utils/sundayReliability.js";

const CLOSED_RESPONSES = new Set(["do_not_contact", "has_church", "wrong_number"]);

export function hasJoinedChurch(contact) {
  return ["member", "leader"].includes(contact?.member_status);
}

export function hasFirstAttended(contact) {
  return Boolean(contact?.first_visit_date || contact?.attended_church);
}

export function isOutreachSalvation(contact) {
  return Boolean(contact?.outreach_salvation_decision ?? contact?.salvation_decision);
}

export function contactId(contact) {
  return contact?._id || contact?.id;
}

export function personName(person, fallback = "Unknown") {
  return [person?.first_name, person?.last_name].filter(Boolean).join(" ") || fallback;
}

export function formatOutreachDate(value) {
  if (!value) return "Date unknown";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unknown";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatResponse(value) {
  const labels = {
    not_assessed: "Not assessed",
    responsive: "Open to follow-up",
    non_responsive: "Not responding",
    has_church: "Has another church",
    events_only: "Events only",
    big_events_only: "Big events only",
    bacenta_mainly: "Bacenta mainly",
    do_not_contact: "Do not contact",
  };
  return labels[value] || value || "Not recorded";
}

function daysSince(value, today) {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((start - date) / 86400000));
}

function journeyFor(contact) {
  const member = hasJoinedChurch(contact);
  if (member) return { key: "joined", label: "Joined church" };

  const visited = hasFirstAttended(contact);
  if (visited) return { key: "guest", label: "Non-member" };
  return { key: "outreach", label: "Outreach Contact" };
}

export function buildEvangelismRows(contacts = [], people = [], crmWorkspace = {}, now = new Date()) {
  const assignments = crmWorkspace.active_assignments || [];
  const tasks = [...(crmWorkspace.tasks || []), ...(crmWorkspace.member_care_tasks || []), ...(crmWorkspace.visitation_tasks || [])];
  const crmContacts = crmWorkspace.contacts || [];
  const laterIds = new Set((crmWorkspace.later_contacts || []).map((item) => String(contactId(item))));
  const unassignedIds = new Set((crmWorkspace.unassigned_contacts || []).map((item) => String(contactId(item))));
  const today = now.toISOString().slice(0, 10);

  return contacts.map((contact) => {
    const id = String(contactId(contact));
    const assignment = assignments.find((item) => String(item.person_id) === id) || null;
    const nextTask = tasks
      .filter((item) => String(item.person_id) === id && item.status === "open")
      .sort((a, b) => String(a.due_date || "").localeCompare(String(b.due_date || "")))[0] || null;
    const inviter = people.find((person) => String(contactId(person)) === String(contact.invited_by_id));
    const crmContact = crmContacts.find((item) => String(contactId(item)) === id) || null;
    const sundayReliability = crmContact?.sunday_reliability || contact.sunday_reliability || null;
    const journey = journeyFor(contact);
    const age = daysSince(contact.contact_date, now);
    const member = journey.key === "joined";
    const category = contact.response || contact.contact_category;
    const closed = contact.follow_up_status === "closed" || contact.pipeline_stage === "closed"
      || crmContact?.follow_up_status === "closed" || crmContact?.pipeline_stage === "closed"
      || CLOSED_RESPONSES.has(category);
    const assignedId = assignment?.assigned_leader_id || nextTask?.assigned_leader_id || null;
    const worker = people.find((person) => String(contactId(person)) === String(assignedId))
      || crmWorkspace.leaders?.find((person) => String(contactId(person)) === String(assignedId))
      || assignment?.assigned_leader
      || nextTask?.assigned_leader;
    const creditIds = [...new Set([
      ...(contact.collector_ids || []), contact.collected_by_id, contact.invited_by_id,
    ].filter(Boolean).map(String))];
    const creditNames = creditIds.map((creditId) => people.find((person) => String(contactId(person)) === creditId))
      .filter(Boolean).map((person) => personName(person));
    const later = laterIds.has(id) || contact.is_paused || contact.follow_up_status === "later";
    const unassigned = !member && !closed && !later && !nextTask && (unassignedIds.has(id) || !assignment);

    let followUpLabel = "No next action";
    let followUpKey = "none";
    if (category === "do_not_contact") {
      followUpLabel = "Do not contact";
      followUpKey = "closed";
    } else if (nextTask?.due_date && nextTask.due_date < today) {
      followUpLabel = `Overdue · ${formatOutreachDate(nextTask.due_date)}`;
      followUpKey = "overdue";
    } else if (nextTask) {
      followUpLabel = `Scheduled · ${formatOutreachDate(nextTask.due_date)}`;
      followUpKey = "scheduled";
    } else if (closed) {
      followUpLabel = "Follow-up ended";
      followUpKey = "closed";
    } else if (later) {
      followUpLabel = "Follow up later";
      followUpKey = "later";
    } else if (unassigned) {
      followUpLabel = "Assign someone";
      followUpKey = "unassigned";
    } else if (assignment && !member) {
      followUpLabel = "In follow-up";
      followUpKey = "active";
    }

    return {
      ...contact,
      id: contactId(contact),
      outreach_salvation_decision: isOutreachSalvation(contact),
      outreach_salvation_date: contact.outreach_salvation_date
        || (isOutreachSalvation(contact) ? contact.contact_date : undefined),
      outreach_salvation_source: contact.outreach_salvation_source
        || (contact.outreach_salvation_decision === undefined && contact.salvation_decision
          ? "legacy_salvation_decision"
          : undefined),
      full_name: personName(contact),
      contact_date_label: formatOutreachDate(contact.contact_date),
      response_label: formatResponse(contact.response || contact.contact_category),
      invited_by_name: contact.invited_by_name || personName(inviter, "Not recorded"),
      reached_by_name: contact.invited_by_name || [...new Set([
        ...creditNames, ...(contact.collector_names || []), contact.primary_inviter_name,
      ].filter(Boolean))].join(", ") || "Not recorded",
      assigned_worker_name: assignedId ? personName(worker, "Assigned worker") : "Unassigned",
      inviter_ids: Array.isArray(contact.inviter_ids) && contact.inviter_ids.length
        ? contact.inviter_ids
        : contact.invited_by_id ? [contact.invited_by_id] : [],
      journey_key: journey.key,
      journey_label: journey.label,
      follow_up_key: followUpKey,
      follow_up_label: followUpLabel,
      sunday_reliability: sundayReliability,
      sunday_reliability_label: sundayReliabilityLabel(sundayReliability),
      freshness_label: age === null ? "Date unknown" : age <= 14 ? `Fresh · ${age}d` : `Older · ${Math.floor(age / 7)}w`,
      assigned_leader_id: assignedId,
      crm_assignment: assignment,
      crm_next_task: nextTask,
      is_unassigned: unassigned,
      is_due: Boolean(nextTask?.due_date && nextTask.due_date <= today),
      is_closed: closed,
    };
  }).sort((a, b) => String(b.contact_date || "").localeCompare(String(a.contact_date || "")));
}

export function filterEvangelismRows(rows, filters = {}) {
  const responses = filters.responses || [];
  const inviters = filters.inviters || [];
  const journeys = filters.journeys || [];
  const followUp = filters.followUp || [];

  return rows.filter((row) =>
    (!responses.length || responses.includes(row.response || row.contact_category))
    && (!inviters.length || (row.inviter_ids || [row.invited_by_id]).some((id) => inviters.includes(id)))
    && (!journeys.length || journeys.includes(row.journey_key))
    && (!followUp.length || followUp.includes(row.follow_up_key))
  );
}

export function isWithinDateRange(value, range) {
  if (!value || !range?.startDate || !range?.endDate) return true;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  const start = new Date(`${range.startDate}T00:00:00`);
  const end = new Date(`${range.endDate}T23:59:59.999`);
  return !Number.isNaN(date.getTime()) && date >= start && date <= end;
}

export function outreachMetrics(rows = []) {
  const savedRows = rows.filter(isOutreachSalvation);
  const visitedRows = rows.filter(hasFirstAttended);
  const joinedRows = rows.filter(hasJoinedChurch);
  return {
    reached: rows.length,
    saved: savedRows.length,
    visited: visitedRows.length,
    joined: joinedRows.length,
  };
}

export function monthlyOutreach(rows = [], limit = 12) {
  const months = new Map();
  rows.forEach((row) => {
    if (!row.contact_date) return;
    const date = new Date(`${row.contact_date}T00:00:00`);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const item = months.get(key) || {
      month: String(date.getMonth() + 1),
      year: date.getFullYear(),
      count: 0,
      saved: 0,
      visited: 0,
      joined: 0,
    };
    item.count += 1;
    if (isOutreachSalvation(row)) item.saved += 1;
    if (hasFirstAttended(row)) item.visited += 1;
    if (hasJoinedChurch(row)) item.joined += 1;
    months.set(key, item);
  });
  return [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value).slice(-limit);
}

export function topInviters(rows = [], people = [], limit = 5) {
  const counts = new Map();
  rows.forEach((row) => {
    const ids = [...new Set((Array.isArray(row.inviter_ids) && row.inviter_ids.length ? row.inviter_ids : [row.invited_by_id]).filter(Boolean))];
    ids.forEach((id) => {
      const current = counts.get(id) || { id, count: 0, joined: 0 };
      current.count += 1;
      if (hasJoinedChurch(row)) current.joined += 1;
      counts.set(id, current);
    });
  });
  return [...counts.values()].map((item) => ({
    ...item,
    name: personName(people.find((person) => String(contactId(person)) === String(item.id)), "Unknown inviter"),
  })).sort((a, b) => b.count - a.count || b.joined - a.joined).slice(0, limit);
}
