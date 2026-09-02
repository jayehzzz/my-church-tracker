import { describe, expect, it } from "vitest";
import {
  buildAttendanceData,
  resolveServiceCounts,
  summarizeNamedAttendance,
  validateServiceCounts,
  validateServiceSetup,
} from "./serviceRecording.js";

const people = [
  { id: "p1", first_name: "Ama", member_status: "member" },
  { id: "p2", first_name: "Kojo", member_status: "guest" },
];

describe("service recording", () => {
  it("summarizes named check-ins and their recorded outcomes", () => {
    const summary = summarizeNamedAttendance(new Set(["p1", "p2"]), {
      p1: { gave_tithe: true },
      p2: { first_timer: true, made_salvation_decision: true },
    }, people);

    expect(summary).toEqual({ named: 2, guests: 1, firstTimers: 1, salvationDecisions: 1, tithers: 1 });
  });

  it("uses named records as sensible defaults while allowing a larger headcount", () => {
    const summary = { named: 2, guests: 1, firstTimers: 1, salvationDecisions: 1, tithers: 1 };
    expect(resolveServiceCounts({ total_attendance: "", guests_count: "4", salvation_decisions: "", tithers_count: "" }, summary)).toEqual({
      total_attendance: 2, guests_count: 4, salvation_decisions: 1, tithers_count: 1,
    });
  });

  it("prevents aggregate totals from contradicting named attendance", () => {
    const summary = { named: 5, guests: 2, firstTimers: 1, salvationDecisions: 1, tithers: 2 };
    expect(validateServiceCounts({ total_attendance: 4, guests_count: 5, salvation_decisions: 0, tithers_count: 1 }, summary)).toEqual({
      total_attendance: "Cannot be lower than 5 named check-ins",
      guests_count: "Guest count cannot exceed total attendance",
      salvation_decisions: "Cannot be lower than 1 named decisions",
      tithers_count: "Cannot be lower than 2 named tithers",
    });
  });

  it("validates setup and builds attendance payloads", () => {
    expect(validateServiceSetup({ service_date: "", service_type: "" })).toEqual({
      service_date: "Service date is required", service_type: "Service type is required",
    });
    expect(buildAttendanceData(new Set(["p1"]), { p1: { first_timer: true } })).toEqual([{
      person_id: "p1", gave_tithe: false, made_salvation_decision: false, first_timer: true,
    }]);
  });
});
