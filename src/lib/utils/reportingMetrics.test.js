import { describe, expect, it } from "vitest";
import {
  completedCareCount,
  isWithinReportingRange,
  prayerHours,
} from "./reportingMetrics.js";
import { buildMeetingAnalytics } from "./meetingAnalytics.js";
import { dataToCSV, exportColumns } from "./exportUtils.js";

const now = new Date("2026-09-05T12:00:00");

describe("reporting definitions", () => {
  it("counts only completed past meetings as held actual attendance", () => {
    const analytics = buildMeetingAnalytics([
      { id: "held", meeting_date: "2026-09-01", status: "completed", attendance_count: 20 },
      { id: "future", meeting_date: "2026-09-12", status: "scheduled", attendance_count: 99 },
    ], [], now);

    expect(analytics.metrics).toMatchObject({ held: 1, totalAttendance: 20, average: 20 });
  });

  it("uses inclusive calendar-day reporting boundaries", () => {
    const range = { startDate: "2026-09-01", endDate: "2026-09-30" };
    expect(isWithinReportingRange("2026-09-01T23:45:00Z", range)).toBe(true);
    expect(isWithinReportingRange("2026-09-30", range)).toBe(true);
    expect(isWithinReportingRange("2026-10-01", range)).toBe(false);
  });

  it("counts prayer duration and successful care only", () => {
    expect(prayerHours([
      { meeting_date: "2026-09-01", status: "completed", meeting_type: "acts_prayer", duration_minutes: 90 },
      { meeting_date: "2026-09-02", status: "completed", meeting_type: "bacenta", duration_minutes: 120 },
      { meeting_date: "2026-09-10", status: "scheduled", meeting_type: "acts_prayer", duration_minutes: 60 },
    ], now)).toBe(1.5);
    expect(completedCareCount([
      { status: "completed", outcome: "welcomed_encouraged" },
      { status: "unsuccessful", outcome: "not_home" },
      { status: "cancelled", outcome: "welcomed_encouraged" },
    ])).toBe(1);
  });

  it("deduplicates repeat first-timer attendance and protects CSV cells", () => {
    const analytics = buildMeetingAnalytics([
      { meeting_date: "2026-09-01", status: "completed", attendance_records: [{ person_id: "p1", first_timer: true }] },
      { meeting_date: "2026-09-02", status: "completed", attendance_records: [{ person_id: "p1", first_timer: true }] },
    ], [], now);
    expect(analytics.metrics.firstTimers).toBe(1);
    const csv = dataToCSV([{ first_name: "=SUM(A1:A2)", phone: "07123456789" }], exportColumns.people);
    expect(csv).toContain("'=SUM(A1:A2)");
    expect(csv).toContain("'07123456789");
  });
});
