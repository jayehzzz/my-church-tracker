import { describe, expect, it } from "vitest";
import { completedSundayWindow, recentMissedSundayPeople } from "./missedSundayHistory.js";

describe("missed Sunday history window", () => {
  it("uses the four most recent completed Sundays and skips today when it is Sunday", () => {
    expect(completedSundayWindow("2026-09-24")).toEqual({ start: "2026-08-30", end: "2026-09-20" });
    expect(completedSundayWindow("2026-09-27")).toEqual({ start: "2026-08-30", end: "2026-09-20" });
  });

  it("keeps people with a miss in range and excludes older misses", () => {
    const people = [
      { person_id: "recent", missed_sundays: [{ gathering_date: "2026-09-13" }] },
      { person_id: "old", missed_sundays: [{ gathering_date: "2026-08-23" }] },
    ];
    expect(recentMissedSundayPeople(people, "2026-09-24").map(row => row.person_id)).toEqual(["recent"]);
  });
});
