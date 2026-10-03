import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let createTask;
let getDashboard;
let captureLocalEvangelismContact;

beforeAll(async () => {
  vi.stubEnv("VITE_CONVEX_URL", "");
  vi.stubEnv("VITE_APP_ENV", "development");
  vi.stubEnv("VITE_APP_MODE", "demo");
  ({ createTask, getDashboard, captureLocalEvangelismContact } = await import("./followUpCrmService.js"));
});

afterAll(() => vi.unstubAllEnvs());

describe("follow-up CRM service", () => {
  it("builds an explicitly selected demo dashboard when Convex is not configured", async () => {
    const result = await getDashboard();

    expect(result.error).toBeNull();
    expect(result.source).toBe("demo");
    expect(result.data.source).toBe("demo");
    expect(result.data.leaders.length).toBeGreaterThan(0);
    expect(result.data.attendance_forecast.service_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.data.attendance_forecast.confirmed_non_members).toBe(
      result.data.confirmed_commitments.length,
    );
    expect(result.data.attendance_forecast.confirmed_guests).toBe(result.data.attendance_forecast.confirmed_non_members);
    expect(result.data.upcoming_commitments).toBeInstanceOf(Array);
    expect(result.data.sunday_commitments).toBeInstanceOf(Array);
    expect(result.data.sunday_missed_history).toBeInstanceOf(Array);
    expect(result.data.visitation_follow_ups).toBeInstanceOf(Array);
    expect(result.data.quarterly_active_limit).toBe(10);
    expect(result.data.quarterly_backlog_count).toBeGreaterThanOrEqual(0);
    const careTasks = [
      ...result.data.tasks,
      ...result.data.member_care_tasks,
      ...result.data.visitation_tasks,
    ]
      .filter((task) => ["visitation", "member_care"].includes(task.task_type));
    expect(careTasks).toHaveLength(5);
    const dueToday = careTasks.find((task) => task._id === "demo-care-welcome")?.due_date;
    expect(dueToday).toBeTruthy();
    expect(careTasks.filter((task) => task.due_date < dueToday)).toHaveLength(2);
  });

  it("keeps outreach-only people as contacts and attendance-derived people as guests", async () => {
    const outreach = await captureLocalEvangelismContact({
      id: "local-outreach-semantics",
      first_name: "Outreach",
      contact_date: "2026-09-01",
      response: "responsive",
    });
    const attended = await captureLocalEvangelismContact({
      id: "local-guest-semantics",
      first_name: "Returning",
      contact_date: "2026-08-20",
      first_visit_date: "2026-08-23",
      response: "responsive",
    });

    expect(outreach.data.member_status).toBe("contact");
    expect(attended.data.member_status).toBe("guest");
  });

  it("does not grant membership when follow-up is merely settled", async () => {
    const { assignContact, completeTask, getContactProfile } = await import("./followUpCrmService.js");
    const contactId = "local-explicit-membership";
    await captureLocalEvangelismContact({
      id: contactId,
      first_name: "Settled",
      contact_date: "2026-09-01",
      response: "responsive",
    });
    const dashboard = await getDashboard();
    const leaderId = dashboard.data.leaders[0]._id || dashboard.data.leaders[0].id;
    const assignment = await assignContact(contactId, leaderId, "2026-09-02");

    expect(assignment.error).toBeNull();
    const completed = await completeTask(assignment.data.task._id, {
      leaderId,
      outcome: "positive_conversation",
      closeContact: true,
      closeReason: "settled",
    });
    expect(completed.error).toBeNull();

    const profile = await getContactProfile(contactId);
    expect(profile.data.person.member_status).toBe("contact");
    expect(profile.data.person.activity_status).toBeUndefined();
    expect(profile.data.person.membership_date).toBeUndefined();
  });

  it("creates a linked visitation task for a person and care leader", async () => {
    const dashboard = await getDashboard();
    const leader = dashboard.data.leaders[0];
    const person = dashboard.data.attendance_roster.find(
      (candidate) => String(candidate._id || candidate.id) !== String(leader._id || leader.id),
    );

    const result = await createTask({
      personId: person._id || person.id,
      assignedLeaderId: leader._id || leader.id,
      dueDate: "2026-09-03",
      taskType: "visitation",
      priority: "high",
      reason: "Pastoral check-in",
    });

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      person_id: person._id || person.id,
      assigned_leader_id: leader._id || leader.id,
      task_type: "visitation",
      status: "open",
    });
    expect(result.data.person).toBeTruthy();
    expect(result.data.assigned_leader).toBeTruthy();
  });

  it("assigns regular members without creating first-contact work and reports partial bulk failures", async () => {
    const { getAssignmentDirectory, batchAssignContacts, getContactProfile } = await import("./followUpCrmService.js");
    const directory = await getAssignmentDirectory();
    const member = directory.data.find(row => row.member_status === "member" && !row.blocked_reason);
    const leader = directory.data.find(row => row.member_status === "leader");
    const before = await getContactProfile(member._id);
    const result = await batchAssignContacts([member._id, "local-missing-person", member._id], leader._id);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].task).toBeNull();
    expect(result.succeededPersonIds).toEqual([member._id]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ personId: "local-missing-person" });
    expect(result.errors[0].error.message).toBe("Person not found");
    expect(result.error.message).toBe("1 assigned; 1 failed");
    const after = await getContactProfile(member._id);
    expect(after.data.person).toEqual(before.data.person);
    expect(after.data.tasks).toEqual(before.data.tasks);
  });

  it("transfers demo tasks without restarting first contact and rejects a stale reviewed owner", async () => {
    const { assignContact, getAssignmentDirectory, getContactProfile } = await import("./followUpCrmService.js");
    await captureLocalEvangelismContact({ id:"local-reassigned-contact",first_name:"Transfer",contact_date:"2026-10-01",response:"responsive" });
    const leaders = (await getAssignmentDirectory()).data.filter(row => row.member_status === "leader");
    const first = await assignContact("local-reassigned-contact",leaders[0]._id,"2026-10-04");
    const next = await assignContact("local-reassigned-contact",leaders[1]._id,"2026-10-06",{expectedAssignmentId:first.data.assignment._id});
    expect(next.data.task).toBeNull();
    const profile = await getContactProfile("local-reassigned-contact");
    expect(profile.data.tasks).toHaveLength(1);
    expect(profile.data.tasks[0]).toMatchObject({ _id:first.data.task._id,assigned_leader_id:leaders[1]._id,due_date:"2026-10-04" });
    expect(profile.data.tasks[0].ownership_history).toHaveLength(1);
    expect(profile.data.assignment_history).toHaveLength(2);
    const stale = await assignContact("local-reassigned-contact",leaders[0]._id,undefined,{expectedAssignmentId:first.data.assignment._id});
    expect(stale.error.message).toMatch(/changed/);
  });

  it("handles batch assignment and quick log no answer", async () => {
    const { batchAssignContacts, quickLogNoAnswer, resolveCommitment, getDashboard } = await import("./followUpCrmService.js");
    const dashboard = await getDashboard();
    const leader = dashboard.data.leaders[0];
    const unassigned = dashboard.data.unassigned_contacts.slice(0, 2);

    if (unassigned.length > 0) {
      const ids = unassigned.map((p) => p._id || p.id);
      const batchResult = await batchAssignContacts(ids, leader._id || leader.id, "2026-09-05");
      expect(batchResult.error).toBeNull();
      expect(batchResult.data).toHaveLength(ids.length);

      const assignedTask = batchResult.data[0]?.task;
      if (assignedTask) {
        const quickLogResult = await quickLogNoAnswer(assignedTask._id, leader._id || leader.id);
        expect(quickLogResult.error).toBeNull();
        expect(quickLogResult.data.outcome).toBe("no_response");
      }
    }
  });

  it("does not create or alter a follow-up task when a Sunday commitment is resolved as no_show", async () => {
    const { resolveCommitment, getDashboard } = await import("./followUpCrmService.js");
    const dashboard = await getDashboard();
    const commitment = dashboard.data.sunday_commitments.find((c) => c.resolution === "pending" || !c.resolution);
    if (commitment) {
      const before = dashboard.data.tasks.filter((task) => String(task.person_id) === String(commitment.person_id)).map(task => task._id || task.id);
      const result = await resolveCommitment(commitment._id || commitment.id, "no_show");
      expect(result.error).toBeNull();
      expect(result.data.resolution).toBe("no_show");

      const refreshed = await getDashboard();
      expect(refreshed.data.tasks.filter((task) => String(task.person_id) === String(commitment.person_id)).map(task => task._id || task.id)).toEqual(before);
      expect(refreshed.data.sunday_missed_history.some(row => String(row.person_id) === String(commitment.person_id))).toBe(true);
    }
  });
  it("preserves restrictions and cancels only outreach when an existing contact opts out", async () => {
    const { assignContact, getContactProfile, reactivateContact } = await import("./followUpCrmService.js");
    const dashboard = await getDashboard();
    const leaderId = dashboard.data.leaders[0]._id;
    const id = "local-simplified-no-contact";
    await captureLocalEvangelismContact({ id, first_name: "Restricted", contact_date: "2026-09-01", assigned_leader_id: leaderId });
    await createTask({ personId: id, assignedLeaderId: leaderId, dueDate: "2026-09-03", taskType: "member_care" });
    await captureLocalEvangelismContact({ id, response: "do_not_contact" });
    await captureLocalEvangelismContact({ id, first_name: "Updated", member_status: "member" });
    const profile = await getContactProfile(id);
    expect(profile.data.person.contact_category).toBe("do_not_contact");
    expect(profile.data.tasks.some(task => task.status === "open" && task.task_type === "first_contact")).toBe(false);
    expect(profile.data.tasks.some(task => task.status === "open" && task.task_type === "member_care")).toBe(true);
    expect((await assignContact(id, leaderId)).error).toBeTruthy();
    expect((await reactivateContact(id, leaderId)).error).toBeTruthy();
  });

  it("creates one initial task without a category and does not duplicate it on edit", async () => {
    const { getContactProfile } = await import("./followUpCrmService.js");
    const dashboard = await getDashboard();
    const leaderId = dashboard.data.leaders[0]._id;
    const contact = { id: "local-simplified-intake", first_name: "New", contact_date: "2026-09-01", assigned_leader_id: leaderId };
    await captureLocalEvangelismContact(contact);
    await captureLocalEvangelismContact({ ...contact, first_name: "Edited" });
    const profile = await getContactProfile(contact.id);
    expect(profile.data.person.contact_category).toBe("not_assessed");
    expect(profile.data.tasks.filter(task => task.status === "open" && task.task_type === "first_contact")).toHaveLength(1);
  });

  it("creates the initial task through the Evangelism service used by the form", async () => {
    const evangelism = await import("./evangelismService.js");
    const { getContactProfile } = await import("./followUpCrmService.js");
    const dashboard = await getDashboard();
    const created = await evangelism.create({ first_name: "Service intake", contact_date: "2026-09-01", assigned_leader_id: dashboard.data.leaders[0]._id });
    expect(created.error).toBeNull();
    expect(created.data.response).toBe("not_assessed");
    const peopleService = await import("./peopleService.js");
    expect((await peopleService.getById(created.data.id)).data.member_status).toBe("contact");
    const profile = await getContactProfile(created.data.id);
    expect(profile.data.tasks.filter(task => task.status === "open" && task.task_type === "first_contact")).toHaveLength(1);
  });

  it("retains an explicit no-contact closure as an opt-out", async () => {
    const { assignContact, completeTask, getContactProfile } = await import("./followUpCrmService.js");
    const dashboard = await getDashboard();
    const leaderId = dashboard.data.leaders[0]._id;
    const id = "local-simplified-closure";
    await captureLocalEvangelismContact({ id, first_name: "Closure", contact_date: "2026-09-01" });
    const assigned = await assignContact(id, leaderId);
    await completeTask(assigned.data.task._id, { outcome: "positive_conversation", closeContact: true, closeReason: "do_not_contact", skipAutomaticNextTask: true });
    expect((await getContactProfile(id)).data.person.contact_category).toBe("do_not_contact");
    expect((await assignContact(id, leaderId)).error).toBeTruthy();
  });


});
