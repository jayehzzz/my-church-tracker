import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
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
      getByRole("link", { name: "Open Ama Mensah's profile" }),
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
    const profileLinks = getAllByRole("link").filter((link) =>
      link.getAttribute("href")?.startsWith("/people/"),
    );
    expect(profileLinks[0]).toHaveTextContent("Daniel Brown");
  });
});
