import { describe, expect, it } from "vitest";
import {
  buildMeetingAnalytics,
  filterMeetingRecords,
  percentageChange,
  previousDateRange,
} from "./meetingAnalytics.js";

const people = [
  { id: "p1", first_name: "A", member_status: "guest" },
  { id: "p2", first_name: "B", member_status: "member" },
  { id: "p3", first_name: "C", member_status: "member" },
];

const programs = [
  {
    id: "bacenta-a",
    name: "Bacenta A",
    category: "bacenta",
    member_ids: ["p2", "p3"],
    leader_ids: ["p3"],
  },
];

const meetings = [
  {
    id: "m1",
    program_id: "bacenta-a",
    program: programs[0],
    meeting_type: "bacenta",
    meeting_date: "2026-08-03",
    format: "in_person",
    status: "completed",
    unnamed_guests_count: 1,
    attendance_records: [
      { person_id: "p1", status: "present", first_timer: true, first_program_attendance: true },
      { person_id: "p2", status: "present", first_program_attendance: true },
    ],
  },
  {
    id: "m2",
    program_id: "bacenta-a",
    program: programs[0],
    meeting_type: "bacenta",
    meeting_date: "2026-08-10",
    format: "in_person",
    status: "completed",
    attendance_records: [
      { person_id: "p1", status: "present" },
      { person_id: "p2", status: "present" },
      { person_id: "p3", status: "present", first_program_attendance: true },
    ],
  },
  {
    id: "m3",
    title: "Outreach Day",
    meeting_type: "evangelistic_event",
    meeting_date: "2026-08-17",
    format: "in_person",
    status: "attendance_needed",
    attendance_records: [{ person_id: "p1", status: "present" }],
  },
];

describe("meeting analytics", () => {
  it("combines attendance, programme-firsts, return rate, and roster rate", () => {
    const analytics = buildMeetingAnalytics(meetings, programs);

    expect(analytics.metrics.held).toBe(2);
    expect(analytics.metrics.totalAttendance).toBe(6);
    expect(analytics.metrics.uniquePeople).toBe(3);
    expect(analytics.metrics.firstTimers).toBe(1);
    expect(analytics.metrics.returnRate).toBe(100);
    expect(analytics.peopleComposition[1].personIds).toEqual(["p2", "p3"]);
    expect(analytics.rosterData[0].rosterRate).toBe(75);
  });

  it("filters by programme, milestone, guest recording, person, and range", () => {
    const filtered = filterMeetingRecords(
      meetings,
      {
        program: "bacenta-a",
        milestone: "first_timer",
        guestRecording: "both",
        person: "p1",
        minAttendance: 3,
      },
      {
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        programs,
        people,
      },
    );

    expect(filtered.map((meeting) => meeting.id)).toEqual(["m1"]);
  });

  it("calculates the matching previous date window and percentage change", () => {
    expect(
      previousDateRange({ startDate: "2026-08-01", endDate: "2026-08-31" }),
    ).toEqual({ startDate: "2026-07-01", endDate: "2026-07-31" });
    expect(percentageChange(12, 10)).toBe(20);
    expect(percentageChange(3, 0)).toBe(100);
  });
});
