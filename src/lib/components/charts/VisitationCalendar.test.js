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
  it("shows the care recorded on a selected day and opens its detail", async () => {
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
    const onVisitSelect = vi.fn();
    const { getByRole, getByText } = render(VisitationCalendar, {
      props: { data: [visit], onVisitSelect },
    });

    await fireEvent.click(getByRole("button", { name: /1 care interaction$/ }));
    expect(getByText("Ama Owusu")).toBeDefined();
    expect(getByText("Prayed together and agreed a follow-up call.")).toBeDefined();
    await fireEvent.click(getByRole("button", { name: /Ama Owusu/ }));
    expect(onVisitSelect).toHaveBeenCalledWith(visit);
  });
});
