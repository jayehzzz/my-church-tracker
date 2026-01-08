import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all visitations with person data
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        const visitations = await ctx.db.query("visitations").collect();
        const results = await Promise.all(
            visitations.map(async (visitation) => {
                const person = await ctx.db.get(visitation.person_id);
                return { ...visitation, people: person };
            })
        );
        return results.sort(
            (a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
        );
    },
});

// Get visitation by ID
export const getById = query({
    args: { id: v.id("visitations") },
    handler: async (ctx, args) => {
        const visitation = await ctx.db.get(args.id);
        if (!visitation) return null;
        const person = await ctx.db.get(visitation.person_id);
        return { ...visitation, people: person };
    },
});

// Create visitation
export const create = mutation({
    args: {
        person_id: v.id("people"),
        person_visited_name: v.optional(v.string()),
        visited_by_name: v.optional(v.string()),
        visited_by_id: v.optional(v.string()),
        visit_date: v.string(),
        outcome: v.string(),
        follow_up_required: v.boolean(),
        follow_up_date: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        const id = await ctx.db.insert("visitations", {
            ...args,
            created_at: now,
        });
        return await ctx.db.get(id);
    },
});

// Update visitation
export const update = mutation({
    args: {
        id: v.id("visitations"),
        person_id: v.optional(v.id("people")),
        person_visited_name: v.optional(v.string()),
        visited_by_name: v.optional(v.string()),
        visited_by_id: v.optional(v.string()),
        visit_date: v.optional(v.string()),
        outcome: v.optional(v.string()),
        follow_up_required: v.optional(v.boolean()),
        follow_up_date: v.optional(v.string()),
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

// Delete visitation
export const remove = mutation({
    args: { id: v.id("visitations") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

// Get visitations by person
export const getByPerson = query({
    args: { personId: v.id("people") },
    handler: async (ctx, args) => {
        const visitations = await ctx.db
            .query("visitations")
            .withIndex("by_person", (q) => q.eq("person_id", args.personId))
            .collect();
        return visitations.sort(
            (a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
        );
    },
});

// Get visitations requiring follow-up
export const getRequiringFollowUp = query({
    args: {},
    handler: async (ctx) => {
        const visitations = await ctx.db
            .query("visitations")
            .withIndex("by_follow_up", (q) => q.eq("follow_up_required", true))
            .collect();
        const results = await Promise.all(
            visitations.map(async (visitation) => {
                const person = await ctx.db.get(visitation.person_id);
                return { ...visitation, people: person };
            })
        );
        return results.sort((a, b) => {
            if (!a.follow_up_date) return 1;
            if (!b.follow_up_date) return -1;
            return a.follow_up_date.localeCompare(b.follow_up_date);
        });
    },
});

// Get visitations by date range
export const getByDateRange = query({
    args: { startDate: v.string(), endDate: v.string() },
    handler: async (ctx, args) => {
        const visitations = await ctx.db.query("visitations").collect();
        const filtered = visitations.filter(
            (v) => v.visit_date >= args.startDate && v.visit_date <= args.endDate
        );
        const results = await Promise.all(
            filtered.map(async (visitation) => {
                const person = await ctx.db.get(visitation.person_id);
                return { ...visitation, people: person };
            })
        );
        return results.sort(
            (a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
        );
    },
});
