import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Helper function to safely get leader by ID
// The leader_id is stored as a string, so we need to convert it
async function getLeaderById(ctx: any, leaderId: string | undefined) {
    if (!leaderId) return null;
    try {
        // Try to use the leader_id directly as an ID
        return await ctx.db.get(leaderId as Id<"people">);
    } catch {
        // If it fails, return null (invalid ID format)
        return null;
    }
}

// Get all meetings with leader data
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        const meetings = await ctx.db.query("meetings").collect();
        const results = await Promise.all(
            meetings.map(async (meeting) => {
                const leader = await getLeaderById(ctx, meeting.leader_id);
                return { ...meeting, leader };
            })
        );
        return results.sort(
            (a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()
        );
    },
});

// Get meeting by ID
export const getById = query({
    args: { id: v.id("meetings") },
    handler: async (ctx, args) => {
        const meeting = await ctx.db.get(args.id);
        if (!meeting) return null;
        const leader = await getLeaderById(ctx, meeting.leader_id);
        return { ...meeting, leader };
    },
});

// Create meeting
export const create = mutation({
    args: {
        meeting_date: v.string(),
        meeting_type: v.string(),
        start_time: v.optional(v.string()),
        end_time: v.optional(v.string()),
        duration_minutes: v.optional(v.float64()),
        location: v.optional(v.string()),
        attendance_count: v.optional(v.float64()),
        leaders_count: v.optional(v.float64()),
        leader_id: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        const id = await ctx.db.insert("meetings", {
            ...args,
            created_at: now,
        });
        return await ctx.db.get(id);
    },
});

// Update meeting
export const update = mutation({
    args: {
        id: v.id("meetings"),
        meeting_date: v.optional(v.string()),
        meeting_type: v.optional(v.string()),
        start_time: v.optional(v.string()),
        end_time: v.optional(v.string()),
        duration_minutes: v.optional(v.float64()),
        location: v.optional(v.string()),
        attendance_count: v.optional(v.float64()),
        leaders_count: v.optional(v.float64()),
        leader_id: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, {
            ...updates,
            updated_at: new Date().toISOString(),
        });
        return await ctx.db.get(id);
    },
});

// Delete meeting
export const remove = mutation({
    args: { id: v.id("meetings") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

// Get meetings by type
export const getByType = query({
    args: { meetingType: v.string() },
    handler: async (ctx, args) => {
        const meetings = await ctx.db
            .query("meetings")
            .withIndex("by_meeting_type", (q) => q.eq("meeting_type", args.meetingType))
            .collect();
        const results = await Promise.all(
            meetings.map(async (meeting) => {
                const leader = await getLeaderById(ctx, meeting.leader_id);
                return { ...meeting, leader };
            })
        );
        return results.sort(
            (a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()
        );
    },
});

// Get meetings by date range
export const getByDateRange = query({
    args: { startDate: v.string(), endDate: v.string() },
    handler: async (ctx, args) => {
        // Use index for date range filtering
        const meetings = await ctx.db
            .query("meetings")
            .withIndex("by_meeting_date", (q) =>
                q.gte("meeting_date", args.startDate).lte("meeting_date", args.endDate)
            )
            .collect();
        const results = await Promise.all(
            meetings.map(async (meeting) => {
                const leader = await getLeaderById(ctx, meeting.leader_id);
                return { ...meeting, leader };
            })
        );
        return results.sort(
            (a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()
        );
    },
});

// Add attendee to meeting
export const addAttendee = mutation({
    args: {
        meetingId: v.id("meetings"),
        personId: v.id("people"),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        const id = await ctx.db.insert("meeting_attendance", {
            meeting_id: args.meetingId,
            person_id: args.personId,
            created_at: now,
        });
        return await ctx.db.get(id);
    },
});

// Get meeting attendees
export const getAttendees = query({
    args: { meetingId: v.id("meetings") },
    handler: async (ctx, args) => {
        const records = await ctx.db
            .query("meeting_attendance")
            .withIndex("by_meeting", (q) => q.eq("meeting_id", args.meetingId))
            .collect();
        return await Promise.all(
            records.map(async (record) => {
                const person = await ctx.db.get(record.person_id);
                return { ...record, people: person };
            })
        );
    },
});
