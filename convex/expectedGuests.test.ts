import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { guestInvitationVersion } from "../src/lib/services/expectedGuestLogic.js";
const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const stamp = "2026-09-01T09:00:00Z";
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-03T12:00:00Z")); });
afterEach(() => { vi.useRealTimers(); });
async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const add = (first_name: string, member_status = "guest") => ctx.db.insert("people", { first_name, last_name: "", member_status, created_at: stamp, updated_at: stamp });
    const layla = await add("Layla", "member"), leader = await add("Leader", "leader"), other = await add("Other", "leader"), guest = await add("Nia");
    await ctx.db.patch(guest, { invited_by_id: other, phone: "07123456789" });
    for (const [name, role, person_id, confidential] of [["owner", "owner", leader, true], ["admin", "admin", other, false], ["leader", "leader", leader, false], ["other", "leader", other, false], ["viewer", "viewer", undefined, false]] as const) {
      await ctx.db.insert("crm_users", { external_auth_id: `https://guest.test|${name}`, role, person_id, can_view_confidential: confidential, status: "active", created_at: stamp, updated_at: stamp });
    }
    return { layla, leader, other, guest };
  });
  const as = (name: string) => t.withIdentity({ issuer: "https://guest.test", subject: name, tokenIdentifier: `https://guest.test|${name}` });
  const owner = as("owner");
  const create = (patch: any = {}) => owner.mutation(api.expectedGuests.create, { serviceDate: "2026-10-04", nameUnknown: true, inviterId: ids.layla, leaderId: ids.leader, state: "coming", reportSource: "inviter_report", ...patch });
  const update = (row: any, patch: any = {}) => owner.mutation(api.expectedGuests.update, { invitationId: row._id, expectedVersion: guestInvitationVersion(row), serviceDate: row.service_date, nameUnknown: row.name_unknown, firstName: row.first_name, lastName: row.last_name, phone: row.phone, email: row.email, inviterId: row.inviter_id, leaderId: row.responsible_leader_id, state: row.state, reportSource: row.report_source, note: row.note, changeReason: "Fixture correction", ...patch });
  const dashboard = (serviceDate = "2026-10-04") => owner.query(api.crm.getDashboard, { serviceDate });
  return { t, ids, as, owner, create, update, dashboard };
}

describe("expected guests without outreach", () => {
  it("keeps distinct unknown friends and tentative invitations outside people, confirmations and attendance", async () => {
    const { t, create, dashboard } = await fixture();
    await create({ leaderId: undefined }); await create(); await create({ state: "tentative" });
    const result = await dashboard();
    expect(result.guest_invitations.map(row => row.display_name)).toEqual(["Layla's friend", "Layla's friend 2", "Layla's friend 3"]);
    expect(result.attendance_forecast).toMatchObject({ expected_total: 2, confirmed_total: 0, unnamed_expected_guests: 2, tentative_guest_count: 1 });
    expect((await dashboard("2026-10-11")).guest_invitations).toHaveLength(0);
    const tables = await t.run(async ctx => ({ people: await ctx.db.query("people").collect(), attendance: await ctx.db.query("attendance").collect(), calls: await ctx.db.query("follow_ups").collect(), tasks: await ctx.db.query("follow_up_tasks").collect(), commitments: await ctx.db.query("gathering_commitments").collect() }));
    expect(tables.people).toHaveLength(4); expect(tables.attendance).toHaveLength(0); expect(tables.calls).toHaveLength(0); expect(tables.tasks).toHaveLength(0); expect(tables.commitments).toHaveLength(0);
    expect(tables.people.every(person => !person.first_visit_date && !person.membership_date && !person.contact_date)).toBe(true);
  });
  it("adds known details later and explicitly creates a non-member without inventing outreach or milestones", async () => {
    const { t, owner, create, update, dashboard, ids } = await fixture();
    const unnamed = await create();
    await expect(owner.mutation(api.expectedGuests.link, { invitationId: unnamed!._id, expectedVersion: guestInvitationVersion(unnamed), createPerson: true, changeReason: "Guest arrived" })).rejects.toThrow(/real name/);
    const named = await update(unnamed, { nameUnknown: false, firstName: "Practice Ama", email: "ama@example.test" });
    const linked = await owner.mutation(api.expectedGuests.link, { invitationId: named!._id, expectedVersion: guestInvitationVersion(named), createPerson: true, changeReason: "Real name supplied" });
    const person = await t.run(ctx => ctx.db.get(linked!.person_id!));
    expect(person).toMatchObject({ first_name: "Practice Ama", member_status: "guest", invited_by_id: ids.layla, email: "ama@example.test" });
    for (const field of ["first_visit_date", "contact_date", "entry_point", "membership_date", "outreach_salvation_decision"]) expect((person as any)[field]).toBeUndefined();
    expect(linked!.history).toHaveLength(3); expect(linked!.history[1].before.name_unknown).toBe(true);
    expect((await dashboard()).attendance_forecast.expected_total).toBe(1);
    // Converting a friend never makes a later unnamed friend reuse that label.
    expect((await create())!.friend_number).toBe(2);
  });
  it("links to an already confirmed person once while preserving both inviters and invitation history", async () => {
    const { t, owner, ids, create, update, dashboard } = await fixture();
    await owner.mutation(api.crm.recordCommitment, { personId: ids.guest, leaderId: ids.leader, gatheringType: "sunday_service", gatheringDate: "2026-10-04", response: "yes" });
    const one = await create(), two = await create();
    expect((await dashboard()).attendance_forecast.expected_total).toBe(3);
    const link = (row: any) => owner.mutation(api.expectedGuests.link, { invitationId: row._id, expectedVersion: guestInvitationVersion(row), personId: ids.guest, changeReason: "Owner reviewed existing person" });
    const first = await link(one), second = await link(two);
    expect((await dashboard()).attendance_forecast).toMatchObject({ expected_total: 1, confirmed_total: 1, additional_expected_guests: 0 });
    expect(first!.inviter_id).toBe(ids.layla); expect((await t.run(ctx => ctx.db.get(ids.guest)))!.invited_by_id).toBe(ids.other);
    await update(first, { state: "cancelled" }); await update(second, { enteredInError: true });
    // Independent personal Yes is not silently cancelled with the inviter report.
    expect((await dashboard()).attendance_forecast).toMatchObject({ expected_total: 1, confirmed_total: 1 });
    expect(await owner.query(api.crm.getContactProfile, { personId: ids.guest })).toHaveProperty("guest_invitations");
  });
  it("cancels, corrects and records non-arrival without deleting history or counting tentative misses", async () => {
    const { create, update, dashboard } = await fixture();
    const coming = await create({ serviceDate: "2026-09-27" }), tentative = await create({ serviceDate: "2026-09-27", state: "tentative" });
    await expect(update(tentative, { state: "no_show" })).rejects.toThrow(/tentative/);
    const missed = await update(coming, { state: "no_show" });
    expect((await dashboard("2026-09-27")).attendance_forecast).toMatchObject({ expected_total: 0, tentative_guest_count: 1 });
    expect(missed!.history).toHaveLength(2);
    const cancelled = await update(tentative, { state: "cancelled" });
    const corrected = await update(cancelled, { enteredInError: true });
    expect(corrected!.history).toHaveLength(3);
    const future = await create(); await expect(update(future, { state: "no_show" })).rejects.toThrow(/after the Sunday/);
    await expect(update(cancelled)).rejects.toThrow(/changed/);
  });
  it("enforces owner/admin writes, approved/scoped reads and corrected-history visibility without care access", async () => {
    const { as, owner, ids, create, update } = await fixture();
    const own = await create(), outside = await create({ leaderId: ids.other });
    expect((await as("leader").query(api.crm.getDashboard, { serviceDate: "2026-10-04" })).guest_invitations.map(row => row._id)).toEqual([own!._id]);
    expect((await as("other").query(api.crm.getDashboard, { serviceDate: "2026-10-04" })).guest_invitations.map(row => row._id)).toEqual([outside!._id]);
    await expect(as("leader").mutation(api.expectedGuests.update, { invitationId: own!._id, expectedVersion: guestInvitationVersion(own), serviceDate: "2026-10-04", nameUnknown: true, inviterId: ids.layla, state: "cancelled", reportSource: "inviter_report", changeReason: "Spoofed owner" })).rejects.toThrow(/FORBIDDEN/);
    await expect(as("viewer").query(api.crm.getDashboard, {})).rejects.toThrow();
    await expect(as("unapproved").mutation(api.expectedGuests.link, { invitationId: own!._id, expectedVersion: guestInvitationVersion(own), personId: ids.guest, changeReason: "Unauthorised" })).rejects.toThrow();
    await update(own, { state: "cancelled", changeReason: "Inviter cancelled transport" });
    const adminRows = (await as("admin").query(api.crm.getDashboard, { serviceDate: "2026-10-04" })).guest_invitations;
    expect(adminRows.find(row => row._id === own!._id)!.history.at(-1)!.change_reason).toBe("Inviter cancelled transport");
    await expect(owner.mutation(api.expectedGuests.create, { serviceDate: "2026-10-04", nameUnknown: true, state: "coming", reportSource: "guest_report" })).rejects.toThrow(/unnamed guest/);
  });
  it("deduplicates actual check-ins, reconciles register corrections and rejects invitation shortcuts", async () => {
    const { t, owner, as, create, ids, update, dashboard } = await fixture();
    const service = await owner.mutation(api.services.record, { service_date: "2026-09-27", service_type: "sunday_service", total_attendance: 0, guests_count: 0, salvation_decisions: 0, tithers_count: 0, attendanceData: [] });
    const unknown = await create({ serviceDate: "2026-09-27" });
    const attendance = (row: any, patch: any = {}) => owner.mutation(api.expectedGuests.attendance, { invitationId: row._id, expectedVersion: guestInvitationVersion(row), serviceId: service!._id, attended: true, ...patch });
    await expect(attendance(unknown)).rejects.toThrow(/real name/);
    let linked = await owner.mutation(api.expectedGuests.link, { invitationId: unknown!._id, expectedVersion: guestInvitationVersion(unknown), personId: ids.guest, changeReason: "Identified at service" });
    await expect(as("leader").mutation(api.expectedGuests.attendance, { invitationId: linked!._id, expectedVersion: guestInvitationVersion(linked), serviceId: service!._id, attended: true })).rejects.toThrow(/FORBIDDEN/);
    linked = await attendance(linked);
    expect((await dashboard("2026-09-27")).attendance_forecast.expected_total).toBe(0);
    const register = await owner.query(api.attendance.getByService, { serviceId: service!._id });
    expect(register).toHaveLength(1); expect(register[0].first_timer).toBe(true); expect(register[0].made_salvation_decision).toBe(false);
    await attendance(linked); expect(await owner.query(api.attendance.getByService, { serviceId: service!._id })).toHaveLength(1);
    const latest = await t.run(ctx => ctx.db.get(linked!._id));
    await expect(update(latest, { serviceDate: "2026-10-04", state: "cancelled" })).rejects.toThrow(/actual attendance separately/);
    const removed = await attendance(latest, { attended: false, changeReason: "Wrong check-in", afterRemoval: "coming" });
    expect(removed!.attendance_service_id).toBeUndefined(); expect(await owner.query(api.attendance.getByService, { serviceId: service!._id })).toHaveLength(0);
    expect((await dashboard("2026-09-27")).attendance_forecast.expected_total).toBe(1);
    expect((await t.run(ctx => ctx.db.get(ids.guest)))!.first_visit_date).toBeUndefined();
  });
  it("tracks external register additions, service-date corrections and removal without inventing an invitation date", async () => {
    const { t, owner, create, ids, dashboard } = await fixture();
    const record = (service_date: string) => owner.mutation(api.services.record, { service_date, service_type: "sunday_service", total_attendance: 0, guests_count: 0, salvation_decisions: 0, tithers_count: 0, attendanceData: [] });
    const service = await record("2026-09-27"), different = await record("2026-09-20"), future = await record("2026-10-04");
    const invitation = await create({ serviceDate: "2026-09-27" });
    let linked = await owner.mutation(api.expectedGuests.link, { invitationId: invitation!._id, expectedVersion: guestInvitationVersion(invitation), personId: ids.guest, changeReason: "Reviewed existing guest" });
    const mark = (row: any, serviceId: any) => owner.mutation(api.expectedGuests.attendance, { invitationId: row._id, expectedVersion: guestInvitationVersion(row), serviceId, attended: true });
    await expect(mark(linked, different!._id)).rejects.toThrow(/does not match/);
    const next = await create();
    const futureLink = await owner.mutation(api.expectedGuests.link, { invitationId: next!._id, expectedVersion: guestInvitationVersion(next), personId: ids.guest, changeReason: "Reviewed next Sunday" });
    await expect(mark(futureLink, future!._id)).rejects.toThrow(/future gathering/);
    await owner.mutation(api.attendance.create, { service_id: service!._id, person_id: ids.guest });
    linked = await t.run(ctx => ctx.db.get(linked!._id));
    expect(linked!.attendance_service_id).toBe(service!._id);
    expect((await dashboard("2026-09-27")).attendance_forecast.expected_total).toBe(0);
    await owner.mutation(api.services.update, { id: service!._id, service_date: "2026-09-20" });
    linked = await t.run(ctx => ctx.db.get(linked!._id));
    expect(linked!.service_date).toBe("2026-09-27"); expect(linked!.attendance_service_id).toBeUndefined();
    expect((await dashboard("2026-09-27")).attendance_forecast.expected_total).toBe(1);
    await owner.mutation(api.services.update, { id: service!._id, service_date: "2026-09-27" });
    expect((await t.run(ctx => ctx.db.get(linked!._id)))!.attendance_service_id).toBe(service!._id);
    await owner.mutation(api.services.remove, { id: service!._id });
    const removed = await t.run(ctx => ctx.db.get(linked!._id));
    expect(removed!.attendance_service_id).toBeUndefined(); expect(removed!.history.at(-1)!.action).toBe("actual_attendance_removed");
    expect((await dashboard("2026-09-27")).attendance_forecast.expected_total).toBe(1);
  });
  it("checks contact duplicates and preserves references during person merge and deletion", async () => {
    const { t, owner, ids, create } = await fixture();
    const known = await create({ nameUnknown: false, firstName: "Nia", phone: "07123456789" });
    await expect(owner.mutation(api.expectedGuests.link, { invitationId: known!._id, expectedVersion: guestInvitationVersion(known), createPerson: true, changeReason: "Add duplicate" })).rejects.toThrow(/matching contact details/);
    const linked = await owner.mutation(api.expectedGuests.link, { invitationId: known!._id, expectedVersion: guestInvitationVersion(known), personId: ids.guest, changeReason: "Link reviewed person" });
    await expect(owner.mutation(api.people.remove, { id: ids.guest })).rejects.toThrow(/recorded history/);
    await expect(owner.mutation(api.people.remove, { id: ids.layla })).rejects.toThrow(/recorded history/);
    const target = await owner.mutation(api.people.create, { first_name: "Retained", member_status: "guest" });
    const source = await t.run(ctx => ctx.db.get(ids.guest));
    await owner.mutation(api.people.mergeReviewed, { sourceId: ids.guest, targetId: target!._id, sourceUpdatedAt: source!.updated_at, targetUpdatedAt: target!.updated_at });
    const moved = await t.run(ctx => ctx.db.get(linked!._id));
    expect(moved!.person_id).toBe(target!._id); expect(moved!.inviter_id).toBe(ids.layla); expect(moved!.history.at(-1)!.action).toBe("person_records_merged");
  });
});
