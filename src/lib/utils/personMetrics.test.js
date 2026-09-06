import { describe, expect, it } from "vitest";
import {
  CHURCH_SCHOOL_OPTIONS,
  formatChurchRole,
  formatDegreeStatus,
  normalizeCompletedSchools,
} from "./personMetrics.js";

describe("person metrics", () => {
  it("exposes the canonical church school checklist", () => {
    expect(CHURCH_SCHOOL_OPTIONS).toHaveLength(8);
    expect(CHURCH_SCHOOL_OPTIONS.map((school) => school.label)).toContain(
      "Proof of Shepherding Exams",
    );
  });

  it("normalizes the legacy singular shepherding exam value", () => {
    expect(
      normalizeCompletedSchools([
        "proof_of_shepherding_exam",
        "proof_of_shepherding_exams",
        "unknown_school",
      ]),
    ).toEqual(["proof_of_shepherding_exams"]);
  });

  it("formats church role and degree values", () => {
    expect(formatChurchRole("basonta")).toBe("Basonta");
    expect(formatDegreeStatus("degree_completed")).toBe("Degree Completed");
  });
});
