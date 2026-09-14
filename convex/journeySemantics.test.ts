import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const stamp = "2026-08-01T10:00:00.000Z";

async function fixture() {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
        const leader = await ctx.db.insert("people", {
            first_name: "Owner",
            last_name: "Leader",
            member_status: "leader",
            created_at: stamp,
            updated_at: stamp,
        });
        await ctx.db.insert("crm_users", {
            external_auth_id: "https://fixture.example|owner",
            person_id: leader,
            role: "owner",
            status: "active",
            can_view_confidential: true,
            created_at: stamp,
            updated_at: stamp,
        });
        return { leader };
    });
    const owner = t.withIdentity({
        tokenIdentifier: "https://fixture.example|owner",
        issuer: "https://fixture.example",
        subject: "owner",
    });
    return { t, ids, owner };
}

describe("church journey semantics", () => {
    it("keeps outreach salvation separate from salvation recorded at a gathering", async () => {
        const { t, owner } = await fixture();
        const outreach = await owner.mutation(api.evangelism.create, {
            first_name: "Outreach",
            contact_date: "2026-08-01",
            response: "responsive",
            salvation_decision: true,
        });
        expect(await t.run((ctx) => ctx.db.get(outreach!._id))).toMatchObject({
            outreach_salvation_decision: true,
            outreach_salvation_date: "2026-08-01",
            outreach_salvation_source: "evangelism_outreach",
            salvation_decision: true,
            member_status: "contact",
        });

        const churchOnly = await owner.mutation(api.evangelism.create, {
            first_name: "Church only",
            contact_date: "2026-08-01",
            response: "responsive",
        });
        await owner.mutation(api.services.record, {
            service_date: "2026-08-02",
            service_type: "sunday_service",
            total_attendance: 1,
            guests_count: 1,
            salvation_decisions: 1,
            tithers_count: 0,
            attendanceData: [{
                person_id: churchOnly!._id,
                first_timer: true,
                made_salvation_decision: true,
                gave_tithe: false,
            }],
        });
        const reloaded = await t.run((ctx) => ctx.db.get(churchOnly!._id));
        expect(reloaded?.member_status).toBe("guest");
        expect(reloaded?.outreach_salvation_decision).toBeUndefined();
        expect(reloaded?.salvation_decision).toBeUndefined();
        const attendance = await t.run((ctx) => ctx.db.query("attendance").withIndex("by_person", (q) => q.eq("person_id", churchOnly!._id)).unique());
        expect(attendance?.made_salvation_decision).toBe(true);

        const legacyId = await t.run((ctx) => ctx.db.insert("people", {
            first_name: "Legacy",
            last_name: "Contact",
            member_status: "contact",
            entry_point: "evangelism",
            contact_date: "2026-07-20",
            salvation_decision: true,
            created_at: stamp,
            updated_at: stamp,
        }));
        expect(await owner.query(api.evangelism.getById, { id: legacyId })).toMatchObject({
            outreach_salvation_decision: true,
            outreach_salvation_date: "2026-07-20",
            outreach_salvation_source: "legacy_salvation_decision",
            salvation_decision: true,
        });
    });

    it("keeps imported legacy outreach contacts editable by canonicalizing their follow-up posture", async () => {
        const { t, owner } = await fixture();
        const legacyId = await t.run((ctx) => ctx.db.insert("people", {
            first_name: "Imported",
            last_name: "Contact",
            member_status: "contact",
            contact_date: "2026-08-01",
            contact_category: "outreach",
            created_at: stamp,
            updated_at: stamp,
        }));

        const loaded = await owner.query(api.evangelism.getById, { id: legacyId });
        expect(loaded?.response).toBe("not_assessed");

        await owner.mutation(api.evangelism.update, {
            id: legacyId,
            first_name: "Imported Updated",
            response: loaded?.response,
        });

        expect(await t.run((ctx) => ctx.db.get(legacyId))).toMatchObject({
            first_name: "Imported Updated",
            contact_category: "not_assessed",
        });
    });

    it("settled follow-up closes CRM work without silently creating membership", async () => {
        const { t, ids, owner } = await fixture();
        const contact = await owner.mutation(api.evangelism.create, {
            first_name: "Settled",
            contact_date: "2026-08-01",
            response: "responsive",
        });
        const task = await owner.mutation(api.crm.createTask, {
            personId: contact!._id,
            assignedLeaderId: ids.leader,
            dueDate: "2026-08-03",
            taskType: "follow_up",
        });
        await owner.mutation(api.crm.completeTask, {
            taskId: task!._id,
            followUpDate: "2026-08-03",
            outcome: "positive_conversation",
            closeContact: true,
            closeReason: "settled",
        });
        expect(await t.run((ctx) => ctx.db.get(contact!._id))).toMatchObject({
            member_status: "contact",
            activity_status: "regular",
            pipeline_stage: "closed",
        });
        expect((await t.run((ctx) => ctx.db.get(contact!._id)))?.membership_date).toBeUndefined();
    });

    it("records church membership explicitly without changing outreach salvation", async () => {
        const { t, owner } = await fixture();
        const contact = await owner.mutation(api.evangelism.create, {
            first_name: "Member",
            contact_date: "2026-08-01",
            response: "responsive",
        });

        await owner.mutation(api.evangelism.markAsJoinedChurch, { id: contact!._id });

        const reloaded = await t.run((ctx) => ctx.db.get(contact!._id));
        expect(reloaded?.member_status).toBe("member");
        expect(reloaded?.membership_date).toBeDefined();
        expect(reloaded?.outreach_salvation_decision).toBeUndefined();
        expect(reloaded?.salvation_decision).toBeUndefined();
    });

    it("keeps a newly entered outreach record as guest when an earlier church visit is already known", async () => {
        const { t, owner } = await fixture();
        const contact = await owner.mutation(api.evangelism.create, {
            first_name: "Known visitor",
            contact_date: "2026-08-05",
            first_visit_date: "2026-08-02",
            response: "responsive",
        });
        expect(await t.run((ctx) => ctx.db.get(contact!._id))).toMatchObject({
            member_status: "guest",
            first_visit_date: "2026-08-02",
        });
    });

    it("reclassifies only historical outreach-only guests when the guarded migration is applied", async () => {
        const { t } = await fixture();
        const ids = await t.run(async (ctx) => {
            const candidate = await ctx.db.insert("people", {
                first_name: "Outreach only", last_name: "Guest", member_status: "guest",
                contact_date: "2026-07-01", created_at: stamp, updated_at: stamp,
            });
            const attended = await ctx.db.insert("people", {
                first_name: "Attended", last_name: "Guest", member_status: "guest",
                contact_date: "2026-07-01", created_at: stamp, updated_at: stamp,
            });
            const knownVisit = await ctx.db.insert("people", {
                first_name: "Known", last_name: "Guest", member_status: "guest",
                contact_date: "2026-07-01", first_visit_date: "2026-07-03", created_at: stamp, updated_at: stamp,
            });
            const service = await ctx.db.insert("services", {
                service_date: "2026-07-03", service_type: "sunday_service", created_at: stamp,
            });
            await ctx.db.insert("attendance", { service_id: service, person_id: attended, created_at: stamp });
            return { candidate, attended, knownVisit };
        });

        expect(await t.mutation(internal.migrations.reclassifyOutreachOnlyGuests, { apply: false }))
            .toEqual({ candidates: 1, updated: 0 });
        const previous = process.env.CHURCH_MAINTENANCE_ENABLED;
        process.env.CHURCH_MAINTENANCE_ENABLED = "true";
        try {
            expect(await t.mutation(internal.migrations.reclassifyOutreachOnlyGuests, { apply: true }))
                .toEqual({ candidates: 1, updated: 1 });
        } finally {
            if (previous === undefined) delete process.env.CHURCH_MAINTENANCE_ENABLED;
            else process.env.CHURCH_MAINTENANCE_ENABLED = previous;
        }
        expect((await t.run((ctx) => ctx.db.get(ids.candidate)))?.member_status).toBe("contact");
        expect((await t.run((ctx) => ctx.db.get(ids.attended)))?.member_status).toBe("guest");
        expect((await t.run((ctx) => ctx.db.get(ids.knownVisit)))?.member_status).toBe("guest");
    });

    it("promotes an outreach contact to guest on first attendance and keeps later visits as returning guest visits", async () => {
        const { t, owner } = await fixture();
        const contact = await owner.mutation(api.evangelism.create, {
            first_name: "Returning",
            contact_date: "2026-08-01",
            response: "responsive",
        });
        expect((await t.run((ctx) => ctx.db.get(contact!._id)))?.member_status).toBe("contact");

        await owner.mutation(api.services.record, {
            service_date: "2026-08-02",
            service_type: "sunday_service",
            total_attendance: 1,
            guests_count: 1,
            salvation_decisions: 0,
            tithers_count: 0,
            attendanceData: [{ person_id: contact!._id, first_timer: false, made_salvation_decision: false, gave_tithe: false }],
        });
        expect(await t.run((ctx) => ctx.db.get(contact!._id))).toMatchObject({
            member_status: "guest",
            first_visit_date: "2026-08-02",
        });

        await owner.mutation(api.services.record, {
            service_date: "2026-08-09",
            service_type: "sunday_service",
            total_attendance: 1,
            guests_count: 1,
            salvation_decisions: 0,
            tithers_count: 0,
            attendanceData: [{ person_id: contact!._id, first_timer: true, made_salvation_decision: false, gave_tithe: false }],
        });
        const rows = (await t.run((ctx) => ctx.db.query("attendance").withIndex("by_person", (q) => q.eq("person_id", contact!._id)).collect()))
            .sort((a, b) => a.created_at.localeCompare(b.created_at));
        const services = await t.run((ctx) => ctx.db.query("services").collect());
        const firstService = services.find((service) => service.service_date === "2026-08-02")!;
        const secondService = services.find((service) => service.service_date === "2026-08-09")!;
        expect(rows.find((row) => row.service_id === firstService._id)?.first_timer).toBe(true);
        expect(rows.find((row) => row.service_id === secondService._id)?.first_timer).toBe(false);
        expect((await t.run((ctx) => ctx.db.get(contact!._id)))?.member_status).toBe("guest");
    });

    it("labels funnel membership explicitly while keeping legacy aliases compatible", async () => {
        const { t, owner } = await fixture();
        await t.run(async (ctx) => {
            await ctx.db.insert("people", {
                first_name: "Joined",
                last_name: "Contact",
                member_status: "member",
                entry_point: "evangelism",
                contact_date: "2026-07-01",
                first_visit_date: "2026-07-07",
                created_at: stamp,
                updated_at: stamp,
            });
        });
        const funnel = await owner.query(api.follow_ups.getConversionFunnel, {});
        expect(funnel.joined_church).toBe(1);
        expect(funnel.converted).toBe(funnel.joined_church);
        expect(funnel.rates.membership_rate).toBe(100);
        expect(funnel.rates.conversion_rate).toBe(funnel.rates.membership_rate);
    });
});
