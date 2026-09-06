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
