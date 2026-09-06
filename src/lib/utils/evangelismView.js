const CLOSED_RESPONSES = new Set(["do_not_contact", "has_church"]);

function hasJoined(contact) {
  return Boolean(contact.converted || ["member", "leader"].includes(contact.status) || ["member", "leader"].includes(contact.member_status));
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
  const member = hasJoined(contact);
  if (member) return { key: "joined", label: "Joined church" };

  const saved = Boolean(contact.salvation_decision);
  const visited = Boolean(contact.attended_church || contact.first_visit_date);
  if (saved && visited) return { key: "engaged", label: "Saved · Visited" };
  if (saved) return { key: "saved", label: "Salvation decision" };
  if (visited) return { key: "visited", label: "First visit" };
  if (CLOSED_RESPONSES.has(contact.response || contact.contact_category)) {
    return { key: "closed", label: "Closed" };
  }
  return { key: "outreach", label: "Outreach" };
}

export function buildEvangelismRows(contacts = [], people = [], crmWorkspace = {}, now = new Date()) {
  const assignments = crmWorkspace.active_assignments || [];
  const tasks = [...(crmWorkspace.tasks || []), ...(crmWorkspace.member_care_tasks || [])];
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
    const journey = journeyFor(contact);
    const age = daysSince(contact.contact_date, now);
    const member = journey.key === "joined";
    const closed = journey.key === "closed";
    const unassigned = !member && !closed && (unassignedIds.has(id) || (!assignment && !laterIds.has(id)));

    let followUpLabel = "No next action";
    let followUpKey = "none";
    if (closed) {
      followUpLabel = "Closed";
      followUpKey = "closed";
    } else if (member) {
      followUpLabel = "Complete";
      followUpKey = "complete";
    } else if (unassigned) {
      followUpLabel = "Needs owner";
      followUpKey = "unassigned";
    } else if (laterIds.has(id)) {
      followUpLabel = "Follow up later";
      followUpKey = "later";
    } else if (nextTask?.due_date && nextTask.due_date < today) {
      followUpLabel = `Overdue · ${formatOutreachDate(nextTask.due_date)}`;
      followUpKey = "overdue";
    } else if (nextTask) {
      followUpLabel = `Scheduled · ${formatOutreachDate(nextTask.due_date)}`;
      followUpKey = "scheduled";
    } else if (assignment) {
      followUpLabel = "In follow-up";
      followUpKey = "active";
    }

    return {
      ...contact,
      id: contactId(contact),
      full_name: personName(contact),
      contact_date_label: formatOutreachDate(contact.contact_date),
      response_label: formatResponse(contact.response || contact.contact_category),
      invited_by_name: contact.invited_by_name || personName(inviter, "Not recorded"),
      journey_key: journey.key,
      journey_label: journey.label,
      follow_up_key: followUpKey,
      follow_up_label: followUpLabel,
      freshness_label: age === null ? "Date unknown" : age <= 14 ? `Fresh · ${age}d` : `Older · ${Math.floor(age / 7)}w`,
      assigned_leader_id: assignment?.assigned_leader_id || nextTask?.assigned_leader_id || null,
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
    && (!inviters.length || inviters.includes(row.invited_by_id))
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
  const savedRows = rows.filter((row) => row.salvation_decision);
  const visitedRows = rows.filter((row) => row.attended_church || row.first_visit_date || row.converted);
  const joinedRows = rows.filter(hasJoined);
  return {
    reached: rows.length,
    saved: savedRows.length,
    visited: visitedRows.length,
    engaged: rows.filter((row) => row.salvation_decision && (row.attended_church || row.first_visit_date || row.converted)).length,
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
    if (row.salvation_decision) item.saved += 1;
    if (row.attended_church || row.first_visit_date || row.converted) item.visited += 1;
    if (hasJoined(row)) item.joined += 1;
    months.set(key, item);
  });
  return [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value).slice(-limit);
}

export function topInviters(rows = [], people = [], limit = 5) {
  const counts = new Map();
  rows.forEach((row) => {
    if (!row.invited_by_id) return;
    const current = counts.get(row.invited_by_id) || { id: row.invited_by_id, count: 0, joined: 0 };
    current.count += 1;
    if (hasJoined(row)) current.joined += 1;
    counts.set(row.invited_by_id, current);
  });
  return [...counts.values()].map((item) => ({
    ...item,
    name: personName(people.find((person) => String(contactId(person)) === String(item.id)), "Unknown inviter"),
  })).sort((a, b) => b.count - a.count || b.joined - a.joined).slice(0, limit);
}
