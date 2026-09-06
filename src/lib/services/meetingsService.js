import { api } from "../../../convex/_generated/api.js";
import { mockMeetings, mockPeople } from "../data/mockData.js";
import { mockMeetingPrograms } from "./meetingProgramsService.js";
import { getConvexHttpClient, isDemoMode, unavailableError } from "$lib/convex.js";

const TYPE_ALIASES = {
  flow_prayer: "flow_service",
  farley_prayer: "acts_prayer",
};

const PROGRAM_CODES = {
  bacenta: "bacenta-main",
  flow_prayer: "flow-service",
  flow_service: "flow-service",
  farley_prayer: "acts-prayer",
  acts_prayer: "acts-prayer",
  shemen_prayer: "shemen-prayer",
  workers_meeting: "workers-meeting",
};

function getClient() {
  return getConvexHttpClient();
}

const unavailable = () => ({ data: null, error: unavailableError() });

function isConvexId(id) {
  if (!id || typeof id !== "string") return false;
  if (id.startsWith("mock-") || id.length < 15) return false;
  return /^[0-9a-z_-]{15,}$/i.test(id);
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

function normalizeMockMeeting(meeting) {
  const meetingType = TYPE_ALIASES[meeting.meeting_type] || meeting.meeting_type;
  const programCode = PROGRAM_CODES[meeting.meeting_type] || PROGRAM_CODES[meetingType];
  const program =
    mockMeetingPrograms.find((item) => item.id === meeting.program_id) ||
    mockMeetingPrograms.find((item) => item.code === programCode) ||
    null;
  const rawAttendanceRecords = meeting.attendance_records ||
    (meeting.attendees || []).map((personId) => ({
      person_id: personId,
      status: "present",
      attended: true,
    }));
  const presentRecords = rawAttendanceRecords.filter(
    (record) => !record.status || record.status === "present" || record.attended,
  );
  const attendeeIds = Array.from(
    new Set(presentRecords.map((record) => record.person_id)),
  );
  const unnamedGuests = meeting.unnamed_guests_count ?? Math.max(
    0,
    (meeting.attendance_count || 0) - attendeeIds.length,
  );
  const attendees = presentRecords
    .map((record) => {
      const person = mockPeople.find(
        (item) => String(item.id) === String(record.person_id),
      );
      return person ? { ...record, person } : null;
    })
    .filter(Boolean);
  return mapDoc({
    ...meeting,
    meeting_type: meetingType,
    program_id: meeting.program_id || program?.id,
    program,
    format:
      meeting.format || program?.default_format ||
      (meetingType === "flow_service" ? "online" : "in_person"),
    status: meeting.status || "completed",
    attendance_records: presentRecords,
    attendees,
    attendee_ids: attendeeIds,
    named_attendance_count: attendeeIds.length,
    unnamed_guests_count: unnamedGuests,
    display_attendance_count: attendeeIds.length + unnamedGuests,
    total_attendance: attendeeIds.length + unnamedGuests,
    leaders: program?.leaders || [],
    leader: program?.leaders?.[0] || null,
  });
}

export async function getAll() {
  const client = getClient();
  if (!client) {
    return isDemoMode() ? { data: mockMeetings.map(normalizeMockMeeting), error: null } : unavailable();
  }
  try {
    const data = await withTimeout(client.query(api.meetings.getAll));
    return { data: (data || []).map(mapDoc), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getById(id) {
  const client = getClient();
  if (!client || !isConvexId(id)) {
    if (!isDemoMode()) return unavailable();
    const meeting = mockMeetings.find((item) => String(item.id) === String(id));
    return { data: meeting ? normalizeMockMeeting(meeting) : null, error: null };
  }
  try {
    return {
      data: mapDoc(await withTimeout(client.query(api.meetings.getById, { id }))),
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

export async function create(meetingData) {
  const client = getClient();
  if (!client) {
    if (!isDemoMode()) return unavailable();
    const meeting = {
      ...meetingData,
      id: `mock-${Date.now()}-${mockMeetings.length}`,
      attendees: [],
      created_at: new Date().toISOString(),
    };
    mockMeetings.unshift(meeting);
    return { data: normalizeMockMeeting(meeting), error: null };
  }
  try {
    const data = await withTimeout(
      client.mutation(api.meetings.create, cleanData(meetingData)),
      6000,
    );
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function update(id, meetingData) {
  const client = getClient();
  if (!client || !isConvexId(id)) {
    if (!isDemoMode()) return unavailable();
    const index = mockMeetings.findIndex((item) => String(item.id) === String(id));
    if (index < 0) return { data: null, error: new Error("Meeting not found") };
    mockMeetings[index] = { ...mockMeetings[index], ...meetingData };
    return { data: normalizeMockMeeting(mockMeetings[index]), error: null };
  }
  try {
    const data = await withTimeout(
      client.mutation(api.meetings.update, { id, ...cleanData(meetingData) }),
      6000,
    );
    return { data: mapDoc(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function remove(id) {
  const client = getClient();
  if (!client || !isConvexId(id)) {
    if (!isDemoMode()) return { error: unavailableError() };
    const index = mockMeetings.findIndex((item) => String(item.id) === String(id));
    if (index >= 0) mockMeetings.splice(index, 1);
    return { error: null };
  }
  try {
    await withTimeout(client.mutation(api.meetings.remove, { id }), 6000);
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function syncAttendance(
  meetingId,
  attendanceData,
  unnamedGuestsCount = 0,
  markComplete = true,
) {
  const client = getClient();
  if (!client || !isConvexId(meetingId)) {
    if (!isDemoMode()) return unavailable();
    const meeting = mockMeetings.find(
      (item) => String(item.id) === String(meetingId),
    );
    if (!meeting) return { data: null, error: new Error("Meeting not found") };
    const programId = normalizeMockMeeting(meeting).program_id;
    const priorProgrammeAttendeeIds = new Set(
      programId
        ? mockMeetings
            .filter(
              (record) =>
                String(record.id) !== String(meeting.id) &&
                record.meeting_date < meeting.meeting_date &&
                String(normalizeMockMeeting(record).program_id) ===
                  String(programId),
            )
            .flatMap((record) => normalizeMockMeeting(record).attendee_ids || [])
            .map(String)
        : [],
    );
    meeting.attendance_records = Array.from(
      new Map(
        attendanceData.map((record) => [String(record.person_id), record]),
      ).values(),
    ).map((record) => ({
      ...record,
      attended: !record.status || record.status === "present",
      status: record.status || "present",
      first_timer: Boolean(record.first_timer),
      first_program_attendance: Boolean(
        programId && !priorProgrammeAttendeeIds.has(String(record.person_id)),
      ),
    }));
    meeting.attendees = meeting.attendance_records
      .filter((record) => record.status === "present")
      .map((record) => record.person_id);
    meeting.attendance_records
      .filter((record) => record.first_timer)
      .forEach((record) => {
        const person = mockPeople.find(
          (item) => String(item.id) === String(record.person_id),
        );
        if (!person || person.first_visit_date) return;
        person.first_visit_date = meeting.meeting_date;
        person.entry_point =
          person.entry_point ||
          (meeting.meeting_type === "bacenta"
            ? "bacenta_meeting"
            : meeting.meeting_type === "evangelistic_event"
              ? "evangelism"
              : "other");
      });
    meeting.unnamed_guests_count = Math.max(0, Number(unnamedGuestsCount) || 0);
    meeting.attendance_count = meeting.attendees.length + meeting.unnamed_guests_count;
    meeting.status = markComplete ? "completed" : "attendance_needed";
    return { data: normalizeMockMeeting(meeting), error: null };
  }
  try {
    const data = await withTimeout(
      client.mutation(api.meetings.syncAttendance, {
        meetingId,
        attendanceData,
        unnamedGuestsCount: Math.max(0, Number(unnamedGuestsCount) || 0),
        markComplete,
      }),
      7000,
    );
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAttendees(meetingId) {
  const client = getClient();
  if (!client || !isConvexId(meetingId)) {
    if (!isDemoMode()) return unavailable();
    const meeting = mockMeetings.find(
      (item) => String(item.id) === String(meetingId),
    );
    const records = meeting?.attendance_records ||
      (meeting?.attendees || []).map((personId) => ({
        person_id: personId,
        status: "present",
        attended: true,
      }));
    const data = records
      .map((record) => {
        const person = mockPeople.find(
          (item) => String(item.id) === String(record.person_id),
        );
        return person
          ? { ...record, people: person }
          : null;
      })
      .filter(Boolean);
    return { data, error: null };
  }
  try {
    return {
      data: await withTimeout(
        client.query(api.meetings.getAttendees, { meetingId }),
      ),
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getByPerson(personId) {
  const client = getClient();
  if (!client || !isConvexId(personId)) {
    if (!isDemoMode()) return unavailable();
    const data = mockMeetings.flatMap((meeting) => {
      const normalizedMeeting = normalizeMockMeeting(meeting);
      const record = normalizedMeeting.attendance_records.find(
        (attendance) => String(attendance.person_id) === String(personId),
      );
      if (!record || (record.status && record.status !== "present")) return [];
      return [
        {
          id: record.id || `meeting-attendance-${meeting.id}-${personId}`,
          ...record,
          person_id: personId,
          status: record.status || "present",
          meeting: normalizedMeeting,
        },
      ];
    });
    return { data, error: null };
  }
  try {
    const data = await withTimeout(
      client.query(api.meetings.getByPerson, { personId }),
    );
    return { data: (data || []).map(mapDoc), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getByType(meetingType) {
  const { data, error } = await getAll();
  return {
    data: error ? null : data.filter((meeting) => meeting.meeting_type === meetingType),
    error,
  };
}

export async function getByDateRange(startDate, endDate) {
  const { data, error } = await getAll();
  return {
    data: error
      ? null
      : data.filter(
          (meeting) =>
            meeting.meeting_date >= startDate && meeting.meeting_date <= endDate,
        ),
    error,
  };
}

export async function addAttendee(meetingId, personId) {
  const current = await getAttendees(meetingId);
  if (current.error) return current;
  const attendanceData = current.data.map((record) => ({
    person_id: record.person_id,
    status: record.status || "present",
  }));
  if (!attendanceData.some((record) => String(record.person_id) === String(personId))) {
    attendanceData.push({ person_id: personId, status: "present" });
  }
  return await syncAttendance(meetingId, attendanceData, 0, true);
}

export async function record(recordData) {
  const client = getClient();
  if (!client) return { data: null, error: new Error("Connected attendance recording requires the live backend. Demo gathering records are read-only.") };
  try {
    const data = await client.mutation(api.meetings.record, cleanData(recordData));
    return { data: mapDoc(data), error: null };
  } catch (error) { return { data: null, error }; }
}
