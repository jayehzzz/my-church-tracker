import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const stamp = "2026-09-05T10:00:00.000Z";

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const owner = await ctx.db.insert("people", { first_name: "Owner", last_name: "Fixture", member_status: "leader", created_at: stamp, updated_at: stamp });
    const contact = await ctx.db.insert("people", {
      first_name: "Stale", last_name: "Guest", member_status: "guest", contact_date: "2026-01-01",
      last_follow_up_date: "2026-01-01", created_at: stamp, updated_at: stamp,
    });
    await ctx.db.insert("crm_users", { external_auth_id: "https://fixture.example|owner", person_id: owner, role: "owner", status: "active", can_view_confidential: true, created_at: stamp, updated_at: stamp });
    await ctx.db.insert("follow_up_assignments", { person_id: contact, assigned_leader_id: owner, status: "active", assigned_at: stamp, created_at: stamp, updated_at: stamp });
    return { owner, contact };
  });
  const owner = t.withIdentity({ tokenIdentifier: "https://fixture.example|owner", issuer: "https://fixture.example", subject: "owner" });
  return { t, ids, owner };
}

describe("operational CRM behaviour", () => {
  it("attributes period evidence to the recording worker while enforcing the current reader scope", async () => {
    const { t, ids, owner } = await fixture();
    const workers = await t.run(async (ctx) => {
      const oldWorker = await ctx.db.insert("people", { first_name: "Old", last_name: "Worker", member_status: "leader", created_at: stamp, updated_at: stamp });
      const newWorker = await ctx.db.insert("people", { first_name: "New", last_name: "Worker", member_status: "leader", created_at: stamp, updated_at: stamp });
      await ctx.db.insert("crm_users", { external_auth_id: "https://fixture.example|old", person_id: oldWorker, role: "leader", status: "active", can_view_confidential: false, created_at: stamp, updated_at: stamp });
      await ctx.db.insert("crm_users", { external_auth_id: "https://fixture.example|new", person_id: newWorker, role: "leader", status: "active", can_view_confidential: false, created_at: stamp, updated_at: stamp });
      const former = await ctx.db.query("follow_up_assignments").withIndex("by_person", q => q.eq("person_id", ids.contact)).unique();
      await ctx.db.patch(former!._id, { status: "ended" });
      await ctx.db.insert("follow_up_assignments", { person_id: ids.contact, assigned_leader_id: newWorker, status: "active", assigned_at: "2026-09-06T00:00:00.000Z", created_at: stamp, updated_at: stamp });
      await ctx.db.insert("follow_ups", { contact_id: ids.contact, leader_id: oldWorker, follow_up_date: "2026-09-03", method: "call", outcome: "positive_conversation", notes: "private note", created_at: stamp });
      await ctx.db.insert("gathering_commitments", { person_id: ids.contact, leader_id: oldWorker, gathering_type: "sunday_service", gathering_date: "2026-09-06", response: "yes", resolution: "attended", confirmation_note: "private note", created_at: "2026-09-03T10:00:00.000Z", updated_at: stamp });
      return { oldWorker, newWorker };
    });
    const args = { periodStart: "2026-09-01", periodEnd: "2026-09-05", serviceDate: "2026-09-06" };
    const dashboard = await owner.query(api.crm.getDashboard, args);
    const old = dashboard.team_stats.find((row) => row.leader_id === workers.oldWorker)!;
    const newer = dashboard.team_stats.find((row) => row.leader_id === workers.newWorker)!;
    expect(old.period_unique_contacts).toBe(1);
    expect(old.evidence.period_unique_contacts.map((row) => row.person_id)).toEqual([ids.contact]);
    expect(old.evidence.meaningful_conversations).toEqual([expect.objectContaining({ person_id: ids.contact, outcome: "positive_conversation" })]);
    expect(old.evidence.sunday_promises).toHaveLength(1);
    expect(old.evidence.promises_attended).toHaveLength(1);
    expect(newer.period_unique_contacts).toBe(0);
    expect(JSON.stringify(old.evidence)).not.toContain("private note");
    const formerSession = t.withIdentity({ tokenIdentifier: "https://fixture.example|old", issuer: "https://fixture.example", subject: "old" });
    const formerView = await formerSession.query(api.crm.getDashboard, args);
    expect(formerView.team_stats.flatMap((row) => row.evidence.period_unique_contacts)).toEqual([]);
  });
  it("keeps dashboard reads side-effect free and makes the daily reconciliation idempotent", async () => {
    const { t, owner } = await fixture();
    await owner.query(api.crm.getDashboard, { serviceDate: "2026-09-06" });
    expect(await t.run((ctx) => ctx.db.query("follow_up_tasks").collect())).toHaveLength(0);

    const first = await t.mutation((internal as any).crm.runQuarterlyReengagement, { asOfDate: "2026-09-05" });
    const second = await t.mutation((internal as any).crm.runQuarterlyReengagement, { asOfDate: "2026-09-05" });
    expect(first.created).toBe(1);
    expect(second.created).toBe(0);
    expect(await t.run((ctx) => ctx.db.query("follow_up_tasks").collect())).toHaveLength(1);
  });

  it("builds live alerts from saved work rather than sample notifications", async () => {
    const { t, ids, owner } = await fixture();
    await t.run((ctx) => ctx.db.insert("follow_up_tasks", {
      person_id: ids.contact, assigned_leader_id: ids.owner, due_date: "2026-09-01", status: "open",
      task_type: "follow_up", priority: "high", created_at: stamp, updated_at: stamp,
    }));
    const alerts = await owner.query((api as any).notifications.getFeed, {});
    expect(alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "crm-overdue-work", href: "/pipeline" }),
    ]));
  });

  it("uses the live name search indexes and the caller's normal access scope", async () => {
    const { owner } = await fixture();
    const results = await owner.query((api as any).search.people, { query: "stal" });
    expect(results).toEqual([expect.objectContaining({ title: "Stale Guest", href: expect.stringMatching(/^\/people\//) })]);
  });

  it("loads a 100-contact indexed dashboard fixture without a maintenance write", async () => {
    const { t, owner, ids } = await fixture();
    await t.run(async (ctx) => {
      for (let index = 0; index < 99; index += 1) {
        const person = await ctx.db.insert("people", {
          first_name: `Guest${index}`, last_name: "Load", member_status: "guest", contact_date: "2026-09-01",
          created_at: stamp, updated_at: stamp,
        });
        await ctx.db.insert("follow_up_assignments", { person_id: person, assigned_leader_id: ids.owner, status: "active", assigned_at: stamp, created_at: stamp, updated_at: stamp });
      }
    });
    const started = performance.now();
    const dashboard = await owner.query(api.crm.getDashboard, { serviceDate: "2026-09-06" });
    const elapsed = performance.now() - started;
    expect(dashboard.contacts).toHaveLength(100);
    expect(elapsed).toBeLessThan(1_500);
    expect(await t.run((ctx) => ctx.db.query("follow_up_tasks").collect())).toHaveLength(0);
  });
});
