import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import VisitationCalendar from "./VisitationCalendar.svelte";

function localDate(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("VisitationCalendar", () => {
  it("routes a selected day and its care metric to the page-owned drilldown", async () => {
    const date = localDate();
    const visit = {
      id: "visit-1",
      visit_date: date,
      person_visited_name: "Ama Owusu",
      visited_by_name: "Grace Mensah",
      interaction_type: "phone_call",
      purpose: "prayer",
      outcome: "prayer_request_received",
      notes: "Prayed together and agreed a follow-up call.",
    };
    const onDaySelect = vi.fn();
    const onDrilldown = vi.fn();
    const { getByRole } = render(VisitationCalendar, {
      props: { data: [visit], onDaySelect, onDrilldown },
    });

    await fireEvent.click(getByRole("button", { name: /1 care interaction$/ }));
    expect(onDaySelect).toHaveBeenCalledWith(date);
    await fireEvent.click(getByRole('button', { name: /Series A · Care interactions/ }));
    expect(onDrilldown).toHaveBeenCalledWith(expect.objectContaining({ choices: [expect.objectContaining({ metricKey: 'interactions', sourceIds: ['visit-1'] })] }));
  });
});
