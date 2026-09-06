import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { date, now } from "./attendanceWorkflow";
import { canFollowUp } from "./contactPolicy";

export async function refreshCareStats(ctx: MutationCtx, personId?: Id<"people">) {
    if (!personId || !await ctx.db.get(personId)) return;
    const history = await ctx.db.query("follow_ups").withIndex("by_contact", q => q.eq("contact_id", personId)).collect();
    await ctx.db.patch(personId, { total_follow_ups: history.length, last_follow_up_date: history.map(f => f.follow_up_date).sort().at(-1), updated_at: now() });
}
function method(type?: string) {
    return type === "phone_call" ? "call" : type === "message" ? "whatsapp" : ["home_visit", "hospital_visit", "church_meeting", "practical_support"].includes(type ?? "") ? "in_person" : "other";
}
// Older care entries had no backlink. Only adopt an exact creation-time match;
// ambiguous legacy histories require manual review rather than a guessed deletion.
export async function linkedHistory(ctx: MutationCtx, care: Doc<"visitations">) {
    if (!care.person_id) return [];
    const all = await ctx.db.query("follow_ups").withIndex("by_contact", q => q.eq("contact_id", care.person_id!)).collect();
    const linked = all.filter(f => f.source_visitation_id === care._id);
    if (linked.length) return linked;
    const legacy = all.filter(f => !f.source_visitation_id && f.created_at === care.created_at && f.leader_id === care.visited_by_id);
    if (legacy.length > 1) throw new Error("This legacy care entry has ambiguous history. Review its duplicate timeline entries before changing it.");
    return legacy;
}
export async function reconcileCare(ctx: MutationCtx, id: Id<"visitations">, before?: Doc<"visitations">) {
    const care = await ctx.db.get(id);
    if (!care) throw new Error("Care interaction not found");
    date(care.visit_date);
    const person = care.person_id ? await ctx.db.get(care.person_id) : null;
    const leader = care.visited_by_id ? await ctx.db.get(care.visited_by_id) : null;
    if (care.person_id && !person) throw new Error("Person not found");
    if (care.visited_by_id && !leader) throw new Error("Care leader not found");
    const next = care.next_task_id ? await ctx.db.get(care.next_task_id) : null;
    if (before?.person_id !== care.person_id && next && next.status !== "open") throw new Error("Completed or cancelled care work cannot be reassigned. Record a separate interaction for the other person.");
    if (care.follow_up_required) {
        if (!care.follow_up_date) throw new Error("Choose a due date for the next action");
        date(care.follow_up_date);
        if (!person || !leader) throw new Error("Link a person and care leader to schedule follow-up");
        if ((!next || next.status === "open") && care.follow_up_date < care.visit_date) throw new Error("The next action must be on or after the care date");
    }
    const histories = await linkedHistory(ctx, before ?? care);
    const values = { contact_id: care.person_id!, leader_id: care.visited_by_id!, follow_up_date: care.visit_date, method: method(care.interaction_type), outcome: care.outcome, care_status: care.status ?? "completed", source_visitation_id: id, source_task_id: care.source_task_id, next_action_date: care.follow_up_required && care.status !== "cancelled" ? care.follow_up_date : undefined, notes: care.notes };
    if (person && leader) {
        if (histories[0]) await ctx.db.patch(histories[0]._id, values);
        else await ctx.db.insert("follow_ups", { ...values, created_at: care.created_at });
        for (const duplicate of histories.slice(1)) await ctx.db.delete(duplicate._id);
    } else for (const history of histories) await ctx.db.delete(history._id);

    const shouldSchedule = care.follow_up_required && care.status !== "cancelled" && person && leader && canFollowUp(person);
    if (shouldSchedule) {
        const values = { person_id: person!._id, assigned_leader_id: leader!._id, due_date: care.follow_up_date!, reason: `Continue pastoral care after ${care.visit_date}`, priority: ["concerns_shared", "prayer_request_received"].includes(care.outcome) ? "high" as const : "normal" as const, source_visitation_id: id, updated_at: now() };
        if (next?.status === "open") await ctx.db.patch(next._id, values);
        else if (!next && !care.next_task_id) {
            const nextId = await ctx.db.insert("follow_up_tasks", { ...values, status: "open", task_type: "member_care", created_at: now() });
            await ctx.db.patch(id, { next_task_id: nextId });
        }
        // Completed/cancelled task links are retained. A correction never creates
        // another task; intentional new work goes through Create Care Task.
    } else if (next?.status === "open") await ctx.db.patch(next._id, { status: "cancelled", outcome: "care_follow_up_removed", completed_at: now(), updated_at: now() });

    if (care.source_task_id) {
        const source = await ctx.db.get(care.source_task_id);
        if (!source || source.person_id !== care.person_id) throw new Error("The source care task belongs to a different person or no longer exists");
        // Correct linked task details without changing its completion state.
        if (source.status === "completed") await ctx.db.patch(source._id, { outcome: care.outcome, notes: care.notes, updated_at: now() });
    }
    await refreshCareStats(ctx, before?.person_id);
    await refreshCareStats(ctx, care.person_id);
}
export async function deleteCare(ctx: MutationCtx, id: Id<"visitations">) {
    const care = await ctx.db.get(id);
    if (!care) return { success: true };
    const history = await linkedHistory(ctx, care);
    const tasks = (await ctx.db.query("follow_up_tasks").collect()).filter(t => t.source_visitation_id === id || t._id === care.next_task_id);
    const source = care.source_task_id ? await ctx.db.get(care.source_task_id) : null;
    await ctx.db.insert("record_recovery", { record_type: "care", record_id: id, snapshot: { record: care, history, tasks, source }, deleted_at: now() });
    for (const f of history) await ctx.db.delete(f._id);
    for (const task of tasks) await ctx.db.patch(task._id, { source_visitation_id: undefined, ...(task.status === "open" ? { status: "cancelled" as const, outcome: "care_record_removed", completed_at: now() } : {}), updated_at: now() });
    // Completed source work stays completed; its recovery snapshot explains why.
    await ctx.db.delete(id);
    await refreshCareStats(ctx, care.person_id);
    return { success: true };
}
