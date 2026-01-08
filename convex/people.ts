import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all people sorted by last name
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        const people = await ctx.db.query("people").order("asc").collect();
        return people.sort((a, b) => a.last_name.localeCompare(b.last_name));
    },
});

// Get person by ID
export const getById = query({
    args: { id: v.id("people") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// Create a new person
export const create = mutation({
    args: {
        first_name: v.string(),
        last_name: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        member_status: v.string(),
        role: v.optional(v.string()),
        activity_status: v.optional(v.string()),
        leader_id: v.optional(v.string()),
        address: v.optional(v.string()),
        lat: v.optional(v.float64()),
        lng: v.optional(v.float64()),
        avatar_url: v.optional(v.string()),
        membership_date: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        const id = await ctx.db.insert("people", {
            ...args,
            created_at: now,
            updated_at: now,
        });
        return await ctx.db.get(id);
    },
});

// Update a person
export const update = mutation({
    args: {
        id: v.id("people"),
        first_name: v.optional(v.string()),
        last_name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        member_status: v.optional(v.string()),
        role: v.optional(v.string()),
        activity_status: v.optional(v.string()),
        leader_id: v.optional(v.string()),
        address: v.optional(v.string()),
        lat: v.optional(v.float64()),
        lng: v.optional(v.float64()),
        avatar_url: v.optional(v.string()),
        membership_date: v.optional(v.string()),
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

// Delete a person
export const remove = mutation({
    args: { id: v.id("people") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

// Get people by member status
export const getByStatus = query({
    args: { status: v.string() },
    handler: async (ctx, args) => {
        const people = await ctx.db
            .query("people")
            .withIndex("by_member_status", (q) => q.eq("member_status", args.status))
            .collect();
        return people.sort((a, b) => a.last_name.localeCompare(b.last_name));
    },
});

// Search people by name
export const search = query({
    args: { searchTerm: v.string() },
    handler: async (ctx, args) => {
        const term = args.searchTerm.toLowerCase();
        const allPeople = await ctx.db.query("people").collect();
        return allPeople
            .filter(
                (p) =>
                    p.first_name.toLowerCase().includes(term) ||
                    p.last_name.toLowerCase().includes(term)
            )
            .sort((a, b) => a.last_name.localeCompare(b.last_name));
    },
});
