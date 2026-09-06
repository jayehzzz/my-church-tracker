import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { TableNames } from "../_generated/dataModel";
import schema from "../schema";

export function requireMaintenance() {
  if (process.env.CHURCH_MAINTENANCE_ENABLED !== "true") {
    throw new ConvexError("MAINTENANCE_DISABLED");
  }
}

export function requireDisposable(confirmation: string) {
  requireMaintenance();
  const deployment = process.env.CONVEX_CLOUD_URL;
  if (process.env.CHURCH_DATA_DISPOSABLE !== "true"
    || !["development", "test"].includes(process.env.CHURCH_ENV || "")
    || !deployment || confirmation !== `DISPOSABLE ${deployment}`) {
    throw new ConvexError("DISPOSABLE_ENVIRONMENT_REQUIRED");
  }
}

/** Derive the reset set from the schema, including every newer relation.
 * Access grants and audit rows are also reset, so there are no dangling IDs.
 * Never call this helper without requireDisposable in the internal entrypoint.
 */
export async function resetApplicationData(ctx: MutationCtx) {
  const tables = Object.keys(schema.tables) as TableNames[];
  let deleted = 0;
  for (const table of tables) {
    for (const record of await ctx.db.query(table).collect()) {
      await ctx.db.delete(record._id);
      deleted++;
    }
  }
  return { tables, deleted };
}
