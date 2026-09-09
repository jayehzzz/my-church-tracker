import { queryFor, mutationFor, authenticatedUser, forbidden } from "./lib/security";
import { v } from "convex/values";

const clean = (label: string, value: string, maximum = 240) => {
  const text = value.trim();
  if (!text) throw new Error(`${label} is required`);
  if (text.length > maximum) throw new Error(`${label} is too long`);
  return text;
};

export const get = queryFor("churchSettings:get")({
  args: {},
  handler: async (ctx) => ctx.db.query("church_settings").withIndex("by_key", q => q.eq("key", "primary")).unique(),
});

// This is intentionally owner-only: the profile identifies the shared church
// reporting scope and must not change through ordinary people management.
export const save = mutationFor("churchSettings:save")({
  args: { churchName: v.string(), address: v.string(), constituency: v.string(), trackedGroup: v.string(), trackedProgramIds: v.optional(v.array(v.id("meeting_programs"))) },
  handler: async (ctx, args) => {
    if (authenticatedUser(ctx).role !== "owner") forbidden();
    const now = new Date().toISOString();
    const record = {
      key: "primary" as const,
      church_name: clean("Church name", args.churchName),
      address: clean("Address", args.address, 500),
      constituency: clean("Constituency", args.constituency),
      tracked_group: clean("Tracked group", args.trackedGroup),
      tracked_program_ids: args.trackedProgramIds,
      updated_at: now,
    };
    for (const programId of args.trackedProgramIds || []) if (!await ctx.db.get(programId)) throw new Error("Tracked programme not found");
    const existing = await ctx.db.query("church_settings").withIndex("by_key", q => q.eq("key", "primary")).unique();
    if (existing) {
      await ctx.db.patch(existing._id, record);
      return await ctx.db.get(existing._id);
    }
    const id = await ctx.db.insert("church_settings", { ...record, created_at: now });
    return await ctx.db.get(id);
  },
});
