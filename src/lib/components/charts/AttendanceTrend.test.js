import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import AttendanceTrend from "./AttendanceTrend.svelte";

const mockAttendanceData = [
  { date: "2026-08-16", total: 120, guests: 20, members: 100 },
  { date: "2026-08-23", total: 135, guests: 25, members: 110 },
  { date: "2026-08-30", total: 150, guests: 30, members: 120 },
];

const comparisonOptions = [
  { key: "guests", label: "Guests", color: "info" },
  { key: "members", label: "Members", color: "success" },
];

describe("AttendanceTrend", () => {
  it("renders line chart by default with clean dates and summary metrics", () => {
    const { getByText, getAllByText } = render(AttendanceTrend, {
      props: {
        data: mockAttendanceData,
        title: "Attendance Trend",
        comparisonOptions,
      },
    });

    expect(getByText("Attendance Trend")).toBeDefined();
    expect(getByText("3 meetings recorded")).toBeDefined();

    // Summary footer & values
    expect(getAllByText("150").length).toBeGreaterThan(0);
    expect(getAllByText("135").length).toBeGreaterThan(0);
  });

  it("switches between line and bar views cleanly", async () => {
    const { getByRole } = render(AttendanceTrend, {
      props: {
        data: mockAttendanceData,
      },
    });

    const barButton = getByRole("button", { name: "Bar" });
    await fireEvent.click(barButton);
    expect(barButton.getAttribute("aria-pressed")).toBe("true");

    const lineButton = getByRole("button", { name: "Line" });
    await fireEvent.click(lineButton);
    expect(lineButton.getAttribute("aria-pressed")).toBe("true");
  });

  it("handles comparison selection and shows legend", async () => {
    const { getByLabelText, getByText, getAllByText } = render(AttendanceTrend, {
      props: {
        data: mockAttendanceData,
        comparisonOptions,
      },
    });

    const select = getByLabelText("Compare attendance with");
    await fireEvent.change(select, { target: { value: "guests" } });

    expect(getByText("Total attendance")).toBeDefined();
    expect(getAllByText("Guests").length).toBeGreaterThan(0);
  });

  it("shows empty state when no data provided", () => {
    const { getByText } = render(AttendanceTrend, {
      props: {
        data: [],
      },
    });

    expect(getByText("No attendance data available")).toBeDefined();
  });
});
