import { v } from "convex/values";
import { mutationFor, queryFor, authenticatedUser, isAdmin, managesAttendance } from "./lib/security";
import { reconcilePerson } from "./lib/attendanceWorkflow";
import { computeWarmthScore } from "./follow_ups";
import type { Doc, Id } from "./_generated/dataModel";

type Commitment = Doc<"gathering_commitments">;
type FollowUp = Doc<"follow_ups">;
const day = /^\d{4}-\d{2}-\d{2}$/;
const response = v.union(v.literal("yes"), v.literal("maybe"), v.literal("no"));
const effectKeys = ["pipeline_stage", "is_paused", "pause_reason", "resume_date", "contact_category"] as const;
const stamp = () => new Date().toISOString();
const version = (row: Commitment | FollowUp) => `${"updated_at" in row ? row.updated_at : row.corrected_at ?? row.created_at}:${row.correction_revision ?? 0}`;
const snapshotCommitment = (row: Commitment) => ({ date: row.gathering_date, response: row.response, resolution: row.resolution, entered_in_error: row.entered_in_error === true });
const snapshotCall = (row: FollowUp) => ({ date: row.follow_up_date, method: row.method, outcome: row.outcome, notes: row.notes, entered_in_error: row.entered_in_error === true });
function reason(value: string) {
  const clean = value.trim();
  if (!clean || clean.length > 500) throw new Error("Add a correction reason of 500 characters or fewer");
  return clean;
}
function validDay(value: string) {
  if (!day.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error("Choose a valid date");
  return value;
}
function canEdit(ctx: object, owner: Id<"people">) {
  const user = authenticatedUser(ctx);
  if (!isAdmin(user) && user.person_id !== owner) throw new Error("Only the worker who recorded this or an administrator can correct it");
  if (!user.person_id) throw new Error("Link your account to a church person before correcting records");
  return user.person_id;
}
async function actualAttendance(ctx: any, row: Commitment) {
  const visits = await ctx.db.query("attendance").withIndex("by_person", (q: any) => q.eq("person_id", row.person_id)).collect();
  for (const visit of visits) if ((await ctx.db.get(visit.service_id))?.service_date === row.gathering_date) return true;
  const meetings = await ctx.db.query("meeting_attendance").withIndex("by_person", (q: any) => q.eq("person_id", row.person_id)).collect();
  for (const visit of meetings) if ((visit.status ? visit.status === "present" : visit.attended !== false) && (await ctx.db.get(visit.meeting_id))?.meeting_date === row.gathering_date) return true;
  return false;
}
async function personEffect(ctx: any, row: FollowUp) {
  const person = await ctx.db.get(row.contact_id);
  const applied = row.completion_effects?.after;
  return { person, reversible: Boolean(applied && person && effectKeys.every(key => person[key] === applied[key])) };
}
async function preview(ctx: any, row: FollowUp) {
  const sourceTask = row.source_task_id ? await ctx.db.get(row.source_task_id) : null;
  const nextTask = row.next_task_id ? await ctx.db.get(row.next_task_id) : null;
  const commitment = row.commitment_id ? await ctx.db.get(row.commitment_id) : null;
  const { person, reversible } = await personEffect(ctx, row);
  const affectedTasks = await Promise.all((row.completion_effects?.cancelled_task_ids ?? []).map((id: Id<"follow_up_tasks">) => ctx.db.get(id)));
  return {
    follow_up: row, source_task: sourceTask, next_task: nextTask, commitment,
    affected_tasks: affectedTasks.filter(Boolean),
    person_status: person ? { pipeline_stage: person.pipeline_stage, is_paused: person.is_paused, contact_category: person.contact_category } : null,
    can_revert_person_status: reversible && Boolean(row.completion_effects?.before && effectKeys.some(key => row.completion_effects.before[key] !== row.completion_effects.after[key])),
    can_cancel_next_task: nextTask?.status === "open",
    can_reopen_source_task: sourceTask?.status === "completed",
    can_restore_affected_tasks: affectedTasks.length > 0 && affectedTasks.every(task => task?.status === "cancelled" && task.outcome === "contact_closed"),
    legacy_links_unavailable: !row.next_task_id && Boolean(row.next_action_date),
  };
}

export const previewFollowUp = queryFor("corrections:previewFollowUp")({
  args: { followUpId: v.id("follow_ups") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.followUpId);
    if (!row) throw new Error("Follow-up unavailable");
    canEdit(ctx, row.leader_id);
    if (row.source_visitation_id || row.care_status) throw new Error("Edit this care record in the care workflow");
    return preview(ctx, row);
  },
});

export const previewCommitment = queryFor("corrections:previewCommitment")({
  args: { commitmentId: v.id("gathering_commitments") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.commitmentId);
    if (!row) throw new Error("Confirmation unavailable");
    const calls = (await ctx.db.query("follow_ups").withIndex("by_contact", q => q.eq("contact_id", row.person_id)).collect()).filter(call => call.commitment_id === row._id);
    const tasks = await Promise.all(calls.flatMap(call => [call.source_task_id, call.next_task_id].filter(Boolean)).map(id => ctx.db.get(id!)));
    return { commitment: row, linked_calls: calls, linked_tasks: tasks.filter(Boolean), actual_attendance: managesAttendance(ctx) ? await actualAttendance(ctx, row) : row.resolution === "attended" };
  },
});

export const correctFollowUp = mutationFor("corrections:correctFollowUp")({
  args: {
    followUpId: v.id("follow_ups"), expectedVersion: v.string(), reason: v.string(),
    date: v.string(), method: v.string(), outcome: v.string(), notes: v.optional(v.string()),
    enteredInError: v.boolean(), cancelNextTask: v.boolean(), reopenSourceTask: v.boolean(), revertPersonStatus: v.boolean(), restoreAffectedTasks: v.boolean(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.followUpId);
    if (!row) throw new Error("Follow-up unavailable");
    const actor = canEdit(ctx, row.leader_id);
    if (row.source_visitation_id || row.care_status) throw new Error("Edit this care record in the care workflow");
    if (version(row) !== args.expectedVersion) throw new Error("This follow-up changed. Reload it before saving your correction");
    const why = reason(args.reason);
    const date = validDay(args.date);
    const method = args.method.trim();
    const outcome = args.outcome.trim();
    const notes = args.notes === undefined ? row.notes : args.notes.trim() || undefined;
    if (!method || !outcome || method.length > 80 || outcome.length > 80 || (notes?.length ?? 0) > 2000) throw new Error("Check the follow-up details and keep notes to 2,000 characters");
    const before = snapshotCall(row);
    const after = { date, method, outcome, notes, entered_in_error: args.enteredInError };
    const now = stamp();
    const links = await preview(ctx, row);
    if (args.cancelNextTask) {
      if (!links.can_cancel_next_task || !links.next_task) throw new Error("The linked next task is no longer open");
      await ctx.db.patch(links.next_task._id, { status: "cancelled", outcome: "corrected_follow_up", updated_at: now });
    }
    if (args.reopenSourceTask) {
      if (!args.enteredInError || !links.can_reopen_source_task || !links.source_task) throw new Error("Only an invalidated completion can reopen its completed task");
      await ctx.db.patch(links.source_task._id, { status: "open", outcome: undefined, notes: undefined, completed_at: undefined, completed_by_id: undefined, updated_at: now });
    } else if (links.source_task?.status === "completed") {
      await ctx.db.patch(links.source_task._id, { outcome, notes, updated_at: now });
    }
    if (args.restoreAffectedTasks) {
      if (!args.enteredInError || !links.can_restore_affected_tasks) throw new Error("These related tasks have changed; review them separately");
      for (const task of links.affected_tasks) await ctx.db.patch(task._id, { status: "open", outcome: undefined, completed_at: undefined, updated_at: now });
    }
    if (args.revertPersonStatus) {
      if (!links.can_revert_person_status || !links.person_status) throw new Error("The person's status changed after this call; review it separately");
      const before = row.completion_effects.before;
      await ctx.db.patch(row.contact_id, {
        pipeline_stage: before.pipeline_stage, is_paused: before.is_paused,
        pause_reason: before.pause_reason, resume_date: before.resume_date,
        contact_category: before.contact_category, updated_at: now,
      });
    }
    await ctx.db.patch(row._id, {
      follow_up_date: date, method, outcome, notes, entered_in_error: args.enteredInError,
      corrected_at: now, correction_revision: (row.correction_revision ?? 0) + 1,
      correction_history: [...(row.correction_history ?? []), { at: now, actor_id: actor, reason: why, before, after }],
    });
    const active = (await ctx.db.query("follow_ups").withIndex("by_contact", q => q.eq("contact_id", row.contact_id)).collect()).filter(item => !item.entered_in_error);
    const person = await ctx.db.get(row.contact_id);
    if (person) {
      const previousLegacyPromise = !row.commitment_id && row.outcome === "promised_to_come" && !row.entered_in_error;
      const currentLegacyPromise = !row.commitment_id && outcome === "promised_to_come" && !args.enteredInError;
      const promisesMade = Math.max(0, (person.promises_made ?? 0) + Number(currentLegacyPromise) - Number(previousLegacyPromise));
      await ctx.db.patch(row.contact_id, {
        total_follow_ups: active.length,
        last_follow_up_date: active.map(item => item.follow_up_date).sort().at(-1),
        promises_made: promisesMade,
        warmth_score: computeWarmthScore({ ...person, promises_made: promisesMade }, [...active]),
        updated_at: now,
      });
    }
    return await ctx.db.get(row._id);
  },
});

export const correctCommitment = mutationFor("corrections:correctCommitment")({
  args: {
    commitmentId: v.id("gathering_commitments"), expectedVersion: v.string(), reason: v.string(),
    date: v.string(), response: v.optional(response), enteredInError: v.boolean(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.commitmentId);
    if (!row) throw new Error("Confirmation unavailable");
    const actor = authenticatedUser(ctx).person_id;
    if (!actor) throw new Error("Link your account to a church person before correcting confirmations");
    if (version(row) !== args.expectedVersion) throw new Error("This confirmation changed. Reload it before saving your correction");
    const why = reason(args.reason);
    const date = validDay(args.date);
    if (!args.enteredInError && !args.response) throw new Error("Choose Yes, Maybe or No");
    const hasVisit = managesAttendance(ctx) ? await actualAttendance(ctx, row) : false;
    if (hasVisit && date !== row.gathering_date) throw new Error("Correct actual attendance separately before changing this gathering date");
    if (hasVisit && !managesAttendance(ctx)) throw new Error("An administrator must correct a confirmation linked to actual attendance");
    const conflict = (await ctx.db.query("gathering_commitments").withIndex("by_person_date", q => q.eq("person_id", row.person_id).eq("gathering_date", date)).collect())
      .find(other => other._id !== row._id && other.gathering_type === row.gathering_type && !other.entered_in_error);
    if (conflict) throw new Error("A confirmation already exists for this person and gathering date");
    const before = snapshotCommitment(row);
    const now = stamp();
    const nextResponse = args.enteredInError ? row.response : args.response!;
    const resolution = hasVisit ? "attended" : args.enteredInError || (row.response === "yes" && nextResponse !== "yes") ? "cancelled" : nextResponse === "yes" && date === row.gathering_date && row.resolution === "no_show" ? "no_show" : "pending";
    const after = { date, response: args.enteredInError ? null : nextResponse, resolution, entered_in_error: args.enteredInError };
    await ctx.db.patch(row._id, {
      gathering_date: date, response: nextResponse, resolution, entered_in_error: args.enteredInError,
      service_id: hasVisit ? row.service_id : undefined, meeting_id: hasVisit ? row.meeting_id : undefined,
      attendance_previous_status: undefined, resolved_at: resolution === "pending" ? undefined : now,
      resolution_note: resolution === "cancelled" ? why : resolution === "no_show" ? row.resolution_note : undefined,
      history: [...(row.history ?? []), { at: now, leader_id: actor, action: args.enteredInError ? "entered_in_error" : "response_corrected", note: why }],
      correction_history: [...(row.correction_history ?? []), { at: now, actor_id: actor, reason: why, before, after }],
      correction_revision: (row.correction_revision ?? 0) + 1, updated_at: now,
    });
    const linked = (await ctx.db.query("follow_ups").withIndex("by_contact", q => q.eq("contact_id", row.person_id)).collect()).filter(call => call.commitment_id === row._id);
    for (const call of linked) await ctx.db.patch(call._id, { attendance_response: args.enteredInError ? undefined : nextResponse, promised_date: !args.enteredInError && nextResponse === "yes" ? date : undefined, gathering_date: date });
    if (row.gathering_type === "sunday_service") {
      const plans = await ctx.db.query("attendance_plans").withIndex("by_person_date", q => q.eq("person_id", row.person_id).eq("service_date", row.gathering_date)).collect();
      for (const plan of plans.filter(plan => ["confirmed", "absent"].includes(plan.status))) await ctx.db.patch(plan._id, { status: "expected", updated_at: now });
      const person = await ctx.db.get(row.person_id);
      if (person && ["member", "leader"].includes(person.member_status) && !args.enteredInError && nextResponse === "yes" && !hasVisit) {
        const target = (await ctx.db.query("attendance_plans").withIndex("by_person_date", q => q.eq("person_id", row.person_id).eq("service_date", date)).collect())[0];
        if (target) await ctx.db.patch(target._id, { status: resolution === "no_show" ? "absent" : "confirmed", updated_at: now });
        else await ctx.db.insert("attendance_plans", { person_id: row.person_id, leader_id: actor, service_date: date, status: resolution === "no_show" ? "absent" : "confirmed", created_at: now, updated_at: now });
      }
    }
    // The historical counter may include older promise sources. Change it only
    // when the effective yes state of this specific commitment changes.
    const person = await ctx.db.get(row.person_id);
    if (person && (row.response === "yes" && !row.entered_in_error) !== (nextResponse === "yes" && !args.enteredInError)) {
      const delta = nextResponse === "yes" && !args.enteredInError ? 1 : -1;
      await ctx.db.patch(row.person_id, { promises_made: Math.max(0, (person.promises_made ?? 0) + delta), updated_at: now });
    }
    await reconcilePerson(ctx, row.person_id);
    const refreshedPerson = await ctx.db.get(row.person_id);
    if (refreshedPerson) {
      const activeCalls = (await ctx.db.query("follow_ups").withIndex("by_contact", q => q.eq("contact_id", row.person_id)).collect()).filter(call => !call.entered_in_error);
      await ctx.db.patch(row.person_id, { warmth_score: computeWarmthScore(refreshedPerson, activeCalls), updated_at: now });
    }
    return await ctx.db.get(row._id);
  },
});
