import { ConvexError } from "convex/values";
import type { DataModel, Doc } from "../_generated/dataModel";
import { mutation as rawMutation, query as rawQuery, type QueryCtx, type MutationCtx } from "../_generated/server";
import type { QueryBuilder, MutationBuilder } from "convex/server";
import { wrapDatabaseReader, wrapDatabaseWriter, type Rules } from "convex-helpers/server/rowLevelSecurity";

export const isAdmin = (user: Doc<"crm_users">) => user.role === "owner" || user.role === "admin";
const attendanceContexts = new WeakSet<object>();
export const managesAttendance = (ctx: object) => attendanceContexts.has(ctx);
export function forbidden(): never { throw new ConvexError("FORBIDDEN"); }

export async function requireUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("UNAUTHENTICATED");
  // The verified issuer + subject is the key. Email and church leadership fields
  // are neither login credentials nor authority to grant access.
  const user = await ctx.db.query("crm_users")
    .withIndex("by_external_auth_id", q => q.eq("external_auth_id", identity.tokenIdentifier)).unique();
  if (!user || user.status !== "active") throw new ConvexError("ACCOUNT_NOT_APPROVED");
  return user;
}

const confidentialKeys = new Set([
  "notes", "reason", "pause_reason", "description", "nextReason", "closeReason",
]);
function hasConfidentialInput(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) =>
    (confidentialKeys.has(key) && child !== undefined)
    || (key === "clear_fields" && Array.isArray(child) && child.some(field => confidentialKeys.has(field)))
    || hasConfidentialInput(child));
}
export function redactConfidential(value: any): any {
  if (Array.isArray(value)) return value.map(redactConfidential);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !confidentialKeys.has(key))
    .map(([key, child]) => [key, redactConfidential(child)]));
}

// Unlisted mutations require an administrator. Leaders cannot assign their own
// scope, delete people, run global reconciliation, or change account permissions.
const leaderMutations = new Set([
  "people:update", "evangelism:update", "evangelism:markAsConverted",
  "crm:createTask", "crm:completeTask", "crm:moveToLater", "crm:recordCommitment",
  "crm:resolveCommitment", "crm:setAttendancePlan",
  "follow_ups:create", "follow_ups:resolvePromise", "follow_ups:bulkResolvePromises",
  "visitations:create", "visitations:update",
]);

async function securedContext(ctx: QueryCtx | MutationCtx, user: Doc<"crm_users">, write: boolean) {
  const admin = isAdmin(user);
  const assignments = user.person_id && !admin ? await ctx.db.query("follow_up_assignments")
    .withIndex("by_leader_status", q => q.eq("assigned_leader_id", user.person_id!).eq("status", "active")).collect() : [];
  const assigned = new Set<string>(assignments.map(a => a.person_id));
  const canPerson = (id: string) => admin || assigned.has(id) || id === user.person_id;
  const canRecord = (doc: any) => admin || Boolean(doc.person_id && assigned.has(doc.person_id));
  const ownAction = (doc: any) => admin || (!doc.assigned_leader_id || doc.assigned_leader_id === user.person_id);
  const linked = { read: async (_: unknown, doc: any) => canRecord(doc),
    modify: async (_: unknown, doc: any) => canRecord(doc) && ownAction(doc),
    insert: async (_: unknown, doc: any) => canRecord(doc) && ownAction(doc) };
  const adminOnly = { read: async () => admin, modify: async () => admin, insert: async () => admin };
  const rules: Rules<unknown, DataModel> = {
    people: {
      read: async (_, doc) => canPerson(doc._id),
      modify: async (_, doc) => admin || assigned.has(doc._id),
      insert: async () => admin,
    },
    follow_up_assignments: { ...adminOnly, read: linked.read },
    follow_up_tasks: linked, gathering_commitments: linked, attendance_plans: linked,
    attendance: { ...linked, modify: adminOnly.modify, insert: adminOnly.insert },
    meeting_attendance: { ...linked, modify: adminOnly.modify, insert: adminOnly.insert },
    follow_ups: {
      read: async (_, doc) => (admin || assigned.has(doc.contact_id)) && (!doc.source_visitation_id || !!user.can_view_confidential),
      modify: async (_, doc) => (admin || assigned.has(doc.contact_id)) && (!doc.source_visitation_id || !!user.can_view_confidential),
      insert: async (_, doc) => admin || (assigned.has(doc.contact_id) && doc.leader_id === user.person_id),
    },
    // Care purpose/outcome can itself reveal confidential pastoral information.
    visitations: {
      read: async (_, doc) => Boolean(user.can_view_confidential) && canRecord(doc),
      modify: async (_, doc) => Boolean(user.can_view_confidential) && canRecord(doc),
      insert: async (_, doc) => Boolean(user.can_view_confidential) && canRecord(doc),
    },
    services: adminOnly, meetings: adminOnly, meeting_programs: adminOnly,
    meeting_program_leaders: adminOnly, meeting_program_members: adminOnly,
    activities: adminOnly, service_photos: adminOnly, record_recovery: adminOnly,
    // Accounts and security events are accessible only through dedicated APIs.
  };
  const config = { defaultPolicy: "deny" as const };
  if (!write) return { ...ctx, db: wrapDatabaseReader({}, ctx.db, rules, config) };
  const rawDb = (ctx as MutationCtx).db;
  const guarded = wrapDatabaseWriter({}, rawDb, rules, config);
  // RLS checks the old row on patch. Also check the resulting relationships,
  // otherwise a leader could move a permitted row to an unassigned person.
  const db = new Proxy(guarded, {
    get(target, prop) {
      if (!["insert", "patch", "replace", "delete"].includes(String(prop))) {
        const value = Reflect.get(target, prop);
        return typeof value === "function" ? value.bind(target) : value;
      }
      return async (...args: any[]) => {
        const operation = String(prop);
        const old: any = operation === "insert" ? null : await rawDb.get(args[0]);
        const payload = operation === "delete" ? undefined : { ...args[1] };
        if (payload) {
          // Legacy person-based fields remain for compatibility; the audit user
          // below is the authoritative actor even if no person is linked.
          for (const key of ["created_by_id", "assigned_by_id", "completed_by_id"]) {
            if (key in payload) payload[key] = user.person_id;
          }
          if (!admin) {
            const next = { ...old, ...payload };
            if (next.person_id && !assigned.has(next.person_id)) forbidden();
            if (next.contact_id && !assigned.has(next.contact_id)) forbidden();
            if (next.assigned_leader_id && next.assigned_leader_id !== user.person_id) forbidden();
            for (const key of ["leader_id", "visited_by_id"]) {
              if (key in payload && payload[key] !== user.person_id) forbidden();
            }
            for (const key of ["role", "church_role", "leader_id", "invited_by_id"]) {
              if (old?.first_name !== undefined && key in payload && payload[key] !== old[key]) forbidden();
            }
          }
          args[1] = payload;
        }
        const result = await (target as any)[operation](...args);
        await rawDb.insert("security_audit", {
          actor_user_id: user._id,
          operation,
          record_id: String(operation === "insert" ? result : args[0]),
          created_at: new Date().toISOString(),
        });
        return result;
      };
    },
  });
  return { ...ctx, db };
}

function authenticateBuilder(builder: any, name: string, write: boolean) {
  return (definition: any) => builder({ ...definition, handler: async (ctx: any, input: any) => {
    const user = await requireUser(ctx);
    if (user.role === "viewer") forbidden(); // Summary-only API is separate.
    if (write && !isAdmin(user) && !leaderMutations.has(name)) forbidden();
    if (write && !user.can_view_confidential && hasConfidentialInput(input)) forbidden();
    if (name.startsWith("visitations:") && !user.can_view_confidential) forbidden();
    if (["people:getMergePreview", "people:mergeReviewed", "people:remove"].includes(name)) {
      if (!isAdmin(user) || !user.can_view_confidential) forbidden();
      for (const id of [input.id, input.sourceId, input.targetId].filter(Boolean)) {
        const accounts = await ctx.db.query("crm_users").withIndex("by_person", (q: any) => q.eq("person_id", id)).collect();
        if (accounts.length) throw new ConvexError("UNLINK_ACCOUNT_BEFORE_DELETION_OR_MERGE");
      }
    }
    const args = { ...input };
    if (write) {
      for (const key of ["assignedById", "createdById", "completedById", "reactivatedById"]) {
        if (key in definition.args) args[key] = user.person_id;
      }
      if (name === "crm:completeTask" || name === "follow_ups:create" || name === "visitations:create") {
        if (!user.person_id) throw new ConvexError("LINKED_PERSON_REQUIRED");
        if (name === "crm:completeTask") args.leaderId = user.person_id;
        if (name === "follow_ups:create") args.leader_id = user.person_id;
        if (name === "visitations:create") {
          args.visited_by_id = user.person_id;
          delete args.visited_by_name;
        }
      }
    }
    const guardedContext = await securedContext(ctx, user, write);
    if (isAdmin(user)) attendanceContexts.add(guardedContext);
    // A leader may record expectations, but cannot create a contradictory late
    // expectation after actual attendance. Check only an already scoped person.
    if (!isAdmin(user) && write && ["crm:recordCommitment", "crm:completeTask"].includes(name)) {
      const task = name === "crm:completeTask" ? await guardedContext.db.get(args.taskId) : null;
      const personId = args.personId ?? (task as any)?.person_id;
      const day = args.commitment?.gatheringDate ?? args.gatheringDate;
      if (personId && day && await guardedContext.db.get(personId)) {
        const rows = await ctx.db.query("attendance").withIndex("by_person", (q: any) => q.eq("person_id", personId)).collect();
        const meetings = await ctx.db.query("meeting_attendance").withIndex("by_person", (q: any) => q.eq("person_id", personId)).collect();
        for (const row of rows) if ((await ctx.db.get(row.service_id))?.service_date === day) throw new ConvexError("Actual attendance already exists for this date. An administrator must reconcile this commitment.");
        for (const row of meetings) if ((row.status ? row.status === "present" : row.attended !== false) && (await ctx.db.get(row.meeting_id))?.meeting_date === day) throw new ConvexError("Actual attendance already exists for this date. An administrator must reconcile this commitment.");
      }
    }
    const result = await definition.handler(guardedContext, args);
    return user.can_view_confidential ? result : redactConfidential(result);
  }});
}

// Preserve Convex's argument inference while routing every handler through the
// same authentication, row scope, confidentiality and audit boundary.
export const queryFor = (name: string): QueryBuilder<DataModel, "public"> => authenticateBuilder(rawQuery, name, false);
export const mutationFor = (name: string): MutationBuilder<DataModel, "public"> => authenticateBuilder(rawMutation, name, true);
