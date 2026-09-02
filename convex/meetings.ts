import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const LEGACY_PROGRAM_CODES: Record<string, string> = {
    bacenta: "bacenta-main",
    flow_prayer: "flow-service",
    flow_service: "flow-service",
    farley_prayer: "acts-prayer",
    acts_prayer: "acts-prayer",
    shemen_prayer: "shemen-prayer",
    workers_meeting: "workers-meeting",
};

const RENAMED_MEETING_TYPES: Record<string, string> = {
    flow_prayer: "flow_service",
    farley_prayer: "acts_prayer",
};

async function getPerson(ctx: any, personId: string | undefined) {
    if (!personId) return null;
    try {
        return await ctx.db.get(personId as Id<"people">);
    } catch {
        return null;
    }
}

async function getProgramForMeeting(ctx: any, meeting: any) {
    if (meeting.program_id) {
        const program = await ctx.db.get(meeting.program_id);
        if (program) return program;
    }
    const code = LEGACY_PROGRAM_CODES[meeting.meeting_type];
    if (!code) return null;
    return await ctx.db
        .query("meeting_programs")
        .withIndex("by_code", (q: any) => q.eq("code", code))
        .first();
}

async function getProgramLeaders(
    ctx: any,
    programId: Id<"meeting_programs"> | undefined,
) {
    if (!programId) return [];
    const links = await ctx.db
        .query("meeting_program_leaders")
        .withIndex("by_program", (q: any) => q.eq("program_id", programId))
        .collect();
    return (await Promise.all(
        links.map(async (link: any) => {
            const person = await ctx.db.get(link.person_id);
            return person ? { ...person, is_primary: link.is_primary } : null;
        }),
    )).filter(Boolean);
}

async function getPriorProgrammeAttendeeIds(ctx: any, meeting: any) {
    if (!meeting?.program_id) return new Set<string>();
    const programmeMeetings = await ctx.db
        .query("meetings")
        .withIndex("by_program", (q: any) =>
            q.eq("program_id", meeting.program_id),
        )
        .collect();
    const priorMeetingIds = programmeMeetings
        .filter(
            (record: any) =>
                String(record._id) !== String(meeting._id) &&
                record.meeting_date < meeting.meeting_date,
        )
        .map((record: any) => record._id);
    const priorAttendance = (
        await Promise.all(
            priorMeetingIds.map((meetingId: Id<"meetings">) =>
                ctx.db
                    .query("meeting_attendance")
                    .withIndex("by_meeting", (q: any) =>
                        q.eq("meeting_id", meetingId),
                    )
                    .collect(),
            ),
        )
    ).flat();
    return new Set(
        priorAttendance
            .filter(
                (record: any) =>
                    !record.status ||
                    record.status === "present" ||
                    record.attended,
            )
            .map((record: any) => String(record.person_id)),
    );
}

async function hydrateMeeting(ctx: any, meeting: any) {
    const [program, attendanceRecords, legacyLeader] = await Promise.all([
        getProgramForMeeting(ctx, meeting),
        ctx.db
            .query("meeting_attendance")
            .withIndex("by_meeting", (q: any) =>
                q.eq("meeting_id", meeting._id),
            )
            .collect(),
        getPerson(ctx, meeting.leader_id),
    ]);
    const presentRecords = attendanceRecords.filter(
        (record: any) =>
            !record.status || record.status === "present" || record.attended,
    );
    const attendees = (await Promise.all(
        presentRecords.map(async (record: any) => {
            const person = await ctx.db.get(record.person_id);
            return person ? { ...record, person } : null;
        }),
    )).filter(Boolean);
    const leaders = program
        ? await getProgramLeaders(ctx, program._id)
        : legacyLeader
          ? [legacyLeader]
          : [];
    const unnamedGuests = meeting.unnamed_guests_count || 0;
    const namedCount = presentRecords.length;

    return {
        ...meeting,
        meeting_type:
            RENAMED_MEETING_TYPES[meeting.meeting_type] || meeting.meeting_type,
        program,
        leaders,
        leader: leaders[0] || legacyLeader,
        attendees,
        attendee_ids: presentRecords.map((record: any) => record.person_id),
        named_attendance_count: namedCount,
        total_attendance: namedCount + unnamedGuests,
        display_attendance_count:
            namedCount > 0 || meeting.unnamed_guests_count !== undefined
                ? namedCount + unnamedGuests
                : meeting.attendance_count || 0,
    };
}

export const getAll = query({
    args: {},
    handler: async (ctx) => {
        const meetings = await ctx.db.query("meetings").collect();
        const results = await Promise.all(
            meetings.map((meeting) => hydrateMeeting(ctx, meeting)),
        );
        return results.sort(
            (a, b) =>
                new Date(b.meeting_date).getTime() -
                new Date(a.meeting_date).getTime(),
        );
    },
});

export const getById = query({
    args: { id: v.id("meetings") },
    handler: async (ctx, args) => {
        const meeting = await ctx.db.get(args.id);
        return meeting ? await hydrateMeeting(ctx, meeting) : null;
    },
});

export const create = mutation({
    args: {
        program_id: v.optional(v.id("meeting_programs")),
        title: v.optional(v.string()),
        meeting_date: v.string(),
        meeting_type: v.string(),
        start_time: v.optional(v.string()),
        end_time: v.optional(v.string()),
        duration_minutes: v.optional(v.float64()),
        format: v.optional(v.string()),
        location: v.optional(v.string()),
        online_url: v.optional(v.string()),
        status: v.optional(v.string()),
        attendance_count: v.optional(v.float64()),
        unnamed_guests_count: v.optional(v.float64()),
        leaders_count: v.optional(v.float64()),
        leader_id: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        const id = await ctx.db.insert("meetings", {
            ...args,
            meeting_type:
                RENAMED_MEETING_TYPES[args.meeting_type] || args.meeting_type,
            attendance_count: args.attendance_count || 0,
            unnamed_guests_count: args.unnamed_guests_count || 0,
            status: args.status || "attendance_needed",
            created_at: now,
        });
        return await ctx.db.get(id);
    },
});

export const update = mutation({
    args: {
        id: v.id("meetings"),
        program_id: v.optional(v.id("meeting_programs")),
        title: v.optional(v.string()),
        meeting_date: v.optional(v.string()),
        meeting_type: v.optional(v.string()),
        start_time: v.optional(v.string()),
        end_time: v.optional(v.string()),
        duration_minutes: v.optional(v.float64()),
        format: v.optional(v.string()),
        location: v.optional(v.string()),
        online_url: v.optional(v.string()),
        status: v.optional(v.string()),
        attendance_count: v.optional(v.float64()),
        unnamed_guests_count: v.optional(v.float64()),
        leaders_count: v.optional(v.float64()),
        leader_id: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, meeting_type, ...updates } = args;
        await ctx.db.patch(id, {
            ...updates,
            ...(meeting_type
                ? {
                      meeting_type:
                          RENAMED_MEETING_TYPES[meeting_type] || meeting_type,
                  }
                : {}),
            updated_at: new Date().toISOString(),
        });
        return await ctx.db.get(id);
    },
});

export const remove = mutation({
    args: { id: v.id("meetings") },
    handler: async (ctx, args) => {
        const attendance = await ctx.db
            .query("meeting_attendance")
            .withIndex("by_meeting", (q) => q.eq("meeting_id", args.id))
            .collect();
        await Promise.all(
            attendance.map((record) => ctx.db.delete(record._id)),
        );
        await ctx.db.delete(args.id);
        return { success: true, attendanceRemoved: attendance.length };
    },
});

export const getByType = query({
    args: { meetingType: v.string() },
    handler: async (ctx, args) => {
        const acceptedTypes = Object.entries(RENAMED_MEETING_TYPES)
            .filter(([, current]) => current === args.meetingType)
            .map(([legacy]) => legacy);
        acceptedTypes.push(args.meetingType);
        const allMeetings = await ctx.db.query("meetings").collect();
        const meetings = allMeetings.filter((meeting) =>
            acceptedTypes.includes(meeting.meeting_type),
        );
        const results = await Promise.all(
            meetings.map((meeting) => hydrateMeeting(ctx, meeting)),
        );
        return results.sort(
            (a, b) =>
                new Date(b.meeting_date).getTime() -
                new Date(a.meeting_date).getTime(),
        );
    },
});

export const getByDateRange = query({
    args: { startDate: v.string(), endDate: v.string() },
    handler: async (ctx, args) => {
        const meetings = await ctx.db
            .query("meetings")
            .withIndex("by_meeting_date", (q) =>
                q
                    .gte("meeting_date", args.startDate)
                    .lte("meeting_date", args.endDate),
            )
            .collect();
        const results = await Promise.all(
            meetings.map((meeting) => hydrateMeeting(ctx, meeting)),
        );
        return results.sort(
            (a, b) =>
                new Date(b.meeting_date).getTime() -
                new Date(a.meeting_date).getTime(),
        );
    },
});

export const addAttendee = mutation({
    args: {
        meetingId: v.id("meetings"),
        personId: v.id("people"),
    },
    handler: async (ctx, args) => {
        const meeting = await ctx.db.get(args.meetingId);
        if (!meeting) throw new Error("Meeting not found");
        const priorProgrammeAttendeeIds =
            await getPriorProgrammeAttendeeIds(ctx, meeting);
        const firstProgramAttendance = Boolean(
            meeting.program_id &&
                !priorProgrammeAttendeeIds.has(String(args.personId)),
        );
        const existing = await ctx.db
            .query("meeting_attendance")
            .withIndex("by_meeting_person", (q) =>
                q
                    .eq("meeting_id", args.meetingId)
                    .eq("person_id", args.personId),
            )
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                attended: true,
                status: "present",
                first_program_attendance: firstProgramAttendance,
            });
            return await ctx.db.get(existing._id);
        }
        const id = await ctx.db.insert("meeting_attendance", {
            meeting_id: args.meetingId,
            person_id: args.personId,
            attended: true,
            status: "present",
            first_program_attendance: firstProgramAttendance,
            created_at: new Date().toISOString(),
        });
        return await ctx.db.get(id);
    },
});

export const syncAttendance = mutation({
    args: {
        meetingId: v.id("meetings"),
        attendanceData: v.array(
            v.object({
                person_id: v.id("people"),
                status: v.optional(v.string()),
                arrived_late: v.optional(v.boolean()),
                left_early: v.optional(v.boolean()),
                first_timer: v.optional(v.boolean()),
            }),
        ),
        unnamedGuestsCount: v.float64(),
        markComplete: v.boolean(),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        const meeting = await ctx.db.get(args.meetingId);
        if (!meeting) throw new Error("Meeting not found");
        const priorProgrammeAttendeeIds =
            await getPriorProgrammeAttendeeIds(ctx, meeting);
        const existing = await ctx.db
            .query("meeting_attendance")
            .withIndex("by_meeting", (q) => q.eq("meeting_id", args.meetingId))
            .collect();
        const dedupedAttendance = Array.from(
            new Map(
                args.attendanceData.map((record) => [String(record.person_id), record]),
            ).values(),
        );
        const existingByPerson = new Map(
            existing.map((record) => [String(record.person_id), record]),
        );
        const incomingIds = new Set(
            dedupedAttendance.map((record) => String(record.person_id)),
        );
        const removals = existing.filter(
            (record) => !incomingIds.has(String(record.person_id)),
        );
        await Promise.all(
            removals.map((record) => ctx.db.delete(record._id)),
        );

        for (const record of dedupedAttendance) {
            const current = existingByPerson.get(String(record.person_id));
            const isPresent = (record.status || "present") === "present";
            const attendanceValues = {
                attended: isPresent,
                status: record.status || "present",
                arrived_late: record.arrived_late || false,
                left_early: record.left_early || false,
                first_timer: record.first_timer || false,
                first_program_attendance: Boolean(
                    isPresent &&
                        meeting.program_id &&
                        !priorProgrammeAttendeeIds.has(String(record.person_id)),
                ),
            };
            if (current) {
                await ctx.db.patch(current._id, attendanceValues);
            } else {
                await ctx.db.insert("meeting_attendance", {
                    meeting_id: args.meetingId,
                    person_id: record.person_id,
                    ...attendanceValues,
                    created_at: now,
                });
            }
            if (record.first_timer) {
                const person = await ctx.db.get(record.person_id);
                if (person && !person.first_visit_date) {
                    await ctx.db.patch(record.person_id, {
                        first_visit_date:
                            meeting.meeting_date || now.split("T")[0],
                        entry_point:
                            person.entry_point ||
                            (meeting.meeting_type === "bacenta"
                                ? "bacenta_meeting"
                                : meeting.meeting_type === "evangelistic_event"
                                  ? "evangelism"
                                  : "other"),
                        updated_at: now,
                    });
                }
            }
        }

        const present = dedupedAttendance.filter(
            (record) => !record.status || record.status === "present",
        );
        let leaderCount = 0;
        if (meeting?.program_id) {
            const leaderLinks = await ctx.db
                .query("meeting_program_leaders")
                .withIndex("by_program", (q) =>
                    q.eq("program_id", meeting.program_id!),
                )
                .collect();
            const leaderIds = new Set(
                leaderLinks.map((link) => String(link.person_id)),
            );
            leaderCount = present.filter((record) =>
                leaderIds.has(String(record.person_id)),
            ).length;
        }

        const total = present.length + Math.max(0, args.unnamedGuestsCount);
        await ctx.db.patch(args.meetingId, {
            attendance_count: total,
            unnamed_guests_count: Math.max(0, args.unnamedGuestsCount),
            leaders_count: leaderCount,
            status: args.markComplete ? "completed" : "attendance_needed",
            attendance_completed_at: args.markComplete ? now : undefined,
            updated_at: now,
        });
        return {
            success: true,
            namedAttendance: present.length,
            totalAttendance: total,
            removed: removals.length,
        };
    },
});

export const getAttendees = query({
    args: { meetingId: v.id("meetings") },
    handler: async (ctx, args) => {
        const records = await ctx.db
            .query("meeting_attendance")
            .withIndex("by_meeting", (q) => q.eq("meeting_id", args.meetingId))
            .collect();
        return await Promise.all(
            records.map(async (record) => ({
                ...record,
                people: await ctx.db.get(record.person_id),
            })),
        );
    },
});

export const getByPerson = query({
    args: { personId: v.id("people") },
    handler: async (ctx, args) => {
        const records = await ctx.db
            .query("meeting_attendance")
            .withIndex("by_person", (q) => q.eq("person_id", args.personId))
            .collect();
        const results = await Promise.all(
            records.map(async (record) => {
                const meeting = await ctx.db.get(record.meeting_id);
                if (!meeting) return null;
                const hydrated = await hydrateMeeting(ctx, meeting);
                return { ...record, meeting: hydrated };
            }),
        );
        return results
            .filter(Boolean)
            .sort(
                (a: any, b: any) =>
                    new Date(b.meeting.meeting_date).getTime() -
                    new Date(a.meeting.meeting_date).getTime(),
            );
    },
});

export const migrateLegacyMeetings = mutation({
    args: {},
    handler: async (ctx) => {
        const meetings = await ctx.db.query("meetings").collect();
        const programs = await ctx.db.query("meeting_programs").collect();
        const programByCode = new Map(
            programs.map((program) => [program.code, program]),
        );
        let updated = 0;
        for (const meeting of meetings) {
            const code = LEGACY_PROGRAM_CODES[meeting.meeting_type];
            const program = code ? programByCode.get(code) : undefined;
            const nextType =
                RENAMED_MEETING_TYPES[meeting.meeting_type] ||
                meeting.meeting_type;
            const patch: Record<string, unknown> = {};
            if (!meeting.program_id && program) patch.program_id = program._id;
            if (nextType !== meeting.meeting_type) {
                patch.meeting_type = nextType;
            }
            if (!meeting.status) {
                patch.status =
                    meeting.attendance_count !== undefined
                        ? "completed"
                        : "attendance_needed";
            }
            if (!meeting.format) {
                patch.format =
                    nextType === "flow_service" ? "online" : "in_person";
            }
            if (Object.keys(patch).length > 0) {
                await ctx.db.patch(meeting._id, {
                    ...patch,
                    updated_at: new Date().toISOString(),
                });
                updated += 1;
            }
        }
        return { updated };
    },
});
