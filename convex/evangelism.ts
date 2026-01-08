import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all evangelism contacts with inviter data
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        const contacts = await ctx.db.query("evangelism_contacts").collect();
        const results = await Promise.all(
            contacts.map(async (contact) => {
                // Get inviter person if exists
                let contacted_by_person = null;
                if (contact.invited_by_id) {
                    // Try to find the person by matching the string ID
                    const people = await ctx.db.query("people").collect();
                    contacted_by_person = people.find(p => p._id.toString().includes(contact.invited_by_id!)) || null;
                }
                return { ...contact, contacted_by_person };
            })
        );
        return results.sort(
            (a, b) => new Date(b.contact_date).getTime() - new Date(a.contact_date).getTime()
        );
    },
});

// Get contact by ID
export const getById = query({
    args: { id: v.id("evangelism_contacts") },
    handler: async (ctx, args) => {
        const contact = await ctx.db.get(args.id);
        if (!contact) return null;
        let contacted_by_person = null;
        if (contact.invited_by_id) {
            const people = await ctx.db.query("people").collect();
            contacted_by_person = people.find(p => p._id.toString().includes(contact.invited_by_id!)) || null;
        }
        return { ...contact, contacted_by_person };
    },
});

// Create evangelism contact
export const create = mutation({
    args: {
        first_name: v.string(),
        last_name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        contact_date: v.string(),
        response: v.string(),
        follow_up_date: v.optional(v.string()),
        converted: v.boolean(),
        conversion_date: v.optional(v.string()),
        status: v.optional(v.string()),
        attended_church: v.optional(v.boolean()),
        salvation_decision: v.optional(v.boolean()),
        invited_by_id: v.optional(v.string()),
        comments: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        const id = await ctx.db.insert("evangelism_contacts", {
            ...args,
            created_at: now,
        });
        return await ctx.db.get(id);
    },
});

// Update evangelism contact
export const update = mutation({
    args: {
        id: v.id("evangelism_contacts"),
        first_name: v.optional(v.string()),
        last_name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        contact_date: v.optional(v.string()),
        response: v.optional(v.string()),
        follow_up_date: v.optional(v.string()),
        converted: v.optional(v.boolean()),
        conversion_date: v.optional(v.string()),
        status: v.optional(v.string()),
        attended_church: v.optional(v.boolean()),
        salvation_decision: v.optional(v.boolean()),
        invited_by_id: v.optional(v.string()),
        added_as_person_id: v.optional(v.id("people")),
        comments: v.optional(v.array(v.string())),
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

// Delete evangelism contact
export const remove = mutation({
    args: { id: v.id("evangelism_contacts") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

// Get contacts by response type
export const getByResponse = query({
    args: { response: v.string() },
    handler: async (ctx, args) => {
        const contacts = await ctx.db
            .query("evangelism_contacts")
            .withIndex("by_response", (q) => q.eq("response", args.response))
            .collect();
        return contacts.sort(
            (a, b) => new Date(b.contact_date).getTime() - new Date(a.contact_date).getTime()
        );
    },
});

// Get contacts requiring follow-up
export const getRequiringFollowUp = query({
    args: {},
    handler: async (ctx) => {
        const today = new Date().toISOString().split("T")[0];
        const contacts = await ctx.db.query("evangelism_contacts").collect();
        return contacts
            .filter(
                (c) =>
                    c.follow_up_date !== null &&
                    c.follow_up_date !== undefined &&
                    c.follow_up_date <= today &&
                    !c.converted
            )
            .sort((a, b) => {
                if (!a.follow_up_date) return 1;
                if (!b.follow_up_date) return -1;
                return a.follow_up_date.localeCompare(b.follow_up_date);
            });
    },
});

// Get converted contacts
export const getConverted = query({
    args: {},
    handler: async (ctx) => {
        const contacts = await ctx.db
            .query("evangelism_contacts")
            .withIndex("by_converted", (q) => q.eq("converted", true))
            .collect();
        return contacts.sort((a, b) => {
            if (!a.conversion_date) return 1;
            if (!b.conversion_date) return -1;
            return new Date(b.conversion_date).getTime() - new Date(a.conversion_date).getTime();
        });
    },
});

// Get contacts by date range
export const getByDateRange = query({
    args: { startDate: v.string(), endDate: v.string() },
    handler: async (ctx, args) => {
        const contacts = await ctx.db.query("evangelism_contacts").collect();
        return contacts
            .filter(
                (c) => c.contact_date >= args.startDate && c.contact_date <= args.endDate
            )
            .sort(
                (a, b) => new Date(b.contact_date).getTime() - new Date(a.contact_date).getTime()
            );
    },
});

// Mark contact as converted
export const markAsConverted = mutation({
    args: {
        id: v.id("evangelism_contacts"),
        addToPeople: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const contact = await ctx.db.get(args.id);
        if (!contact) return { data: null, error: "Contact not found" };

        const today = new Date().toISOString().split("T")[0];
        let addedPersonId = null;

        // Add to people if requested
        if (args.addToPeople) {
            const now = new Date().toISOString();
            const personId = await ctx.db.insert("people", {
                first_name: contact.first_name,
                last_name: contact.last_name || "",
                email: contact.email,
                phone: contact.phone,
                address: contact.address,
                member_status: "visitor",
                created_at: now,
                updated_at: now,
            });
            addedPersonId = personId;
        }

        // Update the contact
        await ctx.db.patch(args.id, {
            converted: true,
            conversion_date: today,
            added_as_person_id: addedPersonId,
            updated_at: new Date().toISOString(),
        });

        return await ctx.db.get(args.id);
    },
});
