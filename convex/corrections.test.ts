import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const when = "2026-09-01T10:00:00Z";

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const person = await ctx.db.insert("people", { first_name: "Guest", last_name: "Example", member_status: "guest", created_at: when, updated_at: when });
    const worker = await ctx.db.insert("people", { first_name: "Worker", last_name: "Example", member_status: "leader", created_at: when, updated_at: when });
    const other = await ctx.db.insert("people", { first_name: "Other", last_name: "Example", member_status: "leader", created_at: when, updated_at: when });
    for (const [name, role, linked, confidential] of [["owner", "owner", worker, true], ["worker", "leader", worker, true], ["limited", "leader", worker, false], ["other", "leader", other, true]] as const) await ctx.db.insert("crm_users", { external_auth_id: `https://fixture.example|${name}`, person_id: linked, role, status: "active", can_view_confidential: confidential, created_at: when, updated_at: when });
    await ctx.db.insert("follow_up_assignments", { person_id: person, assigned_leader_id: worker, status: "active", assigned_at: when, created_at: when, updated_at: when });
    const task = await ctx.db.insert("follow_up_tasks", { person_id: person, assigned_leader_id: worker, due_date: "2026-09-02", status: "open", task_type: "follow_up", priority: "normal", created_at: when, updated_at: when });
    return { person, worker, other, task };
  });
  const as = (name: string) => t.withIdentity({ tokenIdentifier: `https://fixture.example|${name}`, issuer: "https://fixture.example", subject: name });
  return { t, ids, as };
}

const commitmentArgs = (commitment: any, values: any = {}) => ({ commitmentId: commitment._id, expectedVersion: `${commitment.updated_at}:${commitment.correction_revision ?? 0}`, reason: "Correcting the recorded response", date: commitment.gathering_date, response: "yes" as const, enteredInError: false, ...values });

describe("follow-up corrections", () => {
  it("separates a changed mind from an accidental yes and preserves the audit", async () => {
    const { t, ids, as } = await fixture();
    const yes = await as("worker").mutation(api.crm.recordCommitment, { personId: ids.person, leaderId: ids.worker, gatheringType: "sunday_service", gatheringDate: "2026-09-06", response: "yes" });
    const no = await as("worker").mutation(api.corrections.correctCommitment, commitmentArgs(yes, { response: "no" }));
    expect(no).toMatchObject({ response: "no", resolution: "cancelled", entered_in_error: false });
    expect(no!.correction_history).toHaveLength(1);
    await expect(as("worker").mutation(api.corrections.correctCommitment, commitmentArgs(yes, { response: "yes" }))).rejects.toThrow(/changed/i);
    const again = await as("worker").mutation(api.corrections.correctCommitment, commitmentArgs(no));
    expect(again).toMatchObject({ response: "yes", resolution: "pending" });
    const error = await as("worker").mutation(api.corrections.correctCommitment, commitmentArgs(again, { enteredInError: true }));
    expect(error?.entered_in_error).toBe(true);
    expect(await as("owner").query(api.crm.getSundayCommitments, {})).toHaveLength(0);
    expect((await t.run(ctx => ctx.db.get(ids.person)))?.promises_made).toBe(0);
  });

  it("removes a corrected no-show from the missed list without deleting attendance", async () => {
    const { t, ids, as } = await fixture();
    const yes = await as("owner").mutation(api.crm.recordCommitment, { personId: ids.person, leaderId: ids.worker, gatheringType: "sunday_service", gatheringDate: "2026-09-06", response: "yes" });
    await as("owner").mutation(api.crm.resolveCommitment, { commitmentId: yes!._id, resolution: "no_show" });
    const missed = await t.run(ctx => ctx.db.get(yes!._id));
    const fixed = await as("owner").mutation(api.corrections.correctCommitment, commitmentArgs(missed, { enteredInError: true }));
    expect(fixed?.entered_in_error).toBe(true);
    const dashboard = await as("owner").query(api.crm.getDashboard, {});
    expect(dashboard.sunday_missed_history).toHaveLength(0);
  });

  it("keeps a recorded visit when an administrator corrects the promise", async () => {
    const { t, ids, as } = await fixture();
    const yes = await as("owner").mutation(api.crm.recordCommitment, { personId: ids.person, leaderId: ids.worker, gatheringType: "sunday_service", gatheringDate: "2026-09-06", response: "yes" });
    const service = await as("owner").mutation(api.services.record, { service_date: "2026-09-06", service_type: "sunday_service", total_attendance: 1, guests_count: 1, salvation_decisions: 0, tithers_count: 0, attendanceData: [{ person_id: ids.person, first_timer: true, made_salvation_decision: false, gave_tithe: false }] });
    const attended = await t.run(ctx => ctx.db.get(yes!._id));
    await expect(as("worker").mutation(api.corrections.correctCommitment, commitmentArgs(attended, { response: "no" }))).rejects.toThrow(/FORBIDDEN/);
    const corrected = await as("owner").mutation(api.corrections.correctCommitment, commitmentArgs(attended, { response: "no" }));
    expect(corrected).toMatchObject({ response: "no", resolution: "attended" });
    expect((await t.run(ctx => ctx.db.query("attendance").collect())).some(row => row.person_id === ids.person && row.service_id === service?._id)).toBe(true);
  });

  it("moves a confirmation date without losing a later correction", async () => {
    const { ids, as } = await fixture();
    const yes = await as("owner").mutation(api.crm.recordCommitment, { personId: ids.person, leaderId: ids.worker, gatheringType: "sunday_service", gatheringDate: "2026-09-06", response: "yes" });
    const moved = await as("owner").mutation(api.corrections.correctCommitment, commitmentArgs(yes, { date: "2026-09-13" }));
    expect(moved?.gathering_date).toBe("2026-09-13");
    expect(moved?.correction_history).toHaveLength(1);
    const no = await as("owner").mutation(api.corrections.correctCommitment, commitmentArgs(moved, { response: "no" }));
    expect(no?.correction_history).toHaveLength(2);
    expect(no?.response).toBe("no");
  });

  it("edits a completed call, previews links, and reopens only its source task", async () => {
    const { t, ids, as } = await fixture();
    const result = await as("worker").mutation(api.crm.completeTask, { taskId: ids.task, method: "call", outcome: "no_response", nextActionDate: "2026-09-09", skipAutomaticNextTask: true });
    const followUp = result.follow_up!;
    const preview = await as("worker").query(api.corrections.previewFollowUp, { followUpId: followUp._id });
    expect(preview.source_task?._id).toBe(ids.task);
    expect(preview.next_task?._id).toBe(result.next_task?._id);
    const args = { followUpId: followUp._id, expectedVersion: `${followUp.created_at}:0`, reason: "Logged this call against the wrong person", date: followUp.follow_up_date, method: "call", outcome: "no_response", notes: "", enteredInError: true, cancelNextTask: true, reopenSourceTask: true, revertPersonStatus: false, restoreAffectedTasks: false };
    await expect(as("other").mutation(api.corrections.correctFollowUp, args)).rejects.toThrow();
    await as("worker").mutation(api.corrections.correctFollowUp, args);
    expect((await t.run(ctx => ctx.db.get(ids.task)))?.status).toBe("open");
    expect((await t.run(ctx => ctx.db.get(result.next_task!._id)))?.status).toBe("cancelled");
    expect((await t.run(ctx => ctx.db.get(ids.person)))?.total_follow_ups).toBe(0);
    await expect(as("worker").mutation(api.corrections.correctFollowUp, args)).rejects.toThrow(/changed/i);
  });

  it("restores only tasks linked to a mistaken closure and leaves later work intact", async () => {
    const { t, ids, as } = await fixture();
    const sibling = await t.run(ctx => ctx.db.insert("follow_up_tasks", { person_id: ids.person, assigned_leader_id: ids.worker, due_date: "2026-09-03", status: "open", task_type: "follow_up", priority: "normal", created_at: when, updated_at: when }));
    const result = await as("owner").mutation(api.crm.completeTask, { taskId: ids.task, method: "call", outcome: "not_interested", closeContact: true, closeReason: "not_interested", skipAutomaticNextTask: true });
    const later = await t.run(ctx => ctx.db.insert("follow_up_tasks", { person_id: ids.person, assigned_leader_id: ids.worker, due_date: "2026-09-10", status: "open", task_type: "follow_up", priority: "normal", created_at: when, updated_at: when }));
    const preview = await as("owner").query(api.corrections.previewFollowUp, { followUpId: result.follow_up!._id });
    expect(preview.affected_tasks.map(task => task!._id)).toEqual([sibling]);
    await as("owner").mutation(api.corrections.correctFollowUp, { followUpId: result.follow_up!._id, expectedVersion: `${result.follow_up!.created_at}:0`, reason: "Closed by mistake", date: result.follow_up!.follow_up_date, method: "call", outcome: "not_interested", enteredInError: true, cancelNextTask: false, reopenSourceTask: true, restoreAffectedTasks: true, revertPersonStatus: true });
    expect((await t.run(ctx => ctx.db.get(sibling)))?.status).toBe("open");
    expect((await t.run(ctx => ctx.db.get(later)))?.status).toBe("open");
    expect((await t.run(ctx => ctx.db.get(ids.person)))?.pipeline_stage).not.toBe("closed");
  });

  it("lets a scoped worker correct non-confidential details without exposing notes", async () => {
    const { t, ids, as } = await fixture();
    const result = await as("owner").mutation(api.crm.completeTask, { taskId: ids.task, method: "call", outcome: "no_response", notes: "Private context", skipAutomaticNextTask: true });
    const call = result.follow_up!;
    const preview = await as("limited").query(api.corrections.previewFollowUp, { followUpId: call._id });
    expect(preview.follow_up).not.toHaveProperty("notes");
    await as("limited").mutation(api.corrections.correctFollowUp, { followUpId: call._id, expectedVersion: `${call.created_at}:0`, reason: "Wrong contact method", date: call.follow_up_date, method: "sms", outcome: call.outcome, enteredInError: false, cancelNextTask: false, reopenSourceTask: false, restoreAffectedTasks: false, revertPersonStatus: false });
    expect((await t.run(ctx => ctx.db.get(call._id)))?.notes).toBe("Private context");
  });
});
