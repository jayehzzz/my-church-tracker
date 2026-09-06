import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let createTask;
let getDashboard;

beforeAll(async () => {
  vi.stubEnv("VITE_CONVEX_URL", "");
  vi.stubEnv("VITE_APP_ENV", "development");
  vi.stubEnv("VITE_APP_MODE", "demo");
  ({ createTask, getDashboard } = await import("./followUpCrmService.js"));
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
    expect(result.data.attendance_forecast.confirmed_guests).toBe(
      result.data.confirmed_commitments.length,
    );
    expect(result.data.upcoming_commitments).toBeInstanceOf(Array);
    expect(result.data.sunday_commitments).toBeInstanceOf(Array);
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

  it("creates a recovery task when a Sunday commitment is resolved as no_show", async () => {
    const { resolveCommitment, getDashboard } = await import("./followUpCrmService.js");
    const dashboard = await getDashboard();
    const commitment = dashboard.data.sunday_commitments.find((c) => c.resolution === "pending" || !c.resolution);
    if (commitment) {
      const result = await resolveCommitment(commitment._id || commitment.id, "no_show");
      expect(result.error).toBeNull();
      expect(result.data.resolution).toBe("no_show");

      const refreshed = await getDashboard();
      const recoveryTask = refreshed.data.tasks.find(
        (t) => String(t.person_id) === String(commitment.person_id) && t.reason?.includes("Missed Sunday"),
      );
      expect(recoveryTask).toBeDefined();
    }
  });
});
