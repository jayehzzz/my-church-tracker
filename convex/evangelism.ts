import { queryFor, mutationFor, authenticatedUser, isAdmin } from "./lib/security";

import { v } from "convex/values";
import { canonicalContactCategory, normalizeEmail, validatePersonInput } from "./peopleValidation";
import { canDiscoverOutreach, cancelPendingOutreach } from "./lib/contactPolicy";

/**
 * REFACTORED: Now queries the Unified `people` table for guests/contacts.
 * Acts as an ADAPTER to map unified unified schema fields back to legacy fields expected by frontend.
 */

// Helper to map Person -> EvangelismContact format
const mapToContact = (person: any, primaryInviter: any = null, collectors: any[] = []) => {
    // Compute freshness based on contact_date
    const now = new Date();
    const contactDate = person.contact_date ? new Date(person.contact_date) : new Date(person.created_at);
    const daysSinceContact = Math.floor((now.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24));

    let freshness: string;
    if (daysSinceContact <= 7) freshness = "this_week";
    else if (daysSinceContact <= 14) freshness = "last_week";
    else if (daysSinceContact <= 28) freshness = "two_plus_weeks";
    else freshness = "month_plus";

    const outreachSalvationDecision = person.outreach_salvation_decision ?? person.salvation_decision;
    const legacyOnlySalvation = person.outreach_salvation_decision === undefined && person.salvation_decision !== undefined;
    const outreachSalvationDate = person.outreach_salvation_date
        ?? (outreachSalvationDecision ? person.contact_date : undefined);
    const outreachSalvationSource = person.outreach_salvation_source
        ?? (outreachSalvationDecision
            ? (legacyOnlySalvation ? "legacy_salvation_decision" : "evangelism_outreach")
            : undefined);
    const response = canonicalContactCategory(person.contact_category);

    return {
        ...person,
        id: person._id, // Ensure ID is accessible as 'id' if needed

        // Mapped fields
        response,
        status: person.member_status,
        converted: ["member", "leader"].includes(person.member_status),
        outreach_salvation_decision: outreachSalvationDecision,
        outreach_salvation_date: outreachSalvationDate,
        outreach_salvation_source: outreachSalvationSource,
        // Deprecated compatibility alias. This represents outreach salvation,
        // never a decision made at a service or meeting.
        salvation_decision: outreachSalvationDecision,

        // A contact can have shared outreach/invitation credit. Keep the
        // legacy primary inviter for compatibility while exposing every
        // credited person to the frontend and analytics.
        primary_inviter_name: primaryInviter ? `${primaryInviter.first_name || ''} ${primaryInviter.last_name || ''}`.trim() : null,
        collector_ids: collectors.map((collector) => collector._id),
        collector_names: collectors.map((collector) => `${collector.first_name || ''} ${collector.last_name || ''}`.trim()).filter(Boolean),
        inviter_ids: [...new Set([
            ...(primaryInviter ? [String(primaryInviter._id)] : []),
            ...collectors.map((collector) => String(collector._id)),
        ])],
        invited_by_name: [...new Set([
            ...(primaryInviter ? [`${primaryInviter.first_name || ''} ${primaryInviter.last_name || ''}`.trim()] : []),
            ...collectors.map((collector) => `${collector.first_name || ''} ${collector.last_name || ''}`.trim()),
        ].filter(Boolean))].join(', ') || null,
        contacted_by_person: primaryInviter,

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

async function enrichContact(ctx: any, person: any) {
    const primaryInviter = person.invited_by_id ? await ctx.db.get(person.invited_by_id) : null;
    const creditRows = await ctx.db.query("contact_collectors")
        .withIndex("by_person", (q: any) => q.eq("person_id", person._id)).collect();
    const collectors = (await Promise.all(creditRows.map((row: any) => ctx.db.get(row.collector_id)))).filter(Boolean);
    return mapToContact(person, primaryInviter, collectors);
}

async function syncCollectorCredits(ctx: any, personId: any, collectorIds: any[]) {
    const ids = [...new Set(collectorIds.map(String))];
    if (ids.length !== collectorIds.length) throw new Error("Choose each credited person once");
    if (ids.includes(String(personId))) throw new Error("A contact cannot credit themselves");
    for (const collectorId of collectorIds) if (!await ctx.db.get(collectorId)) throw new Error("Credited person not found");
    const existing = await ctx.db.query("contact_collectors")
        .withIndex("by_person", (q: any) => q.eq("person_id", personId)).collect();
    const wanted = new Set(ids);
    for (const row of existing) if (!wanted.has(String(row.collector_id))) await ctx.db.delete(row._id);
    for (const collectorId of collectorIds) {
        if (!existing.some((row: any) => row.collector_id === collectorId)) {
            await ctx.db.insert("contact_collectors", { person_id: personId, collector_id: collectorId, created_at: new Date().toISOString() });
        }
    }
}


export const getAll = queryFor("evangelism:getAll")({
    args: {},
    handler: async (ctx) => {
        const people = await ctx.db.query("people").collect();
        const contacts = people.filter((person) => person.contact_date || person.entry_point === "evangelism");

        const results = await Promise.all(contacts.map((contact) => enrichContact(ctx, contact)));

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

        return enrichContact(ctx, contact);
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
        response: v.optional(v.string()), // Maps to contact_category; new contacts need no assessment
        invited_by_id: v.optional(v.id("people")),
        collected_by_id: v.optional(v.id("people")),
        collector_ids: v.optional(v.array(v.id("people"))),
        assigned_leader_id: v.optional(v.id("people")),
        comments: v.optional(v.array(v.string())),

        // Frontend might send these
        contact_method: v.optional(v.string()),
        follow_up_date: v.optional(v.string()),
        attended_church: v.optional(v.boolean()),
        first_visit_date: v.optional(v.string()),
        outreach_salvation_decision: v.optional(v.boolean()),
        outreach_salvation_date: v.optional(v.string()),
        outreach_salvation_source: v.optional(v.string()),
        salvation_decision: v.optional(v.boolean()),
        converted: v.optional(v.boolean()),
        conversion_date: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (args.collector_ids !== undefined && !isAdmin(authenticatedUser(ctx))) throw new Error("Shared outreach credit requires an admin");
        const contactCategory = canonicalContactCategory(args.response) ?? "not_assessed";
        const outreachSalvationDecision = args.outreach_salvation_decision ?? args.salvation_decision;
        const outreachSalvationDate = outreachSalvationDecision
            ? (args.outreach_salvation_date ?? args.contact_date)
            : undefined;
        validatePersonInput({
            first_name: args.first_name,
            ...(args.last_name ? { last_name: args.last_name } : {}),
            ...(args.email ? { email: args.email } : {}),
            contact_date: args.contact_date,
            contact_category: contactCategory,
            ...(args.contact_method ? { contact_method: args.contact_method } : {}),
            ...(args.first_visit_date ? { first_visit_date: args.first_visit_date } : {}),
            ...(outreachSalvationDate ? { outreach_salvation_date: outreachSalvationDate } : {}),
        });
        const primaryCollectorId = args.collector_ids?.[0] ?? args.collected_by_id;
        if (primaryCollectorId && !await ctx.db.get(primaryCollectorId)) throw new Error("Collector not found or unavailable");
        const now = new Date().toISOString();

        // Outreach-only people are contacts until a recorded church attendance
        // promotes them to guest. Membership remains an explicit later step.
        const status = args.attended_church || args.first_visit_date ? "guest" : "contact";

        const id = await ctx.db.insert("people", {
            first_name: args.first_name.trim(),
            last_name: args.last_name?.trim() || "",
            surname_status: args.last_name?.trim() ? "known" : "missing",
            email: normalizeEmail(args.email),
            phone: args.phone?.trim() || undefined,
            address: args.address?.trim() || undefined,

            member_status: status,
            contact_category: contactCategory,
            contact_date: args.contact_date,
            contact_method: args.contact_method,
            invited_by_id: args.invited_by_id,
            collected_by_id: primaryCollectorId,
            outreach_salvation_decision: outreachSalvationDecision,
            outreach_salvation_date: outreachSalvationDate,
            outreach_salvation_source: outreachSalvationDecision
                ? (args.outreach_salvation_source ?? "evangelism_outreach")
                : undefined,
            // Keep the legacy field as a write-through compatibility mirror.
            salvation_decision: outreachSalvationDecision,
            first_visit_date: args.first_visit_date || (args.attended_church ? args.contact_date : undefined),
            notes: args.notes,

            // New unified fields for attendance/spiritual tracking
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

        if (args.collector_ids !== undefined) await syncCollectorCredits(ctx, id, args.collector_ids);

        // A new evangelism contact can enter the CRM immediately. Ownership is
        // separate from invited_by_id because the inviter is not always the
        // leader responsible for follow-up.
        if (args.assigned_leader_id && ["contact", "guest"].includes(status)) {
            const leader = await ctx.db.get(args.assigned_leader_id);
            if (!leader || (isAdmin(authenticatedUser(ctx)) && leader.member_status !== "leader")) {
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
            if (canDiscoverOutreach({ contact_category: contactCategory, member_status: status })) await ctx.db.insert("follow_up_tasks", {
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

        return enrichContact(ctx, await ctx.db.get(id));
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
        collected_by_id: v.optional(v.union(v.id("people"), v.null())),
        collector_ids: v.optional(v.array(v.id("people"))),
        contact_date: v.optional(v.string()),

        contact_method: v.optional(v.string()),
        follow_up_date: v.optional(v.string()),
        attended_church: v.optional(v.boolean()),
        first_visit_date: v.optional(v.string()),
        outreach_salvation_decision: v.optional(v.boolean()),
        outreach_salvation_date: v.optional(v.string()),
        outreach_salvation_source: v.optional(v.string()),
        salvation_decision: v.optional(v.boolean()),
        converted: v.optional(v.boolean()),
        conversion_date: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const {
            id, response, converted, conversion_date, attended_church, collector_ids,
            outreach_salvation_decision, outreach_salvation_date, outreach_salvation_source,
            salvation_decision, ...rest
        } = args;
        if (collector_ids !== undefined && !isAdmin(authenticatedUser(ctx))) throw new Error("Shared outreach credit requires an admin");
        if (args.collected_by_id && !await ctx.db.get(args.collected_by_id)) throw new Error("Collector not found or unavailable");
        const existingPerson = await ctx.db.get(id);
        if (!existingPerson) throw new Error("Contact not found");
        const contactCategory = response !== undefined ? canonicalContactCategory(response) : undefined;
        const outreachFieldsTouched = outreach_salvation_decision !== undefined
            || salvation_decision !== undefined
            || outreach_salvation_date !== undefined
            || outreach_salvation_source !== undefined;
        const currentOutreachDecision = existingPerson.outreach_salvation_decision ?? existingPerson.salvation_decision;
        const nextOutreachDecision = outreach_salvation_decision ?? salvation_decision ?? currentOutreachDecision;
        const nextOutreachDate = nextOutreachDecision
            ? (outreach_salvation_date
                ?? existingPerson.outreach_salvation_date
                ?? existingPerson.contact_date
                ?? rest.contact_date)
            : undefined;
        validatePersonInput({
            ...rest,
            ...(contactCategory !== undefined ? { contact_category: contactCategory } : {}),
            ...(nextOutreachDate ? { outreach_salvation_date: nextOutreachDate } : {}),
        });
        const nextCategory = contactCategory ?? canonicalContactCategory(existingPerson.contact_category);
        const reintroduced = Boolean(
            rest.contact_date
            && existingPerson.contact_date
            && rest.contact_date > existingPerson.contact_date
            && ["contact", "guest"].includes(existingPerson.member_status)
            && !["do_not_contact", "has_church", "wrong_number"].includes(nextCategory ?? ""),
        );

        const updates: any = {
            ...rest,
            updated_at: new Date().toISOString(),
        };

        if (collector_ids !== undefined) updates.collected_by_id = collector_ids[0] ?? undefined;

        if (updates.collected_by_id === null) updates.collected_by_id = undefined;
        if (updates.first_name !== undefined) updates.first_name = updates.first_name.trim();
        if (updates.last_name !== undefined) updates.last_name = updates.last_name.trim();
        if (updates.email !== undefined) updates.email = normalizeEmail(updates.email);
        if (updates.phone !== undefined) updates.phone = updates.phone.trim() || undefined;
        if (updates.address !== undefined) updates.address = updates.address.trim() || undefined;

        if (contactCategory !== undefined) updates.contact_category = contactCategory;
        if (outreachFieldsTouched) {
            updates.outreach_salvation_decision = nextOutreachDecision;
            updates.salvation_decision = nextOutreachDecision;
            updates.outreach_salvation_date = nextOutreachDate;
            updates.outreach_salvation_source = nextOutreachDecision
                ? (outreach_salvation_source
                    ?? existingPerson.outreach_salvation_source
                    ?? (existingPerson.outreach_salvation_decision === undefined && existingPerson.salvation_decision
                        ? "legacy_salvation_decision"
                        : "evangelism_outreach"))
                : undefined;
        }
        // Legacy conversion fields remain accepted, but routine outreach edits
        // never change membership. People owns that explicit decision.
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
        if (nextCategory === "do_not_contact") await cancelPendingOutreach(ctx, id);
        if (collector_ids !== undefined) await syncCollectorCredits(ctx, id, collector_ids);
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
        return enrichContact(ctx, await ctx.db.get(id));
    },
});

export const remove = mutationFor("evangelism:remove")({
    args: { id: v.id("people") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

async function markAsJoinedChurchHandler(ctx: any, id: any) {
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    await ctx.db.patch(id, {
        member_status: "member",
        membership_date: today,
        updated_at: now,
    });

    return await ctx.db.get(id);
}

export const markAsJoinedChurch = mutationFor("evangelism:markAsJoinedChurch")({
    args: {
        id: v.id("people"),
    },
    handler: async (ctx, args) => markAsJoinedChurchHandler(ctx, args.id),
});

// Deprecated compatibility mutation. "Converted" historically meant that an
// evangelism contact joined the church; it does not represent salvation.
export const markAsConverted = mutationFor("evangelism:markAsConverted")({
    args: {
        id: v.id("people"),
        addToPeople: v.optional(v.boolean()), // Legacy, ignored
    },
    handler: async (ctx, args) => markAsJoinedChurchHandler(ctx, args.id),
});

export const getByResponse = queryFor("evangelism:getByResponse")({
    args: { response: v.string() },
    handler: async (ctx, args) => {
        const people = await ctx.db.query("people").collect();
        const contacts = people.filter((person) => person.contact_date || person.entry_point === "evangelism");

        const requested = canonicalContactCategory(args.response);
        const filtered = contacts.filter(c => canonicalContactCategory(c.contact_category) === requested);

        return await Promise.all(filtered.map((c) => enrichContact(ctx, c)));
    },
});

export const getRequiringFollowUp = queryFor("evangelism:getRequiringFollowUp")({
    args: {},
    handler: async (ctx) => {
        // Include unassessed prospects as well as known responses, while keeping
        // contact restrictions and paused/closed work out of discovery.
        const [contacts, guests] = await Promise.all([
            ctx.db.query("people").withIndex("by_member_status", (q) => q.eq("member_status", "contact")).collect(),
            ctx.db.query("people").withIndex("by_member_status", (q) => q.eq("member_status", "guest")).collect(),
        ]);
        const prospects = [...contacts, ...guests];

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        const needsFollowUp = prospects.filter(g => {
            if (!canDiscoverOutreach(g)) return false;

            // If they've never visited, they need follow-up
            if (!g.first_visit_date) return true;

            // If their first visit was 30+ days ago and they're still a guest
            // (not converted to member), they need follow-up
            if (g.first_visit_date < thirtyDaysAgoStr) return true;

            return false;
        });

        return await Promise.all(needsFollowUp.map((c) => enrichContact(ctx, c)));
    },
});


export const getConverted = queryFor("evangelism:getConverted")({
    args: {},
    handler: async (ctx) => {
        const people = await ctx.db.query("people").collect();
        const members = people.filter((person) => ["member", "leader"].includes(person.member_status));

        // Filter those who came from evangelism (have contact_date)
        const convertedContacts = members.filter(m => m.contact_date != null);

        return await Promise.all(convertedContacts.map((c) => enrichContact(ctx, c)));
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

        return await Promise.all(filtered.map((c) => enrichContact(ctx, c)));
    },
});

export const getByInviter = queryFor("evangelism:getByInviter")({
    args: { personId: v.id("people") },
    handler: async (ctx, args) => {
        const primaryContacts = await ctx.db
            .query("people")
            .withIndex("by_invited_by", (q) => q.eq("invited_by_id", args.personId))
            .collect();
        const sharedRows = await ctx.db.query("contact_collectors")
            .withIndex("by_collector", (q) => q.eq("collector_id", args.personId)).collect();
        const sharedContacts = (await Promise.all(sharedRows.map((row) => ctx.db.get(row.person_id)))).filter(Boolean);
        const contacts = [...new Map([...primaryContacts, ...sharedContacts].map((contact: any) => [String(contact._id), contact])).values()];
        return await Promise.all(contacts.map((contact) => enrichContact(ctx, contact)));
    },
});
