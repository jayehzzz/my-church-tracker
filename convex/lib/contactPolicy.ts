import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export function canFollowUp(person: Pick<Doc<"people">, "contact_category" | "is_paused" | "member_status">) {
    return person.contact_category !== "do_not_contact" && person.is_paused !== true && person.member_status !== "archived";
}
export function requireFollowUpAllowed(person: Parameters<typeof canFollowUp>[0]) {
    if (person.contact_category === "do_not_contact") throw new Error("This person has requested no contact");
    if (person.is_paused) throw new Error("Follow-up is paused. Reactivate the person explicitly before scheduling or recording follow-up.");
    if (person.member_status === "archived") throw new Error("Follow-up is unavailable for an archived person");
}

// These categories suppress outreach discovery without making “has a church”
// a universal contact restriction for pastoral care or explicit follow-up.
export function canDiscoverOutreach(person: Parameters<typeof canFollowUp>[0] & Pick<Doc<"people">, "pipeline_stage">) {
    return canFollowUp(person)
        && !["has_church", "wrong_number"].includes(person.contact_category ?? "")
        && person.pipeline_stage !== "closed";
}

export function isOutreachTask(task: Pick<Doc<"follow_up_tasks">, "task_type" | "source_visitation_id">) {
    return !task.source_visitation_id && !["member_care", "visitation"].includes(task.task_type);
}

export async function cancelPendingOutreach(ctx: MutationCtx, personId: Id<"people">, outcome = "do_not_contact") {
    const tasks = await ctx.db.query("follow_up_tasks")
        .withIndex("by_person_status", q => q.eq("person_id", personId).eq("status", "open")).collect();
    const now = new Date().toISOString();
    for (const task of tasks) {
        if (!isOutreachTask(task)) continue;
        await ctx.db.patch(task._id, { status: "cancelled", outcome, completed_at: now, updated_at: now });
    }
}
