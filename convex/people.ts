import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all people sorted by last name
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        const people = await ctx.db.query("people").collect();
        return people.sort((a, b) => a.last_name.localeCompare(b.last_name));
    },
});

// Get person by ID
export const getById = query({
    args: { id: v.id("people") },
    handler: async (ctx, args) => {
        const person = await ctx.db.get(args.id);
        if (!person) return null;

        // Resolve invited_by name if ID exists
        let invited_by = null;
        if (person.invited_by_id) {
            const inviter = await ctx.db.get(person.invited_by_id);
            if (inviter) {
                invited_by = `${inviter.first_name} ${inviter.last_name}`;
            }
        }

        return {
            ...person,
            invited_by,
        };
    },
});

// Create a new person
export const create = mutation({
    args: {
        first_name: v.string(),
        last_name: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),

        // Address
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zip_code: v.optional(v.string()),

        // Demographics
        preferred_name: v.optional(v.string()),
        birthday: v.optional(v.string()),
        date_of_birth: v.optional(v.string()), // Alias
        gender: v.optional(v.string()),
        marital_status: v.optional(v.string()),
        employment_status: v.optional(v.string()),
        basontas: v.optional(v.array(v.string())),

        // Status & Role
        member_status: v.string(),
        role: v.optional(v.string()),
        activity_status: v.optional(v.string()),
        leader_id: v.optional(v.string()),

        // Evangelism / Contact Info
        contact_category: v.optional(v.string()),
        contact_date: v.optional(v.string()),
        invited_by_id: v.optional(v.id("people")),

        // Spiritual Milestones
        first_visit_date: v.optional(v.string()),
        membership_date: v.optional(v.string()),
        is_baptised: v.optional(v.boolean()),
        is_tither: v.optional(v.boolean()),

        // System
        lat: v.optional(v.float64()),
        lng: v.optional(v.float64()),
        avatar_url: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { date_of_birth, ...rest } = args;
        const now = new Date().toISOString();

        const peopleData: any = {
            ...rest,
            created_at: now,
            updated_at: now,
        };

        if (date_of_birth) {
            peopleData.birthday = date_of_birth;
        }

        const id = await ctx.db.insert("people", peopleData);
        return await ctx.db.get(id);
    },
});

// Update a person
export const update = mutation({
    args: {
        id: v.id("people"),

        // Identity
        first_name: v.optional(v.string()),
        last_name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),

        // Address
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zip_code: v.optional(v.string()),

        // Demographics
        preferred_name: v.optional(v.string()),
        birthday: v.optional(v.string()),
        date_of_birth: v.optional(v.string()), // Alias for birthday
        gender: v.optional(v.string()),
        marital_status: v.optional(v.string()),
        employment_status: v.optional(v.string()),
        basontas: v.optional(v.array(v.string())), // Ministry groups

        // Status & Role
        member_status: v.optional(v.string()),
        role: v.optional(v.string()),
        activity_status: v.optional(v.string()),
        leader_id: v.optional(v.string()),

        // Evangelism / Contact Info
        contact_category: v.optional(v.string()),
        contact_date: v.optional(v.string()),
        invited_by_id: v.optional(v.id("people")),

        // Spiritual Milestones
        first_visit_date: v.optional(v.string()),
        membership_date: v.optional(v.string()),
        is_baptised: v.optional(v.boolean()),
        is_tither: v.optional(v.boolean()),

        // System
        lat: v.optional(v.float64()),
        lng: v.optional(v.float64()),
        avatar_url: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, date_of_birth, ...rest } = args;

        const updates: any = { ...rest };

        // Map date_of_birth to birthday if provided
        if (date_of_birth) {
            updates.birthday = date_of_birth;
        }

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
