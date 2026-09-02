import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all services sorted by date descending
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        const services = await ctx.db.query("services").collect();
        const enriched = await Promise.all(services.map(async (service) => {
            const attendance = await ctx.db
                .query("attendance")
                .withIndex("by_service", (q) => q.eq("service_id", service._id))
                .collect();
            const individuals = (await Promise.all(attendance.map((record) => ctx.db.get(record.person_id))))
                .filter(Boolean);
            return { ...service, individuals };
        }));
        return enriched.sort(
            (a, b) =>
                new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
        );
    },
});

// Get service by ID
export const getById = query({
    args: { id: v.id("services") },
    handler: async (ctx, args) => {
        const service = await ctx.db.get(args.id);
        if (!service) return null;
        const attendance = await ctx.db
            .query("attendance")
            .withIndex("by_service", (q) => q.eq("service_id", args.id))
            .collect();
        const individuals = (await Promise.all(attendance.map((record) => ctx.db.get(record.person_id))))
            .filter(Boolean);
        return { ...service, individuals };
    },
});

// Create a new service
export const create = mutation({
    args: {
        service_date: v.string(),
        service_type: v.string(),
        service_time: v.optional(v.string()),
        location: v.optional(v.string()),
        sermon_topic: v.optional(v.string()),
        sermon_speaker: v.optional(v.string()),
        notes: v.optional(v.string()),
        total_attendance: v.optional(v.float64()),
        guests_count: v.optional(v.float64()),
        salvation_decisions: v.optional(v.float64()),
        tithers_count: v.optional(v.float64()),
        individuals: v.optional(v.array(v.string())),
        photos: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        const id = await ctx.db.insert("services", {
            ...args,
            created_at: now,
        });
        return await ctx.db.get(id);
    },
});

// Update a service
export const update = mutation({
    args: {
        id: v.id("services"),
        service_date: v.optional(v.string()),
        service_type: v.optional(v.string()),
        service_time: v.optional(v.string()),
        location: v.optional(v.string()),
        sermon_topic: v.optional(v.string()),
        sermon_speaker: v.optional(v.string()),
        notes: v.optional(v.string()),
        total_attendance: v.optional(v.float64()),
        guests_count: v.optional(v.float64()),
        salvation_decisions: v.optional(v.float64()),
        tithers_count: v.optional(v.float64()),
        individuals: v.optional(v.array(v.string())),
        photos: v.optional(v.array(v.string())),
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

// Record the service and its named attendance as one atomic operation.
// Aggregate headcounts remain authoritative because they may include unnamed attendees.
export const record = mutation({
    args: {
        id: v.optional(v.id("services")),
        service_date: v.string(),
        service_type: v.string(),
        service_time: v.optional(v.string()),
        location: v.optional(v.string()),
        sermon_topic: v.optional(v.string()),
        sermon_speaker: v.optional(v.string()),
        notes: v.optional(v.string()),
        total_attendance: v.float64(),
        guests_count: v.float64(),
        salvation_decisions: v.float64(),
        tithers_count: v.float64(),
        photos: v.optional(v.array(v.string())),
        attendanceData: v.array(v.object({
            person_id: v.id("people"),
            made_salvation_decision: v.boolean(),
            gave_tithe: v.boolean(),
            first_timer: v.boolean(),
        })),
    },
    handler: async (ctx, args) => {
        const { id, attendanceData, ...serviceData } = args;
        const namedGuests = (await Promise.all(attendanceData.map(async (record) => {
            const person = await ctx.db.get(record.person_id);
            return ["guest", "visitor"].includes(person?.member_status || "") || (!person?.member_status && Boolean(person?.contact_date));
        }))).filter(Boolean).length;
        const namedDecisions = attendanceData.filter((record) => record.made_salvation_decision).length;
        const namedTithers = attendanceData.filter((record) => record.gave_tithe).length;
        const namedFirstTimers = attendanceData.filter((record) => record.first_timer).length;

        if (serviceData.total_attendance < attendanceData.length) throw new Error("Total attendance cannot be lower than named check-ins");
        if (serviceData.guests_count > serviceData.total_attendance || serviceData.guests_count < Math.max(namedGuests, namedFirstTimers)) throw new Error("Guest headcount conflicts with named attendance");
        if (serviceData.salvation_decisions > serviceData.total_attendance || serviceData.salvation_decisions < namedDecisions) throw new Error("Salvation decisions conflict with named attendance");
        if (serviceData.tithers_count > serviceData.total_attendance || serviceData.tithers_count < namedTithers) throw new Error("Tither count conflicts with named attendance");

        const now = new Date().toISOString();
        let serviceId = id;
        if (serviceId) {
            const existingService = await ctx.db.get(serviceId);
            if (!existingService) throw new Error("Service not found");
            await ctx.db.patch(serviceId, { ...serviceData, updated_at: now });
        } else {
            serviceId = await ctx.db.insert("services", { ...serviceData, created_at: now });
        }

        const existingAttendance = await ctx.db
            .query("attendance")
            .withIndex("by_service", (q) => q.eq("service_id", serviceId))
            .collect();
        const existingByPerson = new Map(existingAttendance.map((record) => [String(record.person_id), record]));
        const incomingIds = new Set(attendanceData.map((record) => String(record.person_id)));

        await Promise.all(existingAttendance
            .filter((record) => !incomingIds.has(String(record.person_id)))
            .map((record) => ctx.db.delete(record._id)));

        await Promise.all(attendanceData.map(async (record) => {
            const existing = existingByPerson.get(String(record.person_id));
            if (existing) {
                await ctx.db.patch(existing._id, {
                    made_salvation_decision: record.made_salvation_decision,
                    gave_tithe: record.gave_tithe,
                    first_timer: record.first_timer,
                });
            } else {
                await ctx.db.insert("attendance", { ...record, service_id: serviceId, created_at: now });
            }

            if (record.first_timer) {
                const person = await ctx.db.get(record.person_id);
                if (person && !person.first_visit_date) {
                    await ctx.db.patch(record.person_id, {
                        first_visit_date: serviceData.service_date,
                        entry_point: person.entry_point || "sunday_service",
                        updated_at: now,
                    });
                }
            }
        }));

        const service = await ctx.db.get(serviceId);
        const individuals = (await Promise.all(attendanceData.map((record) => ctx.db.get(record.person_id))))
            .filter(Boolean);
        return { ...service, individuals };
    },
});

// Delete a service
export const remove = mutation({
    args: { id: v.id("services") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

// Get services by date range
export const getByDateRange = query({
    args: { startDate: v.string(), endDate: v.string() },
    handler: async (ctx, args) => {
        // Use index for efficient date range filtering
        const services = await ctx.db
            .query("services")
            .withIndex("by_service_date", (q) =>
                q.gte("service_date", args.startDate).lte("service_date", args.endDate)
            )
            .collect();
        return services.sort(
            (a, b) =>
                new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
        );
    },
});
