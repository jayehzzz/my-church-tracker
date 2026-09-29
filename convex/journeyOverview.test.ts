import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const stamp = "2026-09-01T12:00:00.000Z";

async function setup() {
    const t = convexTest(schema, modules);
    const ids = await t.run(async ctx => {
        const ownerPerson = await ctx.db.insert("people", { first_name: "Owner", last_name: "User", member_status: "leader", created_at: stamp, updated_at: stamp });
        const workerPerson = await ctx.db.insert("people", { first_name: "Worker", last_name: "Person", member_status: "leader", created_at: stamp, updated_at: stamp });
        const inScope = await ctx.db.insert("people", { first_name: "First", last_name: "Timer", phone: "01234", member_status: "guest", created_at: stamp, updated_at: stamp });
        const convert = await ctx.db.insert("people", { first_name: "New", last_name: "Convert", member_status: "guest", created_at: stamp, updated_at: stamp });
        const dateOnly = await ctx.db.insert("people", { first_name: "Date", last_name: "Only", member_status: "contact", first_visit_date: "2026-09-07", created_at: stamp, updated_at: stamp });
        const inferred = await ctx.db.insert("people", { first_name: "Inferred", last_name: "Only", member_status: "guest", first_visit_date: "2026-09-06", created_at: stamp, updated_at: stamp });
        const meetingFirst = await ctx.db.insert("people", { first_name: "Meeting", last_name: "First", member_status: "guest", created_at: stamp, updated_at: stamp });
        const outreachOnly = await ctx.db.insert("people", { first_name: "Outreach", last_name: "Only", member_status: "contact", outreach_salvation_decision: true, created_at: stamp, updated_at: stamp });
        const archived = await ctx.db.insert("people", { first_name: "Archived", last_name: "Profile", member_status: "archived", created_at: stamp, updated_at: stamp });
        const outOfScope = await ctx.db.insert("people", { first_name: "Other", last_name: "Person", member_status: "guest", first_visit_date: "2026-09-08", created_at: stamp, updated_at: stamp });
        await ctx.db.insert("crm_users", { external_auth_id: "https://fixture.example|owner", person_id: ownerPerson, role: "owner", status: "active", can_view_confidential: true, created_at: stamp, updated_at: stamp });
        await ctx.db.insert("crm_users", { external_auth_id: "https://fixture.example|worker", person_id: workerPerson, role: "leader", status: "active", can_view_confidential: false, created_at: stamp, updated_at: stamp });
        await ctx.db.insert("follow_up_assignments", { person_id: inScope, assigned_leader_id: workerPerson, status: "active", assigned_at: stamp, created_at: stamp, updated_at: stamp });
        await ctx.db.insert("follow_up_assignments", { person_id: convert, assigned_leader_id: workerPerson, status: "active", assigned_at: stamp, created_at: stamp, updated_at: stamp });
        await ctx.db.insert("follow_up_assignments", { person_id: outOfScope, assigned_leader_id: ownerPerson, status: "active", assigned_at: stamp, created_at: stamp, updated_at: stamp });
        const firstService = await ctx.db.insert("services", { service_date: "2026-09-06", service_type: "sunday_service", service_time: "10:00", location: "Main Hall", unnamed_decisions_count: 2, created_at: stamp });
        const laterService = await ctx.db.insert("services", { service_date: "2026-09-13", service_type: "sunday_service", created_at: stamp });
        const decisionService = await ctx.db.insert("services", { service_date: "2026-09-13", service_type: "special_service", unnamed_decisions_count: 1, created_at: stamp });
        const meeting = await ctx.db.insert("meetings", { meeting_date: "2026-09-20", meeting_type: "bacenta", title: "Bacenta gathering", status: "completed", created_at: stamp });
        await ctx.db.insert("attendance", { service_id: firstService, person_id: inScope, first_timer: false, created_at: stamp });
        await ctx.db.insert("attendance", { service_id: laterService, person_id: inScope, first_timer: false, created_at: stamp });
        await ctx.db.insert("attendance", { service_id: decisionService, person_id: convert, made_salvation_decision: true, created_at: stamp });
        await ctx.db.insert("attendance", { service_id: firstService, person_id: archived, first_timer: true, created_at: stamp });
        await ctx.db.insert("attendance", { service_id: firstService, person_id: outOfScope, first_timer: true, created_at: stamp });
        await ctx.db.insert("attendance", { service_id: firstService, person_id: inferred, first_timer: true, created_at: stamp });
        await ctx.db.insert("meeting_attendance", { meeting_id: meeting, person_id: inScope, first_timer: false, attended: true, status: "present", created_at: stamp });
        await ctx.db.insert("meeting_attendance", { meeting_id: meeting, person_id: meetingFirst, first_timer: true, attended: true, status: "present", created_at: stamp });
        await ctx.db.insert("attendance_visit_evidence", {
            person_id: inScope, service_id: firstService, kind: "explicit_first_visit",
            source_key: "fixture:explicit-first-visit", created_at: stamp,
        });
        await ctx.db.insert("attendance_visit_evidence", {
            person_id: archived, service_id: firstService, kind: "explicit_first_visit",
            source_key: "fixture:archived-first-visit", created_at: stamp,
        });
        await ctx.db.insert("attendance_visit_evidence", {
            person_id: outOfScope, service_id: firstService, kind: "explicit_first_visit",
            source_key: "fixture:out-of-scope-first-visit", created_at: stamp,
        });
        // Outreach salvation is deliberately not a service decision.
        await ctx.db.patch(convert, { outreach_salvation_decision: true, outreach_salvation_date: "2026-09-01" });
        return { ownerPerson, workerPerson, inScope, convert, dateOnly, inferred, meetingFirst, outreachOnly, archived, outOfScope };
    });
    const identity = (subject: string) => t.withIdentity({ tokenIdentifier: `https://fixture.example|${subject}`, issuer: "https://fixture.example", subject });
    return { t, ids, owner: identity("owner"), worker: identity("worker") };
}

describe("crm.getJourneyOverview", () => {
    it("returns only explicitly recorded first visits, service decisions and unnamed counts", async () => {
        const { owner, ids } = await setup();
        const result = await owner.query(api.crm.getJourneyOverview, {});
        const first = result.first_timers.find(row => row.person.id === ids.inScope);
        expect(first?.events).toHaveLength(1);
        expect(first?.events[0]).toMatchObject({ date: "2026-09-06", label: "sunday service", time: "10:00", location: "Main Hall" });
        expect(result.first_timers.some(row => row.person.id === ids.archived)).toBe(true);
        expect(result.first_timers.some(row => row.person.id === ids.dateOnly)).toBe(false);
        expect(result.first_timers.some(row => row.person.id === ids.inferred)).toBe(false);
        expect(result.first_timers.some(row => row.person.id === ids.meetingFirst)).toBe(false);
        expect(result.new_converts).toHaveLength(1);
        expect(result.new_converts.some(row => row.person.id === ids.outreachOnly)).toBe(false);
        expect(result.new_converts[0]).toMatchObject({ person: { id: ids.convert }, events: [{ date: "2026-09-13", label: "special service" }] });
        expect(result.unnamed_decisions).toEqual(expect.arrayContaining([{ date: "2026-09-06", label: "sunday service", count: 2 }, { date: "2026-09-13", label: "special service", count: 1 }]));
    });

    it("limits a worker to people in their assignment scope and omits churchwide unnamed totals", async () => {
        const { worker, ids } = await setup();
        const result = await worker.query(api.crm.getJourneyOverview, {});
        expect(result.first_timers.some(row => row.person.id === ids.inScope)).toBe(true);
        expect(result.first_timers.some(row => row.person.id === ids.outOfScope)).toBe(false);
        expect(result.new_converts.map(row => row.person.id)).toEqual([ids.convert]);
        expect(result.unnamed_decisions_available).toBe(false);
        expect(result.unnamed_decisions).toEqual([]);
    });

    it("applies the selected worker filter without widening the caller's access", async () => {
        const { owner, worker, ids } = await setup();
        const selected = await owner.query(api.crm.getJourneyOverview, { leaderId: ids.workerPerson });
        expect(selected.first_timers.some(row => row.person.id === ids.inScope)).toBe(true);
        expect(selected.first_timers.some(row => row.person.id === ids.outOfScope)).toBe(false);
        const denied = await worker.query(api.crm.getJourneyOverview, { leaderId: ids.ownerPerson });
        expect(denied.first_timers.some(row => row.person.id === ids.inScope)).toBe(false);
        expect(denied.first_timers.some(row => row.person.id === ids.outOfScope)).toBe(false);
    });
});
