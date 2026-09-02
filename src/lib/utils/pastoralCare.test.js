import { describe, expect, it } from "vitest";
import {
  buildAttendanceCareSignals,
  buildCareCandidates,
  enrichCareTasks,
  findConsecutiveAbsences,
  formatInteraction,
  formatOutcome,
  isOpenCareTask,
  splitCareTasks,
} from "./pastoralCare.js";

const people = [
  { id: "p1", first_name: "Ama", last_name: "Owusu", member_status: "member", activity_status: "dormant" },
  { id: "p2", first_name: "Kofi", last_name: "Mensah", member_status: "guest", activity_status: "regular", first_visit_date: "2026-08-20" },
  { id: "l1", first_name: "Grace", last_name: "Boateng", member_status: "leader", activity_status: "regular" },
];

describe("pastoral care logic", () => {
  it("turns profile signals into deduplicated care candidates", () => {
    const candidates = buildCareCandidates({
      people,
      visitations: [],
      tasks: [{ person_id: "p2", task_type: "visitation", status: "open" }],
      attendanceSignals: [{
        person_id: "p1",
        signal_type: "dormant",
        attended_count: 0,
        service_count: 6,
      }],
      today: "2026-09-01",
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ person_id: "p1", priority: "urgent", signal_type: "dormant" });
  });

  it("does not suggest a guest before the three-day welcome threshold", () => {
    const candidates = buildCareCandidates({
      people: [{ ...people[1], first_visit_date: "2026-08-31" }],
      visitations: [],
      tasks: [],
      today: "2026-09-01",
    });
    expect(candidates).toEqual([]);
  });

  it("detects regular members missing the two latest Sunday services", () => {
    const absences = findConsecutiveAbsences({
      people: [
        { id: "p1", member_status: "member", activity_status: "regular" },
        { id: "p2", member_status: "member", activity_status: "regular" },
      ],
      services: [
        { id: "s1", service_type: "sunday_service", service_date: "2026-08-30" },
        { id: "s2", service_type: "sunday_service", service_date: "2026-08-23" },
      ],
      attendance: [
        { service_id: "s1", person_id: "p2" },
        { service_id: "s2", person_id: "p2" },
      ],
      today: "2026-09-01",
    });
    expect(absences).toEqual(["p1"]);
  });

  it("derives measurable care signals from six Sunday services", () => {
    const services = [1, 2, 3, 4, 5, 6].map((week) => ({
      id: `s${week}`,
      service_type: "sunday_service",
      service_date: `2026-08-${String(31 - week).padStart(2, "0")}`,
    }));
    const signalPeople = [
      { id: "none", member_status: "member" },
      { id: "low", member_status: "member" },
      { id: "recent-gap", member_status: "leader" },
    ];
    const attendance = [
      ...["s1", "s2", "s3"].map((service_id) => ({ service_id, person_id: "low" })),
      ...["s3", "s4", "s5", "s6"].map((service_id) => ({ service_id, person_id: "recent-gap" })),
    ];

    expect(buildAttendanceCareSignals({
      people: signalPeople,
      services,
      attendance,
      today: "2026-09-01",
    })).toEqual([
      {
        person_id: "none",
        signal_type: "dormant",
        attended_count: 0,
        service_count: 6,
        missed_latest_two: true,
      },
      {
        person_id: "low",
        signal_type: "irregular",
        attended_count: 3,
        service_count: 6,
        missed_latest_two: false,
      },
      {
        person_id: "recent-gap",
        signal_type: "missed_sundays",
        attended_count: 4,
        service_count: 6,
        missed_latest_two: true,
      },
    ]);
  });

  it("labels absence and guest signals and suppresses recently completed care", () => {
    const candidates = buildCareCandidates({
      people: [
        { id: "p1", member_status: "member", activity_status: "regular" },
        { id: "p2", member_status: "guest", activity_status: "regular", first_visit_date: "2026-08-20" },
        { id: "p3", member_status: "member", activity_status: "irregular" },
      ],
      visitations: [{ person_id: "p3", visit_date: "2026-08-30" }],
      tasks: [],
      recentAbsencePersonIds: ["p1"],
      today: "2026-09-01",
    });

    expect(candidates.map((candidate) => candidate.signal_type)).toEqual([
      "missed_sundays",
      "new_guest",
    ]);
  });

  it("splits the shared task queue by due state", () => {
    const tasks = [
      { id: "t1", person_id: "p1", task_type: "visitation", status: "open", due_date: "2026-08-31" },
      { id: "t2", person_id: "p1", task_type: "member_care", status: "open", due_date: "2026-09-01" },
      { id: "t3", person_id: "p2", task_type: "visitation", status: "open", due_date: "2026-09-03" },
      { id: "t4", person_id: "p2", task_type: "follow_up", status: "open", due_date: "2026-09-01" },
    ];
    const groups = splitCareTasks(tasks, "2026-09-01");
    expect(groups.overdue.map((task) => task.id)).toEqual(["t1"]);
    expect(groups.dueToday.map((task) => task.id)).toEqual(["t2"]);
    expect(groups.upcoming.map((task) => task.id)).toEqual(["t3"]);
  });

  it("enriches tasks with their linked profile and leader", () => {
    const [task] = enrichCareTasks([
      { id: "t1", person_id: "p1", assigned_leader_id: "l1", task_type: "visitation", status: "open" },
    ], people);
    expect(task.person.first_name).toBe("Ama");
    expect(task.assigned_leader.first_name).toBe("Grace");
    expect(isOpenCareTask(task)).toBe(true);
  });

  it("uses consistent human-readable care labels", () => {
    expect(formatInteraction("phone_call")).toBe("Phone call");
    expect(formatOutcome("prayer_request_received")).toBe("Prayer request");
  });
});
