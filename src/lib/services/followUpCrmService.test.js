import { describe, expect, it } from "vitest";
import { createTask, getDashboard } from "./followUpCrmService.js";

describe("follow-up CRM service", () => {
  it("builds an on-device dashboard when Convex is not configured", async () => {
    const result = await getDashboard();

    expect(result.error).toBeNull();
    expect(result.source).toBe("local");
    expect(result.data.source).toBe("local");
    expect(result.data.leaders.length).toBeGreaterThan(0);
    expect(result.data.attendance_forecast.service_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.data.attendance_forecast.confirmed_guests).toBe(
      result.data.confirmed_commitments.length,
    );
    expect(result.data.upcoming_commitments).toBeInstanceOf(Array);
    expect(result.data.visitation_follow_ups).toBeInstanceOf(Array);
    expect(result.data.quarterly_active_limit).toBe(10);
    expect(result.data.quarterly_backlog_count).toBeGreaterThanOrEqual(0);
    const careTasks = [...result.data.tasks, ...result.data.member_care_tasks]
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
});
