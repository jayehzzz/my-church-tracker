import { isHeldMeeting } from "./reportingMetrics.js";

const PRESENT_STATUSES = new Set([undefined, null, "", "present"]);

function idOf(value) {
  return String(value?._id || value?.id || value || "");
}

function titleCase(value) {
  return String(value || "Meeting")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function meetingName(meeting) {
  if (meeting?.title) return meeting.title;
  if (meeting?.program?.name) return meeting.program.name;
  const names = {
    bacenta: "Bacenta",
    flow_service: "Flow Service",
    flow_prayer: "Flow Service",
    acts_prayer: "Acts Prayer",
    farley_prayer: "Acts Prayer",
    shemen_prayer: "Shemen Prayer",
    workers_meeting: "Workers Meeting",
    evangelistic_event: "Evangelistic Event",
    special_event: "Special Event",
    training: "Training / Workshop",
    fellowship: "Fellowship / Social",
  };
  return names[meeting?.meeting_type] || titleCase(meeting?.meeting_type);
}

export function attendanceRecords(meeting) {
  const source = meeting?.attendance_records || meeting?.attendees || [];
  return source
    .map((record) =>
      typeof record === "string"
        ? { person_id: record, status: "present", attended: true }
        : record,
    )
    .filter(
      (record) => PRESENT_STATUSES.has(record?.status) || record?.attended,
    );
}

export function attendeeIds(meeting) {
  const ids = attendanceRecords(meeting)
    .map((record) => idOf(record.person_id || record.person?._id || record.person?.id))
    .filter(Boolean);
  if (ids.length) return Array.from(new Set(ids));
  return Array.from(
    new Set((meeting?.attendee_ids || []).map(idOf).filter(Boolean)),
  );
}

export function meetingAttendance(meeting) {
  return Number(
    meeting?.display_attendance_count ??
      meeting?.total_attendance ??
      meeting?.attendance_count ??
      attendeeIds(meeting).length + Number(meeting?.unnamed_guests_count || 0),
  );
}

function programmeForMeeting(meeting, programmeMap) {
  return (
    meeting?.program || programmeMap.get(idOf(meeting?.program_id)) || null
  );
}

function categoryForMeeting(meeting, programmeMap) {
  if (!meeting?.program_id) return "one_off";
  return programmeForMeeting(meeting, programmeMap)?.category || "other";
}

function leaderIdsForMeeting(meeting, programme) {
  return new Set(
    [
      ...(meeting?.leaders || []),
      ...(programme?.leaders || []),
      ...(programme?.leader_ids || []),
      meeting?.leader_id,
    ]
      .map(idOf)
      .filter(Boolean),
  );
}

function recordPersonId(record) {
  return idOf(record?.person_id || record?.person?._id || record?.person?.id);
}

export function filterMeetingRecords(
  meetings,
  filters = {},
  { startDate, endDate, programs = [], people = [] } = {},
) {
  const programmeMap = new Map(programs.map((program) => [idOf(program), program]));
  const peopleMap = new Map(people.map((person) => [idOf(person), person]));

  return (meetings || []).filter((meeting) => {
    if (startDate && meeting.meeting_date < startDate) return false;
    if (endDate && meeting.meeting_date > endDate) return false;

    if (filters.program && filters.program !== "all") {
      const matchesProgram =
        filters.program === "one_off"
          ? !meeting.program_id
          : idOf(meeting.program_id) === idOf(filters.program);
      if (!matchesProgram) return false;
    }

    const programme = programmeForMeeting(meeting, programmeMap);
    if (
      filters.category &&
      filters.category !== "all" &&
      categoryForMeeting(meeting, programmeMap) !== filters.category
    ) {
      return false;
    }
    if (
      filters.leader &&
      filters.leader !== "all" &&
      !leaderIdsForMeeting(meeting, programme).has(idOf(filters.leader))
    ) {
      return false;
    }
    if (
      filters.format &&
      filters.format !== "all" &&
      (meeting.format || programme?.default_format || "in_person") !==
        filters.format
    ) {
      return false;
    }
    if (
      filters.status &&
      filters.status !== "all" &&
      (meeting.status || "completed") !== filters.status
    ) {
      return false;
    }

    const ids = attendeeIds(meeting);
    if (
      filters.person &&
      filters.person !== "all" &&
      !ids.includes(idOf(filters.person))
    ) {
      return false;
    }
    if (filters.personStatus && filters.personStatus !== "all") {
      const hasStatus = ids.some((personId) => {
        const status = peopleMap.get(personId)?.member_status;
        return filters.personStatus === "guest"
          ? status === "guest" || status === "visitor"
          : status === filters.personStatus;
      });
      if (!hasStatus) return false;
    }

    const records = attendanceRecords(meeting);
    if (filters.milestone && filters.milestone !== "all") {
      const matchesMilestone = records.some((record) => {
        if (filters.milestone === "first_timer") return record.first_timer;
        if (filters.milestone === "first_program") {
          return record.first_program_attendance;
        }
        if (filters.milestone === "returning") {
          return !record.first_timer && !record.first_program_attendance;
        }
        return true;
      });
      if (!matchesMilestone) return false;
    }

    const hasNamedGuests = ids.some((personId) => {
      const status = peopleMap.get(personId)?.member_status;
      return status === "guest" || status === "visitor";
    });
    const hasUnnamedGuests = Number(meeting.unnamed_guests_count || 0) > 0;
    if (filters.guestRecording === "named" && !hasNamedGuests) return false;
    if (filters.guestRecording === "unnamed" && !hasUnnamedGuests) return false;
    if (
      filters.guestRecording === "both" &&
      !(hasNamedGuests && hasUnnamedGuests)
    ) {
      return false;
    }
    if (
      filters.guestRecording === "none" &&
      (hasNamedGuests || hasUnnamedGuests)
    ) {
      return false;
    }

    const attendance = meetingAttendance(meeting);
    if (
      filters.minAttendance !== "" &&
      filters.minAttendance !== undefined &&
      attendance < Number(filters.minAttendance)
    ) {
      return false;
    }
    if (
      filters.maxAttendance !== "" &&
      filters.maxAttendance !== undefined &&
      attendance > Number(filters.maxAttendance)
    ) {
      return false;
    }
    return true;
  });
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function buildMeetingAnalytics(meetings, programs = [], now = new Date()) {
  const programmeMap = new Map(programs.map((program) => [idOf(program), program]));
  const held = (meetings || []).filter((meeting) => isHeldMeeting(meeting, now));
  const sorted = [...held].sort((a, b) =>
    String(a.meeting_date).localeCompare(String(b.meeting_date)),
  );
  const allPersonIds = unique(sorted.flatMap(attendeeIds));
  const totalAttendance = sorted.reduce(
    (sum, meeting) => sum + meetingAttendance(meeting),
    0,
  );

  const firstTimerIds = unique(
    sorted.flatMap((meeting) =>
      attendanceRecords(meeting)
        .filter((record) => record.first_timer)
        .map(recordPersonId),
    ),
  );
  const programmeFirstIds = unique(
    sorted.flatMap((meeting) =>
      attendanceRecords(meeting)
        .filter(
          (record) =>
            record.first_program_attendance && !record.first_timer,
        )
        .map(recordPersonId),
    ),
  );
  const establishedIds = unique(
    sorted.flatMap((meeting) =>
      attendanceRecords(meeting)
        .filter(
          (record) =>
            !record.first_timer && !record.first_program_attendance,
        )
        .map(recordPersonId),
    ),
  );
  const returnedFirstTimerIds = firstTimerIds.filter((personId) => {
    const firstDate = sorted.find((meeting) =>
      attendanceRecords(meeting).some(
        (record) => recordPersonId(record) === personId && record.first_timer,
      ),
    )?.meeting_date;
    return sorted.some(
      (meeting) =>
        meeting.meeting_date > firstDate && attendeeIds(meeting).includes(personId),
    );
  });

  const trendData = sorted.map((meeting) => ({
    id: idOf(meeting),
    date: meeting.meeting_date,
    total: meetingAttendance(meeting),
    members: attendeeIds(meeting).length,
    guests: Number(meeting.unnamed_guests_count || 0),
    firstTimers: attendanceRecords(meeting).filter((record) => record.first_timer).length,
    programmeFirsts: attendanceRecords(meeting).filter((record) => record.first_program_attendance && !record.first_timer).length,
    topic: meetingName(meeting),
    personIds: attendeeIds(meeting),
  }));

  const grouped = new Map();
  sorted.forEach((meeting) => {
    const programme = programmeForMeeting(meeting, programmeMap);
    const key = meeting.program_id ? idOf(meeting.program_id) : "one_off";
    const group = grouped.get(key) || {
      id: key,
      label: programme?.name || (key === "one_off" ? "One-off events" : meetingName(meeting)),
      meetings: [],
      personIds: [],
      firstTimerIds: [],
      programme,
    };
    group.meetings.push(meeting);
    group.personIds.push(...attendeeIds(meeting));
    group.firstTimerIds.push(
      ...attendanceRecords(meeting)
        .filter((record) => record.first_timer)
        .map(recordPersonId),
    );
    grouped.set(key, group);
  });

  const programmeData = Array.from(grouped.values())
    .map((group) => {
      const total = group.meetings.reduce(
        (sum, meeting) => sum + meetingAttendance(meeting),
        0,
      );
      const personIds = unique(group.personIds);
      const rosterIds = unique(group.programme?.member_ids || []);
      const rosterAttendances = group.meetings.reduce(
        (sum, meeting) =>
          sum + attendeeIds(meeting).filter((id) => rosterIds.includes(id)).length,
        0,
      );
      const rosterOpportunities = rosterIds.length * group.meetings.length;
      return {
        id: group.id,
        label: group.label,
        value: group.meetings.length
          ? Math.round(total / group.meetings.length)
          : 0,
        total,
        meetingCount: group.meetings.length,
        uniquePeople: personIds.length,
        firstTimers: unique(group.firstTimerIds).length,
        personIds,
        rosterSize: rosterIds.length,
        rosterRate: rosterOpportunities
          ? Math.round((rosterAttendances / rosterOpportunities) * 100)
          : null,
        rosterPersonIds: unique(
          group.personIds.filter((personId) => rosterIds.includes(personId)),
        ),
      };
    })
    .sort((a, b) => b.value - a.value);

  return {
    metrics: {
      held: sorted.length,
      totalAttendance,
      uniquePeople: allPersonIds.length,
      average: sorted.length ? Math.round(totalAttendance / sorted.length) : 0,
      awaiting: (meetings || []).filter(
        (meeting) => meeting.status === "attendance_needed",
      ).length,
      firstTimers: firstTimerIds.length,
      returnRate: firstTimerIds.length
        ? Math.round((returnedFirstTimerIds.length / firstTimerIds.length) * 100)
        : 0,
    },
    trendData,
    programmeData,
    rosterData: programmeData
      .filter((item) => item.rosterRate !== null)
      .map((item) => ({
        ...item,
        value: item.rosterRate,
      })),
    peopleComposition: [
      {
        id: "first_timers",
        label: "First timers",
        value: firstTimerIds.length,
        personIds: firstTimerIds,
      },
      {
        id: "programme_firsts",
        label: "Programme firsts",
        value: programmeFirstIds.length,
        personIds: programmeFirstIds,
      },
      {
        id: "established",
        label: "Established",
        value: establishedIds.length,
        personIds: establishedIds,
      },
    ],
  };
}

export function previousDateRange(range) {
  if (!range?.startDate || !range?.endDate) return null;
  const day = 24 * 60 * 60 * 1000;
  const start = Date.parse(`${range.startDate}T00:00:00Z`);
  const end = Date.parse(`${range.endDate}T00:00:00Z`);
  const duration = Math.floor((end - start) / day) + 1;
  const previousEnd = start - day;
  const previousStart = previousEnd - (duration - 1) * day;
  return {
    startDate: new Date(previousStart).toISOString().slice(0, 10),
    endDate: new Date(previousEnd).toISOString().slice(0, 10),
  };
}

export function percentageChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
