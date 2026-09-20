import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import MeetingForm from "./MeetingForm.svelte";

describe("MeetingForm regular expectations", () => {
  it("preloads the programme expectation list without recording attendance until explicitly selected", async () => {
    const program = {
      id: "program-basonta",
      name: "Media Basonta",
      meeting_type: "basonta",
      category: "other",
      default_format: "in_person",
      member_ids: ["person-1", "person-2"],
    };
    const people = [
      { id: "person-1", first_name: "Ama", last_name: "Mensah", member_status: "member" },
      { id: "person-2", first_name: "Kojo", last_name: "Owusu", member_status: "leader" },
      { id: "person-3", first_name: "Esi", last_name: "Boateng", member_status: "member" },
    ];

    const { getByRole, getByText } = render(MeetingForm, {
      props: {
        isOpen: true,
        programs: [program],
        people,
        meetings: [],
        initialProgramId: program.id,
      },
    });

    await fireEvent.click(getByRole("button", { name: /2\. Attendance/ }));

    expect(getByRole("button", { name: "Expected (2)" })).toBeDefined();
    expect(getByText(/preloaded here each time/i)).toBeDefined();
    expect(getByText("0 total attendance")).toBeDefined();

    await fireEvent.click(getByRole("button", { name: "Mark expected present" }));

    expect(getByText("2 total attendance")).toBeDefined();
  });
});
