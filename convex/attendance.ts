import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all attendance records with person and service data
export const getAll = query({
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
export const getById = query({
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
export const create = mutation({
    args: {
        service_id: v.id("services"),
        person_id: v.id("people"),

        // Metadata
        made_salvation_decision: v.optional(v.boolean()),
        gave_tithe: v.optional(v.boolean()),
        first_timer: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        const id = await ctx.db.insert("attendance", {
            ...args,
            created_at: now,
        });
        return await ctx.db.get(id);
    },
});

// Update attendance
export const update = mutation({
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
        await ctx.db.patch(id, updates);
        return await ctx.db.get(id);
    },
});

// Delete attendance
export const remove = mutation({
    args: { id: v.id("attendance") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

// Get attendance by service
export const getByService = query({
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
export const getByPerson = query({
    args: { personId: v.id("people") },
    handler: async (ctx, args) => {
        const records = await ctx.db
            .query("attendance")
            .withIndex("by_person", (q) => q.eq("person_id", args.personId))
            .collect();
        const results = await Promise.all(
            records.map(async (record) => {
                const service = await ctx.db.get(record.service_id);
                return { ...record, services: service };
            })
        );
        return results.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    },
});

// Bulk create attendance records
export const bulkCreate = mutation({
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
        const now = new Date().toISOString();
        const ids = await Promise.all(
            args.records.map((record) =>
                ctx.db.insert("attendance", { ...record, created_at: now })
            )
        );
        return await Promise.all(ids.map((id) => ctx.db.get(id)));
    },
});

// Sync attendance for a service (Smart Check-in: Upsert with Metadata)
export const syncAttendance = mutation({
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
        // Get existing attendance for this service
        const existing = await ctx.db
            .query("attendance")
            .withIndex("by_service", (q) => q.eq("service_id", args.serviceId))
            .collect();

        // Create a map for fast lookup of existing records by person_id
        const existingMap = new Map(existing.map(r => [r.person_id, r]));

        // Sets for tracking IDs
        const newPersonIds = new Set(args.attendanceData.map(d => d.person_id));

        // 1. Identify Removals (Calculated from input: if in DB but not in input list, delete it)
        const toRemove = existing.filter((r) => !newPersonIds.has(r.person_id));

        // 2. Identify Upserts (Additions + Updates)
        const upsertPromises = args.attendanceData.map(async (data) => {
            const existingRecord = existingMap.get(data.person_id);

            if (existingRecord) {
                // UPDATE: Patch existing record with new metadata
                // Only patch if data actually changed to save writes? 
                // For simplicity, just patch. Convex handles no-op patches efficiently.
                await ctx.db.patch(existingRecord._id, {
                    made_salvation_decision: data.made_salvation_decision ?? existingRecord.made_salvation_decision,
                    gave_tithe: data.gave_tithe ?? existingRecord.gave_tithe,
                    first_timer: data.first_timer ?? existingRecord.first_timer,
                    // Preserve creation time
                });
            } else {
                // INSERT: Create new record
                await ctx.db.insert("attendance", {
                    service_id: args.serviceId,
                    person_id: data.person_id,
                    made_salvation_decision: data.made_salvation_decision || false,
                    gave_tithe: data.gave_tithe || false,
                    first_timer: data.first_timer || false,
                    created_at: new Date().toISOString(),
                });
            }
        });

        // Execute all operations
        await Promise.all([
            ...toRemove.map((r) => ctx.db.delete(r._id)),
            ...upsertPromises
        ]);

        return {
            success: true,
            upserted: args.attendanceData.length,
            removed: toRemove.length
        };
    },
});
