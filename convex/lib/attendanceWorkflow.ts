import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { canFollowUp } from "./contactPolicy";

type Ctx = MutationCtx | QueryCtx;
export type Gathering = { serviceId?: Id<"services">; meetingId?: Id<"meetings"> };
export const now = () => new Date().toISOString();
export const present = (r: { status?: string; attended?: boolean }) => r.status ? r.status === "present" : r.attended !== false;
export function count(value: number | undefined, label: string) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) throw new Error(`${label} must be a non-negative whole number`);
    return value ?? 0;
}
export function date(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error("Choose a valid gathering date");
}
export function actualDate(value: string) {
    date(value);
    if (value > now().slice(0, 10)) throw new Error("Actual attendance cannot be recorded for a future gathering. Use an attendance plan instead.");
}
export function gatheringType(g: any, service: boolean): string {
    if (service) return g.service_type === "sunday_service" ? "sunday_service" : "special_event";
    return g.meeting_type === "bacenta" ? "bacenta" : ["special_event", "evangelistic_event"].includes(g.meeting_type) ? "special_event" : g.meeting_type;
}
export async function candidates(ctx: Ctx, type: string, day: string) {
    const services = await ctx.db.query("services").withIndex("by_service_date", q => q.eq("service_date", day)).collect();
    const meetings = await ctx.db.query("meetings").withIndex("by_meeting_date", q => q.eq("meeting_date", day)).collect();
    return [
        ...services.filter(g => gatheringType(g, true) === type).map(g => ({ serviceId: g._id, date: g.service_date, label: `${g.service_type.replaceAll("_", " ")} · ${g.service_time || "time not set"} · ${g.location || "location not set"}` })),
        ...meetings.filter(g => g.status !== "cancelled" && gatheringType(g, false) === type).map(g => ({ meetingId: g._id, date: g.meeting_date, label: `${g.title || g.meeting_type} · ${g.start_time || "time not set"} · ${g.location || "location not set"}` })),
    ];
}
export async function selectGathering(ctx: Ctx, type: string, day: string, selection: Gathering = {}) {
    date(day);
    const choices = await candidates(ctx, type, day);
    if (selection.serviceId && selection.meetingId) throw new Error("Choose one gathering");
    if (selection.serviceId || selection.meetingId) {
        const chosen = choices.find(g => selection.serviceId ? ("serviceId" in g && g.serviceId === selection.serviceId) : ("meetingId" in g && g.meetingId === selection.meetingId));
        if (!chosen) throw new Error("The selected gathering does not match this date and type");
        return chosen;
    }
    if (choices.length !== 1) throw new Error(choices.length ? "Several gatherings match this date. Select the gathering before recording actual attendance." : "No gathering exists for this date. Record the service or meeting first.");
    return choices[0];
}
export async function serviceRows(ctx: Ctx, id: Id<"services">) {
    return ctx.db.query("attendance").withIndex("by_service", q => q.eq("service_id", id)).collect();
}
export async function meetingRows(ctx: Ctx, id: Id<"meetings">) {
    return ctx.db.query("meeting_attendance").withIndex("by_meeting", q => q.eq("meeting_id", id)).collect();
}
async function namedCounts(ctx: Ctx, rows: Array<{person_id: Id<"people">; first_timer?: boolean; made_salvation_decision?: boolean; gave_tithe?: boolean}>) {
    let guests = 0;
    for (const r of rows) {
        const person = await ctx.db.get(r.person_id);
        if (!person) throw new Error("An attendee no longer exists. Refresh the people list.");
        if (r.first_timer || ["guest", "visitor"].includes(person.member_status)) guests++;
    }
    return { total_attendance: rows.length, guests_count: guests, salvation_decisions: rows.filter(r => r.made_salvation_decision).length, tithers_count: rows.filter(r => r.gave_tithe).length };
}
const countPairs = [
    ["total_attendance", "unnamed_attendance_count"], ["guests_count", "unnamed_guests_count"],
    ["salvation_decisions", "unnamed_decisions_count"], ["tithers_count", "unnamed_tithers_count"],
] as const;
// Capture the unlisted portion before changing named check-ins. A correction to
// named attendance must not erase or silently consume an observed unnamed count.
export async function prepareServiceCounts(ctx: MutationCtx, id: Id<"services">) {
    const service = await ctx.db.get(id);
    if (!service) throw new Error("Service not found");
    const named = await namedCounts(ctx, await serviceRows(ctx, id));
    const patch: Record<string, number> = {};
    for (const [total, unnamed] of countPairs) if (service[unnamed] === undefined) patch[unnamed] = Math.max(0, count(service[total], total) - named[total]);
    await ctx.db.patch(id, patch);
}
export async function reconcileServiceCounts(ctx: MutationCtx, id: Id<"services">, explicit?: Partial<Doc<"services">>) {
    const service = await ctx.db.get(id);
    if (!service) throw new Error("Service not found");
    const named = await namedCounts(ctx, await serviceRows(ctx, id));
    const patch: Record<string, number> = {};
    for (const [total, unnamed] of countPairs) {
        const supplied = explicit?.[total];
        if (supplied !== undefined) {
            count(supplied, total);
            if (supplied < named[total]) throw new Error(`${total} cannot be lower than named attendance`);
            patch[unnamed] = supplied - named[total];
        } else patch[unnamed] = count(service[unnamed], unnamed);
        patch[total] = named[total] + patch[unnamed];
    }
    // Named metadata changes can need a larger total when unnamed categories overlap.
    if (explicit?.total_attendance === undefined) {
        patch.total_attendance = Math.max(patch.total_attendance, patch.guests_count, patch.salvation_decisions, patch.tithers_count);
        patch.unnamed_attendance_count = patch.total_attendance - named.total_attendance;
    }
    if ([patch.guests_count, patch.salvation_decisions, patch.tithers_count].some(n => n > patch.total_attendance)) throw new Error("Category headcounts cannot exceed total attendance");
    await ctx.db.patch(id, { ...patch, individuals: undefined, updated_at: now() });
}
export async function reconcileMeetingCounts(ctx: MutationCtx, id: Id<"meetings">) {
    const meeting = await ctx.db.get(id);
    if (!meeting) throw new Error("Meeting not found");
    const rows = (await meetingRows(ctx, id)).filter(present);
    const links = meeting.program_id ? await ctx.db.query("meeting_program_leaders").withIndex("by_program", q => q.eq("program_id", meeting.program_id!)).collect() : [];
    await ctx.db.patch(id, { attendance_count: rows.length + count(meeting.unnamed_guests_count, "Unnamed guests"), leaders_count: rows.filter(r => links.some(l => l.person_id === r.person_id)).length, updated_at: now() });
}
async function personGatherings(ctx: Ctx, personId: Id<"people">) {
    const a = await ctx.db.query("attendance").withIndex("by_person", q => q.eq("person_id", personId)).collect();
    const m = await ctx.db.query("meeting_attendance").withIndex("by_person", q => q.eq("person_id", personId)).collect();
    const result: Array<{serviceId?: Id<"services">; meetingId?: Id<"meetings">; date: string; type: string; entry: string; decision: boolean}> = [];
    for (const r of a) {
        const g = await ctx.db.get(r.service_id);
        if (g) result.push({ serviceId: g._id, date: g.service_date, type: gatheringType(g, true), entry: "sunday_service", decision: !!r.made_salvation_decision });
    }
    for (const r of m.filter(present)) {
        const g = await ctx.db.get(r.meeting_id);
        if (g && g.status !== "cancelled") result.push({ meetingId: g._id, date: g.meeting_date, type: gatheringType(g, false), entry: g.meeting_type === "bacenta" ? "bacenta_meeting" : "other", decision: !!r.made_salvation_decision });
    }
    return result.sort((a, b) => a.date.localeCompare(b.date));
}
// Rebuild derived values instead of incrementing counters on retries/corrections.
export async function reconcilePerson(ctx: MutationCtx, personId: Id<"people">) {
    const person = await ctx.db.get(personId);
    if (!person) return;
    const events = await personGatherings(ctx, personId);
    const commitments = await ctx.db.query("gathering_commitments").withIndex("by_person", q => q.eq("person_id", personId)).collect();
    const interactions = await ctx.db.query("follow_ups").withIndex("by_contact", q => q.eq("contact_id", personId)).collect();
    for (const c of commitments) {
        let event = c.service_id || c.meeting_id ? events.find(e => c.service_id ? e.serviceId === c.service_id : e.meetingId === c.meeting_id) : undefined;
        if (!c.service_id && !c.meeting_id && c.resolution !== "cancelled") {
            const choices = await candidates(ctx, c.gathering_type, c.gathering_date);
            if (choices.length === 1) event = events.find(e => e.date === c.gathering_date && e.type === c.gathering_type);
        }
        if (event && event.type === c.gathering_type) {
            if (event.date !== c.gathering_date && commitments.some(other => other._id !== c._id && other.gathering_type === c.gathering_type && other.gathering_date === event.date)) throw new Error("The corrected date conflicts with another commitment for this person. Resolve the conflicting commitment first.");
            for (const f of interactions.filter(f => f.commitment_id === c._id || (!f.commitment_id && f.promised_date === c.gathering_date && (f.gathering_type ?? "sunday_service") === c.gathering_type))) {
                await ctx.db.patch(f._id, { commitment_id: c._id, gathering_date: event.date, ...(f.promised_date ? { promised_date: event.date } : {}) });
            }
            await ctx.db.patch(c._id, { service_id: event.serviceId, meeting_id: event.meetingId, gathering_date: event.date, resolution: "attended", attendance_previous_status: c.attendance_previous_status ?? (c.resolution === "attended" ? "pending" : c.resolution), resolved_at: c.resolved_at ?? now(), updated_at: now() });
        } else if (c.service_id || c.meeting_id) {
            await ctx.db.patch(c._id, { service_id: undefined, meeting_id: undefined, resolution: (c.attendance_previous_status ?? "pending") as "pending" | "no_show" | "cancelled", attendance_previous_status: undefined, resolved_at: undefined, updated_at: now() });
        }
    }
    const plans = await ctx.db.query("attendance_plans").collect();
    for (const p of plans.filter(p => p.person_id === personId)) {
        let event = p.service_id ? events.find(e => e.serviceId === p.service_id && e.type === "sunday_service") : undefined;
        if (!event) event = events.find(e => e.date === p.service_date && e.type === "sunday_service");
        if (event && event.date !== p.service_date && plans.some(other => other._id !== p._id && other.person_id === personId && other.service_date === event.date)) throw new Error("The corrected date conflicts with another attendance plan for this person.");
        if (event) await ctx.db.patch(p._id, { service_id: event.serviceId, service_date: event.date, status: "attended", attendance_previous_status: p.attendance_previous_status ?? (p.status === "attended" ? "expected" : p.status), updated_at: now() });
        else if (p.service_id && p.generated_from_attendance) await ctx.db.delete(p._id);
        else if (p.service_id) await ctx.db.patch(p._id, { service_id: undefined, status: (p.attendance_previous_status ?? "expected") as "expected" | "away" | "confirmed" | "absent", attendance_previous_status: undefined, updated_at: now() });
    }
    if (["member", "leader"].includes(person.member_status)) {
        const currentPlans = await ctx.db.query("attendance_plans").collect();
        const coveredDays = new Set(currentPlans.filter(p => p.person_id === personId).map(p => p.service_date));
        for (const event of events.filter(e => e.type === "sunday_service")) {
            if (coveredDays.has(event.date)) continue;
            await ctx.db.insert("attendance_plans", { person_id: personId, service_date: event.date, service_id: event.serviceId, status: "attended", generated_from_attendance: true, attendance_previous_status: "expected", created_at: now(), updated_at: now() });
            coveredDays.add(event.date);
        }
    }
    const refreshed = await ctx.db.query("gathering_commitments").withIndex("by_person", q => q.eq("person_id", personId)).collect();
    const followUps = await ctx.db.query("follow_ups").withIndex("by_contact", q => q.eq("contact_id", personId)).collect();
    for (const f of followUps.filter(f => f.promised_date)) {
        const matches = events.filter(e => e.date === f.promised_date && e.type === (f.gathering_type ?? "sunday_service"));
        const choices = await candidates(ctx, f.gathering_type ?? "sunday_service", f.promised_date!);
        await ctx.db.patch(f._id, { promise_fulfilled: matches.length > 0 && choices.length === 1 ? true : f.promise_fulfilled === true ? undefined : f.promise_fulfilled });
    }
    const baseline: any = person.attendance_milestones ?? {
        first_visit_date: person.first_visit_date, entry_point: person.entry_point, salvation_decision: person.salvation_decision,
        pipeline_stage: person.pipeline_stage, warmth_score: person.warmth_score,
    };
    // Preserve later manual profile corrections instead of overwriting them.
    if (person.attendance_milestones) for (const field of ["first_visit_date", "entry_point", "salvation_decision", "pipeline_stage", "warmth_score"] as const) {
        if (person[field] !== baseline[`applied_${field}`]) baseline[field] = person[field];
    }
    const earliest = events[0];
    // First-timer and first-program markers follow the corrected chronology,
    // including a gathering entered later but held earlier.
    const serviceAttendance = await ctx.db.query("attendance").withIndex("by_person", q => q.eq("person_id", personId)).collect();
    for (const row of serviceAttendance) {
        const firstTimer = !!earliest && earliest.serviceId === row.service_id
            && (!baseline.first_visit_date || earliest.date <= baseline.first_visit_date)
            && (["guest", "visitor"].includes(person.member_status) || !!row.first_timer);
        if (!!row.first_timer !== firstTimer) {
            await prepareServiceCounts(ctx, row.service_id);
            await ctx.db.patch(row._id, { first_timer: firstTimer });
            await reconcileServiceCounts(ctx, row.service_id);
        }
    }
    const meetingAttendance = await ctx.db.query("meeting_attendance").withIndex("by_person", q => q.eq("person_id", personId)).collect();
    const personMeetings = await Promise.all(meetingAttendance.map(r => ctx.db.get(r.meeting_id)));
    for (const row of meetingAttendance) {
        const meeting = personMeetings.find(g => g?._id === row.meeting_id);
        if (!meeting) continue;
        const firstTimer = present(row) && !!earliest && earliest.meetingId === row.meeting_id
            && (!baseline.first_visit_date || earliest.date <= baseline.first_visit_date)
            && (["guest", "visitor"].includes(person.member_status) || !!row.first_timer);
        const firstProgram = present(row) && !!meeting.program_id && !meetingAttendance.some(other => {
            const prior = personMeetings.find(g => g?._id === other.meeting_id);
            return present(other) && !!prior && prior.status !== "cancelled" && prior.program_id === meeting.program_id && prior.meeting_date < meeting.meeting_date;
        });
        if (!!row.first_timer !== firstTimer || !!row.first_program_attendance !== firstProgram) await ctx.db.patch(row._id, { first_timer: firstTimer, first_program_attendance: firstProgram });
    }
    const latestNoShow = refreshed.filter(c => c.resolution === "no_show").map(c => c.gathering_date).sort().at(-1);
    const stage = latestNoShow && (!events.length || latestNoShow >= events.at(-1)!.date) ? "no_show" : earliest ? "showed_up" : baseline.pipeline_stage;
    const derived: any = {
        first_visit_date: earliest && (!baseline.first_visit_date || earliest.date < baseline.first_visit_date) ? earliest.date : baseline.first_visit_date,
        entry_point: baseline.entry_point || earliest?.entry,
        salvation_decision: events.some(e => e.decision) ? true : baseline.salvation_decision,
        pipeline_stage: canFollowUp(person) ? stage : baseline.pipeline_stage,
        warmth_score: earliest && canFollowUp(person) ? "hot" : baseline.warmth_score,
    };
    for (const field of Object.keys(derived)) baseline[`applied_${field}`] = derived[field];
    const kept = new Set(refreshed.filter(c => c.response === "yes" && c.resolution === "attended").map(c => `${c.gathering_type}:${c.gathering_date}`));
    for (const f of followUps.filter(f => f.promised_date)) if (events.some(e => e.date === f.promised_date && e.type === (f.gathering_type ?? "sunday_service")) && (await candidates(ctx, f.gathering_type ?? "sunday_service", f.promised_date!)).length === 1) kept.add(`${f.gathering_type ?? "sunday_service"}:${f.promised_date}`);
    await ctx.db.patch(personId, { ...derived, attendance_milestones: baseline, promises_kept: kept.size, updated_at: now() });

    // One welcome task per person, retained when completed, cancelled on removal.
    const tasks = await ctx.db.query("follow_up_tasks").withIndex("by_person", q => q.eq("person_id", personId)).collect();
    const key = "attendance_welcome";
    const welcome = tasks.find(t => t.automation_key === key);
    const owner = refreshed.find(c => c.resolution === "attended")?.leader_id;
    if (earliest && owner && canFollowUp(person) && ["guest", "visitor"].includes(person.member_status) && !welcome && !tasks.some(t => t.status === "open")) {
        const due = new Date(earliest.date); due.setUTCDate(due.getUTCDate() + 2);
        await ctx.db.insert("follow_up_tasks", { person_id: personId, assigned_leader_id: owner, due_date: due.toISOString().slice(0, 10), status: "open", task_type: "follow_up", priority: "high", reason: "Welcome after attendance", automation_key: key, created_at: now(), updated_at: now() });
    } else if (welcome?.status === "open") {
        if (!earliest || !canFollowUp(person)) await ctx.db.patch(welcome._id, { status: "cancelled", outcome: "attendance_removed_or_contact_paused", updated_at: now() });
        else {
            const due = new Date(earliest.date); due.setUTCDate(due.getUTCDate() + 2);
            await ctx.db.patch(welcome._id, { due_date: due.toISOString().slice(0, 10), updated_at: now() });
        }
    }
}
export async function reconcilePeople(ctx: MutationCtx, ids: Id<"people">[]) {
    for (const id of new Set(ids)) await reconcilePerson(ctx, id);
}
export async function setActualAttendance(ctx: MutationCtx, personId: Id<"people">, g: Gathering, attended: boolean) {
    const person = await ctx.db.get(personId);
    if (!person) throw new Error("Person not found");
    if (g.serviceId) {
        const service = await ctx.db.get(g.serviceId);
        if (!service) throw new Error("Service not found");
        if (attended) actualDate(service.service_date);
        await prepareServiceCounts(ctx, g.serviceId);
        const existing = (await serviceRows(ctx, g.serviceId)).filter(r => r.person_id === personId);
        if (attended && !existing.length) await ctx.db.insert("attendance", { service_id: g.serviceId, person_id: personId, first_timer: ["guest", "visitor"].includes(person.member_status) && (!person.first_visit_date || person.first_visit_date >= service.service_date), made_salvation_decision: false, gave_tithe: false, created_at: now() });
        for (const r of existing.slice(attended ? 1 : 0)) await ctx.db.delete(r._id);
        await reconcileServiceCounts(ctx, g.serviceId);
    } else if (g.meetingId) {
        const meeting = await ctx.db.get(g.meetingId);
        if (!meeting || meeting.status === "cancelled") throw new Error("Meeting is unavailable");
        if (attended) actualDate(meeting.meeting_date);
        const existing = (await meetingRows(ctx, g.meetingId)).filter(r => r.person_id === personId);
        if (attended) {
            if (existing[0]) await ctx.db.patch(existing[0]._id, { attended: true, status: "present" });
            else await ctx.db.insert("meeting_attendance", { meeting_id: g.meetingId, person_id: personId, attended: true, status: "present", first_timer: ["guest", "visitor"].includes(person.member_status) && (!person.first_visit_date || person.first_visit_date >= meeting.meeting_date), created_at: now() });
        }
        for (const r of existing.slice(attended ? 1 : 0)) await ctx.db.delete(r._id);
        if (attended) await ctx.db.patch(g.meetingId, { status: "completed", attendance_completed_at: meeting.attendance_completed_at ?? now() });
        await reconcileMeetingCounts(ctx, g.meetingId);
    } else throw new Error("Choose a gathering");
    await reconcilePerson(ctx, personId);
}
export async function syncServiceAttendance(ctx: MutationCtx, serviceId: Id<"services">, data: Array<{ person_id: Id<"people">; first_timer?: boolean; gave_tithe?: boolean; made_salvation_decision?: boolean }>, explicit?: Partial<Doc<"services">>) {
    if (data.length) actualDate((await ctx.db.get(serviceId))?.service_date ?? "");
    await prepareServiceCounts(ctx, serviceId);
    const existing = await serviceRows(ctx, serviceId);
    const incoming = new Map(data.map(r => [r.person_id, r]));
    for (const row of existing) {
        const next = incoming.get(row.person_id);
        if (next) { await ctx.db.patch(row._id, next); incoming.delete(row.person_id); }
        else await ctx.db.delete(row._id);
    }
    for (const row of incoming.values()) {
        if (!await ctx.db.get(row.person_id)) throw new Error("Person not found");
        await ctx.db.insert("attendance", { ...row, service_id: serviceId, created_at: now() });
    }
    await reconcileServiceCounts(ctx, serviceId, explicit);
    await reconcilePeople(ctx, [...existing.map(r => r.person_id), ...data.map(r => r.person_id)]);
}
export async function deleteGathering(ctx: MutationCtx, g: Gathering) {
    const id = g.serviceId ?? g.meetingId!;
    const record = await ctx.db.get(id);
    if (!record) return { success: true };
    const rows = g.serviceId ? await serviceRows(ctx, g.serviceId) : await meetingRows(ctx, g.meetingId!);
    const day = "service_date" in record ? record.service_date : record.meeting_date;
    const type = gatheringType(record, !!g.serviceId);
    const uniqueDate = (await candidates(ctx, type, day)).length === 1;
    const commitments = (await ctx.db.query("gathering_commitments").collect()).filter(c =>
        (g.serviceId ? c.service_id === id : c.meeting_id === id) || (uniqueDate && !c.service_id && !c.meeting_id && c.gathering_date === day && c.gathering_type === type));
    const plans = (await ctx.db.query("attendance_plans").collect()).filter(p => p.service_id === id || p.meeting_id === id || (uniqueDate && type === "sunday_service" && !p.service_id && p.service_date === day));
    const tasks = (await ctx.db.query("follow_up_tasks").collect()).filter(t => uniqueDate && t.gathering_type === type && t.gathering_date === day && t.status === "open");
    const photos = g.serviceId ? await ctx.db.query("service_photos").withIndex("by_service", q => q.eq("service_id", g.serviceId!)).collect() : [];
    const people = await Promise.all([...new Set(rows.map(r => r.person_id))].map(id => ctx.db.get(id)));
    await ctx.db.insert("record_recovery", { record_type: g.serviceId ? "service" : "meeting", record_id: id, snapshot: { record, attendance: rows, commitments, plans, tasks, photos, people }, deleted_at: now() });
    for (const task of tasks) await ctx.db.patch(task._id, { status: "cancelled", outcome: "gathering_removed", updated_at: now() });
    // Retain stored file bytes for recovery; detach active metadata from the deleted service.
    for (const photo of photos) await ctx.db.delete(photo._id);
    for (const row of rows) await ctx.db.delete(row._id);
    await ctx.db.delete(id);
    await reconcilePeople(ctx, [...rows.map(r => r.person_id), ...commitments.map(c => c.person_id), ...plans.map(p => p.person_id)]);
    for (const c of commitments) await ctx.db.patch(c._id, { resolution: "cancelled", service_id: undefined, meeting_id: undefined, attendance_previous_status: undefined, updated_at: now() });
    for (const p of plans) if (await ctx.db.get(p._id)) await ctx.db.delete(p._id);
    return { success: true, attendanceRemoved: rows.length };
}
