import { v } from "convex/values";
import { mutationFor, queryFor } from "./lib/security";

export const get = queryFor("serviceTemplates:get")({
  args: {},
  handler: async ctx => ctx.db.query("service_templates").withIndex("by_key", q => q.eq("key", "sunday")).unique(),
});

export const save = mutationFor("serviceTemplates:save")({
  args: { service_time: v.string(), location: v.string(), expected_person_ids: v.array(v.id("people")) },
  handler: async (ctx, args) => {
    if (args.service_time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(args.service_time)) throw new Error("Enter a valid start time");
    if (args.location.trim().length > 500) throw new Error("Location is too long");
    const ids = [...new Set(args.expected_person_ids)];
    for (const id of ids) {
      const person = await ctx.db.get(id);
      if (!person || person.member_status === "archived") throw new Error("Choose active people for the usual list");
    }
    const current = await ctx.db.query("service_templates").withIndex("by_key", q => q.eq("key", "sunday")).unique();
    const data = { ...args, location: args.location.trim(), expected_person_ids: ids, key: "sunday" as const, updated_at: new Date().toISOString() };
    if (current) { await ctx.db.patch(current._id, data); return current._id; }
    return ctx.db.insert("service_templates", data);
  },
});
