import { queryFor, mutationFor } from "./lib/security";

import { v } from "convex/values";
import { normalizeEmail, validatePersonInput } from "./peopleValidation";

/**
 * REFACTORED: Now queries the Unified `people` table for guests/contacts.
 * Acts as an ADAPTER to map unified unified schema fields back to legacy fields expected by frontend.
 */

// Helper to map Person -> EvangelismContact format
const mapToContact = (person: any, inviter: any = null) => {
    // Compute freshness based on contact_date
    const now = new Date();
    const contactDate = person.contact_date ? new Date(person.contact_date) : new Date(person.created_at);
    const daysSinceContact = Math.floor((now.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24));

    let freshness: string;
    if (daysSinceContact <= 7) freshness = "this_week";
    else if (daysSinceContact <= 14) freshness = "last_week";
    else if (daysSinceContact <= 28) freshness = "two_plus_weeks";
    else freshness = "month_plus";

    return {
        ...person,
        id: person._id, // Ensure ID is accessible as 'id' if needed

        // Mapped fields
        response: person.contact_category,
        status: person.member_status,
        converted: ["member", "leader"].includes(person.member_status),

        // Inviter info
        invited_by_name: inviter ? `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() : null,
        contacted_by_person: inviter,

        // Pipeline tracking fields
        freshness,
        days_since_contact: daysSinceContact,
        pipeline_stage: person.pipeline_stage || "new",
        warmth_score: person.warmth_score || "warm",
        total_follow_ups: person.total_follow_ups || 0,
        last_follow_up_date: person.last_follow_up_date || null,
        promises_made: person.promises_made || 0,
        promises_kept: person.promises_kept || 0,
        is_paused: person.is_paused || false,
        pause_reason: person.pause_reason || null,
        resume_date: person.resume_date || null,
    };
};


export const getAll = queryFor("evangelism:getAll")({
    args: {},
    handler: async (ctx) => {
        const people = await ctx.db.query("people").collect();
        const contacts = people.filter((person) => person.contact_date || person.entry_point === "evangelism");

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

export const getById = queryFor("evangelism:getById")({
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

export const create = mutationFor("evangelism:create")({
    args: {
        first_name: v.string(),
        last_name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        contact_date: v.string(),
        response: v.string(), // Maps to contact_category
        invited_by_id: v.optional(v.id("people")),
        assigned_leader_id: v.optional(v.id("people")),
        comments: v.optional(v.array(v.string())),

        // Frontend might send these
        contact_method: v.optional(v.string()),
        follow_up_date: v.optional(v.string()),
        attended_church: v.optional(v.boolean()),
        first_visit_date: v.optional(v.string()),
        salvation_decision: v.optional(v.boolean()),
        converted: v.optional(v.boolean()),
        conversion_date: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        validatePersonInput({
            first_name: args.first_name,
            ...(args.last_name ? { last_name: args.last_name } : {}),
            ...(args.email ? { email: args.email } : {}),
            contact_date: args.contact_date,
            contact_category: args.response,
            ...(args.contact_method ? { contact_method: args.contact_method } : {}),
            ...(args.first_visit_date ? { first_visit_date: args.first_visit_date } : {}),
            ...(args.conversion_date ? { membership_date: args.conversion_date } : {}),
        });
        const now = new Date().toISOString();

        // If 'converted' is true, set status to member
        const status = args.converted ? "member" : "guest";

        const id = await ctx.db.insert("people", {
            first_name: args.first_name.trim(),
            last_name: args.last_name?.trim() || "",
            email: normalizeEmail(args.email),
            phone: args.phone?.trim() || undefined,
            address: args.address?.trim() || undefined,

            member_status: status,
            contact_category: args.response,
            contact_date: args.contact_date,
            contact_method: args.contact_method,
            invited_by_id: args.invited_by_id,
            salvation_decision: args.salvation_decision,
            first_visit_date: args.first_visit_date || (args.attended_church ? args.contact_date : undefined),
            notes: args.notes,

            // New unified fields for attendance/spiritual tracking
            membership_date: args.conversion_date,
            entry_point: "evangelism",

            // Pipeline tracking — new contacts start as "new" and "hot"
            pipeline_stage: "new",
            warmth_score: "hot",
            total_follow_ups: 0,
            promises_made: 0,
            promises_kept: 0,

            created_at: now,
            updated_at: now,
        });

        // A new evangelism contact can enter the CRM immediately. Ownership is
        // separate from invited_by_id because the inviter is not always the
        // leader responsible for follow-up.
        if (args.assigned_leader_id && status === "guest"
            && !["do_not_contact", "has_church"].includes(args.response)) {
            const leader = await ctx.db.get(args.assigned_leader_id);
            if (!leader || leader.member_status !== "leader") {
                throw new Error("The follow-up owner must be a leader");
            }
            await ctx.db.insert("follow_up_assignments", {
                person_id: id,
                assigned_leader_id: args.assigned_leader_id,
                status: "active",
                assigned_at: now,
                created_at: now,
                updated_at: now,
            });
            await ctx.db.insert("follow_up_tasks", {
                person_id: id,
                assigned_leader_id: args.assigned_leader_id,
                due_date: args.follow_up_date || args.contact_date,
                status: "open",
                task_type: "first_contact",
                priority: "high",
                reason: "Fresh evangelism contact — make the first personal follow-up",
                created_at: now,
                updated_at: now,
            });
        }

        return await ctx.db.get(id);
    },
});

export const update = mutationFor("evangelism:update")({
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
        first_visit_date: v.optional(v.string()),
        salvation_decision: v.optional(v.boolean()),
        converted: v.optional(v.boolean()),
        conversion_date: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, response, converted, conversion_date, attended_church, ...rest } = args;
        validatePersonInput({
            ...rest,
            ...(response ? { contact_category: response } : {}),
            ...(conversion_date ? { membership_date: conversion_date } : {}),
        });
        const existingPerson = await ctx.db.get(id);
        if (!existingPerson) throw new Error("Contact not found");
        const nextCategory = response ?? existingPerson.contact_category;
        const reintroduced = Boolean(
            rest.contact_date
            && existingPerson.contact_date
            && rest.contact_date > existingPerson.contact_date
            && existingPerson.member_status === "guest"
            && !["do_not_contact", "has_church", "wrong_number"].includes(nextCategory ?? ""),
        );

        const updates: any = {
            ...rest,
            updated_at: new Date().toISOString(),
        };

        if (updates.first_name !== undefined) updates.first_name = updates.first_name.trim();
        if (updates.last_name !== undefined) updates.last_name = updates.last_name.trim();
        if (updates.email !== undefined) updates.email = normalizeEmail(updates.email);
        if (updates.phone !== undefined) updates.phone = updates.phone.trim() || undefined;
        if (updates.address !== undefined) updates.address = updates.address.trim() || undefined;

        if (response) updates.contact_category = response;
        if (converted !== undefined) {
            updates.member_status = converted ? "member" : "guest";
        }
        if (conversion_date) {
            updates.membership_date = conversion_date;
        }
        if (reintroduced) {
            updates.pipeline_stage = "new";
            updates.is_paused = false;
            updates.pause_reason = undefined;
            updates.resume_date = undefined;
        }

        // Handle attended_church mapping to first_visit_date
        if (attended_church) {
            // Check if they already have a first visit date
            if (!existingPerson.first_visit_date) {
                // Set to today/now or contact_date if today is cleaner
                updates.first_visit_date = new Date().toISOString().split('T')[0];
            }
        }

        // follow_up_date creates a task during contact creation; it is not a person field.
        delete updates.follow_up_date;

        await ctx.db.patch(id, updates);
        if (reintroduced) {
            const [assignments, openTasks] = await Promise.all([
                ctx.db
                    .query("follow_up_assignments")
                    .withIndex("by_person_status", (q) => q.eq("person_id", id).eq("status", "active"))
                    .collect(),
                ctx.db
                    .query("follow_up_tasks")
                    .withIndex("by_person_status", (q) => q.eq("person_id", id).eq("status", "open"))
                    .collect(),
            ]);
            const owner = assignments.sort((a, b) => b.assigned_at.localeCompare(a.assigned_at))[0];
            if (owner && openTasks.length === 0) {
                const now = new Date().toISOString();
                await ctx.db.insert("follow_up_tasks", {
                    person_id: id,
                    assigned_leader_id: owner.assigned_leader_id,
                    due_date: rest.contact_date!,
                    status: "open",
                    task_type: "first_contact",
                    priority: "high",
                    reason: "Met again through evangelism — reconnect while the contact is fresh",
                    created_at: now,
                    updated_at: now,
                });
            }
        }
        return await ctx.db.get(id);
    },
});

export const remove = mutationFor("evangelism:remove")({
    args: { id: v.id("people") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

export const markAsConverted = mutationFor("evangelism:markAsConverted")({
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

export const getByResponse = queryFor("evangelism:getByResponse")({
    args: { response: v.string() },
    handler: async (ctx, args) => {
        const people = await ctx.db.query("people").collect();
        const contacts = people.filter((person) => person.contact_date || person.entry_point === "evangelism");

        const filtered = contacts.filter(c => c.contact_category === args.response);

        return await Promise.all(filtered.map(async (c) => {
            let inviter = null;
            if (c.invited_by_id) inviter = await ctx.db.get(c.invited_by_id);
            return mapToContact(c, inviter);
        }));
    },
});

export const getRequiringFollowUp = queryFor("evangelism:getRequiringFollowUp")({
    args: {},
    handler: async (ctx) => {
        // Get all guests with responsive status who need follow-up:
        // 1. Responsive contacts who haven't visited yet
        // 2. Responsive contacts whose last visit was 30+ days ago
        const guests = await ctx.db
            .query("people")
            .withIndex("by_member_status", (q) => q.eq("member_status", "guest"))
            .collect();

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        const needsFollowUp = guests.filter(g => {
            // Only consider responsive contacts
            if (g.contact_category !== "responsive") return false;

            // If they've never visited, they need follow-up
            if (!g.first_visit_date) return true;

            // If their first visit was 30+ days ago and they're still a guest
            // (not converted to member), they need follow-up
            if (g.first_visit_date < thirtyDaysAgoStr) return true;

            return false;
        });

        return await Promise.all(needsFollowUp.map(async (c) => {
            let inviter = null;
            if (c.invited_by_id) inviter = await ctx.db.get(c.invited_by_id);
            return mapToContact(c, inviter);
        }));
    },
});


export const getConverted = queryFor("evangelism:getConverted")({
    args: {},
    handler: async (ctx) => {
        const people = await ctx.db.query("people").collect();
        const members = people.filter((person) => ["member", "leader"].includes(person.member_status));

        // Filter those who came from evangelism (have contact_date)
        const convertedContacts = members.filter(m => m.contact_date != null);

        return await Promise.all(convertedContacts.map(async (c) => {
            let inviter = null;
            if (c.invited_by_id) inviter = await ctx.db.get(c.invited_by_id);
            return mapToContact(c, inviter);
        }));
    },
});

export const getByDateRange = queryFor("evangelism:getByDateRange")({
    args: { startDate: v.string(), endDate: v.string() },
    handler: async (ctx, args) => {
        const people = await ctx.db.query("people").collect();
        const contacts = people.filter((person) => person.contact_date || person.entry_point === "evangelism");

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

export const getByInviter = queryFor("evangelism:getByInviter")({
    args: { personId: v.id("people") },
    handler: async (ctx, args) => {
        const contacts = await ctx.db
            .query("people")
            .withIndex("by_invited_by", (q) => q.eq("invited_by_id", args.personId))
            .collect();

        return await Promise.all(contacts.map(async (c) => {
            const inviter = await ctx.db.get(args.personId);
            return mapToContact(c, inviter);
        }));
    },
});
