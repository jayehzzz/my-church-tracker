import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const visitationStatus = v.union(
    v.literal("completed"),
    v.literal("unsuccessful"),
    v.literal("cancelled"),
);

const interactionType = v.union(
    v.literal("home_visit"),
    v.literal("hospital_visit"),
    v.literal("church_meeting"),
    v.literal("phone_call"),
    v.literal("message"),
    v.literal("practical_support"),
    v.literal("other"),
);

const carePurpose = v.union(
    v.literal("new_guest"),
    v.literal("attendance_concern"),
    v.literal("welfare"),
    v.literal("prayer"),
    v.literal("bereavement"),
    v.literal("membership"),
    v.literal("general_care"),
    v.literal("other"),
);

function personName(person: { first_name?: string; last_name?: string; preferred_name?: string } | null) {
    if (!person) return "";
    return [person.preferred_name || person.first_name, person.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
}

function followUpMethod(type?: string) {
    if (type === "phone_call") return "call";
    if (type === "message") return "whatsapp";
    if (["home_visit", "hospital_visit", "church_meeting", "practical_support"].includes(type || "")) {
        return "in_person";
    }
    return "other";
}

async function enrichVisitation(ctx: any, visitation: any) {
    const [person, visitor, sourceTask, nextTask] = await Promise.all([
        visitation.person_id ? ctx.db.get(visitation.person_id) : null,
        visitation.visited_by_id ? ctx.db.get(visitation.visited_by_id) : null,
        visitation.source_task_id ? ctx.db.get(visitation.source_task_id) : null,
        visitation.next_task_id ? ctx.db.get(visitation.next_task_id) : null,
    ]);
    return {
        ...visitation,
        people: person,
        visited_by: visitor,
        source_task: sourceTask,
        next_task: nextTask,
    };
}

export const getAll = query({
    args: {},
    handler: async (ctx) => {
        const visitations = await ctx.db.query("visitations").collect();
        const results = await Promise.all(
            visitations.map((visitation) => enrichVisitation(ctx, visitation)),
        );
        return results.sort((a, b) => b.visit_date.localeCompare(a.visit_date));
    },
});

export const getById = query({
    args: { id: v.id("visitations") },
    handler: async (ctx, args) => {
        const visitation = await ctx.db.get(args.id);
        return visitation ? await enrichVisitation(ctx, visitation) : null;
    },
});

// Completing a care interaction also completes its source task, records the
// shared contact timeline entry, and creates the next task when requested.
export const create = mutation({
    args: {
        person_id: v.optional(v.id("people")),
        person_visited_name: v.optional(v.string()),
        visited_by_name: v.optional(v.string()),
        visited_by_id: v.optional(v.id("people")),
        visit_date: v.string(),
        status: v.optional(visitationStatus),
        interaction_type: v.optional(interactionType),
        purpose: v.optional(carePurpose),
        outcome: v.string(),
        follow_up_required: v.boolean(),
        follow_up_date: v.optional(v.string()),
        source_task_id: v.optional(v.id("follow_up_tasks")),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        const person = args.person_id ? await ctx.db.get(args.person_id) : null;
        const visitor = args.visited_by_id ? await ctx.db.get(args.visited_by_id) : null;

        if (args.person_id && !person) throw new Error("Person visited was not found");
        if (args.visited_by_id && !visitor) throw new Error("Care leader was not found");
        if (args.follow_up_required && !args.follow_up_date) {
            throw new Error("Choose a due date for the next action");
        }

        const sourceTask = args.source_task_id ? await ctx.db.get(args.source_task_id) : null;
        if (args.source_task_id && !sourceTask) throw new Error("The linked care task was not found");
        if (sourceTask && sourceTask.status !== "open") {
            throw new Error("Only an open care task can be completed");
        }
        if (sourceTask && args.person_id && sourceTask.person_id !== args.person_id) {
            throw new Error("The care task belongs to a different person");
        }

        const resolvedPersonId = args.person_id ?? sourceTask?.person_id;
        const resolvedVisitorId = args.visited_by_id ?? sourceTask?.assigned_leader_id;
        const resolvedPerson = person ?? (resolvedPersonId ? await ctx.db.get(resolvedPersonId) : null);
        const resolvedVisitor = visitor ?? (resolvedVisitorId ? await ctx.db.get(resolvedVisitorId) : null);
        const status = args.status
            ?? (["not_home", "declined"].includes(args.outcome) ? "unsuccessful" : "completed");

        const visitationId = await ctx.db.insert("visitations", {
            person_id: resolvedPersonId,
            person_visited_name: args.person_visited_name || personName(resolvedPerson),
            visited_by_id: resolvedVisitorId,
            visited_by_name: args.visited_by_name || personName(resolvedVisitor),
            visit_date: args.visit_date,
            status,
            interaction_type: args.interaction_type ?? "home_visit",
            purpose: args.purpose ?? "general_care",
            outcome: args.outcome,
            follow_up_required: args.follow_up_required,
            follow_up_date: args.follow_up_date,
            source_task_id: args.source_task_id,
            notes: args.notes,
            created_at: now,
        });

        let nextTaskId = null;
        if (args.follow_up_required && args.follow_up_date && resolvedPersonId && resolvedVisitorId) {
            nextTaskId = await ctx.db.insert("follow_up_tasks", {
                person_id: resolvedPersonId,
                assigned_leader_id: resolvedVisitorId,
                created_by_id: resolvedVisitorId,
                due_date: args.follow_up_date,
                status: "open",
                task_type: "member_care",
                priority: ["concerns_shared", "prayer_request_received"].includes(args.outcome)
                    ? "high"
                    : "normal",
                reason: `Continue pastoral care after ${args.visit_date}`,
                source_visitation_id: visitationId,
                created_at: now,
                updated_at: now,
            });
            await ctx.db.patch(visitationId, { next_task_id: nextTaskId });
        }

        if (sourceTask) {
            await ctx.db.patch(sourceTask._id, {
                status: "completed",
                outcome: args.outcome,
                notes: args.notes,
                completed_at: now,
                completed_by_id: resolvedVisitorId,
                updated_at: now,
            });
        }

        if (resolvedPersonId && resolvedVisitorId) {
            await ctx.db.insert("follow_ups", {
                contact_id: resolvedPersonId,
                leader_id: resolvedVisitorId,
                follow_up_date: args.visit_date,
                method: followUpMethod(args.interaction_type),
                outcome: args.outcome,
                next_action_date: args.follow_up_date,
                notes: args.notes,
                created_at: now,
            });
            const interactions = await ctx.db
                .query("follow_ups")
                .withIndex("by_contact", (q) => q.eq("contact_id", resolvedPersonId))
                .collect();
            await ctx.db.patch(resolvedPersonId, {
                total_follow_ups: interactions.length,
                last_follow_up_date: args.visit_date,
                updated_at: now,
            });
        }

        return await ctx.db.get(visitationId);
    },
});

export const update = mutation({
    args: {
        id: v.id("visitations"),
        person_id: v.optional(v.id("people")),
        person_visited_name: v.optional(v.string()),
        visited_by_name: v.optional(v.string()),
        visited_by_id: v.optional(v.id("people")),
        visit_date: v.optional(v.string()),
        status: v.optional(visitationStatus),
        interaction_type: v.optional(interactionType),
        purpose: v.optional(carePurpose),
        outcome: v.optional(v.string()),
        follow_up_required: v.optional(v.boolean()),
        follow_up_date: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const existing = await ctx.db.get(id);
        if (!existing) throw new Error("Care interaction not found");
        const personId = updates.person_id ?? existing.person_id;
        const leaderId = updates.visited_by_id ?? existing.visited_by_id;
        const followUpRequired = updates.follow_up_required ?? existing.follow_up_required;
        const followUpDate = updates.follow_up_date ?? existing.follow_up_date;
        const now = new Date().toISOString();

        let nextTaskId = existing.next_task_id;
        const nextTask = nextTaskId ? await ctx.db.get(nextTaskId) : null;
        if (followUpRequired && followUpDate && personId && leaderId) {
            if (nextTask?.status === "open") {
                await ctx.db.patch(nextTask._id, {
                    person_id: personId,
                    assigned_leader_id: leaderId,
                    due_date: followUpDate,
                    updated_at: now,
                });
            } else {
                nextTaskId = await ctx.db.insert("follow_up_tasks", {
                    person_id: personId,
                    assigned_leader_id: leaderId,
                    created_by_id: leaderId,
                    due_date: followUpDate,
                    status: "open",
                    task_type: "member_care",
                    priority: ["concerns_shared", "prayer_request_received"].includes(
                        updates.outcome ?? existing.outcome,
                    ) ? "high" : "normal",
                    reason: `Continue pastoral care after ${updates.visit_date ?? existing.visit_date}`,
                    source_visitation_id: id,
                    created_at: now,
                    updated_at: now,
                });
            }
        } else if (nextTask?.status === "open") {
            await ctx.db.patch(nextTask._id, {
                status: "cancelled",
                outcome: "care_follow_up_removed",
                completed_at: now,
                updated_at: now,
            });
        }

        await ctx.db.patch(id, {
            ...updates,
            next_task_id: followUpRequired ? nextTaskId : undefined,
            updated_at: now,
        });
        return await ctx.db.get(id);
    },
});

export const remove = mutation({
    args: { id: v.id("visitations") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

export const getByPerson = query({
    args: { personId: v.id("people") },
    handler: async (ctx, args) => {
        const visitations = await ctx.db
            .query("visitations")
            .withIndex("by_person", (q) => q.eq("person_id", args.personId))
            .collect();
        const results = await Promise.all(
            visitations.map((visitation) => enrichVisitation(ctx, visitation)),
        );
        return results.sort((a, b) => b.visit_date.localeCompare(a.visit_date));
    },
});

export const getRequiringFollowUp = query({
    args: {},
    handler: async (ctx) => {
        const visitations = await ctx.db
            .query("visitations")
            .withIndex("by_follow_up", (q) => q.eq("follow_up_required", true))
            .collect();
        const enriched = await Promise.all(
            visitations.map((visitation) => enrichVisitation(ctx, visitation)),
        );
        return enriched
            .filter((visitation) => !visitation.next_task || visitation.next_task.status === "open")
            .sort((a, b) => (a.follow_up_date || "9999-12-31").localeCompare(b.follow_up_date || "9999-12-31"));
    },
});

export const getByDateRange = query({
    args: { startDate: v.string(), endDate: v.string() },
    handler: async (ctx, args) => {
        const visitations = await ctx.db
            .query("visitations")
            .withIndex("by_visit_date", (q) =>
                q.gte("visit_date", args.startDate).lte("visit_date", args.endDate),
            )
            .collect();
        const results = await Promise.all(
            visitations.map((visitation) => enrichVisitation(ctx, visitation)),
        );
        return results.sort((a, b) => b.visit_date.localeCompare(a.visit_date));
    },
});
