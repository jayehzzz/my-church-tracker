import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { session } from "$lib/auth/session.js";
import { create, update } from "$lib/services/evangelismService";
import EvangelismContactForm from "./EvangelismContactForm.svelte";
import EvangelismDetailModal from "../evangelism/EvangelismDetailModal.svelte";

vi.mock("svelte/transition", () => ({ fade: () => ({}), fly: () => ({}), slide: () => ({}), scale: () => ({}) }));
vi.mock("$app/environment", () => ({ browser: true }));
vi.mock("$lib/auth/session.js", async () => {
  const { writable } = await import("svelte/store");
  return { session: writable({ status: "demo", user: null }) };
});
vi.mock("$lib/services/evangelismService", () => ({ create: vi.fn(), update: vi.fn() }));
vi.mock("$lib/services/peopleService", () => ({
  getAll: vi.fn(async () => ({ data: [
    { id: "leader-1", first_name: "Ama", member_status: "leader" },
    { id: "member-1", first_name: "Kojo", member_status: "member" },
    { id: "contact-2", first_name: "Esi", member_status: "contact" },
  ] })),
}));

const existing = { id: "contact-1", first_name: "Grace", contact_date: "2026-09-01" };
async function saveEdit() {
  await fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  return update.mock.calls[0][1];
}
async function optionalDetails() {
  await fireEvent.click(screen.getByText("Optional details"));
}

beforeEach(() => {
  vi.clearAllMocks();
  session.set({ status: "demo", user: null });
  create.mockResolvedValue({ data: { id: "new-contact" } });
  update.mockResolvedValue({ data: existing });
});

describe("Evangelism contact capture", () => {
  it("defaults to today and not assessed, with optional capture and no membership transport", async () => {
    render(EvangelismContactForm, { isOpen: true });
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(screen.getByLabelText(/Contact Date/)).toHaveValue(today);
    expect(screen.getByText("Optional details").closest("details")).not.toHaveAttribute("open");
    expect(screen.getByLabelText("Email").closest("details")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Follow-up Posture" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Joined church/ })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /^Do not contact/ })).not.toBeChecked();
    await fireEvent.input(screen.getByLabelText(/First Name/), { target: { value: "Grace" } });
    await fireEvent.click(screen.getByRole("button", { name: "Add contact" }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0]).toMatchObject({ first_name: "Grace", contact_date: today, response: "not_assessed" });
    expect(create.mock.calls[0][0]).not.toHaveProperty("contact_method");
    for (const field of ["member_status", "membership_date", "converted", "conversion_date"]) {
      expect(create.mock.calls[0][0]).not.toHaveProperty(field);
    }
  });

  it.each(["responsive", "non_responsive", "events_only", "big_events_only", "bacenta_mainly", "has_church", "do_not_contact"])("preserves hidden %s response and membership on edit", async (response) => {
    render(EvangelismContactForm, { isOpen: true, contact: { ...existing, response, member_status: "member", membership_date: "2026-09-02" } });
    const payload = await saveEdit();
    expect(payload.response).toBe(response);
    for (const field of ["member_status", "membership_date", "converted", "conversion_date"]) expect(payload).not.toHaveProperty(field);
  });

  it.each(["events_only", "has_church", "not_assessed"])("restores %s when Do not contact is checked then unchecked", async (response) => {
    render(EvangelismContactForm, { isOpen: true, contact: { ...existing, response } });
    const checkbox = screen.getByRole("checkbox", { name: /^Do not contact/ });
    await fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    await fireEvent.click(checkbox);
    expect((await saveEdit()).response).toBe(response);
  });

  it("can explicitly clear existing Do not contact to not assessed", async () => {
    render(EvangelismContactForm, { isOpen: true, contact: { ...existing, response: "do_not_contact" } });
    await fireEvent.click(screen.getByRole("checkbox", { name: /^Do not contact/ }));
    expect((await saveEdit()).response).toBe("not_assessed");
  });

  it("preserves a legacy category and restores it after toggling church context", async () => {
    render(EvangelismContactForm, { isOpen: true, contact: { ...existing, contact_category: "big_events_only" } });
    await optionalDetails();
    const checkbox = screen.getByRole("checkbox", { name: /^Has another church/ });
    await fireEvent.click(checkbox);
    await fireEvent.click(checkbox);
    expect((await saveEdit()).response).toBe("big_events_only");
  });

  it("saves explicit church context and explains that no initial call is created", async () => {
    render(EvangelismContactForm, { isOpen: true, contact: existing });
    await optionalDetails();
    await fireEvent.click(screen.getByRole("checkbox", { name: /^Has another church/ }));
    expect(screen.getByText(/No automatic initial call is created for someone/)).toBeInTheDocument();
    expect((await saveEdit()).response).toBe("has_church");
  });

  it("keeps Do not contact explicit and hides the initial call date", async () => {
    render(EvangelismContactForm, { isOpen: true });
    expect(screen.queryByLabelText("Next contact date")).not.toBeInTheDocument();
    await screen.findByRole("button", { name: "Assigned worker" });
    await waitFor(async () => {
      await fireEvent.click(screen.getByRole("button", { name: "Assigned worker" }));
      expect(screen.getByRole("button", { name: "Ama" })).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByRole("button", { name: "Ama" }));
    expect(screen.getByLabelText("Next contact date")).toBeInTheDocument();
    await fireEvent.input(screen.getByLabelText("Next contact date"), { target: { value: "2026-10-01" } });
    await fireEvent.click(screen.getByRole("checkbox", { name: /^Do not contact/ }));
    expect(screen.queryByLabelText("Next contact date")).not.toBeInTheDocument();
    await fireEvent.input(screen.getByLabelText(/First Name/), { target: { value: "Grace" } });
    await fireEvent.click(screen.getByRole("button", { name: "Add contact" }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0].response).toBe("do_not_contact");
    expect(create.mock.calls[0][0]).not.toHaveProperty("follow_up_date");
  });

  it("retains multiple credits and primary inviter while adding another person through the shared picker", async () => {
    render(EvangelismContactForm, { isOpen: true, contact: { ...existing, collector_ids: ["leader-1", "member-1"], invited_by_id: "member-1" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Who reached them" })).not.toBeDisabled());
    expect(await screen.findByText(/Ama · Leader/)).toBeInTheDocument();
    await fireEvent.click(screen.getByRole("button", { name: "Who reached them" }));
    await fireEvent.click(screen.getByRole("button", { name: "Include outreach contacts and non-members" }));
    await fireEvent.click(screen.getByRole("button", { name: "Esi · Outreach contact" }));
    const payload = await saveEdit();
    expect(payload).toMatchObject({ collector_ids: ["leader-1", "member-1", "contact-2"], collected_by_id: "leader-1", invited_by_id: "member-1" });
  });

  it("preserves restricted leader permissions", async () => {
    session.set({ status: "authenticated", user: { role: "leader", canViewConfidential: false } });
    render(EvangelismContactForm, { isOpen: true, contact: { ...existing, collector_ids: ["member-1"], invited_by_id: "member-1", notes: "Private" } });
    expect(screen.queryByRole("button", { name: "Who reached them" })).not.toBeInTheDocument();
    const payload = await saveEdit();
    for (const field of ["collector_ids", "collected_by_id", "invited_by_id", "assigned_leader_id", "notes"]) expect(payload).not.toHaveProperty(field);
  });


  it("preserves optional fields and credits without opening optional details", async () => {
    render(EvangelismContactForm, { isOpen: true, contact: {
      ...existing, contact_method: "social_media", email: "grace@example.test", address: "Known address",
      notes: "Existing context", collector_ids: ["leader-1", "unlisted-person"], invited_by_id: "member-1",
      outreach_salvation_decision: true, outreach_salvation_date: "2026-08-31", outreach_salvation_source: "evangelism_outreach",
    } });
    const payload = await saveEdit();
    expect(payload).toMatchObject({
      contact_method: "social_media", email: "grace@example.test", address: "Known address", notes: "Existing context",
      collector_ids: ["leader-1", "unlisted-person"], collected_by_id: "leader-1", invited_by_id: "member-1",
      outreach_salvation_decision: true, outreach_salvation_date: "2026-08-31", outreach_salvation_source: "evangelism_outreach",
    });
  });

  it("restores a preexisting non-DNC category when clearing DNC", async () => {
    render(EvangelismContactForm, { isOpen: true, contact: { ...existing, response: "do_not_contact", contact_category: "events_only" } });
    await fireEvent.click(screen.getByRole("checkbox", { name: /^Do not contact/ }));
    expect((await saveEdit()).response).toBe("events_only");
  });

  it("offers a next contact date for a restricted leader without a worker picker", async () => {
    session.set({ status: "authenticated", user: { role: "leader" } });
    render(EvangelismContactForm, { isOpen: true });
    expect(screen.getByLabelText("Next contact date")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assigned worker" })).not.toBeInTheDocument();
    await optionalDetails();
    await fireEvent.click(screen.getByRole("checkbox", { name: /^Has another church/ }));
    expect(screen.queryByLabelText("Next contact date")).not.toBeInTheDocument();
  });

  it("keeps a failed save open and displays the error", async () => {
    update.mockResolvedValue({ error: { message: "Save unavailable" } });
    render(EvangelismContactForm, { isOpen: true, contact: existing });
    await saveEdit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Save unavailable");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });
});


describe("Evangelism contact details", () => {
  it("shows opt-out guidance without call or assignment controls", () => {
    render(EvangelismDetailModal, { isOpen: true, contact: { ...existing, response: "do_not_contact", phone: "01234567890" }, onAssign: vi.fn() });
    expect(screen.getByText(/Pending outreach calls are cancelled and new outreach is prevented/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Call", exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "WhatsApp" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Assign worker" })).not.toBeInTheDocument();
    expect(screen.queryByText(/No open task. Assign/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View People profile" })).toHaveAttribute("href", "/people/contact-1");
    expect(screen.queryByRole("button", { name: "Record joined church" })).not.toBeInTheDocument();
  });

  it("keeps Sunday context in the Gatherings tab", async () => {
    render(EvangelismDetailModal, { isOpen: true, contact: existing });
    expect(screen.queryByText("This Sunday")).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole("button", { name: "Gatherings & visits" }));
    expect(screen.getByText("This Sunday")).toBeInTheDocument();
    expect(screen.getByText("Recorded attendance")).toBeInTheDocument();
  });
});
