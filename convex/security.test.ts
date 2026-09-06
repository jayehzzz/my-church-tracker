import { convexTest } from "convex-test";
import { describe, expect, it, afterEach, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const domainModules = import.meta.glob(["./*.ts", "!./*.test.ts", "!./schema.ts", "!./auth.config.ts"]);
const now = "2026-09-05T09:00:00.000Z";

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const person = (first_name: string, member_status = "guest") => ctx.db.insert("people", {
      first_name, last_name: "Fixture", member_status, notes: "Confidential pastoral note", created_at: now, updated_at: now,
    });
    const ownerPerson = await person("Owner", "leader");
    const leaderPerson = await person("Leader", "leader");
    const otherLeader = await person("Other leader", "leader");
    const assigned = await person("Assigned");
    const outside = await person("Outside");
    const users: Record<string, any> = {};
    for (const [name, role, personId, confidential] of [
      ["owner", "owner", ownerPerson, true], ["admin", "admin", ownerPerson, false],
      ["leader", "leader", leaderPerson, false], ["pastoral", "leader", leaderPerson, true],
      ["viewer", "viewer", undefined, false],
    ] as const) {
      users[name] = await ctx.db.insert("crm_users", {
        external_auth_id: `https://identity.example/|${name}`, role, person_id: personId,
        can_view_confidential: confidential, status: "active", created_at: now, updated_at: now,
      });
    }
    const assignment = await ctx.db.insert("follow_up_assignments", { person_id: assigned, assigned_leader_id: leaderPerson,
      status: "active", assigned_at: now, created_at: now, updated_at: now });
    const task = await ctx.db.insert("follow_up_tasks", { person_id: assigned, assigned_leader_id: leaderPerson,
      due_date: "2026-09-06", status: "open", task_type: "follow_up", priority: "normal", notes: "Private task note", created_at: now, updated_at: now });
    const outsideTask = await ctx.db.insert("follow_up_tasks", { person_id: outside, assigned_leader_id: otherLeader,
      due_date: "2026-09-06", status: "open", task_type: "follow_up", priority: "normal", created_at: now, updated_at: now });
    const visit = await ctx.db.insert("visitations", { person_id: assigned, visited_by_id: leaderPerson,
      visit_date: "2026-09-05", outcome: "concerns_shared", follow_up_required: false, notes: "Private care note", created_at: now });
    return { ownerPerson, leaderPerson, otherLeader, assigned, outside, users, assignment, task, outsideTask, visit };
  });
  const as = (name: string) => t.withIdentity({ issuer: "https://identity.example/", subject: name, tokenIdentifier: `https://identity.example/|${name}` });
  return { t, ids, as };
}

afterEach(() => vi.unstubAllEnvs());

describe("public backend boundaries", () => {
  it("every public handler rejects unauthenticated access before reading arguments or data", async () => {
    const t = convexTest(schema, modules);
    let checked = 0;
    for (const load of Object.values(domainModules)) {
      const module = await load() as Record<string, any>;
      for (const fn of Object.values(module)) {
        if (!fn?.isPublic || (!fn.isQuery && !fn.isMutation)) continue;
        await expect(t.run(ctx => fn._handler(ctx, {}))).rejects.toThrow(/UNAUTHENTICATED/);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(90);
  });

  it("requires exact verified issuer/subject and an active approved account", async () => {
    const { as, t, ids } = await fixture();
    await expect(as("unapproved").query(api.people.getAll, {})).rejects.toThrow(/ACCOUNT_NOT_APPROVED/);
    await expect(t.withIdentity({ issuer: "https://attacker.example/", subject: "owner" }).query(api.people.getAll, {})).rejects.toThrow(/ACCOUNT_NOT_APPROVED/);
    await t.run(ctx => ctx.db.patch(ids.users.owner, { status: "inactive" }));
    await expect(as("owner").query(api.people.getAll, {})).rejects.toThrow(/ACCOUNT_NOT_APPROVED/);
  });

  it("viewers see summary counts and cannot read personal records or write", async () => {
    const { as } = await fixture();
    expect(await as("viewer").query(api.access.summary, {})).toEqual({ members: 0, leaders: 3, guests: 2 });
    await expect(as("viewer").query(api.people.getAll, {})).rejects.toThrow(/FORBIDDEN/);
    await expect(as("viewer").mutation(api.people.create, { first_name: "No", last_name: "Access", member_status: "guest" })).rejects.toThrow(/FORBIDDEN/);
    await expect(as("viewer").query(api.access.listAccounts, {})).rejects.toThrow(/FORBIDDEN/);
    await expect(as("viewer").query(api.access.authorizeExport, {})).rejects.toThrow(/FORBIDDEN/);
    await expect(as("leader").query(api.access.authorizeExport, {})).rejects.toThrow(/FORBIDDEN/);
    expect(await as("admin").query(api.access.authorizeExport, {})).toBe(true);
  });

  it("rejects service-photo upload allocation for roles without gathering authority", async () => {
    const { as } = await fixture();
    await expect(as("viewer").mutation(api.servicePhotos.generateUploadUrl, {})).rejects.toThrow(/FORBIDDEN/);
    await expect(as("leader").mutation(api.servicePhotos.generateUploadUrl, {})).rejects.toThrow(/FORBIDDEN/);
  });

  it("scopes reads and mutations to explicit active assignments, not dropdown roles", async () => {
    const { as, ids, t } = await fixture();
    expect((await as("leader").query(api.people.getAll, {})).map(p => p._id).sort()).toEqual([ids.assigned, ids.leaderPerson].sort());
    expect(await as("leader").query(api.people.getById, { id: ids.outside })).toBeNull();
    await as("leader").mutation(api.people.update, { id: ids.assigned, first_name: "Updated" });
    await expect(as("leader").mutation(api.people.update, { id: ids.outside, first_name: "Forbidden" })).rejects.toThrow();
    await expect(as("leader").mutation(api.crm.completeTask, { taskId: ids.outsideTask, outcome: "no_response" })).rejects.toThrow();
    await expect(as("leader").mutation(api.crm.assignContact, { personId: ids.outside, assignedLeaderId: ids.leaderPerson })).rejects.toThrow(/FORBIDDEN/);
    await t.run(ctx => ctx.db.patch(ids.assignment, { status: "ended" }));
    expect(await as("leader").query(api.people.getById, { id: ids.assigned })).toBeNull();
  });

  it("protects confidential fields and care records even from an admin without a grant", async () => {
    const { as, ids } = await fixture();
    for (const name of ["admin", "leader"]) {
      expect(await as(name).query(api.people.getById, { id: ids.assigned })).not.toHaveProperty("notes");
      await expect(as(name).query(api.visitations.getById, { id: ids.visit })).rejects.toThrow(/FORBIDDEN/);
      await expect(as(name).mutation(api.people.update, { id: ids.assigned, notes: "overwrite" })).rejects.toThrow(/FORBIDDEN/);
      await expect(as(name).mutation(api.people.update, { id: ids.assigned, clear_fields: ["notes"] })).rejects.toThrow(/FORBIDDEN/);
    }
    expect(await as("pastoral").query(api.visitations.getById, { id: ids.visit })).toHaveProperty("notes", "Private care note");
    expect(await as("owner").query(api.people.getById, { id: ids.assigned })).toHaveProperty("notes", "Confidential pastoral note");
  });

  it("records the session actor and cannot forge completion/creation attribution", async () => {
    const { as, ids, t } = await fixture();
    await as("pastoral").mutation(api.crm.completeTask, {
      taskId: ids.task, completedById: ids.otherLeader, leaderId: ids.otherLeader,
      outcome: "no_response", skipAutomaticNextTask: true,
    });
    const task = await t.run(ctx => ctx.db.get(ids.task));
    expect(task?.completed_by_id).toBe(ids.leaderPerson);
    const audits = await t.run(ctx => ctx.db.query("security_audit").collect());
    expect(audits.length).toBeGreaterThan(0);
    expect(audits.every(a => a.actor_user_id === ids.users.pastoral)).toBe(true);
    expect(JSON.stringify(audits)).not.toContain("Private");
    const created = await as("pastoral").mutation(api.crm.createTask, { personId: ids.assigned, assignedLeaderId: ids.leaderPerson,
      createdById: ids.otherLeader, dueDate: "2026-09-08", taskType: "follow_up" });
    expect(created?.created_by_id).toBe(ids.leaderPerson);
  });

  it("cannot reparent accessible care rows or delegate tasks outside the assigned scope", async () => {
    const { as, ids, t } = await fixture();
    await expect(as("pastoral").mutation(api.visitations.update, { id: ids.visit, person_id: ids.outside })).rejects.toThrow();
    await expect(as("pastoral").mutation(api.crm.createTask, { personId: ids.assigned, assignedLeaderId: ids.otherLeader,
      dueDate: "2026-09-08", taskType: "follow_up" })).rejects.toThrow();
    expect((await t.run(ctx => ctx.db.get(ids.visit)))?.person_id).toBe(ids.assigned);
  });

  it("only owners approve provider-verified requests and they cannot remove the last active owner", async () => {
    const { as, ids } = await fixture();
    await expect(as("admin").query(api.access.listAccessRequests, {})).rejects.toThrow(/FORBIDDEN/);
    await expect(as("admin").mutation(api.access.setAccount, {
      tokenIdentifier: "https://identity.example/|new", role: "viewer", status: "active", canViewConfidential: false,
    })).rejects.toThrow(/FORBIDDEN/);
    expect(await as("new").mutation(api.access.requestAccess, {})).toEqual({ state: "pending" });
    // Repeated clicks do not create or change a second approval request.
    expect(await as("new").mutation(api.access.requestAccess, {})).toEqual({ state: "pending" });
    const requests = await as("owner").query(api.access.listAccessRequests, {});
    expect(requests).toHaveLength(1);
    expect(requests[0]).not.toHaveProperty("external_auth_id");
    await expect(as("owner").mutation(api.access.approveAccessRequest, {
      requestId: requests[0].id, role: "leader", status: "active", canViewConfidential: false,
    })).rejects.toThrow(/LINKED_PERSON_REQUIRED/);
    await as("owner").mutation(api.access.approveAccessRequest, {
      requestId: requests[0].id, role: "viewer", status: "active", canViewConfidential: false,
    });
    expect(await as("new").query(api.access.me, {})).toHaveProperty("role", "viewer");
    const managed = await as("owner").query(api.access.listManagedAccounts, {});
    const newAccount = managed.find(account => account.id !== ids.users.viewer && account.role === "viewer");
    expect(newAccount).toBeTruthy();
    expect(newAccount).not.toHaveProperty("external_auth_id");
    await expect(as("owner").mutation(api.access.updateAccount, {
      accountId: newAccount!.id, role: "viewer", status: "active", canViewConfidential: true,
    })).rejects.toThrow(/VIEWER_CANNOT_READ_NOTES/);
    await as("owner").mutation(api.access.updateAccount, {
      accountId: newAccount!.id, role: "viewer", status: "inactive", canViewConfidential: false,
    });
    await expect(as("new").query(api.access.me, {})).rejects.toThrow(/ACCOUNT_NOT_APPROVED/);
    await expect(as("owner").mutation(api.access.updateAccount, {
      accountId: ids.users.owner, role: "owner", status: "inactive", canViewConfidential: true,
    })).rejects.toThrow(/LAST_OWNER_REQUIRED/);
    await expect(as("owner").mutation(api.access.setAccount, {
      tokenIdentifier: "https://identity.example/|not-requested", role: "viewer", status: "active", canViewConfidential: false,
    })).rejects.toThrow(/ACCESS_REQUEST_REQUIRED/);
  });

  it("keeps account links out of ordinary merge/delete operations", async () => {
    const { as, ids } = await fixture();
    await expect(as("owner").mutation(api.people.remove, { id: ids.ownerPerson })).rejects.toThrow(/UNLINK_ACCOUNT/);
    await expect(as("owner").query(api.people.getMergePreview, { sourceId: ids.leaderPerson, targetId: ids.otherLeader })).rejects.toThrow(/UNLINK_ACCOUNT/);
  });
});

describe("maintenance safeguards", () => {
  it("registers seeds, migration and reset functions as internal only", async () => {
    for (const [path, names] of Object.entries({
      "./seed.ts": ["seed"], "./seed_simple.ts": ["seed"],
      "./migrations.ts": ["removeBasontaWorkerRole", "seedEvangelismContacts"],
      "./meetings.ts": ["migrateLegacyMeetings"], "./maintenance.ts": ["resetDisposableData"],
      "./access.ts": ["provisionFirstOwner"],
    })) {
      const mod = await modules[path]() as Record<string, any>;
      for (const name of names) { expect(mod[name].isInternal).toBe(true); expect(mod[name].isPublic).not.toBe(true); }
    }
  });

  it("fails closed without explicit flags and exact deployment confirmation", async () => {
    const { t } = await fixture();
    vi.stubEnv("CHURCH_MAINTENANCE_ENABLED", "false");
    await expect(t.mutation(internal.maintenance.resetDisposableData, { confirmation: "anything" })).rejects.toThrow(/MAINTENANCE_DISABLED/);
    vi.stubEnv("CHURCH_MAINTENANCE_ENABLED", "true");
    vi.stubEnv("CONVEX_CLOUD_URL", "https://innocent-name.convex.cloud");
    vi.stubEnv("CHURCH_DATA_DISPOSABLE", "true");
    vi.stubEnv("CHURCH_ENV", "production");
    await expect(t.mutation(internal.maintenance.resetDisposableData, { confirmation: "DISPOSABLE https://innocent-name.convex.cloud" })).rejects.toThrow(/DISPOSABLE_ENVIRONMENT_REQUIRED/);
    vi.stubEnv("CHURCH_ENV", "test");
    await expect(t.mutation(internal.seed_simple.seed, { confirmation: "wrong" })).rejects.toThrow(/DISPOSABLE_ENVIRONMENT_REQUIRED/);
  });

  it("resets the complete relational schema, including access, recovery and newer tables", async () => {
    const { t, ids } = await fixture();
    await t.run(ctx => ctx.db.insert("security_audit", { actor_user_id: ids.users.owner, operation: "fixture", record_id: ids.assigned, created_at: now }));
    vi.stubEnv("CHURCH_MAINTENANCE_ENABLED", "true");
    vi.stubEnv("CHURCH_DATA_DISPOSABLE", "true");
    vi.stubEnv("CHURCH_ENV", "test");
    vi.stubEnv("CONVEX_CLOUD_URL", "https://disposable.example");
    const result = await t.mutation(internal.maintenance.resetDisposableData, { confirmation: "DISPOSABLE https://disposable.example" });
    expect(result.tables.sort()).toEqual(Object.keys(schema.tables).sort());
    expect(result.deleted).toBeGreaterThan(10);
    await t.run(async ctx => { for (const table of result.tables) expect(await ctx.db.query(table).collect()).toEqual([]); });
  });
});
