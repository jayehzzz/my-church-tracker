import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/svelte";
import WeeklyAttendanceMatrix from "./WeeklyAttendanceMatrix.svelte";

const people = [
  {
    id: "person-1",
    first_name: "Ama",
    last_name: "Mensah",
    member_status: "member",
    activity_status: "regular",
    membership_date: "2025-01-01",
  },
  {
    id: "person-2",
    first_name: "Daniel",
    last_name: "Brown",
    member_status: "leader",
    activity_status: "regular",
    membership_date: "2025-01-01",
  },
  {
    id: "person-3",
    first_name: "Guest",
    last_name: "Person",
    member_status: "guest",
    activity_status: "regular",
  },
];

const services = [
  {
    id: "service-2",
    service_date: "2026-08-30",
    service_type: "sunday_service",
    individuals: ["person-2", "person-3"],
  },
  {
    id: "service-1",
    service_date: "2026-08-23",
    service_type: "sunday_service",
    individuals: ["person-1", "person-2"],
  },
];

describe("WeeklyAttendanceMatrix", () => {
  it("shows expected people and identifies who missed each Sunday", () => {
    const { getByRole, queryByText } = render(WeeklyAttendanceMatrix, {
      props: { services, people },
    });

    expect(
      getByRole("button", { name: "Open Ama Mensah attendance summary" }),
    ).toBeDefined();
    expect(
      getByRole("button", {
        name: "Ama Mensah missed Sun, 30 Aug 2026",
      }),
    ).toBeDefined();
    expect(
      getByRole("button", {
        name: "Daniel Brown was here on Sun, 30 Aug 2026",
      }),
    ).toBeDefined();
    expect(queryByText("Guest Person")).toBeNull();
  });

  it("opens the selected service from an attendance cell", async () => {
    const onServiceClick = vi.fn();
    const { getByRole } = render(WeeklyAttendanceMatrix, {
      props: { services, people, onServiceClick },
    });

    await fireEvent.click(
      getByRole("button", {
        name: "Ama Mensah missed Sun, 30 Aug 2026",
      }),
    );
    expect(onServiceClick).toHaveBeenCalledWith(services[0]);
  });

  it("offers explicit older and newer controls when more Sundays are loaded than fit", () => {
    const { getByRole } = render(WeeklyAttendanceMatrix, {
      props: { services, people, initialServiceCount: 1 },
    });

    expect(getByRole("button", { name: "Scroll to older Sundays" })).toBeDefined();
    expect(getByRole("button", { name: "Scroll to newer Sundays" })).toBeDefined();
  });

  it("can limit the matrix to a recent Sunday period", async () => {
    const sixSundays = [
      ["2026-08-02", ["person-1"]],
      ["2026-08-09", ["person-2"]],
      ["2026-08-16", ["person-1"]],
      ["2026-08-23", ["person-1", "person-2"]],
      ["2026-08-30", ["person-2"]],
      ["2026-09-06", ["person-1"]],
    ].map(([service_date, individuals], index) => ({
      id: `period-${index}`,
      service_date,
      service_type: "sunday_service",
      individuals,
    }));
    const { getByLabelText, getByRole, queryByRole } = render(WeeklyAttendanceMatrix, {
      props: { services: sixSundays, people, maxServices: 24 },
    });

    await fireEvent.change(getByLabelText("Attendance history period"), {
      target: { value: "4" },
    });

    expect(getByRole("button", { name: "Ama Mensah was here on Sun, 6 Sept 2026" })).toBeDefined();
    expect(queryByRole("button", { name: "Ama Mensah was here on Sun, 2 Aug 2026" })).toBeNull();
  });

  it("switches history to all available when the fit count grows past the selected period", async () => {
    const twelveSundays = [
      "2026-06-21", "2026-06-28", "2026-07-05", "2026-07-12",
      "2026-07-19", "2026-07-26", "2026-08-02", "2026-08-09",
      "2026-08-16", "2026-08-23", "2026-08-30", "2026-09-06",
    ].map((service_date, index) => ({
      id: `history-${index}`,
      service_date,
      service_type: "sunday_service",
      individuals: ["person-1", "person-2"],
    }));
    const { getByLabelText, getByRole } = render(WeeklyAttendanceMatrix, {
      props: { services: twelveSundays, people, maxServices: 24, initialServiceCount: 8 },
    });

    await fireEvent.change(getByLabelText("Attendance history period"), {
      target: { value: "8" },
    });
    expect(getByLabelText("Attendance history period").value).toBe("8");

    await fireEvent.click(getByRole("button", { name: "Show one more Sunday" }));

    expect(getByLabelText("Attendance history period").value).toBe("all");
    expect(getByLabelText("Sundays fitting in view").value).toBe("9");
  });

  it("shows last attendance and resolved expected-Sunday misses", () => {
    const { getByRole, getAllByText } = render(WeeklyAttendanceMatrix, {
      props: { services, people },
    });

    expect(getByRole("columnheader", { name: "Last here / expected misses" })).toBeDefined();
    expect(getAllByText("23 Aug").length).toBeGreaterThan(0);
    expect(getAllByText("No resolved yeses").length).toBeGreaterThan(0);
  });

  it("does not infer absences when named attendance was not recorded", () => {
    const { getByText } = render(WeeklyAttendanceMatrix, {
      props: {
        people,
        services: [
          {
            id: "service-empty",
            service_date: "2026-08-30",
            service_type: "sunday_service",
            individuals: [],
          },
        ],
      },
    });

    expect(getByText("No weekly people pattern yet")).toBeDefined();
  });

  it("uses imported attendance history when a member record was created after the service dates", () => {
    const importedPerson = {
      id: "imported-member",
      first_name: "Imported",
      last_name: "Member",
      member_status: "member",
      activity_status: "regular",
      created_at: "2026-09-09T12:00:00.000Z",
    };
    const importedServices = [
      {
        id: "imported-service-1",
        service_date: "2026-08-23",
        service_type: "sunday_service",
        individuals: [{ id: "imported-member", first_name: "Imported", last_name: "Member" }],
      },
      {
        id: "imported-service-2",
        service_date: "2026-08-30",
        service_type: "sunday_service",
        individuals: [],
      },
    ];

    const { getByRole } = render(WeeklyAttendanceMatrix, {
      props: { services: importedServices, people: [importedPerson] },
    });

    expect(getByRole("button", { name: "Open Imported Member attendance summary" })).toBeDefined();
  });

  it("searches people and filters attendance status", async () => {
    const { getByLabelText, getByText, queryByText } = render(
      WeeklyAttendanceMatrix,
      { props: { services, people } },
    );

    await fireEvent.input(getByLabelText("Search people"), {
      target: { value: "Ama" },
    });
    expect(getByText("Ama Mensah")).toBeDefined();
    expect(queryByText("Daniel Brown")).toBeNull();

    await fireEvent.input(getByLabelText("Search people"), {
      target: { value: "" },
    });
    await fireEvent.change(getByLabelText("Attendance"), {
      target: { value: "present" },
    });
    expect(getByText("Daniel Brown")).toBeDefined();
    expect(queryByText("Ama Mensah")).toBeNull();
  });

  it("focuses on a specific Sunday and sorts the visible people", async () => {
    const { getByLabelText, getAllByRole, getByRole, queryByRole } = render(
      WeeklyAttendanceMatrix,
      { props: { services, people } },
    );

    await fireEvent.change(getByLabelText("Sunday"), {
      target: { value: "service-2" },
    });
    expect(
      getByRole("button", {
        name: "Ama Mensah missed Sun, 30 Aug 2026",
      }),
    ).toBeDefined();
    expect(
      queryByRole("button", {
        name: "Ama Mensah was here on Sun, 23 Aug 2026",
      }),
    ).toBeNull();

    await fireEvent.change(getByLabelText("Sort"), {
      target: { value: "name_desc" },
    });
    const personButtons = getAllByRole("button").filter((button) =>
      button.getAttribute("aria-label")?.startsWith("Open ")
      && button.getAttribute("aria-label")?.endsWith(" attendance summary"),
    );
    expect(personButtons[0]).toHaveTextContent("Daniel Brown");
  });

  it("keeps the date header sticky and opens a person attendance summary from the row", async () => {
    if (!Element.prototype.animate) {
      Element.prototype.animate = () => ({
        cancel() {},
        finish() {},
        play() {},
        pause() {},
        reverse() {},
        currentTime: 0,
        onfinish: null,
      });
    }
    const { getByRole, getByText } = render(WeeklyAttendanceMatrix, {
      props: { services, people },
    });

    expect(getByRole("columnheader", { name: "Person" }).classList.contains("top-0")).toBe(true);
    const row = getByText("Ama Mensah").closest("tr");
    expect(row).toBeTruthy();
    await fireEvent.click(row);

    expect(getByRole("heading", { name: "Ama Mensah · Sunday attendance" })).toBeDefined();
    expect(getByText("Attendance rate")).toBeDefined();
    expect(getByText("Sunday-by-Sunday history")).toBeDefined();
  });

  it("shows explicit expected-Sunday follow-through separately from inferred attendance", async () => {
    if (!Element.prototype.animate) {
      Element.prototype.animate = () => ({ cancel() {}, finish() {}, play() {}, pause() {}, reverse() {} });
    }
    const commitments = [
      { id: "yes-attended", person_id: "person-1", gathering_type: "sunday_service", gathering_date: "2026-08-16", response: "yes", resolution: "attended" },
      { id: "yes-missed", person_id: "person-1", gathering_type: "sunday_service", gathering_date: "2026-08-23", response: "yes", resolution: "no_show" },
      { id: "yes-cancelled", person_id: "person-1", gathering_type: "sunday_service", gathering_date: "2026-08-30", response: "yes", resolution: "cancelled" },
    ];
    const { getByText, getByRole } = render(WeeklyAttendanceMatrix, {
      props: { services, people, commitments },
    });

    await fireEvent.click(getByText("Ama Mensah").closest("tr"));
    const dialog = within(getByRole("dialog"));

    expect(dialog.getByRole("region", { name: "Sunday follow-through" })).toBeDefined();
    expect(dialog.getByText("Expected Sundays")).toBeDefined();
    expect(dialog.getByText("50% kept")).toBeDefined();
    expect(dialog.getByText("Missed when expected: 1/2")).toBeDefined();
    expect(dialog.getByText(/Cancellations stay in the expected total/)).toBeDefined();
  });

  it("opens the same attendance modal when the person's name is clicked", async () => {
    if (!Element.prototype.animate) {
      Element.prototype.animate = () => ({ cancel() {}, finish() {}, play() {}, pause() {}, reverse() {} });
    }
    const { getByRole } = render(WeeklyAttendanceMatrix, {
      props: { services, people },
    });

    await fireEvent.click(getByRole("button", { name: "Open Ama Mensah attendance summary" }));

    expect(getByRole("heading", { name: "Ama Mensah · Sunday attendance" })).toBeDefined();
  });

  it("explains inferred attendance scope for fresh imports instead of presenting it as entered expected Sundays", async () => {
    if (!Element.prototype.animate) {
      Element.prototype.animate = () => ({ cancel() {}, finish() {}, play() {}, pause() {}, reverse() {} });
    }
    const importedPerson = {
      id: "imported-member",
      first_name: "Imported",
      last_name: "Member",
      member_status: "member",
      activity_status: "regular",
      created_at: "2026-09-10T12:00:00.000Z",
    };
    const importedServices = [
      { id: "i-1", service_date: "2026-08-16", service_type: "sunday_service", individuals: ["person-2"] },
      { id: "i-2", service_date: "2026-08-23", service_type: "sunday_service", individuals: ["person-2", "imported-member"] },
      { id: "i-3", service_date: "2026-08-30", service_type: "sunday_service", individuals: ["person-2"] },
    ];
    const { getByText, queryByText } = render(WeeklyAttendanceMatrix, {
      props: { services: importedServices, people: [people[1], importedPerson] },
    });

    await fireEvent.click(getByText("Imported Member").closest("tr"));

    expect(getByText("Sundays assessed")).toBeDefined();
    expect(queryByText("Expected Sundays")).toBeNull();
    expect(getByText(/Calculated from first recorded Sunday \(23 Aug\)/)).toBeDefined();
    expect(getByText(/not a manually entered expected-Sundays value/)).toBeDefined();
  });

  it("quick-filters a person's modal history by attendance status", async () => {
    if (!Element.prototype.animate) {
      Element.prototype.animate = () => ({ cancel() {}, finish() {}, play() {}, pause() {}, reverse() {} });
    }
    const { getByText, getByRole } = render(WeeklyAttendanceMatrix, {
      props: { services, people },
    });

    await fireEvent.click(getByText("Ama Mensah").closest("tr"));
    const dialog = within(getByRole("dialog"));
    expect(dialog.getByText("Sun, 23 Aug 2026")).toBeDefined();
    expect(dialog.getByText("Sun, 30 Aug 2026")).toBeDefined();

    await fireEvent.click(dialog.getByRole("button", { name: "Missed" }));

    expect(dialog.queryByText("Sun, 23 Aug 2026")).toBeNull();
    expect(dialog.getByText("Sun, 30 Aug 2026")).toBeDefined();
    expect(dialog.getByText("Sundays here").closest("div")).toHaveTextContent("0Sundays here");
    expect(dialog.getByText("Sundays missed").closest("div")).toHaveTextContent("1Sundays missed");
    expect(dialog.getByText("Sundays assessed").closest("div")).toHaveTextContent("1Sundays assessed");
  });
});
