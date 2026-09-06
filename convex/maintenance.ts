import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireDisposable, resetApplicationData } from "./lib/maintenance";

export const resetDisposableData = internalMutation({
  args: { confirmation: v.string() },
  handler: async (ctx, args) => {
    requireDisposable(args.confirmation);
    return resetApplicationData(ctx);
  },
});
