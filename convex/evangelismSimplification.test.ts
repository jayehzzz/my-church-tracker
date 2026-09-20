import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const stamp = "2026-09-01T10:00:00.000Z";

async function fixture() {
    const t = convexTest(schema, modules);
    const leader = await t.run(async ctx => {
        const id = await ctx.db.insert("people", {
            first_name: "Owner", last_name: "Fixture", member_status: "leader",
            created_at: stamp, updated_at: stamp,
        });
        await ctx.db.insert("crm_users", {
            external_auth_id: "https://fixture.example|owner", person_id: id,
            role: "owner", status: "active", can_view_confidential: true,
            created_at: stamp, updated_at: stamp,
        });
        return id;
    });
    const owner = t.withIdentity({ tokenIdentifier: "https://fixture.example|owner", issuer: "https://fixture.example", subject: "owner" });
    const create = async (extra = {}) => (await owner.mutation(api.evangelism.create, {
        first_name: "Contact", contact_date: "2026-09-01", ...extra,
    }))!;
    const tasks = (id: Id<"people">) => t.run(ctx => ctx.db.query("follow_up_tasks")
        .withIndex("by_person", q => q.eq("person_id", id)).collect());
    const task = (id: Id<"people">, taskType: Doc<"follow_up_tasks">["task_type"] = "follow_up") => owner.mutation(api.crm.createTask, {
        personId: id, assignedLeaderId: leader, dueDate: "2026-09-02", taskType,
    });
    return { t, owner, leader, create, tasks, task };
}

describe("category-free evangelism and durable contact restrictions", () => {
    it("defaults to not assessed and creates exactly one assigned first-contact task", async () => {
        const { t, owner, leader, create, tasks } = await fixture();
        const contact = await create({ assigned_leader_id: leader, follow_up_date: "2026-09-04" });
        expect(contact).toMatchObject({ response: "not_assessed", member_status: "contact", pipeline_stage: "new" });
        expect(await tasks(contact._id)).toEqual([expect.objectContaining({
            assigned_leader_id: leader, status: "open", task_type: "first_contact", due_date: "2026-09-04",
        })]);
        await owner.mutation(api.crm.assignContact, { personId: contact._id, assignedLeaderId: leader });
        await owner.mutation(api.evangelism.update, { id: contact._id, contact_date: "2026-09-03", notes: "Met again" });
        expect(await tasks(contact._id)).toHaveLength(1);
        expect(await t.run(ctx => ctx.db.query("follow_up_assignments").collect())).toHaveLength(1);
        expect((await owner.query(api.evangelism.getRequiringFollowUp, {})).map(p => p._id)).toContain(contact._id);
    });

    it.each(["do_not_contact", "has_church", "wrong_number"])("preserves historical %s on ordinary edits without reintroduction", async category => {
        const { t, owner, leader, create, tasks } = await fixture();
        const contact = await create({ response: category, assigned_leader_id: leader });
        await t.run(ctx => ctx.db.patch(contact._id, { pipeline_stage: "closed", is_paused: true, pause_reason: "Historical restriction" }));
        await owner.mutation(api.evangelism.update, { id: contact._id, contact_date: "2026-09-19", first_name: "Corrected", notes: "Historical correction" });
        expect(await t.run(ctx => ctx.db.get(contact._id))).toMatchObject({
            first_name: "Corrected", contact_category: category, pipeline_stage: "closed", is_paused: true,
        });
        expect(await tasks(contact._id)).toHaveLength(0);
        expect((await owner.query(api.evangelism.getRequiringFollowUp, {})).map(p => p._id)).not.toContain(contact._id);
    });

    it("discovers unassessed and legacy actionable prospects without rewriting categories", async () => {
        const { t, owner, create } = await fixture();
        const eligible = [];
        for (const category of [undefined, "outreach", "not_assessed", "responsive", "non_responsive"]) {
            const contact = await create();
            await t.run(ctx => ctx.db.patch(contact._id, { contact_category: category }));
            await owner.mutation(api.evangelism.update, { id: contact._id, notes: "Correction only" });
            expect((await t.run(ctx => ctx.db.get(contact._id)))?.contact_category).toBe(category);
            eligible.push(contact._id);
        }
        for (const patch of [
            { contact_category: "has_church" }, { contact_category: "do_not_contact" },
            { contact_category: "wrong_number" }, { is_paused: true }, { pipeline_stage: "closed" },
            { member_status: "member" }, { member_status: "archived" },
            { first_visit_date: new Date().toISOString().slice(0, 10) },
        ]) {
            const contact = await create();
            await t.run(ctx => ctx.db.patch(contact._id, patch));
        }
        expect((await owner.query(api.evangelism.getRequiringFollowUp, {})).map(p => p._id).sort()).toEqual(eligible.sort());
    });

    it.each(["contact", "member"])("cancels pending outreach for a %s, preserves care/history, and blocks recreation and assignment", async memberStatus => {
        const { t, owner, leader, create, tasks, task } = await fixture();
        const contact = await create({ assigned_leader_id: leader });
        if (memberStatus === "member") await owner.mutation(api.people.update, { id: contact._id, member_status: "member", membership_date: "2026-09-02" });
        const history = (await tasks(contact._id))[0];
        await owner.mutation(api.crm.completeTask, { taskId: history._id, outcome: "positive_conversation", skipAutomaticNextTask: true });
        const pending = [];
        for (const type of ["first_contact", "follow_up", "sunday_confirmation", "reengagement", "other"] as const) pending.push((await task(contact._id, type))!._id);
        const care = (await task(contact._id, "member_care"))!;
        const visit = (await task(contact._id, "visitation"))!;
        const careRecord = await owner.mutation(api.visitations.create, {
            person_id: contact._id, visited_by_id: leader, visit_date: "2026-09-01",
            outcome: "prayer_request_received", follow_up_required: true, follow_up_date: "2026-09-03",
        });
        // Historical care-linked tasks may have a generic task type.
        await t.run(ctx => ctx.db.patch(careRecord.next_task_id!, { task_type: "follow_up" }));
        await owner.mutation(api.evangelism.update, { id: contact._id, response: "do_not_contact" });
        for (const id of pending) expect(await t.run(ctx => ctx.db.get(id))).toMatchObject({ status: "cancelled", outcome: "do_not_contact" });
        expect(await t.run(ctx => ctx.db.get(history._id))).toMatchObject({ status: "completed", outcome: "positive_conversation" });
        for (const id of [care._id, visit._id, careRecord.next_task_id!]) expect((await t.run(ctx => ctx.db.get(id)))?.status).toBe("open");
        await owner.mutation(api.people.update, { id: contact._id, member_status: "member", membership_date: "2026-09-02" });
        for (const type of ["first_contact", "follow_up", "reengagement", "sunday_confirmation"] as const) await expect(task(contact._id, type)).rejects.toThrow(/requested no contact/);
        for (const createFirstContactTask of [false, true]) await expect(owner.mutation(api.crm.assignContact, { personId: contact._id, assignedLeaderId: leader, createFirstContactTask })).rejects.toThrow(/requested no contact/);
        await expect(owner.mutation(api.crm.reactivateContact, { personId: contact._id, assignedLeaderId: leader })).rejects.toThrow(/requested no contact/);
        await owner.mutation(api.evangelism.update, { id: contact._id, contact_date: "2026-09-19", converted: false });
        expect(await t.run(ctx => ctx.db.get(contact._id))).toMatchObject({ contact_category: "do_not_contact", member_status: "member", membership_date: "2026-09-02" });
        expect((await tasks(contact._id)).filter(row => row.status === "open").map(row => row._id).sort()).toEqual([care._id, visit._id, careRecord.next_task_id!].sort());
        expect((await t.mutation(internal.crm.runQuarterlyReengagement, { asOfDate: "2027-01-01" })).created).toBe(0);
    });

    it.each(["positive_conversation", "wrong_number"])("persists a do-not-contact closure even with outcome %s", async outcome => {
        const { t, owner, leader, create, task, tasks } = await fixture();
        const contact = await create({ assigned_leader_id: leader });
        const initial = (await tasks(contact._id))[0];
        const pending = (await task(contact._id))!;
        const care = (await task(contact._id, "member_care"))!;
        await owner.mutation(api.crm.completeTask, { taskId: initial._id, outcome, closeContact: true, closeReason: "do_not_contact", moveToLater: true });
        expect(await t.run(ctx => ctx.db.get(contact._id))).toMatchObject({ contact_category: "do_not_contact", pipeline_stage: "closed", member_status: "contact" });
        expect((await t.run(ctx => ctx.db.get(pending._id)))?.status).toBe("cancelled");
        expect((await t.run(ctx => ctx.db.get(care._id)))?.status).toBe("open");
        await owner.mutation(api.evangelism.update, { id: contact._id, contact_date: "2026-09-19" });
        await expect(task(contact._id)).rejects.toThrow(/requested no contact/);
        expect((await t.run(ctx => ctx.db.get(contact._id)))?.pipeline_stage).toBe("closed");
        expect((await t.mutation(internal.crm.runQuarterlyReengagement, { asOfDate: "2027-01-01" })).created).toBe(0);
    });

    it("does not recreate outreach when a restricted contact misses or later attends a gathering", async () => {
        const { t, owner, leader, create, tasks } = await fixture();
        const contact = await create({ assigned_leader_id: leader });
        const commitment = await owner.mutation(api.crm.recordCommitment, {
            personId: contact._id, leaderId: leader, gatheringType: "sunday_service",
            gatheringDate: "2026-09-06", response: "yes",
        });
        await owner.mutation(api.evangelism.update, { id: contact._id, response: "do_not_contact" });
        await owner.mutation(api.services.record, {
            service_date: "2026-09-06", service_type: "sunday_service", total_attendance: 1,
            guests_count: 0, salvation_decisions: 0, tithers_count: 0, attendanceData: [],
        });
        expect((await t.run(ctx => ctx.db.get(commitment!._id)))?.resolution).toBe("no_show");
        await owner.mutation(api.services.record, {
            service_date: "2026-09-13", service_type: "sunday_service", total_attendance: 1,
            guests_count: 1, salvation_decisions: 0, tithers_count: 0,
            attendanceData: [{ person_id: contact._id, first_timer: true, made_salvation_decision: false, gave_tithe: false }],
        });
        expect(await t.run(ctx => ctx.db.get(contact._id))).toMatchObject({ member_status: "guest", contact_category: "do_not_contact" });
        expect((await tasks(contact._id)).filter(row => row.status === "open")).toHaveLength(0);
    });

    it("keeps has-church behavior separate from do-not-contact", async () => {
        const { t, owner, leader, create, task } = await fixture();
        const contact = await create({ assigned_leader_id: leader });
        const pending = (await task(contact._id))!;
        await owner.mutation(api.evangelism.update, { id: contact._id, response: "has_church" });
        expect((await t.run(ctx => ctx.db.get(pending._id)))?.status).toBe("open");
        expect(await task(contact._id)).toMatchObject({ status: "open" });
        expect(await task(contact._id, "member_care")).toMatchObject({ status: "open" });
        expect(await owner.query(api.evangelism.getRequiringFollowUp, {})).toHaveLength(0);
    });

    it("keeps membership explicit and preserves it through outreach edits", async () => {
        const { t, owner, create } = await fixture();
        const contact = await create({ converted: true, conversion_date: "2026-09-01", salvation_decision: true });
        expect(contact.member_status).toBe("contact");
        expect(contact.membership_date).toBeUndefined();
        await owner.mutation(api.people.update, { id: contact._id, member_status: "leader", membership_date: "2026-09-02" });
        await owner.mutation(api.evangelism.update, {
            id: contact._id, converted: false, conversion_date: "2026-09-19", contact_date: "2026-09-19", notes: "Historical outreach detail",
        });
        expect(await t.run(ctx => ctx.db.get(contact._id))).toMatchObject({ member_status: "leader", membership_date: "2026-09-02", outreach_salvation_decision: true });
        // Dedicated legacy membership endpoints remain callable.
        const legacy = await create();
        await owner.mutation(api.evangelism.markAsConverted, { id: legacy._id });
        expect((await t.run(ctx => ctx.db.get(legacy._id)))?.member_status).toBe("member");
    });
});
