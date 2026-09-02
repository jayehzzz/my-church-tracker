import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api.js";
import { mockPeople } from "$lib/data/mockData.js";

const mockLeaders = mockPeople.filter((person) => person.member_status === "leader");
const mockMembers = mockPeople.filter(
  (person) => person.member_status === "member" || person.member_status === "leader",
);

export const mockMeetingPrograms = [
  {
    id: "mp-bacenta-main",
    code: "bacenta-main",
    name: "Bacenta",
    meeting_type: "bacenta",
    category: "bacenta",
    description: "Midweek fellowship meeting",
    default_format: "in_person",
    default_location: "Coffee shop",
    active: true,
    leaders: mockLeaders.slice(0, 1),
    leader_ids: mockLeaders.slice(0, 1).map((person) => person.id),
    members: mockMembers.slice(0, 14),
    member_ids: mockMembers.slice(0, 14).map((person) => person.id),
  },
  {
    id: "mp-flow-service",
    code: "flow-service",
    name: "Flow Service",
    meeting_type: "flow_service",
    category: "prayer",
    description: "Online YouTube prayer service with the main church",
    default_format: "online",
    default_location: "YouTube",
    active: true,
    leaders: [],
    leader_ids: [],
    members: [],
    member_ids: [],
  },
  {
    id: "mp-acts-prayer",
    code: "acts-prayer",
    name: "Acts Prayer",
    meeting_type: "acts_prayer",
    category: "prayer",
    description: "Weekly morning prayer meeting, formerly Farley Morning Prayer",
    default_format: "in_person",
    active: true,
    leaders: [],
    leader_ids: [],
    members: [],
    member_ids: [],
  },
  {
    id: "mp-shemen-prayer",
    code: "shemen-prayer",
    name: "Shemen Prayer",
    meeting_type: "shemen_prayer",
    category: "prayer",
    description: "Friday evening prayer meeting",
    default_day: "friday",
    default_format: "in_person",
    active: true,
    leaders: [],
    leader_ids: [],
    members: [],
    member_ids: [],
  },
  {
    id: "mp-workers-meeting",
    code: "workers-meeting",
    name: "Workers Meeting",
    meeting_type: "workers_meeting",
    category: "workers",
    description: "Teaching and church planning meeting for workers",
    default_format: "in_person",
    active: true,
    leaders: [],
    leader_ids: [],
    members: [],
    member_ids: [],
  },
];

function getClient() {
  const convexUrl = import.meta.env?.VITE_CONVEX_URL;
  return convexUrl ? new ConvexHttpClient(convexUrl) : null;
}

function isConvexId(id) {
  return Boolean(id && !String(id).startsWith("mp-") && String(id).length >= 15);
}

function withTimeout(promise, timeoutMs = 4000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Convex request timed out")), timeoutMs),
    ),
  ]);
}

function mapDoc(doc) {
  return doc ? { ...doc, id: doc._id || doc.id } : null;
}

function cleanData(data) {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    ),
  );
}

function slugify(name) {
  return String(name || "meeting")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function initialize() {
  const client = getClient();
  if (!client) return { data: mockMeetingPrograms, error: null };
  try {
    await withTimeout(client.mutation(api.meetingPrograms.ensureDefaults), 6000);
    await withTimeout(client.mutation(api.meetings.migrateLegacyMeetings), 6000);
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAll({ includeArchived = false } = {}) {
  const client = getClient();
  if (!client) {
    const programs = includeArchived
      ? mockMeetingPrograms
      : mockMeetingPrograms.filter((program) => program.active);
    return { data: programs.map(mapDoc), error: null };
  }
  try {
    const data = await withTimeout(
      client.query(api.meetingPrograms.getAll, { includeArchived }),
    );
    return { data: (data || []).map(mapDoc), error: null };
  } catch (error) {
    return { data: mockMeetingPrograms.map(mapDoc), error: null };
  }
}

export async function create(programData) {
  const client = getClient();
  const data = {
    ...programData,
    code: programData.code || `${slugify(programData.name)}-${Date.now()}`,
  };
  if (!client) {
    const program = { ...data, id: `mp-${Date.now()}`, active: true };
    program.leaders = mockPeople.filter((person) =>
      (program.leader_ids || []).includes(person.id),
    );
    program.members = mockPeople.filter((person) =>
      (program.member_ids || []).includes(person.id),
    );
    mockMeetingPrograms.push(program);
    return { data: program, error: null };
  }
  try {
    const result = await withTimeout(
      client.mutation(api.meetingPrograms.create, cleanData(data)),
      6000,
    );
    return { data: mapDoc(result), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function update(id, programData) {
  const client = getClient();
  const { leader_ids = [], member_ids = [], ...details } = programData;
  if (!client || !isConvexId(id)) {
    const index = mockMeetingPrograms.findIndex(
      (program) => String(program.id) === String(id),
    );
    if (index < 0) return { data: null, error: new Error("Programme not found") };
    mockMeetingPrograms[index] = {
      ...mockMeetingPrograms[index],
      ...details,
      leader_ids,
      member_ids,
      leaders: mockPeople.filter((person) => leader_ids.includes(person.id)),
      members: mockPeople.filter((person) => member_ids.includes(person.id)),
    };
    return { data: mockMeetingPrograms[index], error: null };
  }
  try {
    const result = await withTimeout(
      client.mutation(api.meetingPrograms.update, { id, ...cleanData(details) }),
      6000,
    );
    await withTimeout(
      client.mutation(api.meetingPrograms.syncPeople, {
        programId: id,
        leaderIds: leader_ids,
        memberIds: member_ids,
      }),
      6000,
    );
    return { data: mapDoc(result), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function archive(id) {
  const client = getClient();
  if (!client || !isConvexId(id)) {
    const program = mockMeetingPrograms.find(
      (item) => String(item.id) === String(id),
    );
    if (program) program.active = false;
    return { error: null };
  }
  try {
    await withTimeout(client.mutation(api.meetingPrograms.archive, { id }), 5000);
    return { error: null };
  } catch (error) {
    return { error };
  }
}
