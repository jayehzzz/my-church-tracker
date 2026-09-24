import { describe, expect, it } from "vitest";
import { serviceAttendanceMetrics, summarizeAverageAttendanceMix, summarizeServicePeriod } from "./serviceAnalytics.js";

describe("serviceAttendanceMetrics", () => {
  it("never reports zero guests when first-timer attendance proves guest visits", () => {
    const service = { id: "s1", total_attendance: 6, guests_count: 0, tithers_count: 0, salvation_decisions: 0 };
    const attendance = [
      { service_id: "s1", person_id: "p1", first_timer: true, gave_tithe: false },
      { service_id: "s1", person_id: "p2", first_timer: false, gave_tithe: true },
    ];

    expect(serviceAttendanceMetrics(service, attendance)).toMatchObject({
      totalAttendance: 6,
      guestAttendance: 1,
      returningGuestAttendance: 0,
      memberAttendance: 5,
      firstTimers: 1,
      tithers: 1,
    });
  });

  it("uses the stored aggregate when it is higher than the named evidence", () => {
    const service = { id: "s1", total_attendance: 10, guests_count: 4, tithers_count: 3, salvation_decisions: 2 };
    expect(serviceAttendanceMetrics(service, [])).toMatchObject({
      totalAttendance: 10,
      guestAttendance: 4,
      returningGuestAttendance: 0,
      unclassifiedNonMemberAttendance: 4,
      memberAttendance: 6,
      tithers: 3,
      decisions: 2,
    });
  });

  it("keeps period totals reconciled", () => {
    const services = [
      { id: "s1", total_attendance: 6, guests_count: 0 },
      { id: "s2", total_attendance: 8, guests_count: 2 },
    ];
    const attendance = [{ service_id: "s1", person_id: "p1", first_timer: true }];
    expect(summarizeServicePeriod(services, attendance)).toMatchObject({
      totalAttendance: 14,
      guestAttendance: 3,
      returningGuestAttendance: 0,
      unclassifiedNonMemberAttendance: 2,
      memberAttendance: 11,
      firstTimers: 1,
      serviceCount: 2,
    });
  });

  it("uses per-gathering averages for attendance mix instead of cumulative attendance", () => {
    const services = [
      { id: "s1", total_attendance: 10, guests_count: 2, tithers_count: 4 },
      { id: "s2", total_attendance: 14, guests_count: 4, tithers_count: 6 },
    ];

    expect(summarizeAverageAttendanceMix(services)).toEqual({
      averageAttendance: 12,
      averageMembers: 9,
      averageGuests: 3,
      averageReturningGuests: 0,
      averageUnclassifiedNonMembers: 3,
      averageFirstTimers: 0,
      averageTithers: 5,
      memberPct: 75,
      guestPct: 25,
      returningGuestPct: 0,
      unclassifiedNonMemberPct: 25,
      firstTimerPct: 0,
      titherRate: 56,
      serviceCount: 2,
    });
  });

  it("separates first timers from returning guests in visible reporting", () => {
    const services = [{ id: "s1", total_attendance: 10, guests_count: 4 }];
    const attendance = [
      { service_id: "s1", person_id: "p1", first_timer: true },
      { service_id: "s1", person_id: "p2", first_timer: false },
    ];
    const people = [
      { id: "p1", member_status: "guest" },
      { id: "p2", member_status: "guest" },
    ];

    expect(serviceAttendanceMetrics(services[0], attendance, people)).toMatchObject({
      guestAttendance: 4,
      returningGuestAttendance: 1,
      unclassifiedNonMemberAttendance: 2,
      firstTimers: 1,
    });
    expect(summarizeAverageAttendanceMix(services, attendance, people)).toMatchObject({
      averageMembers: 6,
      averageReturningGuests: 1,
      averageUnclassifiedNonMembers: 2,
      averageFirstTimers: 1,
      memberPct: 60,
      returningGuestPct: 10,
      unclassifiedNonMemberPct: 20,
      firstTimerPct: 10,
    });
  });
});
