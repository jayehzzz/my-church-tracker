import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * REFACTORED: Now queries the Unified `people` table for guests/contacts.
 * Acts as an ADAPTER to map unified unified schema fields back to legacy fields expected by frontend.
 */

// Helper to map Person -> EvangelismContact format
const mapToContact = (person: any, inviter: any = null) => {
    return {
        ...person,
        id: person._id, // Ensure ID is accessible as 'id' if needed

        // Mapped fields
        response: person.contact_category,
        status: person.member_status,
        converted: person.member_status === "member",

        // Enrichment
        contacted_by_person: inviter,
    };
};

export const getAll = query({
    args: {},
    handler: async (ctx) => {
        const contacts = await ctx.db
            .query("people")
            .withIndex("by_member_status", (q) => q.eq("member_status", "guest"))
            .collect();

        const results = await Promise.all(
            contacts.map(async (contact) => {
                let inviter = null;
                if (contact.invited_by_id) {
                    inviter = await ctx.db.get(contact.invited_by_id);
                }
                return mapToContact(contact, inviter);
            })
        );

        return results.sort(
            (a, b) => {
                const dateA = a.contact_date || a.created_at;
                const dateB = b.contact_date || b.created_at;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            }
        );
    },
});

export const getById = query({
    args: { id: v.id("people") },
    handler: async (ctx, args) => {
        const contact = await ctx.db.get(args.id);
        if (!contact) return null;

        let inviter = null;
        if (contact.invited_by_id) {
            inviter = await ctx.db.get(contact.invited_by_id);
        }
        return mapToContact(contact, inviter);
    },
});

export const create = mutation({
    args: {
        first_name: v.string(),
        last_name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        contact_date: v.string(),
        response: v.string(), // Maps to contact_category
        invited_by_id: v.optional(v.id("people")),
        comments: v.optional(v.array(v.string())),

        // Frontend might send these
        contact_method: v.optional(v.string()),
        follow_up_date: v.optional(v.string()),
        attended_church: v.optional(v.boolean()),
        salvation_decision: v.optional(v.boolean()),
        converted: v.optional(v.boolean()),
        conversion_date: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();

        // If 'converted' is true, set status to member
        const status = args.converted ? "member" : "guest";

        const id = await ctx.db.insert("people", {
            first_name: args.first_name,
            last_name: args.last_name || "",
            email: args.email,
            phone: args.phone,
            address: args.address,

            member_status: status,
            contact_category: args.response,
            contact_date: args.contact_date,
            invited_by_id: args.invited_by_id,

            // New unified fields for attendance/spiritual tracking
            membership_date: args.conversion_date,

            created_at: now,
            updated_at: now,
        });

        return await ctx.db.get(id);
    },
});

export const update = mutation({
    args: {
        id: v.id("people"),
        first_name: v.optional(v.string()),
        last_name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),

        response: v.optional(v.string()),
        invited_by_id: v.optional(v.id("people")),
        contact_date: v.optional(v.string()),

        contact_method: v.optional(v.string()),
        follow_up_date: v.optional(v.string()),
        attended_church: v.optional(v.boolean()),
        salvation_decision: v.optional(v.boolean()),
        converted: v.optional(v.boolean()),
        conversion_date: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, response, converted, conversion_date, ...rest } = args;

        const updates: any = {
            ...rest,
            updated_at: new Date().toISOString(),
        };

        if (response) updates.contact_category = response;
        if (converted !== undefined) {
            updates.member_status = converted ? "member" : "guest";
        }
        if (conversion_date) {
            updates.membership_date = conversion_date;
        }

        // Clean up fields not in people schema
        delete updates.contact_method;
        delete updates.follow_up_date;
        delete updates.notes;

        await ctx.db.patch(id, updates);
        return await ctx.db.get(id);
    },
});

export const remove = mutation({
    args: { id: v.id("people") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

export const markAsConverted = mutation({
    args: {
        id: v.id("people"),
        addToPeople: v.optional(v.boolean()), // Legacy, ignored
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        const today = now.split('T')[0];

        await ctx.db.patch(args.id, {
            member_status: "member",
            membership_date: today,
            updated_at: now,
        });

        return await ctx.db.get(args.id);
    },
});

export const getByResponse = query({
    args: { response: v.string() },
    handler: async (ctx, args) => {
        const contacts = await ctx.db
            .query("people")
            .withIndex("by_member_status", (q) => q.eq("member_status", "guest"))
            .collect();

        const filtered = contacts.filter(c => c.contact_category === args.response);

        return await Promise.all(filtered.map(async (c) => {
            let inviter = null;
            if (c.invited_by_id) inviter = await ctx.db.get(c.invited_by_id);
            return mapToContact(c, inviter);
        }));
    },
});

export const getRequiringFollowUp = query({
    args: {},
    handler: async (ctx) => {
        return []; // TODO: Implement follow-up logic in unified model
    },
});

export const getConverted = query({
    args: {},
    handler: async (ctx) => {
        const members = await ctx.db
            .query("people")
            .withIndex("by_member_status", (q) => q.eq("member_status", "member"))
            .collect();

        // Filter those who came from evangelism (have contact_date)
        const convertedContacts = members.filter(m => m.contact_date != null);

        return await Promise.all(convertedContacts.map(async (c) => {
            let inviter = null;
            if (c.invited_by_id) inviter = await ctx.db.get(c.invited_by_id);
            return mapToContact(c, inviter);
        }));
    },
});

export const getByDateRange = query({
    args: { startDate: v.string(), endDate: v.string() },
    handler: async (ctx, args) => {
        const contacts = await ctx.db
            .query("people")
            .withIndex("by_member_status", (q) => q.eq("member_status", "guest"))
            .collect();

        const filtered = contacts.filter(c => {
            if (!c.contact_date) return false;
            return c.contact_date >= args.startDate && c.contact_date <= args.endDate;
        });

        return await Promise.all(filtered.map(async (c) => {
            let inviter = null;
            if (c.invited_by_id) inviter = await ctx.db.get(c.invited_by_id);
            return mapToContact(c, inviter);
        }));
    },
});

export const getByInviter = query({
    args: { personId: v.id("people") },
    handler: async (ctx, args) => {
        const contacts = await ctx.db
            .query("people")
            .withIndex("by_member_status", (q) => q.eq("member_status", "guest"))
            .filter(q => q.eq(q.field("invited_by_id"), args.personId))
            .collect();

        return await Promise.all(contacts.map(async (c) => {
            const inviter = await ctx.db.get(args.personId);
            return mapToContact(c, inviter);
        }));
    },
});
