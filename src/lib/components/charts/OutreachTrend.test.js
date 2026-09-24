import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import OutreachTrend from "./OutreachTrend.svelte";

const mockMonthlyData = [
  { month: "7", year: 2026, count: 15, saved: 5, visited: 3, joined: 2 },
  { month: "8", year: 2026, count: 14, saved: 4, visited: 6, joined: 1 },
  { month: "9", year: 2026, count: 2, saved: 1, visited: 0, joined: 0 },
];

const comparisonOptions = [
  { key: "saved", label: "Salvation decisions", color: "warning" },
  { key: "visited", label: "First-time attendees", color: "info" },
  { key: "joined", label: "Joined church", color: "success" },
];

describe("OutreachTrend", () => {
  it("renders bar chart by default with correct month labels and stats", () => {
    const { getByText, getAllByText } = render(OutreachTrend, {
      props: {
        data: mockMonthlyData,
        title: "Outreach and outcomes over time",
        periodLabel: "THIS QUARTER (Q3 2026)",
        comparisonOptions,
      },
    });

    expect(getByText("Outreach and outcomes over time")).toBeDefined();
    expect(getAllByText("THIS QUARTER (Q3 2026)").length).toBeGreaterThan(0);

    // Month labels
    expect(getByText("Jul")).toBeDefined();
    expect(getByText("Aug")).toBeDefined();
    expect(getByText("Sep")).toBeDefined();

    // Total contacts footer
    expect(getByText("31")).toBeDefined();
    expect(getAllByText("10").length).toBeGreaterThan(0); // Rounded average/month
    expect(getAllByText("15").length).toBeGreaterThan(0); // Peak month and/or bar label
    expect(getByText("Average monthly contacts reached").previousElementSibling?.classList.contains("text-primary")).toBe(true);
  });

  it("can switch to line chart view", async () => {
    const { getByRole, getByText } = render(OutreachTrend, {
      props: {
        data: mockMonthlyData,
        comparisonOptions,
      },
    });

    const lineButton = getByRole("button", { name: "Line" });
    await fireEvent.click(lineButton);

    // After switching, the line view is rendered
    expect(lineButton.getAttribute("aria-pressed")).toBe("true");
    expect(getByText("Jul")).toBeDefined();
  });

  it("renders comparison legend when an option is selected", async () => {
    const { getByLabelText, getByText, getAllByText } = render(OutreachTrend, {
      props: {
        data: mockMonthlyData,
        comparisonOptions,
      },
    });

    const select = getByLabelText("Compare outreach with");
    await fireEvent.change(select, { target: { value: "saved" } });

    expect(getByText("Contacts reached · actual monthly count")).toBeDefined();
    expect(getAllByText("Salvation decisions · period average per month").length).toBeGreaterThan(0);
  });

  it("displays empty state when data is empty", () => {
    const { getByText } = render(OutreachTrend, {
      props: {
        data: [],
      },
    });

    expect(getByText("No outreach outcomes recorded for this period.")).toBeDefined();
  });
});

it('compares monthly actuals with the same metric average including zero months and drills into raw records', async () => {
  const points=[];
  const {getByLabelText,getByRole}=render(OutreachTrend,{data:[{year:2025,month:'7',count:31}],periodRange:{startDate:'2025-07-01',endDate:'2025-09-30'},onPointClick:point=>points.push(point)});
  await fireEvent.change(getByLabelText('Compare outreach with'),{target:{value:'count'}});
  const average=getByRole('button',{name:'Jul: 31 Contacts reached · actual monthly count, 10 Contacts reached · period average per month'});
  await fireEvent.click(average);
  expect(points[0]).toMatchObject({year:2025,month:'7',count:31});
});
