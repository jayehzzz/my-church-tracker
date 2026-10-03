import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { guestInvitationName, guestInvitationVersion } from "../../src/lib/services/expectedGuestLogic.js";

export async function expectedGuestsForSunday(ctx: QueryCtx, serviceDate: string, leaderId?: Id<"people">) {
    const rows = await ctx.db.query("guest_invitations").withIndex("by_date", q => q.eq("service_date", serviceDate)).collect();
    return await Promise.all(rows.filter(row => !leaderId || row.responsible_leader_id === leaderId).map(async row => {
        const person = row.person_id ? await ctx.db.get(row.person_id) : null;
        const leader = row.responsible_leader_id ? await ctx.db.get(row.responsible_leader_id) : null;
        const value = { ...row, person, person_archived: person?.member_status === "archived", leader_name: leader ? [leader.preferred_name || leader.first_name, leader.last_name].filter(Boolean).join(" ") : null };
        return { ...value, display_name: guestInvitationName(value), version: guestInvitationVersion(row) };
    }));
}

export function invitationSnapshot(row: Doc<"guest_invitations">) {
    const { history, _id, _creationTime, ...snapshot } = row;
    return snapshot;
}
export async function changeInvitation(ctx: MutationCtx, row: Doc<"guest_invitations">, patch: Partial<Doc<"guest_invitations">>, action: string, reason?: string, actor?: Id<"crm_users">) {
    const at = new Date().toISOString();
    await ctx.db.patch(row._id, { ...patch, revision: row.revision + 1, updated_at: at, history: [...row.history, {
        at, action, ...(actor ? { actor_user_id: actor } : {}), ...(reason ? { change_reason: reason } : {}), before: invitationSnapshot(row), after: patch,
    }] });
    return await ctx.db.get(row._id);
}

// Called only by the existing authorized register reconciliation. A report never
// creates attendance; removing/correcting a check-in clears this display link.
export async function reconcileGuestInvitations(ctx: MutationCtx, personId: Id<"people">, events: Array<{ serviceId?: Id<"services">; date: string; sunday: boolean }>) {
    const rows = await ctx.db.query("guest_invitations").withIndex("by_person", q => q.eq("person_id", personId)).collect();
    for (const row of rows) {
        const match = events.find(event => event.sunday && event.date === row.service_date && event.serviceId);
        if (row.attendance_service_id === match?.serviceId) continue;
        await changeInvitation(ctx, row, { attendance_service_id: match?.serviceId }, match ? "actual_attendance_linked" : "actual_attendance_removed");
    }
}
