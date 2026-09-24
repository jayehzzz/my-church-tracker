import { describe, expect, it, vi } from "vitest";
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

  it("requires confirmation of unmarked regulars before completing attendance", async () => {
    const onsave = vi.fn();
    const { getByRole, getByText } = render(MeetingForm, { props: {
      isOpen: true, programs: [{ id: "program-1", name: "Eastside Bacenta", meeting_type: "bacenta", default_format: "in_person", member_ids: ["person-1"] }],
      people: [{ id: "person-1", first_name: "Ama", last_name: "Mensah", member_status: "guest" }],
      initialProgramId: "program-1", onsave,
    } });
    await fireEvent.click(getByRole("button", { name: /2\. Attendance/ }));
    expect(getByText(/1 regular people not marked present/)).toBeDefined();
    await fireEvent.click(getByRole("button", { name: "Save attendance" }));
    expect(getByText(/Confirm the regular people/)).toBeDefined();
    expect(onsave).not.toHaveBeenCalled();
    await fireEvent.click(getByRole("button", { name: "Absent · mark excused" }));
    expect(getByRole("button", { name: "Excused ✓" })).toBeDefined();
  });
});
