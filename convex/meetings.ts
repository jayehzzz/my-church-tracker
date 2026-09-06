import { internalMutation } from "./_generated/server";
import { requireMaintenance } from "./lib/maintenance";
import { queryFor, mutationFor } from "./lib/security";
import { actualDate, count, date, present, deleteGathering, meetingRows, reconcilePeople, reconcileMeetingCounts, setActualAttendance } from "./lib/attendanceWorkflow";
import type { MutationCtx } from "./_generated/server";

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
                    present(record),
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
            present(record),
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

export const getAll = queryFor("meetings:getAll")({
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

export const getById = queryFor("meetings:getById")({
    args: { id: v.id("meetings") },
    handler: async (ctx, args) => {
        const meeting = await ctx.db.get(args.id);
        return meeting ? await hydrateMeeting(ctx, meeting) : null;
    },
});

export const create = mutationFor("meetings:create")({
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
        date(args.meeting_date);
        count(args.unnamed_guests_count, "Unnamed guests");
        count(args.attendance_count, "Attendance");
        if (args.attendance_count && args.attendance_count !== args.unnamed_guests_count) throw new Error("Use record for named attendance; specify unnamed_guests_count for unnamed attendees");
        const now = new Date().toISOString();
        const id = await ctx.db.insert("meetings", {
            ...args,
            meeting_type:
                RENAMED_MEETING_TYPES[args.meeting_type] || args.meeting_type,
            attendance_count: args.unnamed_guests_count || 0,
            unnamed_guests_count: args.unnamed_guests_count || 0,
            status: args.status || "attendance_needed",
            created_at: now,
        });
        return await ctx.db.get(id);
    },
});

export const update = mutationFor("meetings:update")({
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
        if (!await ctx.db.get(id)) throw new Error("Meeting not found");
        if (updates.meeting_date) date(updates.meeting_date);
        count(updates.unnamed_guests_count, "Unnamed guests");
        count(updates.attendance_count, "Attendance");
        const rows = await meetingRows(ctx, id);
        if (updates.meeting_date && (rows.some(present) || updates.status === "completed")) actualDate(updates.meeting_date);
        if (updates.status === "cancelled" && rows.some(present)) throw new Error("Remove named attendance before cancelling the meeting");
        if (updates.attendance_count !== undefined && updates.attendance_count !== rows.filter(present).length + (updates.unnamed_guests_count ?? (await ctx.db.get(id))?.unnamed_guests_count ?? 0)) throw new Error("Attendance totals are derived from named and unnamed attendance");
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
        await reconcileMeetingCounts(ctx, id);
        await reconcilePeople(ctx, rows.map(r => r.person_id));
        return await ctx.db.get(id);
    },
});

export const remove = mutationFor("meetings:remove")({
    args: { id: v.id("meetings") },
    handler: async (ctx, args) => {
        return await deleteGathering(ctx, { meetingId: args.id });

    },
});

export const getByType = queryFor("meetings:getByType")({
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

export const getByDateRange = queryFor("meetings:getByDateRange")({
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

export const addAttendee = mutationFor("meetings:addAttendee")({
    args: {
        meetingId: v.id("meetings"),
        personId: v.id("people"),
    },
    handler: async (ctx, args) => {
        await setActualAttendance(ctx, args.personId, { meetingId: args.meetingId }, true);
        return (await meetingRows(ctx, args.meetingId)).find(r => r.person_id === args.personId);

    },
});

export const syncAttendance = mutationFor("meetings:syncAttendance")({
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
    handler: async (ctx, args) => syncMeetingAttendance(ctx, args),
});

async function syncMeetingAttendance(ctx: MutationCtx, args: {
    meetingId: Id<"meetings">;
    attendanceData: Array<{ person_id: Id<"people">; status?: string; arrived_late?: boolean; left_early?: boolean; first_timer?: boolean }>;
    unnamedGuestsCount: number;
    markComplete: boolean;
}) {
        count(args.unnamedGuestsCount, "Unnamed guests");
        const now = new Date().toISOString();
        const meeting = await ctx.db.get(args.meetingId);
        if (!meeting) throw new Error("Meeting not found");
        if (args.markComplete || args.attendanceData.some(r => !r.status || r.status === "present")) actualDate(meeting.meeting_date);
        if (meeting.status === "cancelled") throw new Error("Reopen the cancelled meeting before recording attendance");
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
            (record) => !incomingIds.has(String(record.person_id)) || existingByPerson.get(String(record.person_id))?._id !== record._id,
        );
        await Promise.all(
            removals.map((record) => ctx.db.delete(record._id)),
        );

        for (const record of dedupedAttendance) {
            if (!await ctx.db.get(record.person_id)) throw new Error("Person not found");
            if (record.status && !["present", "absent", "excused"].includes(record.status)) throw new Error("Invalid attendance status");
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
        await reconcilePeople(ctx, [...existing.map(r => r.person_id), ...dedupedAttendance.map(r => r.person_id)]);
        return {
            success: true,
            namedAttendance: present.length,
            totalAttendance: total,
            removed: removals.length,
        };
}


export const getAttendees = queryFor("meetings:getAttendees")({
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

export const getByPerson = queryFor("meetings:getByPerson")({
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

export const migrateLegacyMeetings = internalMutation({
    args: {},
    handler: async (ctx) => {
        requireMaintenance();
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

// Meeting details and check-ins commit together, including retries after timeout.
export const record = mutationFor("meetings:record")({
    args: {
        id: v.optional(v.id("meetings")),
        request_id: v.optional(v.string()),
        attendanceData: v.array(v.object({ person_id: v.id("people"), status: v.optional(v.string()), first_timer: v.optional(v.boolean()) })),
        markComplete: v.boolean(),
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
        const { id, request_id, attendanceData, markComplete, attendance_count, ...data } = args;
        date(data.meeting_date);
        count(data.unnamed_guests_count, "Unnamed guests");
        if (!id && request_id) {
            const previous = await ctx.db.query("meetings").filter(q => q.eq(q.field("request_id"), request_id)).first();
            if (previous) return await hydrateMeeting(ctx, previous);
        }
        let meetingId = id;
        if (meetingId) {
            if (!await ctx.db.get(meetingId)) throw new Error("Meeting not found");
            await ctx.db.patch(meetingId, { ...data, updated_at: new Date().toISOString() });
        } else meetingId = await ctx.db.insert("meetings", { ...data, request_id, created_at: new Date().toISOString() });
        await syncMeetingAttendance(ctx, { meetingId, attendanceData, unnamedGuestsCount: data.unnamed_guests_count ?? 0, markComplete });
        return await hydrateMeeting(ctx, await ctx.db.get(meetingId));
    },
});
