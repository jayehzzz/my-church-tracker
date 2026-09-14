import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { internal } from "./_generated/api";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const stamp = "2026-09-10T08:00:00.000Z";

describe("reviewed church import totals", () => {
  it("rebuilds guest totals from named first timers while preserving the reviewed attendance total", async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const batchId = await ctx.db.insert("church_import_batches", {
        source_id: "sheet", source_fingerprint: "fingerprint", status: "applied",
        applied_at: stamp, created_at: stamp,
      });
      const personId = await ctx.db.insert("people", {
        first_name: "First", last_name: "Timer", member_status: "member",
        created_at: stamp, updated_at: stamp,
      });
      const serviceId = await ctx.db.insert("services", {
        service_date: "2026-08-30", service_type: "sunday_service",
        total_attendance: 3, guests_count: 0, unnamed_attendance_count: 2,
        unnamed_guests_count: 0, created_at: stamp,
      });
      await ctx.db.insert("attendance", {
        service_id: serviceId, person_id: personId, first_timer: true, created_at: stamp,
      });
      await ctx.db.insert("church_import_rows", {
        batch_id: batchId, source_key: "service:2026-08-30", source_fingerprint: "service-fingerprint", record_type: "sunday_service",
        disposition: "imported", target_service_id: serviceId, created_at: stamp,
      });
      return { batchId, serviceId };
    });

    await t.mutation(internal.churchImport.repairAppliedServiceCounts, { batchId: ids.batchId });
    const service = await t.run((ctx) => ctx.db.get(ids.serviceId));
    expect(service).toMatchObject({ total_attendance: 3, guests_count: 1, unnamed_attendance_count: 2 });
  });
});
