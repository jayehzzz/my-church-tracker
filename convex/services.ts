import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all services sorted by date descending
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        const services = await ctx.db.query("services").collect();
        return services.sort(
            (a, b) =>
                new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
        );
    },
});

// Get service by ID
export const getById = query({
    args: { id: v.id("services") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
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
        const allServices = await ctx.db.query("services").collect();
        return allServices
            .filter(
                (s) => s.service_date >= args.startDate && s.service_date <= args.endDate
            )
            .sort(
                (a, b) =>
                    new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
            );
    },
});
