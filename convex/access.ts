import { query, mutation, internalMutation, type MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireUser, forbidden, isAdmin, requireVerifiedPasswordEmail } from "./lib/security";
import { requireMaintenance } from "./lib/maintenance";

const role = v.union(v.literal("owner"), v.literal("admin"), v.literal("leader"), v.literal("viewer"));
const status = v.union(v.literal("active"), v.literal("inactive"));

type AccountInput = {
  role: "owner" | "admin" | "leader" | "viewer";
  status: "active" | "inactive";
  personId?: any;
  displayName?: string;
  canViewConfidential: boolean;
};

function validateAccount(input: AccountInput) {
  if (input.role === "viewer" && input.canViewConfidential) throw new ConvexError("VIEWER_CANNOT_READ_NOTES");
  if (input.role === "leader" && !input.personId) throw new ConvexError("LINKED_PERSON_REQUIRED");
}

async function saveAccount(ctx: MutationCtx, actor: any, externalAuthId: string, input: AccountInput, existing?: any, operation = "set_account") {
  validateAccount(input);
  if (!externalAuthId.includes("|")) throw new ConvexError("INVALID_IDENTITY");
  if (input.personId && !await ctx.db.get(input.personId)) throw new ConvexError("PERSON_NOT_FOUND");
  if (existing?.role === "owner" && existing.status === "active" && (input.role !== "owner" || input.status !== "active")) {
    const owners = (await ctx.db.query("crm_users").collect()).filter(u => u.role === "owner" && u.status === "active");
    if (owners.length <= 1) throw new ConvexError("LAST_OWNER_REQUIRED");
  }
  const now = new Date().toISOString();
  const values = {
    external_auth_id: externalAuthId, role: input.role, status: input.status,
    person_id: input.personId, display_name: input.displayName,
    can_view_confidential: input.canViewConfidential, updated_at: now,
  };
  const id = existing?._id ?? await ctx.db.insert("crm_users", { ...values, created_at: now });
  if (existing) await ctx.db.patch(id, values);
  await ctx.db.insert("security_audit", { actor_user_id: actor._id, operation, record_id: id, created_at: now });
  return id;
}

export const authorizeExport = query({
  args: {},
  handler: async (ctx) => {
    if (!isAdmin(await requireUser(ctx))) forbidden();
    return true;
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const identity = (await ctx.auth.getUserIdentity())!;
    return {
      id: user._id, role: user.role, personId: user.person_id,
      name: user.display_name || identity.name || "Church Tracker user",
      email: identity.email || user.email,
      canViewConfidential: user.can_view_confidential === true,
    };
  },
});

/** Only aggregate counts are exposed to viewers; no per-person identifiers. */
export const summary = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const people = await ctx.db.query("people").collect();
    return {
      members: people.filter(p => p.member_status === "member").length,
      leaders: people.filter(p => p.member_status === "leader").length,
      guests: people.filter(p => ["guest", "visitor"].includes(p.member_status)).length,
    };
  },
});

export const listAccounts = query({
  args: {},
  handler: async (ctx) => {
    if ((await requireUser(ctx)).role !== "owner") forbidden();
    return await ctx.db.query("crm_users").collect();
  },
});

/** Owner UI data deliberately excludes the provider issuer/subject. */
export const listManagedAccounts = query({
  args: {},
  handler: async (ctx) => {
    const actor = await requireUser(ctx);
    if (actor.role !== "owner") forbidden();
    const identity = (await ctx.auth.getUserIdentity())!;
    const accounts = await ctx.db.query("crm_users").collect();
    return await Promise.all(accounts.map(async account => {
      const externalAuthId = account.external_auth_id;
      const request = externalAuthId ? await ctx.db.query("access_requests")
        .withIndex("by_external_auth_id", q => q.eq("external_auth_id", externalAuthId)).unique() : null;
      const subject = externalAuthId?.slice(externalAuthId.indexOf("|") + 1) || "";
      const signInMethod = subject.startsWith("google-oauth2|") ? "Google"
        : subject.startsWith("auth0|") ? "Email and password" : "Other sign-in";
      return {
        id: account._id,
        displayName: account.display_name,
        email: account.email || request?.email || (account._id === actor._id ? identity.email : undefined),
        signInMethod,
        isCurrentAccount: account._id === actor._id,
        role: account.role,
        status: account.status,
        personId: account.person_id,
        canViewConfidential: account.can_view_confidential === true,
        createdAt: account.created_at,
        updatedAt: account.updated_at,
      };
    }));
  },
});

/** A signed-in provider identity can ask an owner for access, never grant it. */
export const requestAccess = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHENTICATED");
    requireVerifiedPasswordEmail(identity);
    const account = await ctx.db.query("crm_users")
      .withIndex("by_external_auth_id", q => q.eq("external_auth_id", identity.tokenIdentifier)).unique();
    if (account?.status === "active") return { state: "approved" as const };
    if (account) return { state: "inactive" as const };
    const now = new Date().toISOString();
    const existing = await ctx.db.query("access_requests")
      .withIndex("by_external_auth_id", q => q.eq("external_auth_id", identity.tokenIdentifier)).unique();
    if (existing) {
      if (existing.status === "pending") return { state: "pending" as const };
      throw new ConvexError("ACCOUNT_ALREADY_EXISTS");
    }
    await ctx.db.insert("access_requests", {
      external_auth_id: identity.tokenIdentifier,
      // These fields are recognition hints only; authentication always uses
      // tokenIdentifier from the verified token above.
      display_name: identity.name,
      email: identity.email,
      status: "pending", requested_at: now, updated_at: now,
    });
    return { state: "pending" as const };
  },
});

export const listAccessRequests = query({
  args: {},
  handler: async (ctx) => {
    if ((await requireUser(ctx)).role !== "owner") forbidden();
    const requests = await ctx.db.query("access_requests").withIndex("by_status", q => q.eq("status", "pending")).collect();
    return requests.sort((a, b) => a.requested_at.localeCompare(b.requested_at)).map(request => ({
      id: request._id, displayName: request.display_name, email: request.email, requestedAt: request.requested_at,
    }));
  },
});

export const approveAccessRequest = mutation({
  args: {
    requestId: v.id("access_requests"), role, status,
    personId: v.optional(v.id("people")), displayName: v.optional(v.string()), canViewConfidential: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx);
    if (actor.role !== "owner") forbidden();
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "pending") throw new ConvexError("ACCESS_REQUEST_NOT_PENDING");
    const existing = await ctx.db.query("crm_users").withIndex("by_external_auth_id", q => q.eq("external_auth_id", request.external_auth_id)).unique();
    if (existing) throw new ConvexError("ACCOUNT_ALREADY_EXISTS");
    const id = await saveAccount(ctx, actor, request.external_auth_id, args, undefined, "approve_access_request");
    if (request.email) await ctx.db.patch(id, { email: request.email });
    await ctx.db.patch(request._id, { status: "approved", updated_at: new Date().toISOString() });
    return id;
  },
});

export const updateAccount = mutation({
  args: {
    accountId: v.id("crm_users"), role, status,
    personId: v.optional(v.id("people")), displayName: v.optional(v.string()), canViewConfidential: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx);
    if (actor.role !== "owner") forbidden();
    const existing = await ctx.db.get(args.accountId);
    if (!existing?.external_auth_id) throw new ConvexError("ACCOUNT_NOT_FOUND");
    return await saveAccount(ctx, actor, existing.external_auth_id, args, existing, "update_account");
  },
});

export const setAccount = mutation({
  args: {
    tokenIdentifier: v.string(), role, status,
    personId: v.optional(v.id("people")),
    displayName: v.optional(v.string()), canViewConfidential: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx);
    if (actor.role !== "owner") forbidden();
    const existing = await ctx.db.query("crm_users").withIndex("by_external_auth_id", q => q.eq("external_auth_id", args.tokenIdentifier)).unique();
    // New accounts must come from requestAccess, where the identity was read
    // from a signed provider token rather than copied from an owner form.
    if (!existing) throw new ConvexError("ACCESS_REQUEST_REQUIRED");
    return await saveAccount(ctx, actor, args.tokenIdentifier, args, existing);
  },
});

/** One-off operator bootstrap; never automatically approve the first visitor. */
export const provisionFirstOwner = internalMutation({
  args: { tokenIdentifier: v.string(), displayName: v.string(), canViewConfidential: v.boolean() },
  handler: async (ctx, args) => {
    requireMaintenance();
    if (!args.tokenIdentifier.includes("|")) throw new ConvexError("INVALID_IDENTITY");
    if ((await ctx.db.query("crm_users").collect()).some(u => u.role === "owner" && u.status === "active")) {
      throw new ConvexError("OWNER_ALREADY_EXISTS");
    }
    if (await ctx.db.query("crm_users").withIndex("by_external_auth_id", q => q.eq("external_auth_id", args.tokenIdentifier)).unique()) {
      throw new ConvexError("ACCOUNT_ALREADY_EXISTS");
    }
    const now = new Date().toISOString();
    const id = await ctx.db.insert("crm_users", {
      external_auth_id: args.tokenIdentifier, display_name: args.displayName,
      role: "owner", status: "active", can_view_confidential: args.canViewConfidential,
      created_at: now, updated_at: now,
    });
    await ctx.db.insert("security_audit", { actor_user_id: id, operation: "operator_bootstrap", record_id: id, created_at: now });
    return id;
  },
});
