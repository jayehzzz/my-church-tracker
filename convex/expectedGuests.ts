import { v } from "convex/values";
import { mutationFor, authenticatedUser } from "./lib/security";
import { assertDate, validatePersonInput, normalizeEmail, normalizePhone } from "./peopleValidation";
import { guestInvitationVersion } from "../src/lib/services/expectedGuestLogic.js";
import { changeInvitation } from "./lib/guestInvitations";
import { personGatherings, selectGathering, setActualAttendance } from "./lib/attendanceWorkflow";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const fields = {
    serviceDate: v.string(), nameUnknown: v.boolean(), firstName: v.optional(v.string()), lastName: v.optional(v.string()),
    phone: v.optional(v.string()), email: v.optional(v.string()), inviterId: v.optional(v.id("people")), leaderId: v.optional(v.id("people")),
    state: v.union(v.literal("tentative"), v.literal("coming"), v.literal("cancelled"), v.literal("no_show")),
    reportSource: v.union(v.literal("inviter_report"), v.literal("guest_report")), note: v.optional(v.string()),
};
const review = { invitationId: v.id("guest_invitations"), expectedVersion: v.string() };
function reason(value: string) { if (!value.trim() || value.trim().length > 500) throw new Error("Add a correction reason of 1–500 characters"); return value.trim(); }
async function reviewed(ctx: MutationCtx, id: Id<"guest_invitations">, version: string) {
    const row = await ctx.db.get(id);
    if (!row) throw new Error("Invitation unavailable");
    if (guestInvitationVersion(row) !== version) throw new Error("Invitation changed. Reload before saving");
    return row;
}
async function identity(ctx: MutationCtx, id: Id<"people">) {
    const person = await ctx.db.get(id);
    if (!person || person.member_status === "archived" || person.merged_into_id) throw new Error("Choose an active person");
    return person;
}
async function invitationFields(ctx: MutationCtx, args: any) {
    assertDate("Sunday", args.serviceDate);
    if (new Date(`${args.serviceDate}T12:00:00Z`).getUTCDay() !== 0) throw new Error("Choose a Sunday date");
    if (args.nameUnknown && (!args.inviterId || args.reportSource !== "inviter_report")) throw new Error("An unnamed guest needs an inviter and an inviter report");
    if (args.reportSource === "inviter_report" && !args.inviterId) throw new Error("Choose the inviter who reported this invitation");
    const firstName = args.firstName?.trim() || undefined, lastName = args.lastName?.trim() || undefined;
    if (args.nameUnknown && (firstName || lastName)) throw new Error("Leave the guest name blank while it is not known");
    validatePersonInput({ ...(args.nameUnknown ? {} : { first_name: firstName }), phone: args.phone?.trim() || undefined, email: args.email?.trim() || undefined }, !args.nameUnknown);
    if ([firstName, lastName].some(value => value && value.length > 100) || (args.note?.length ?? 0) > 2000) throw new Error("Names must be at most 100 characters and notes at most 2000");
    const inviter = args.inviterId ? await identity(ctx, args.inviterId) : null;
    if (args.leaderId && (await identity(ctx, args.leaderId)).member_status !== "leader") throw new Error("Choose a responsible leader");
    if (args.state === "no_show" && args.serviceDate >= new Date().toISOString().slice(0, 10)) throw new Error("Record non-arrival only after the Sunday");
    return {
        service_date: args.serviceDate, name_unknown: args.nameUnknown, first_name: firstName, last_name: lastName,
        phone: args.phone?.trim() || undefined, email: normalizeEmail(args.email), inviter_id: args.inviterId,
        inviter_name: inviter ? [inviter.preferred_name || inviter.first_name, inviter.last_name].filter(Boolean).join(" ") : undefined,
        responsible_leader_id: args.leaderId, state: args.state, report_source: args.reportSource, note: args.note?.trim() || undefined,
    };
}

export const create = mutationFor("expectedGuests:create")({
    args: fields,
    handler: async (ctx, args) => {
        if (!["tentative", "coming"].includes(args.state)) throw new Error("Add an invitation as tentative or coming");
        const data = await invitationFields(ctx, args);
        const previous = args.inviterId ? await ctx.db.query("guest_invitations").withIndex("by_inviter", q => q.eq("inviter_id", args.inviterId)).collect() : [];
        const friendNumber = Math.max(0, ...previous.filter(row => row.service_date === args.serviceDate).map(row => row.friend_number)) + 1;
        const at = new Date().toISOString();
        const id = await ctx.db.insert("guest_invitations", { ...data, friend_number: friendNumber, revision: 0, history: [{ at, action: "invitation_added", actor_user_id: authenticatedUser(ctx)._id, after: data }], created_at: at, updated_at: at });
        return await ctx.db.get(id);
    },
});

export const update = mutationFor("expectedGuests:update")({
    args: { ...review, ...fields, changeReason: v.string(), enteredInError: v.optional(v.boolean()) },
    handler: async (ctx, args) => {
        const row = await reviewed(ctx, args.invitationId, args.expectedVersion);
        const changeReason = reason(args.changeReason);
        const data = await invitationFields(ctx, args);
        if (row.attendance_service_id && (row.service_date !== data.service_date || row.state !== data.state || Boolean(args.enteredInError) !== Boolean(row.entered_in_error))) throw new Error("Correct actual attendance separately before changing this invitation's result or date");
        if (args.state === "no_show" && row.state !== "coming" && row.state !== "no_show") throw new Error("A tentative invitation is not a missed confirmation. Cancel it instead");
        if (row.person_id && args.nameUnknown) throw new Error("This invitation is already linked to a known person");
        const sameInviter = data.inviter_id === row.inviter_id;
        if (!sameInviter || data.service_date !== row.service_date) {
            const others = data.inviter_id ? await ctx.db.query("guest_invitations").withIndex("by_inviter", q => q.eq("inviter_id", data.inviter_id)).collect() : [];
            const number = Math.max(0, ...others.filter(other => other._id !== row._id && other.service_date === data.service_date).map(other => other.friend_number)) + 1;
            return await changeInvitation(ctx, row, { ...data, friend_number: number, entered_in_error: args.enteredInError ?? row.entered_in_error }, "invitation_corrected", changeReason, authenticatedUser(ctx)._id);
        }
        return await changeInvitation(ctx, row, { ...data, entered_in_error: args.enteredInError ?? row.entered_in_error }, "invitation_corrected", changeReason, authenticatedUser(ctx)._id);
    },
});

export const link = mutationFor("expectedGuests:link")({
    args: { ...review, personId: v.optional(v.id("people")), createPerson: v.optional(v.boolean()), changeReason: v.string() },
    handler: async (ctx, args) => {
        const row = await reviewed(ctx, args.invitationId, args.expectedVersion);
        const changeReason = reason(args.changeReason);
        if (row.entered_in_error) throw new Error("Correct the invalidated invitation before linking it");
        if (row.attendance_service_id) throw new Error("Correct actual attendance before changing the linked person");
        if (Boolean(args.personId) === Boolean(args.createPerson)) throw new Error("Choose an existing person or explicitly create one");
        let personId = args.personId;
        if (args.createPerson) {
            if (row.person_id) throw new Error("This invitation is already linked. Choose an existing person to correct the link");
            if (row.name_unknown || !row.first_name) throw new Error("Add the guest's real name before creating a person");
            const all = await ctx.db.query("people").collect();
            if (all.some(person => person.member_status !== "archived" && ((normalizeEmail(row.email) && normalizeEmail(row.email) === normalizeEmail(person.email)) || (normalizePhone(row.phone) && normalizePhone(row.phone) === normalizePhone(person.phone))))) throw new Error("An existing person has matching contact details. Review and link that person instead");
            const at = new Date().toISOString();
            personId = await ctx.db.insert("people", { first_name: row.first_name, last_name: row.last_name || "", surname_status: row.last_name ? "known" : "missing", phone: row.phone, email: row.email, invited_by_id: row.inviter_id, member_status: "guest", created_at: at, updated_at: at });
        }
        const person = await identity(ctx, personId!);
        if (person._id === row.inviter_id) throw new Error("The guest cannot be their own inviter");
        if (person.contact_category === "do_not_contact" || person.is_paused) throw new Error("Follow-up is restricted for this person. Use the existing correction/reactivation workflow");
        const event = (await personGatherings(ctx, person._id)).find(event => event.sunday && event.date === row.service_date);
        return await changeInvitation(ctx, row, { person_id: person._id, name_unknown: false, first_name: person.first_name, last_name: person.last_name || undefined, attendance_service_id: event?.serviceId }, args.createPerson ? "known_person_created_and_linked" : "existing_person_linked", changeReason, authenticatedUser(ctx)._id);
    },
});

export const attendance = mutationFor("expectedGuests:attendance")({
    args: { ...review, attended: v.boolean(), serviceId: v.id("services"), changeReason: v.optional(v.string()), afterRemoval: v.optional(v.union(v.literal("coming"), v.literal("no_show"), v.literal("cancelled"))) },
    handler: async (ctx, args) => {
        const row = await reviewed(ctx, args.invitationId, args.expectedVersion);
        if (!row.person_id) throw new Error("Add a real name or link an existing person before recording named attendance");
        if (row.entered_in_error) throw new Error("Correct the invalidated invitation before recording attendance");
        const gathering = await selectGathering(ctx, "sunday_service", row.service_date, { serviceId: args.serviceId });
        if (!args.attended && row.attendance_service_id !== args.serviceId) throw new Error("Review the actual check-in before removing it");
        if (!args.attended && !args.afterRemoval) throw new Error("Choose the invitation state after removing attendance");
        if (!args.attended && args.afterRemoval === "no_show" && row.service_date >= new Date().toISOString().slice(0, 10)) throw new Error("Record non-arrival only after the Sunday");
        const changeReason = !args.attended ? reason(args.changeReason || "") : undefined;
        await setActualAttendance(ctx, row.person_id, gathering, args.attended);
        const updated = await ctx.db.get(row._id);
        if (!args.attended && updated) await changeInvitation(ctx, updated, { state: args.afterRemoval }, "actual_attendance_correction", changeReason, authenticatedUser(ctx)._id);
        return await ctx.db.get(row._id);
    },
});
