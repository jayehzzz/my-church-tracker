import { describe, expect, it } from "vitest";
import {
  summarizeSundayCommitments,
  sundayReliabilityLabel,
} from "./sundayReliability.js";

describe("Sunday reliability", () => {
  it("separates attendance, no-shows, cancellations and pending yes responses", () => {
    const summary = summarizeSundayCommitments([
      { id: "a", person_id: "p1", gathering_type: "sunday_service", gathering_date: "2026-08-16", response: "yes", resolution: "attended" },
      { id: "b", person_id: "p1", gathering_type: "sunday_service", gathering_date: "2026-08-23", response: "yes", resolution: "no_show" },
      { id: "c", person_id: "p1", gathering_type: "sunday_service", gathering_date: "2026-08-30", response: "yes", resolution: "cancelled" },
      { id: "d", person_id: "p1", gathering_type: "sunday_service", gathering_date: "2026-09-06", response: "yes", resolution: "pending" },
    ]);

    expect(summary).toMatchObject({
      expected: 4,
      attended: 1,
      missed: 1,
      cancelled: 1,
      pending: 1,
      decided: 2,
      follow_through_rate: 50,
      repeated_misses: false,
    });
    expect(sundayReliabilityLabel(summary)).toBe("4 expected · 1 attended · 1 missed · 1 cancelled · 1 pending");
  });

  it("counts one expected Sunday per date and ignores non-yes or non-Sunday plans", () => {
    const summary = summarizeSundayCommitments([
      { id: "pending", gathering_type: "sunday_service", gathering_date: "2026-08-23", response: "yes", resolution: "pending" },
      { id: "resolved", gathering_type: "sunday_service", gathering_date: "2026-08-23", response: "yes", resolution: "attended" },
      { id: "maybe", gathering_type: "sunday_service", gathering_date: "2026-08-30", response: "maybe", resolution: "pending" },
      { id: "bacenta", gathering_type: "bacenta", gathering_date: "2026-08-26", response: "yes", resolution: "no_show" },
    ]);

    expect(summary).toMatchObject({ expected: 1, attended: 1, missed: 0, follow_through_rate: 100 });
    expect(summary.entries).toHaveLength(1);
    expect(summary.entries[0].id).toBe("resolved");
  });
});
