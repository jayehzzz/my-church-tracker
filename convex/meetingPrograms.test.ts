import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const now = "2026-09-24T10:00:00.000Z";

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const person = (first_name: string, status = "guest") => ctx.db.insert("people", { first_name, last_name: "Test", member_status: status, created_at: now, updated_at: now });
    const owner = await person("Owner", "leader");
    const leaderA = await person("Leader A", "leader");
    const leaderB = await person("Leader B", "leader");
    const regular = await person("Regular");
    const outsider = await person("Outsider");
    for (const [name, role, personId] of [["owner", "owner", owner], ["a", "leader", leaderA], ["b", "leader", leaderB]] as const) {
      await ctx.db.insert("crm_users", { external_auth_id: `https://identity.example/|${name}`, role, person_id: personId, status: "active", created_at: now, updated_at: now });
    }
    const program = (code: string) => ctx.db.insert("meeting_programs", { code, name: code, meeting_type: "bacenta", category: "bacenta", default_format: "in_person", active: true, created_at: now, updated_at: now });
    const a = await program("Eastside");
    const b = await program("Westside");
    await ctx.db.insert("meeting_program_leaders", { program_id: a, person_id: leaderA, is_primary: true, created_at: now });
    await ctx.db.insert("meeting_program_leaders", { program_id: b, person_id: leaderB, is_primary: true, created_at: now });
    await ctx.db.insert("meeting_program_members", { program_id: a, person_id: regular, status: "active", joined_at: now });
    return { a, b, owner, leaderA, leaderB, regular, outsider };
  });
  const as = (name: string) => t.withIdentity({ issuer: "https://identity.example/", subject: name, tokenIdentifier: `https://identity.example/|${name}` });
  return { t, ids, as };
}

describe("programme leadership and weekly attendance", () => {
  it("scopes leaders to their own bacenta and preserves the dated regular list", async () => {
    const { t, ids, as } = await fixture();
    expect((await as("a").query(api.meetingPrograms.getAll, {})).map(program => program._id)).toEqual([ids.a]);
    expect((await as("a").query(api.people.getAll, {})).map(person => person._id)).toEqual(expect.arrayContaining([ids.regular, ids.leaderA]));
    expect((await as("a").query(api.people.getAll, {})).map(person => person._id)).not.toContain(ids.outsider);
    await expect(as("a").mutation(api.meetingPrograms.syncPeople, { programId: ids.b, leaderIds: [ids.leaderA], memberIds: [] })).rejects.toThrow();
    await expect(as("a").mutation(api.meetingPrograms.syncPeople, { programId: ids.a, leaderIds: [ids.leaderA, ids.leaderB], memberIds: [ids.regular] })).rejects.toThrow();
    const guest = await as("a").mutation(api.meetingPrograms.addGuest, { programId: ids.a, firstName: "New", lastName: "Guest", phone: "07123456789" });
    expect(guest?.member_status).toBe("guest");
    await expect(as("a").mutation(api.meetingPrograms.addGuest, { programId: ids.a, firstName: "New", lastName: "Guest", phone: "07123456789" })).rejects.toThrow(/matching person/i);
    await expect(as("b").mutation(api.meetingPrograms.addGuest, { programId: ids.a, firstName: "Hidden", lastName: "Guest" })).rejects.toThrow();
    await as("a").mutation(api.meetingPrograms.update, { id: ids.a, name: "Eastside Bacenta", description: "Wednesday gathering" });
    expect((await as("a").query(api.meetingPrograms.getAll, {}))[0].description).toBe("Wednesday gathering");
    await expect(as("a").mutation(api.meetingPrograms.update, { id: ids.a, active: false })).rejects.toThrow();

    const meeting = await as("a").mutation(api.meetings.record, {
      program_id: ids.a, meeting_type: "bacenta", meeting_date: "2026-09-24", attendanceData: [], markComplete: true, unnamed_guests_count: 0,
    });
    expect(meeting?.status).toBe("completed");
    const [absence] = await as("a").query(api.meetings.getAttendees, { meetingId: meeting!._id });
    expect(absence).toMatchObject({ person_id: ids.regular, status: "absent", expected_regular: true });
    await as("owner").mutation(api.meetingPrograms.syncPeople, { programId: ids.a, leaderIds: [ids.leaderA], memberIds: [] });
    const followUps = await as("a").query(api.meetingFollowUps.getForProgram, { programId: ids.a });
    expect(followUps.rows).toHaveLength(1);
    await as("a").mutation(api.meetingFollowUps.setAbsenceReason, { meetingId: meeting!._id, personId: ids.regular, absenceReason: "On holiday" });
    const task = await as("a").mutation(api.meetingFollowUps.createTask, { meetingId: meeting!._id, personId: ids.regular, assignedLeaderId: ids.leaderA, dueDate: "2026-09-26" });
    expect(task?.meeting_id).toBe(meeting!._id);
    expect((await as("a").query(api.meetingFollowUps.getForProgram, { programId: ids.a })).openTasks).toHaveLength(1);
    await as("owner").mutation(api.meetingPrograms.syncPeople, { programId: ids.b, leaderIds: [ids.leaderB], memberIds: [ids.regular] });
    const sameDayMeeting = await as("b").mutation(api.meetings.record, { program_id: ids.b, meeting_type: "bacenta", meeting_date: "2026-09-24", attendanceData: [], markComplete: true });
    const otherTask = await as("b").mutation(api.meetingFollowUps.createTask, { meetingId: sameDayMeeting!._id, personId: ids.regular, assignedLeaderId: ids.leaderB, dueDate: "2026-09-27" });
    expect(otherTask?.meeting_id).not.toBe(task?.meeting_id);
    expect((await as("a").query(api.meetingFollowUps.getForProgram, { programId: ids.a })).tasks.map(item => item._id)).toEqual([task!._id]);
    await as("a").mutation(api.meetings.record, { id: meeting!._id, program_id: ids.a, meeting_type: "bacenta", meeting_date: "2026-09-24", attendanceData: [{ person_id: ids.regular, status: "present" }], markComplete: true });
    const [corrected] = await as("a").query(api.meetings.getAttendees, { meetingId: meeting!._id });
    expect(corrected).toMatchObject({ status: "present", expected_regular: true });
    expect(corrected.absence_reason).toBeUndefined();
    expect((await as("a").query(api.meetingFollowUps.getForProgram, { programId: ids.a })).tasks.map(item => item._id)).toEqual([task!._id]);
    await expect(as("b").query(api.meetingFollowUps.getForProgram, { programId: ids.a })).rejects.toThrow();
    await expect(as("b").mutation(api.meetingFollowUps.createTask, { meetingId: meeting!._id, personId: ids.regular, assignedLeaderId: ids.leaderB, dueDate: "2026-09-26" })).rejects.toThrow();
    await expect(as("a").mutation(api.meetings.record, { program_id: ids.b, meeting_type: "bacenta", meeting_date: "2026-09-24", attendanceData: [], markComplete: true })).rejects.toThrow();
    expect((await t.run(ctx => ctx.db.query("meeting_attendance").collect())).filter(row => row.meeting_id === meeting!._id)).toHaveLength(1);
  });
});
