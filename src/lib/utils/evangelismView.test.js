import { describe, expect, it } from "vitest";
import {
  buildEvangelismRows,
  filterEvangelismRows,
  formatResponse,
  isWithinDateRange,
  monthlyOutreach,
  outreachMetrics,
  topInviters,
} from "./evangelismView.js";

const contacts = [
  {
    id: "c1", first_name: "Ama", last_name: "Mensah", contact_date: "2026-08-20",
    response: "responsive", invited_by_id: "p1", inviter_ids: ["p1", "p2"],
    outreach_salvation_decision: true, outreach_salvation_date: "2026-08-20",
    outreach_salvation_source: "evangelism_outreach", first_visit_date: "2026-08-23",
  },
  {
    id: "c2", first_name: "Kojo", last_name: "Asare", contact_date: "2026-07-04",
    response: "responsive", invited_by_id: "p1", member_status: "member", membership_date: "2026-07-20",
  },
  {
    id: "c3", first_name: "Esi", last_name: "Owusu", contact_date: "2026-08-28",
    response: "has_church", invited_by_id: "p2", member_status: "contact", converted: true,
  },
  {
    id: "c4", first_name: "Yaw", last_name: "Boateng", contact_date: "2026-08-10",
    response: "responsive", invited_by_id: "p1", member_status: "contact", salvation_decision: true,
  },
];

const people = [
  { id: "p1", first_name: "Samuel", last_name: "Owusu" },
  { id: "p2", first_name: "Grace", last_name: "Mensah" },
];

describe("evangelism view model", () => {
  it("builds journey and follow-up labels without hiding historical contacts", () => {
    const rows = buildEvangelismRows(contacts, people, {
      active_assignments: [{ person_id: "c1", assigned_leader_id: "p2" }],
      tasks: [{ person_id: "c1", status: "open", due_date: "2026-09-05" }],
      contacts: [{
        _id: "c1",
        sunday_reliability: {
          expected: 4, attended: 2, missed: 1, cancelled: 1, pending: 0,
          decided: 3, follow_through_rate: 67, repeated_misses: false,
        },
      }],
      unassigned_contacts: [],
    }, new Date("2026-09-01T12:00:00"));

    expect(rows.map((row) => row.id)).toEqual(["c3", "c1", "c4", "c2"]);
    expect(rows.find((row) => row.id === "c1")).toMatchObject({
      invited_by_name: "Samuel Owusu",
      journey_key: "guest",
      journey_label: "Guest",
      outreach_salvation_decision: true,
      follow_up_key: "scheduled",
      sunday_reliability_label: "4 expected · 2 attended · 1 missed · 1 cancelled",
    });
    expect(rows.find((row) => row.id === "c2")).toMatchObject({ journey_key: "joined", follow_up_key: "complete" });
    expect(rows.find((row) => row.id === "c3")).toMatchObject({ journey_key: "outreach", journey_label: "Outreach Contact", follow_up_key: "closed" });
    expect(rows.find((row) => row.id === "c4")).toMatchObject({
      journey_key: "outreach",
      journey_label: "Outreach Contact",
      outreach_salvation_decision: true,
      outreach_salvation_source: "legacy_salvation_decision",
    });
  });

  it("filters the directory by outreach concepts", () => {
    const rows = buildEvangelismRows(contacts, people, {}, new Date("2026-09-01T12:00:00"));
    expect(filterEvangelismRows(rows, { journeys: ["joined"] }).map((row) => row.id)).toEqual(["c2"]);
    expect(filterEvangelismRows(rows, { responses: ["responsive"], journeys: ["guest"] }).map((row) => row.id)).toEqual(["c1"]);
    expect(filterEvangelismRows(rows, { responses: ["responsive"], journeys: ["outreach"] }).map((row) => row.id)).toEqual(["c4"]);
  });

  it("applies the date range only to insight calculations", () => {
    const rows = buildEvangelismRows(contacts, people, {}, new Date("2026-09-01T12:00:00"));
    const august = rows.filter((row) => isWithinDateRange(row.contact_date, {
      startDate: "2026-08-01", endDate: "2026-08-31",
    }));

    expect(august).toHaveLength(3);
    expect(outreachMetrics(august)).toEqual({ reached: 3, saved: 2, visited: 1, joined: 0 });
    expect(monthlyOutreach(rows)).toEqual([
      { month: "7", year: 2026, count: 1, saved: 0, visited: 0, joined: 1 },
      { month: "8", year: 2026, count: 3, saved: 2, visited: 1, joined: 0 },
    ]);
  });

  it("ranks inviters by connections and joined contacts", () => {
    expect(topInviters(contacts, people)).toEqual([
      { id: "p1", name: "Samuel Owusu", count: 3, joined: 1 },
      { id: "p2", name: "Grace Mensah", count: 2, joined: 0 },
    ]);
  });

  it("uses neutral follow-up wording before a posture is assessed", () => {
    expect(formatResponse("not_assessed")).toBe("Not assessed");
  });
});
