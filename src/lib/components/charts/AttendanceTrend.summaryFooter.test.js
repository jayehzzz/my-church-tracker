import { expect, it } from "vitest";
import { render } from "@testing-library/svelte";
import AttendanceTrend from "./AttendanceTrend.svelte";

const data = [{ date: "2026-09-20", total: 42 }];

it("keeps the summary footer by default and hides only that footer when requested", () => {
  const defaultChart = render(AttendanceTrend, { props: { data } });
  expect(defaultChart.getByText("Latest attendance")).toBeDefined();
  defaultChart.unmount();

  const conciseChart = render(AttendanceTrend, {
    props: { data, showSummaryFooter: false },
  });
  expect(conciseChart.queryByText("Latest attendance")).toBeNull();
  expect(conciseChart.getByRole("combobox", { name: "Primary metric" })).toBeDefined();
  expect(conciseChart.getByRole("img", { name: /Attendance Trend line chart/ })).toBeDefined();
});
