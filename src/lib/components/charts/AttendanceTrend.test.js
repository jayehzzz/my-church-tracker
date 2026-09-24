import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import AttendanceTrend from "./AttendanceTrend.svelte";

const mockAttendanceData = [
  { date: "2026-08-16", total: 120, guests: 20, members: 100, firstTimers: 4, decisions: 2 },
  { date: "2026-08-23", total: 135, guests: 25, members: 110, firstTimers: 5, decisions: 3 },
  { date: "2026-08-30", total: 150, guests: 30, members: 120, firstTimers: 6, decisions: 4 },
];

const comparisonOptions = [
  { key: "guests", label: "Guests", color: "info" },
  { key: "members", label: "Members", color: "success" },
  { key: "firstTimers", label: "First timers", color: "warning" },
  { key: "decisions", label: "Salvation decisions", color: "success" },
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
    expect(getByText("Overall average attendance").previousElementSibling?.classList.contains("text-primary")).toBe(true);
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
    const { getByRole, getAllByText, getByLabelText } = render(AttendanceTrend, {
      props: {
        data: mockAttendanceData,
        comparisonOptions,
      },
    });

    await fireEvent.change(getByRole("combobox", { name: "Compare attendance with" }), {
      target: { value: "guests" },
    });

    expect(getByLabelText("Series A controls")).toBeDefined();
    expect(getByLabelText("Series B controls")).toBeDefined();
    expect(getAllByText("Attendance").length).toBeGreaterThan(0);
    expect(getAllByText("Guests").length).toBeGreaterThan(0);
  });

  it("can compare average attendance with actual total salvation decisions", async () => {
    const { getByRole, getByText, getAllByText } = render(AttendanceTrend, {
      props: {
        data: mockAttendanceData,
        comparisonOptions,
      },
    });

    await fireEvent.change(getByRole("combobox", { name: "Chart time scale" }), {
      target: { value: "month" },
    });
    await fireEvent.change(getByRole("combobox", { name: "Compare attendance with" }), {
      target: { value: "decisions" },
    });
    await fireEvent.change(getByRole("combobox", { name: "Comparison calculation" }), {
      target: { value: "total" },
    });

    expect(getByText("Overall average attendance")).toBeDefined();
    expect(getByText("Period total salvation decisions")).toBeDefined();
    expect(getAllByText("135").length).toBeGreaterThan(0);
    expect(getAllByText("9").length).toBeGreaterThan(0);
  });

  it("can show a non-attendance metric by itself", async () => {
    const { getByRole, getByText, getAllByText, queryByText } = render(AttendanceTrend, {
      props: { data: mockAttendanceData, comparisonOptions },
    });

    await fireEvent.change(getByRole("combobox", { name: "Primary metric" }), {
      target: { value: "firstTimers" },
    });

    expect(getAllByText("First timers").length).toBeGreaterThan(0);
    expect(getByText("Overall average first timers")).toBeDefined();
    expect(queryByText("Overall average attendance")).toBeNull();
  });

  it("plots grouped averages at the displayed whole-person height", async () => {
    const { container, getByRole, getByText } = render(AttendanceTrend, {
      props: { data: [
        { date: "2026-07-05", total: 7 },
        { date: "2026-07-12", total: 8 },
        { date: "2026-08-02", total: 8 },
      ], periodLabel: "This Year (2026)" },
    });
    expect(getByText(/Averages per gathering are shown as whole people/)).toBeDefined();
    const points = [...container.querySelectorAll('svg circle[stroke="hsl(var(--primary))"]')];
    expect(points).toHaveLength(2);
    expect(points[0].getAttribute('cy')).toBe(points[1].getAttribute('cy'));
    expect(container.querySelector('svg')?.textContent).not.toContain('7.5');
    await fireEvent.click(getByRole('button', { name: 'View Jul 2026 details' }));
    expect(getByRole('dialog')).toHaveTextContent('8');
    expect(getByRole('dialog').textContent).not.toContain('7.5');
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
