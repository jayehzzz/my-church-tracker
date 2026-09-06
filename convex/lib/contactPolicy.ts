import type { Doc } from "../_generated/dataModel";

export function canFollowUp(person: Pick<Doc<"people">, "contact_category" | "is_paused" | "member_status">) {
    return person.contact_category !== "do_not_contact" && person.is_paused !== true && person.member_status !== "archived";
}
export function requireFollowUpAllowed(person: Parameters<typeof canFollowUp>[0]) {
    if (person.contact_category === "do_not_contact") throw new Error("This person has requested no contact");
    if (person.is_paused) throw new Error("Follow-up is paused. Reactivate the person explicitly before scheduling or recording follow-up.");
    if (person.member_status === "archived") throw new Error("Follow-up is unavailable for an archived person");
}
