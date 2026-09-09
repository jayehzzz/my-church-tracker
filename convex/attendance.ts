import { queryFor, mutationFor } from "./lib/security";
import { serviceRows, syncServiceAttendance, reconcilePeople, prepareServiceCounts, reconcileServiceCounts } from "./lib/attendanceWorkflow";

import { v } from "convex/values";

// Get all attendance records with person and service data
export const getAll = queryFor("attendance:getAll")({
    args: {},
    handler: async (ctx) => {
        const attendanceRecords = await ctx.db.query("attendance").collect();
        const results = await Promise.all(
            attendanceRecords.map(async (record) => {
                const person = await ctx.db.get(record.person_id);
                const service = await ctx.db.get(record.service_id);
                return { ...record, people: person, services: service };
            })
        );
        return results.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    },
});

// Get attendance by ID
export const getById = queryFor("attendance:getById")({
    args: { id: v.id("attendance") },
    handler: async (ctx, args) => {
        const record = await ctx.db.get(args.id);
        if (!record) return null;
        const person = await ctx.db.get(record.person_id);
        const service = await ctx.db.get(record.service_id);
        return { ...record, people: person, services: service };
    },
});

// Create attendance record
export const create = mutationFor("attendance:create")({
    args: {
        service_id: v.id("services"),
        person_id: v.id("people"),

        // Metadata
        made_salvation_decision: v.optional(v.boolean()),
        gave_tithe: v.optional(v.boolean()),
        first_timer: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { service_id, ...row } = args;
        const existing = await serviceRows(ctx, service_id);
        const current = existing.find(r => r.person_id === row.person_id);
        await syncServiceAttendance(ctx, service_id, [...existing.filter(r => r.person_id !== row.person_id).map(({person_id, first_timer, gave_tithe, made_salvation_decision}) => ({person_id, first_timer, gave_tithe, made_salvation_decision})), { ...current && { first_timer: current.first_timer, gave_tithe: current.gave_tithe, made_salvation_decision: current.made_salvation_decision }, ...row }]);
        return (await serviceRows(ctx, service_id)).find(r => r.person_id === row.person_id);

    },
});

// Update attendance
export const update = mutationFor("attendance:update")({
    args: {
        id: v.id("attendance"),
        service_id: v.optional(v.id("services")),
        person_id: v.optional(v.id("people")),

        made_salvation_decision: v.optional(v.boolean()),
        gave_tithe: v.optional(v.boolean()),
        first_timer: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const existing = await ctx.db.get(id);
        if (!existing) throw new Error("Attendance not found");
        const next = { ...existing, ...updates };
        if (!await ctx.db.get(next.person_id)) throw new Error("Person not found");
        await prepareServiceCounts(ctx, existing.service_id);
        if (next.service_id !== existing.service_id) await prepareServiceCounts(ctx, next.service_id);
        const duplicates = (await serviceRows(ctx, next.service_id)).filter(r => r.person_id === next.person_id && r._id !== id);
        for (const duplicate of duplicates) await ctx.db.delete(duplicate._id);
        await ctx.db.patch(id, updates);
        await reconcileServiceCounts(ctx, existing.service_id);
        if (next.service_id !== existing.service_id) await reconcileServiceCounts(ctx, next.service_id);
        await reconcilePeople(ctx, [existing.person_id, next.person_id]);
        return await ctx.db.get(id);

    },
});

// Delete attendance
export const remove = mutationFor("attendance:remove")({
    args: { id: v.id("attendance") },
    handler: async (ctx, args) => {
        const row = await ctx.db.get(args.id);
        if (!row) return { success: true };
        await prepareServiceCounts(ctx, row.service_id);
        await ctx.db.delete(args.id);
        await reconcileServiceCounts(ctx, row.service_id);
        await reconcilePeople(ctx, [row.person_id]);
        return { success: true };

    },
});

// Get attendance by service
export const getByService = queryFor("attendance:getByService")({
    args: { serviceId: v.id("services") },
    handler: async (ctx, args) => {
        const records = await ctx.db
            .query("attendance")
            .withIndex("by_service", (q) => q.eq("service_id", args.serviceId))
            .collect();
        return await Promise.all(
            records.map(async (record) => {
                const person = await ctx.db.get(record.person_id);
                return { ...record, people: person };
            })
        );
    },
});

// Get attendance by person
export const getByPerson = queryFor("attendance:getByPerson")({
    args: { personId: v.id("people") },
    handler: async (ctx, args) => {
        const records = await ctx.db
            .query("attendance")
            .withIndex("by_person", (q) => q.eq("person_id", args.personId))
            .collect();
        const results = await Promise.all(
            records.map(async (record) => {
                const service = await ctx.db.get(record.service_id);
                if (!service) throw new Error("Service history is unavailable for this profile.");
                return { ...record, services: service };
            })
        );
        return results.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    },
});

// Bulk create attendance records
export const bulkCreate = mutationFor("attendance:bulkCreate")({
    args: {
        records: v.array(v.object({
            service_id: v.id("services"),
            person_id: v.id("people"),
            made_salvation_decision: v.optional(v.boolean()),
            gave_tithe: v.optional(v.boolean()),
            first_timer: v.optional(v.boolean()),
        }))
    },
    handler: async (ctx, args) => {
        const result = [];
        for (const serviceId of new Set(args.records.map(r => r.service_id))) {
            const incoming = args.records.filter(r => r.service_id === serviceId);
            const rows = new Map((await serviceRows(ctx, serviceId)).map(({person_id, first_timer, gave_tithe, made_salvation_decision}) => [person_id, {person_id, first_timer, gave_tithe, made_salvation_decision}]));
            for (const { service_id, ...row } of incoming) rows.set(row.person_id, { first_timer: undefined, gave_tithe: undefined, made_salvation_decision: undefined, ...rows.get(row.person_id), ...row });
            await syncServiceAttendance(ctx, serviceId, [...rows.values()]);
            result.push(...(await serviceRows(ctx, serviceId)).filter(r => incoming.some(i => i.person_id === r.person_id)));
        }
        return result;

    },
});

// Sync attendance for a service (Smart Check-in: Upsert with Metadata)
export const syncAttendance = mutationFor("attendance:syncAttendance")({
    args: {
        serviceId: v.id("services"),
        // NOW accepts full objects with metadata!
        attendanceData: v.array(v.object({
            person_id: v.id("people"),
            made_salvation_decision: v.optional(v.boolean()),
            gave_tithe: v.optional(v.boolean()),
            first_timer: v.optional(v.boolean()),
            // Add other metadata fields here if needed
        })),
    },
    handler: async (ctx, args) => {
        await syncServiceAttendance(ctx, args.serviceId, args.attendanceData);
        return { success: true, upserted: new Set(args.attendanceData.map(r => r.person_id)).size };

    },
});


// Check which people have attended any prior service (for first-timer detection)
export const getAttendanceHistory = queryFor("attendance:getAttendanceHistory")({
    args: { personIds: v.array(v.id("people")), beforeDate: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const results: Record<string, boolean> = {};
        for (const personId of args.personIds) {
            const services = await ctx.db.query("attendance").withIndex("by_person", q => q.eq("person_id", personId)).collect();
            const meetings = await ctx.db.query("meeting_attendance").withIndex("by_person", q => q.eq("person_id", personId)).collect();
            results[personId] = false;
            for (const r of services) {
                const g = await ctx.db.get(r.service_id);
                if (g && (!args.beforeDate || g.service_date < args.beforeDate)) results[personId] = true;
            }
            for (const r of meetings.filter(r => r.status ? r.status === "present" : r.attended !== false)) {
                const g = await ctx.db.get(r.meeting_id);
                if (g && g.status !== "cancelled" && (!args.beforeDate || g.meeting_date < args.beforeDate)) results[personId] = true;
            }
        }
        return results;
    },
});
