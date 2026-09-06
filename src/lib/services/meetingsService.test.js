import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let meetingsService;
let mockPeople;

beforeAll(async () => {
  vi.stubEnv("VITE_CONVEX_URL", "");
  vi.stubEnv("VITE_APP_ENV", "development");
  vi.stubEnv("VITE_APP_MODE", "demo");
  meetingsService = await import("./meetingsService.js");
  ({ mockPeople } = await import("../data/mockData.js"));
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("meetingsService attendance overhaul", () => {
  it("normalizes renamed Flow and Acts meeting types", async () => {
    const result = await meetingsService.getAll();
    expect(result.error).toBeNull();
    expect(result.data.some((meeting) => meeting.meeting_type === "flow_service")).toBe(true);
    expect(result.data.some((meeting) => meeting.meeting_type === "acts_prayer")).toBe(true);
    expect(result.data.some((meeting) => meeting.meeting_type === "farley_prayer")).toBe(false);
  });

  it("syncs named attendance without duplicates and includes unnamed guests", async () => {
    const created = await meetingsService.create({
      program_id: "mp-bacenta-main",
      meeting_type: "bacenta",
      meeting_date: "2026-09-01",
      format: "in_person",
      status: "attendance_needed",
    });
    const meetingId = created.data.id;
    const [firstPerson, secondPerson] = mockPeople;

    const synced = await meetingsService.syncAttendance(
      meetingId,
      [
        { person_id: firstPerson.id, status: "present" },
        { person_id: firstPerson.id, status: "present" },
        { person_id: secondPerson.id, status: "present" },
      ],
      1,
      true,
    );

    expect(synced.error).toBeNull();
    expect(synced.data.named_attendance_count).toBe(2);
    expect(synced.data.display_attendance_count).toBe(3);
    expect(synced.data.status).toBe("completed");

    const history = await meetingsService.getByPerson(firstPerson.id);
    expect(history.data.some((record) => record.meeting.id === meetingId)).toBe(true);

    await meetingsService.remove(meetingId);
  });

  it("keeps first-ever attendance separate from first programme attendance", async () => {
    const programmeId = "test-program-first-attendance";
    const personId = mockPeople[0].id;
    const first = await meetingsService.create({
      program_id: programmeId,
      meeting_type: "bacenta",
      meeting_date: "2026-09-02",
      format: "in_person",
    });
    const second = await meetingsService.create({
      program_id: programmeId,
      meeting_type: "bacenta",
      meeting_date: "2026-09-09",
      format: "in_person",
    });

    await meetingsService.syncAttendance(
      first.data.id,
      [{ person_id: personId, status: "present", first_timer: false }],
      0,
      true,
    );
    await meetingsService.syncAttendance(
      second.data.id,
      [{ person_id: personId, status: "present", first_timer: false }],
      0,
      true,
    );

    const firstAttendance = await meetingsService.getAttendees(first.data.id);
    const secondAttendance = await meetingsService.getAttendees(second.data.id);
    expect(firstAttendance.data[0].first_timer).toBe(false);
    expect(firstAttendance.data[0].first_program_attendance).toBe(true);
    expect(secondAttendance.data[0].first_program_attendance).toBe(false);

    await meetingsService.remove(first.data.id);
    await meetingsService.remove(second.data.id);
  });

  it("records a named one-off event without creating a programme", async () => {
    const created = await meetingsService.create({
      title: "Community Evangelistic Day",
      meeting_type: "evangelistic_event",
      meeting_date: "2026-09-13",
      format: "in_person",
      location: "Town Hall",
    });

    expect(created.error).toBeNull();
    expect(created.data.title).toBe("Community Evangelistic Day");
    expect(created.data.program_id).toBeUndefined();
    expect(created.data.meeting_type).toBe("evangelistic_event");

    await meetingsService.remove(created.data.id);
  });
});
