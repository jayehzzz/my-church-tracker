import { candidates, selectGathering, setActualAttendance, reconcilePerson } from "./lib/attendanceWorkflow";
import { canFollowUp, requireFollowUpAllowed } from "./lib/contactPolicy";
import { managesAttendance } from "./lib/security";
import { queryFor, mutationFor } from "./lib/security";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";

const gatheringType = v.union(
    v.literal("sunday_service"),
    v.literal("bacenta"),
    v.literal("special_event"),
);

const attendanceResponse = v.union(
    v.literal("yes"),
    v.literal("maybe"),
    v.literal("no"),
);

const taskType = v.union(
    v.literal("first_contact"),
    v.literal("follow_up"),
    v.literal("sunday_confirmation"),
    v.literal("member_care"),
    v.literal("visitation"),
    v.literal("reengagement"),
    v.literal("other"),
);

const taskPriority = v.union(
    v.literal("urgent"),
    v.literal("high"),
    v.literal("normal"),
    v.literal("low"),
);

type GatheringType = "sunday_service" | "bacenta" | "special_event";
type AttendanceResponse = "yes" | "maybe" | "no";
type TaskType = "first_contact" | "follow_up" | "sunday_confirmation" | "member_care" | "visitation" | "reengagement" | "other";
type TaskPriority = "urgent" | "high" | "normal" | "low";
const QUARTERLY_ACTIVE_LIMIT_PER_LEADER = 10;

const isoNow = () => new Date().toISOString();
const today = () => isoNow().slice(0, 10);

function addUtcDays(date: string, days: number) {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
}

function automaticNextTaskForOutcome(outcome: string, fromDate = today()) {
    const plans: Record<string, { days: number; taskType: TaskType; reason: string }> = {
        positive_conversation: { days: 2, taskType: "follow_up", reason: "Continue the positive conversation" },
        no_response: { days: 7, taskType: "follow_up", reason: "No response — try once more after a short pause" },
        care_check_in: { days: 7, taskType: "member_care", reason: "Continue the care check-in" },
        rescheduled: { days: 30, taskType: "reengagement", reason: "They asked to speak later — reconnect after a month" },
        not_serious_now: { days: 30, taskType: "reengagement", reason: "Not serious right now — gently reconnect after a month" },
        on_holiday: { days: 30, taskType: "reengagement", reason: "Reconnect after their time away" },
        asked_to_pause: { days: 30, taskType: "reengagement", reason: "Reconnect after the requested pause" },
        busy_period: { days: 30, taskType: "reengagement", reason: "Reconnect after their busy period" },
    };
    const plan = plans[outcome];
    return plan ? { ...plan, dueDate: addUtcDays(fromDate, plan.days) } : null;
}

function nextSunday(fromDate = today()) {
    const value = new Date(`${fromDate}T00:00:00.000Z`);
    const daysUntilSunday = (7 - value.getUTCDay()) % 7;
    value.setUTCDate(value.getUTCDate() + daysUntilSunday);
    return value.toISOString().slice(0, 10);
}

function personName(person: Doc<"people"> | null | undefined) {
    if (!person) return "Unknown";
    return `${person.preferred_name || person.first_name} ${person.last_name}`.trim();
}

function isEvangelismContact(person: Doc<"people">) {
    return ["guest", "visitor", "new_believer"].includes(person.member_status)
        || (
            !["member", "leader", "archived"].includes(person.member_status)
            && (person.entry_point === "evangelism" || Boolean(person.contact_date))
        );
}

function isRegularMember(person: Doc<"people">) {
    return ["member", "leader"].includes(person.member_status)
        && person.activity_status !== "irregular"
        && person.activity_status !== "dormant";
}

async function requirePerson(ctx: MutationCtx, personId: Id<"people">, label = "Person") {
    const person = await ctx.db.get(personId);
    if (!person) throw new Error(`${label} not found`);
    return person;
}

async function requireLeader(ctx: MutationCtx, leaderId: Id<"people">) {
    const leader = await requirePerson(ctx, leaderId, "Leader");
    if (leader.member_status !== "leader") {
        throw new Error("The assignee must be a person with leader status");
    }
    return leader;
}

async function getActiveAssignments(ctx: MutationCtx, personId: Id<"people">) {
    return await ctx.db
        .query("follow_up_assignments")
        .withIndex("by_person_status", (q) => q.eq("person_id", personId).eq("status", "active"))
        .collect();
}

async function replaceAssignment(
    ctx: MutationCtx,
    personId: Id<"people">,
    leaderId: Id<"people">,
    assignedById?: Id<"people">,
) {
    const now = isoNow();
    const active = await getActiveAssignments(ctx, personId);
    const current = active
        .filter((assignment) => assignment.assigned_leader_id === leaderId)
        .sort((a, b) => b.assigned_at.localeCompare(a.assigned_at))[0];

    for (const assignment of active) {
        if (current && assignment._id === current._id) continue;
        await ctx.db.patch(assignment._id, {
            status: "ended",
            ended_at: now,
            updated_at: now,
        });
    }

    if (current) return current._id;

    return await ctx.db.insert("follow_up_assignments", {
        person_id: personId,
        assigned_leader_id: leaderId,
        assigned_by_id: assignedById,
        status: "active",
        assigned_at: now,
        created_at: now,
        updated_at: now,
    });
}

async function insertTask(
    ctx: MutationCtx,
    args: {
        personId: Id<"people">;
        assignedLeaderId: Id<"people">;
        createdById?: Id<"people">;
        dueDate: string;
        taskType: TaskType;
        priority: TaskPriority;
        reason?: string;
        automationKey?: string;
        gatheringType?: GatheringType;
        gatheringDate?: string;
    },
) {
    requireFollowUpAllowed(await requirePerson(ctx, args.personId));
    const now = isoNow();
    return await ctx.db.insert("follow_up_tasks", {
        person_id: args.personId,
        assigned_leader_id: args.assignedLeaderId,
        created_by_id: args.createdById,
        due_date: args.dueDate,
        status: "open",
        task_type: args.taskType,
        priority: args.priority,
        reason: args.reason,
        automation_key: args.automationKey,
        gathering_type: args.gatheringType,
        gathering_date: args.gatheringDate,
        created_at: now,
        updated_at: now,
    });
}

async function upsertCommitment(
    ctx: MutationCtx,
    args: {
        personId: Id<"people">;
        leaderId: Id<"people">;
        gatheringType: GatheringType;
        gatheringDate: string;
        response: AttendanceResponse;
    },
) {
    requireFollowUpAllowed(await requirePerson(ctx, args.personId));
    const now = isoNow();
    const matching = await ctx.db
        .query("gathering_commitments")
        .withIndex("by_person_date", (q) =>
            q.eq("person_id", args.personId).eq("gathering_date", args.gatheringDate),
        )
        .collect();
    const existing = matching
        .filter((commitment) => commitment.gathering_type === args.gatheringType)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];

    if (existing) {
        if (existing.resolution !== "pending") {
            throw new Error("A resolved gathering commitment cannot be changed");
        }
        const becameYes = existing.response !== "yes" && args.response === "yes";
        await ctx.db.patch(existing._id, {
            leader_id: args.leaderId,
            response: args.response,
            updated_at: now,
        });
        return { id: existing._id, becameYes };
    }

    const id = await ctx.db.insert("gathering_commitments", {
        person_id: args.personId,
        leader_id: args.leaderId,
        gathering_type: args.gatheringType,
        gathering_date: args.gatheringDate,
        response: args.response,
        resolution: "pending",
        created_at: now,
        updated_at: now,
    });
    return { id, becameYes: args.response === "yes" };
}

async function putContactOnLaterList(
    ctx: MutationCtx,
    person: Doc<"people">,
    reason: string,
    resumeDate?: string,
    preserveAlternativeGatheringTasks = false,
) {
    const now = isoNow();
    const openTasks = await ctx.db
        .query("follow_up_tasks")
        .withIndex("by_person_status", (q) => q.eq("person_id", person._id).eq("status", "open"))
        .collect();

    for (const task of openTasks) {
        const alternativeGathering = task.gathering_type === "bacenta"
            || task.gathering_type === "special_event";
        if (preserveAlternativeGatheringTasks && alternativeGathering) continue;
        await ctx.db.patch(task._id, {
            status: "cancelled",
            outcome: "moved_to_later",
            completed_at: now,
            updated_at: now,
        });
    }

    await ctx.db.patch(person._id, {
        is_paused: true,
        pause_reason: reason,
        resume_date: resumeDate,
        pipeline_stage: "paused",
        updated_at: now,
    });
}

export const getLeaders = queryFor("crm:getLeaders")({
    args: {},
    handler: async (ctx) => {
        const [leaders, users] = await Promise.all([
            ctx.db
                .query("people")
                .withIndex("by_member_status", (q) => q.eq("member_status", "leader"))
                .collect(),
            ctx.db.query("crm_users").collect(),
        ]);
        const userByPerson = new Map(
            users.filter((user) => user.person_id).map((user) => [user.person_id!, user]),
        );
        return leaders
            .map((leader) => ({
                ...leader,
                name: personName(leader),
                crm_user: userByPerson.get(leader._id) ?? null,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    },
});

// This is deliberately shared by the administrator-only backfill endpoint and
// the scheduled job below.  A dashboard query must never be responsible for
// creating work merely because somebody opened it.
async function synchronizeQuarterlyReengagement(ctx: MutationCtx, asOfDate = today()) {
        const thresholdDate = addUtcDays(asOfDate, -90);
        // The scheduler works only over contact statuses and open CRM work.
        // `last_follow_up_date` is maintained atomically by the write paths, so
        // the job does not need to scan every historical interaction.
        const [guests, newBelievers, legacyVisitors, activeAssignments, openTasks] = await Promise.all([
            ctx.db.query("people").withIndex("by_member_status", (q) => q.eq("member_status", "guest")).collect(),
            ctx.db.query("people").withIndex("by_member_status", (q) => q.eq("member_status", "new_believer")).collect(),
            ctx.db.query("people").withIndex("by_member_status", (q) => q.eq("member_status", "visitor")).collect(),
            ctx.db.query("follow_up_assignments").withIndex("by_status", (q) => q.eq("status", "active")).collect(),
            ctx.db.query("follow_up_tasks").withIndex("by_status_due_date", (q) => q.eq("status", "open")).collect(),
        ]);
        const allPeople = [...guests, ...newBelievers, ...legacyVisitors];
        const ownerByPerson = new Map<Id<"people">, Id<"people">>();
        activeAssignments
            .sort((a, b) => a.assigned_at.localeCompare(b.assigned_at))
            .forEach((assignment) => ownerByPerson.set(assignment.person_id, assignment.assigned_leader_id));
        const peopleWithOpenTasks = new Set(
            openTasks.map((task) => task.person_id),
        );

        const createdTaskIds: Array<Id<"follow_up_tasks">> = [];
        const activeQuarterlyByLeader = new Map<Id<"people">, number>();
        openTasks
            .filter((task) => task.automation_key === "quarterly_reengagement")
            .forEach((task) => {
                activeQuarterlyByLeader.set(
                    task.assigned_leader_id,
                    (activeQuarterlyByLeader.get(task.assigned_leader_id) ?? 0) + 1,
                );
            });
        let waiting = 0;
        for (const person of allPeople) {
            if (person.contact_category === "do_not_contact" || person.member_status === "archived") continue;
            const ownerId = ownerByPerson.get(person._id);
            if (person.is_paused === true) {
                if (
                    person.resume_date
                    && person.resume_date <= asOfDate
                    && ownerId
                    && !peopleWithOpenTasks.has(person._id)
                ) {
                    await ctx.db.patch(person._id, {
                        is_paused: false,
                        pause_reason: undefined,
                        resume_date: undefined,
                        pipeline_stage: "review",
                        updated_at: isoNow(),
                    });
                    const taskId = await insertTask(ctx, {
                        personId: person._id,
                        assignedLeaderId: ownerId,
                        dueDate: asOfDate,
                        taskType: "reengagement",
                        priority: "normal",
                        reason: "90-day review — decide whether to restart follow-up",
                        automationKey: "later_review",
                    });
                    createdTaskIds.push(taskId);
                    peopleWithOpenTasks.add(person._id);
                }
                continue;
            }
            const lastContactDate = person.last_follow_up_date
                ?? person.contact_date
                ?? person.created_at.slice(0, 10);
            if (
                !isEvangelismContact(person)
                || !ownerId
                || peopleWithOpenTasks.has(person._id)
                || ["do_not_contact", "wrong_number", "has_church"].includes(person.contact_category ?? "")
                || lastContactDate > thresholdDate
            ) {
                continue;
            }
            const activeQuarterly = activeQuarterlyByLeader.get(ownerId) ?? 0;
            if (activeQuarterly >= QUARTERLY_ACTIVE_LIMIT_PER_LEADER) {
                waiting += 1;
                continue;
            }
            const taskId = await insertTask(ctx, {
                personId: person._id,
                assignedLeaderId: ownerId,
                dueDate: asOfDate,
                taskType: "reengagement",
                priority: "normal",
                reason: "90-day check-in — see if they may be interested now",
                automationKey: "quarterly_reengagement",
            });
            createdTaskIds.push(taskId);
            peopleWithOpenTasks.add(person._id);
            activeQuarterlyByLeader.set(ownerId, activeQuarterly + 1);
        }
        return {
            created: createdTaskIds.length,
            waiting,
            active_limit: QUARTERLY_ACTIVE_LIMIT_PER_LEADER,
            task_ids: createdTaskIds,
        };
}

// This remains an administrator-only operational backfill. It is not called
// from any page read; scheduled work uses the internal entry point below.
export const syncQuarterlyReengagement = mutationFor("crm:syncQuarterlyReengagement")({
    args: { asOfDate: v.optional(v.string()) },
    handler: async (ctx, args) => synchronizeQuarterlyReengagement(ctx as MutationCtx, args.asOfDate),
});

export const runQuarterlyReengagement = internalMutation({
    args: { asOfDate: v.optional(v.string()) },
    handler: async (ctx, args) => synchronizeQuarterlyReengagement(ctx, args.asOfDate),
});

export const getDashboard = queryFor("crm:getDashboard")({
    args: {
        leaderId: v.optional(v.id("people")),
        serviceDate: v.optional(v.string()),
        periodStart: v.optional(v.string()),
        periodEnd: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const serviceDate = args.serviceDate ?? nextSunday();
        const todayDate = today();
        const todayValue = new Date(`${todayDate}T00:00:00.000Z`);
        const mondayOffset = todayValue.getUTCDay() === 0 ? -6 : 1 - todayValue.getUTCDay();
        const periodStart = args.periodStart ?? addUtcDays(todayDate, mondayOffset);
        const periodEnd = args.periodEnd ?? todayDate;
        const freshSince = addUtcDays(todayDate, -14);
        // The CRM only needs members, leaders and contact statuses. Keep the
        // dashboard on indexed slices rather than reading unrelated archived
        // or historical records on every subscription update.
        const peopleByStatus = await Promise.all(
            ["leader", "member", "guest", "new_believer", "visitor"].map((status) =>
                ctx.db.query("people").withIndex("by_member_status", (q) => q.eq("member_status", status)).collect(),
            ),
        );
        const allPeople = peopleByStatus.flat();
        const contactPeople = allPeople.filter(isEvangelismContact);
        const completedSince = `${freshSince}T00:00:00.000Z`;
        const [allAssignments, openTasks, completedTasks, sundayCommitments, upcomingCommitmentRows, attendancePlans, allVisitations, recentSundayResults] = await Promise.all([
            ctx.db.query("follow_up_assignments").withIndex("by_status", (q) => q.eq("status", "active")).collect(),
            ctx.db.query("follow_up_tasks").withIndex("by_status_due_date", (q) => q.eq("status", "open")).collect(),
            ctx.db.query("follow_up_tasks").withIndex("by_status_completed_at", (q) => q.eq("status", "completed").gte("completed_at", completedSince)).collect(),
            ctx.db.query("gathering_commitments").withIndex("by_gathering", (q) => q.eq("gathering_type", "sunday_service").eq("gathering_date", serviceDate)).collect(),
            ctx.db.query("gathering_commitments").withIndex("by_date", (q) => q.gte("gathering_date", todayDate).lte("gathering_date", addUtcDays(todayDate, 7))).collect(),
            ctx.db.query("attendance_plans").withIndex("by_service_date", (q) => q.eq("service_date", serviceDate)).collect(),
            ctx.db.query("visitations").withIndex("by_follow_up", (q) => q.eq("follow_up_required", true)).collect(),
            ctx.db.query("gathering_commitments").withIndex("by_gathering", (q) => q.eq("gathering_type", "sunday_service")).order("desc").take(40),
        ]);
        const allTasks = [...openTasks, ...completedTasks];
        const [followUpGroups, commitmentGroups] = await Promise.all([
            Promise.all(contactPeople.map((person) => ctx.db.query("follow_ups").withIndex("by_contact", (q) => q.eq("contact_id", person._id)).collect())),
            Promise.all(contactPeople.map((person) => ctx.db.query("gathering_commitments").withIndex("by_person", (q) => q.eq("person_id", person._id)).collect())),
        ]);
        const allFollowUps = followUpGroups.flat();
        const allCommitments = [...new Map(
            [...commitmentGroups.flat(), ...sundayCommitments, ...upcomingCommitmentRows, ...recentSundayResults]
                .map((commitment) => [commitment._id, commitment]),
        ).values()];
        const followUpsByContact = new Map<Id<"people">, typeof allFollowUps>();
        for (const followUp of allFollowUps) {
            const values = followUpsByContact.get(followUp.contact_id) ?? [];
            values.push(followUp);
            followUpsByContact.set(followUp.contact_id, values);
        }
        const commitmentsByPerson = new Map<Id<"people">, typeof allCommitments>();
        for (const commitment of allCommitments) {
            const values = commitmentsByPerson.get(commitment.person_id) ?? [];
            values.push(commitment);
            commitmentsByPerson.set(commitment.person_id, values);
        }

        const peopleById = new Map(allPeople.map((person) => [person._id, person]));
        const leaders = allPeople.filter((person) => person.member_status === "leader");
        const activeAssignments = allAssignments.filter((assignment) => assignment.status === "active");
        const ownerByPerson = new Map(
            activeAssignments
                .sort((a, b) => a.assigned_at.localeCompare(b.assigned_at))
                .map((assignment) => [assignment.person_id, assignment.assigned_leader_id]),
        );
        const enrichedAssignments = activeAssignments
            .filter((assignment) => !args.leaderId || assignment.assigned_leader_id === args.leaderId)
            .map((assignment) => ({
                ...assignment,
                person: peopleById.get(assignment.person_id) ?? null,
                assigned_leader: peopleById.get(assignment.assigned_leader_id) ?? null,
                assigned_leader_name: personName(peopleById.get(assignment.assigned_leader_id)),
            }));

        const scopedTasks = allTasks.filter((task) =>
            task.status === "open"
            && (!args.leaderId || task.assigned_leader_id === args.leaderId),
        );
        const priorityRank: Record<TaskPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
        const enrichedTasks = scopedTasks
            .map((task) => ({
                ...task,
                person: peopleById.get(task.person_id) ?? null,
                person_name: personName(peopleById.get(task.person_id)),
                assigned_leader: peopleById.get(task.assigned_leader_id) ?? null,
                assigned_leader_name: personName(peopleById.get(task.assigned_leader_id)),
                is_overdue: task.due_date < todayDate,
                is_due: task.due_date <= todayDate,
            }))
            .sort((a, b) =>
                a.due_date.localeCompare(b.due_date)
                || priorityRank[a.priority] - priorityRank[b.priority],
            );
        const openTaskByPerson = new Map(
            enrichedTasks
                .slice()
                .sort((a, b) => b.due_date.localeCompare(a.due_date))
                .map((task) => [task.person_id, task]),
        );
        const crmContacts = allPeople
            .filter((person) =>
                isEvangelismContact(person)
                && (!args.leaderId || ownerByPerson.get(person._id) === args.leaderId),
            )
            .map((person) => {
                const personFollowUps = (followUpsByContact.get(person._id) ?? [])
                    .slice()
                    .sort((a, b) => b.follow_up_date.localeCompare(a.follow_up_date));
                let unansweredAttempts = 0;
                for (const followUp of personFollowUps) {
                    if (followUp.outcome !== "no_response") break;
                    unansweredAttempts += 1;
                }
                const personCommitments = commitmentsByPerson.get(person._id) ?? [];
                const confirmedNoShows = new Set(
                    personCommitments
                        .filter((commitment) => commitment.gathering_type === "sunday_service"
                            && commitment.response === "yes"
                            && commitment.resolution === "no_show")
                        .map((commitment) => commitment.gathering_date),
                ).size;
                const positiveSignal = person.contact_category === "responsive"
                    || ["responding", "invited", "promised", "showed_up"].includes(person.pipeline_stage ?? "")
                    || personFollowUps.some((followUp) =>
                        ["positive_conversation", "rescheduled", "came_to_church", "showed_up", "attended"].includes(followUp.outcome))
                    || personCommitments.some((commitment) => commitment.response === "yes" || commitment.resolution === "attended");
                return {
                    ...person,
                    assigned_leader_id: ownerByPerson.get(person._id) ?? null,
                    assigned_leader: peopleById.get(ownerByPerson.get(person._id)!) ?? null,
                    next_task: openTaskByPerson.get(person._id) ?? null,
                    is_fresh: Boolean(
                        person.contact_date
                        && person.contact_date >= freshSince
                        && person.contact_date <= todayDate,
                    ),
                    unanswered_attempts: unansweredAttempts,
                    confirmed_no_shows: confirmedNoShows,
                    should_move_to_later: person.is_paused !== true
                        && (unansweredAttempts >= 3 || confirmedNoShows >= 2),
                    recommendation_reason: unansweredAttempts >= 3
                        ? `${unansweredAttempts} unanswered attempts`
                        : confirmedNoShows >= 2
                            ? `${confirmedNoShows} Sunday promises missed`
                            : null,
                    is_serious: person.is_paused !== true
                        && positiveSignal
                        && unansweredAttempts < 3
                        && confirmedNoShows < 2,
                };
            })
            .sort((a, b) =>
                Number(b.is_fresh) - Number(a.is_fresh)
                || (b.contact_date || b.created_at).localeCompare(a.contact_date || a.created_at),
            );

        // "Coming this Sunday" is intentionally strict: only an explicit yes
        // that has not yet been reconciled is considered confirmed.
        const confirmedCommitments = sundayCommitments
            .filter((commitment) =>
                commitment.response === "yes"
                && commitment.resolution === "pending"
                && (!args.leaderId || commitment.leader_id === args.leaderId),
            )
            .map((commitment) => ({
                ...commitment,
                confirmed: true,
                person: peopleById.get(commitment.person_id) ?? null,
                person_name: personName(peopleById.get(commitment.person_id)),
                leader: peopleById.get(commitment.leader_id) ?? null,
                leader_name: personName(peopleById.get(commitment.leader_id)),
            }))
            .sort((a, b) => a.person_name.localeCompare(b.person_name));
        const sundayExpectedCommitments = sundayCommitments
            .filter((commitment) =>
                commitment.response === "yes"
                && (!args.leaderId || commitment.leader_id === args.leaderId),
            )
            .map((commitment) => ({
                ...commitment,
                confirmed: commitment.resolution === "pending",
                person: peopleById.get(commitment.person_id) ?? null,
                person_name: personName(peopleById.get(commitment.person_id)),
                leader: peopleById.get(commitment.leader_id) ?? null,
                leader_name: personName(peopleById.get(commitment.leader_id)),
            }))
            .sort((a, b) => a.person_name.localeCompare(b.person_name));
        const weekEnd = addUtcDays(todayDate, 7);
        const upcomingCommitments = allCommitments
            .filter((commitment) =>
                commitment.gathering_date >= todayDate
                && commitment.gathering_date <= weekEnd
                && commitment.response === "yes"
                && commitment.resolution === "pending"
                && (!args.leaderId || commitment.leader_id === args.leaderId),
            )
            .map((commitment) => ({
                ...commitment,
                confirmed: true,
                person: peopleById.get(commitment.person_id) ?? null,
                person_name: personName(peopleById.get(commitment.person_id)),
                leader: peopleById.get(commitment.leader_id) ?? null,
                leader_name: personName(peopleById.get(commitment.leader_id)),
            }))
            .sort((a, b) =>
                a.gathering_date.localeCompare(b.gathering_date)
                || a.person_name.localeCompare(b.person_name),
            );
        const visitationFollowUps = allVisitations
            .filter((visitation) =>
                visitation.follow_up_required
                && (!visitation.follow_up_date || visitation.follow_up_date <= weekEnd)
                && (!args.leaderId || visitation.visited_by_id === args.leaderId),
            )
            .map((visitation) => ({
                ...visitation,
                person: visitation.person_id ? peopleById.get(visitation.person_id) ?? null : null,
            }))
            .sort((a, b) => (a.follow_up_date || "9999-12-31").localeCompare(b.follow_up_date || "9999-12-31"));

        const laterContacts = allPeople
            .filter((person) =>
                isEvangelismContact(person)
                && person.is_paused === true
                && (!args.leaderId || ownerByPerson.get(person._id) === args.leaderId),
            )
            .map((person) => ({
                ...person,
                assigned_leader_id: ownerByPerson.get(person._id) ?? null,
                assigned_leader: peopleById.get(ownerByPerson.get(person._id)!) ?? null,
                is_fresh: Boolean(
                    person.contact_date
                    && person.contact_date >= freshSince
                    && person.contact_date <= todayDate,
                ),
            }))
            .sort((a, b) => (a.resume_date || "9999-12-31").localeCompare(b.resume_date || "9999-12-31"));

        const unassignedContacts = allPeople
            .filter((person) =>
                isEvangelismContact(person)
                && person.is_paused !== true
                && !ownerByPerson.has(person._id)
                && person.contact_category !== "do_not_contact"
                && person.contact_category !== "has_church",
            )
            .map((person) => ({
                ...person,
                is_fresh: Boolean(
                    person.contact_date
                    && person.contact_date >= freshSince
                    && person.contact_date <= todayDate,
                ),
            }))
            .sort((a, b) =>
                Number(b.is_fresh) - Number(a.is_fresh)
                || (b.contact_date || b.created_at).localeCompare(a.contact_date || a.created_at),
            );

        const memberCareTasks = enrichedTasks.filter((task) => task.task_type === "member_care");
        const visitationTasks = enrichedTasks.filter((task) => task.task_type === "visitation");
        // Team oversight remains church-wide even when leaderId scopes the
        // operational lists to one leader's work queue.
        const teamStats = leaders.map((leader) => {
            const assignments = activeAssignments.filter(
                (assignment) => assignment.assigned_leader_id === leader._id,
            );
            const assignedIds = new Set(assignments.map((assignment) => assignment.person_id));
            const freshAssignedIds = new Set(
                allPeople
                    .filter((person) =>
                        assignedIds.has(person._id)
                        && person.contact_date !== undefined
                        && person.contact_date >= freshSince
                        && person.contact_date <= todayDate,
                    )
                    .map((person) => person._id),
            );
            const freshContactedIds = new Set(
                allFollowUps
                    .filter((followUp) =>
                        followUp.leader_id === leader._id
                        && freshAssignedIds.has(followUp.contact_id),
                    )
                    .map((followUp) => followUp.contact_id),
            );
            const leaderTasks = allTasks.filter((task) => task.assigned_leader_id === leader._id);
            const assignedPeople = crmContacts.filter((person) => assignedIds.has(person._id));
            const periodFollowUps = allFollowUps.filter((followUp) =>
                followUp.leader_id === leader._id
                && followUp.follow_up_date >= periodStart
                && followUp.follow_up_date <= periodEnd,
            );
            const periodCommitments = allCommitments.filter((commitment) => {
                const recordedDate = commitment.created_at.slice(0, 10);
                return commitment.leader_id === leader._id
                    && recordedDate >= periodStart
                    && recordedDate <= periodEnd;
            });
            const sundayPromises = periodCommitments.filter((commitment) =>
                commitment.gathering_type === "sunday_service" && commitment.response === "yes");
            const openPersonIds = new Set(
                leaderTasks.filter((task) => task.status === "open").map((task) => task.person_id),
            );
            const completedThisWeek = leaderTasks.filter((task) =>
                task.status === "completed"
                && task.completed_at !== undefined
                && task.completed_at.slice(0, 10) >= freshSince,
            );
            const lastFollowUp = allFollowUps
                .filter((followUp) => followUp.leader_id === leader._id)
                .map((followUp) => followUp.follow_up_date)
                .sort()
                .at(-1) ?? null;
            const lastCompletedTask = leaderTasks
                .filter((task) => task.completed_at)
                .map((task) => task.completed_at!)
                .sort()
                .at(-1) ?? null;

            return {
                leader_id: leader._id,
                leader_name: personName(leader),
                assigned_contacts: assignedIds.size,
                fresh_assigned: freshAssignedIds.size,
                fresh_contacted: freshContactedIds.size,
                fresh_contact_rate: freshAssignedIds.size
                    ? Math.round((freshContactedIds.size / freshAssignedIds.size) * 100)
                    : 100,
                open_tasks: leaderTasks.filter((task) => task.status === "open").length,
                overdue_tasks: leaderTasks.filter(
                    (task) => task.status === "open" && task.due_date < todayDate,
                ).length,
                completed_this_week: completedThisWeek.length,
                period_follow_ups: periodFollowUps.length,
                period_unique_contacts: new Set(periodFollowUps.map((followUp) => followUp.contact_id)).size,
                meaningful_conversations: periodFollowUps.filter((followUp) =>
                    !["no_response", "wrong_number"].includes(followUp.outcome)).length,
                serious_candidates: assignedPeople.filter((person) => person.is_serious).length,
                sunday_promises: sundayPromises.length,
                promises_attended: sundayPromises.filter((commitment) => commitment.resolution === "attended").length,
                promises_missed: sundayPromises.filter((commitment) => commitment.resolution === "no_show").length,
                people_without_next_action: assignedPeople.filter((person) => !openPersonIds.has(person._id)).length,
                confirmed_this_sunday: sundayCommitments.filter((commitment) =>
                    commitment.leader_id === leader._id
                    && commitment.response === "yes"
                    && commitment.resolution === "pending",
                ).length,
                confirmed_guests: sundayCommitments.filter((commitment) => {
                    const person = peopleById.get(commitment.person_id);
                    return commitment.leader_id === leader._id
                        && commitment.response === "yes"
                        && commitment.resolution === "pending"
                        && person !== undefined
                        && ["guest", "visitor", "new_believer"].includes(person.member_status);
                }).length,
                last_activity: [lastFollowUp, lastCompletedTask].filter(Boolean).sort().at(-1) ?? null,
            };
        });

        const attendancePlanByPerson = new Map(
            attendancePlans
                .slice()
                .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
                .map((plan) => [plan.person_id, plan]),
        );
        const currentAttendancePlans = [...attendancePlanByPerson.values()];
        const regularBaselineIds = new Set(
            allPeople.filter(isRegularMember).map((person) => person._id),
        );
        const awayIds = new Set(
            currentAttendancePlans
                .filter((plan) => plan.status === "away" && regularBaselineIds.has(plan.person_id))
                .map((plan) => plan.person_id),
        );
        const regularExpectedIds = new Set(
            [...regularBaselineIds].filter((personId) => !awayIds.has(personId)),
        );
        const confirmedRegularIds = new Set(
            currentAttendancePlans
                .filter((plan) => plan.status === "confirmed" && regularBaselineIds.has(plan.person_id))
                .map((plan) => plan.person_id),
        );
        const confirmedIrregularIds = new Set(
            currentAttendancePlans
                .filter((plan) => {
                    const person = peopleById.get(plan.person_id);
                    return plan.status === "confirmed"
                        && person !== undefined
                        && ["member", "leader"].includes(person.member_status)
                        && !regularExpectedIds.has(plan.person_id);
                })
                .map((plan) => plan.person_id),
        );
        const confirmedGuestIds = new Set(
            sundayCommitments
                .filter((commitment) => {
                    const person = peopleById.get(commitment.person_id);
                    return commitment.response === "yes"
                        && commitment.resolution === "pending"
                        && person !== undefined
                        && ["guest", "visitor", "new_believer"].includes(person.member_status)
                        && !regularExpectedIds.has(commitment.person_id)
                        && !confirmedIrregularIds.has(commitment.person_id);
                })
                .map((commitment) => commitment.person_id),
        );
        const allExpectedIds = new Set([
            ...regularExpectedIds,
            ...confirmedIrregularIds,
            ...confirmedGuestIds,
        ]);
        const attendanceRoster = allPeople
            .filter((person) => ["member", "leader"].includes(person.member_status))
            .map((person) => {
                const plan = attendancePlanByPerson.get(person._id) ?? null;
                return {
                    ...person,
                    name: personName(person),
                    attendance_plan: plan,
                    default_expected: isRegularMember(person),
                    expected: allExpectedIds.has(person._id),
                    forecast_status: plan?.status
                        ?? (isRegularMember(person) ? "expected" : "not_expected"),
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        return {
            service_date: serviceDate,
            generated_for_leader_id: args.leaderId ?? null,
            leaders: leaders
                .map((leader) => ({ ...leader, name: personName(leader) }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            active_assignments: enrichedAssignments,
            tasks: enrichedTasks.filter((task) => !["member_care", "visitation"].includes(task.task_type)),
            open_tasks: enrichedTasks,
            confirmed_commitments: confirmedCommitments,
            sunday_commitments: sundayExpectedCommitments,
            upcoming_commitments: upcomingCommitments,
            visitation_follow_ups: visitationFollowUps,
            unassigned_contacts: unassignedContacts,
            later_contacts: laterContacts,
            contacts: crmContacts,
            member_care_tasks: memberCareTasks,
            visitation_tasks: visitationTasks,
            team_stats: teamStats,
            recent_sunday_results: recentSundayResults
                .filter((commitment) => commitment.resolution !== "pending")
                .filter((commitment) => !args.leaderId || commitment.leader_id === args.leaderId)
                .map((commitment) => ({
                    ...commitment,
                    person: peopleById.get(commitment.person_id) ?? null,
                    leader: peopleById.get(commitment.leader_id) ?? null,
                }))
                .sort((a, b) => b.gathering_date.localeCompare(a.gathering_date))
                .slice(0, 40),
            attendance_roster: attendanceRoster,
            attendance_forecast: {
                service_date: serviceDate,
                regular_baseline: regularBaselineIds.size,
                regular_away: awayIds.size,
                known_away: awayIds.size,
                regular_expected: regularExpectedIds.size,
                confirmed_irregular: confirmedIrregularIds.size,
                confirmed_guests: confirmedGuestIds.size,
                confirmed_regular: confirmedRegularIds.size,
                confirmed_total:
                    confirmedRegularIds.size + confirmedIrregularIds.size + confirmedGuestIds.size,
                total_expected: allExpectedIds.size,
                expected_total: allExpectedIds.size,
                expected_person_ids: [...allExpectedIds],
            },
        };
    },
});

export const getContactProfile = queryFor("crm:getContactProfile")({
    args: { personId: v.id("people") },
    handler: async (ctx, args) => {
        const person = await ctx.db.get(args.personId);
        if (!person) throw new Error("Contact not found");

        const [assignments, tasks, followUps, commitments, meetingAttendance, visitations] = await Promise.all([
            ctx.db
                .query("follow_up_assignments")
                .withIndex("by_person", (q) => q.eq("person_id", args.personId))
                .collect(),
            ctx.db
                .query("follow_up_tasks")
                .withIndex("by_person", (q) => q.eq("person_id", args.personId))
                .collect(),
            ctx.db
                .query("follow_ups")
                .withIndex("by_contact", (q) => q.eq("contact_id", args.personId))
                .collect(),
            ctx.db
                .query("gathering_commitments")
                .withIndex("by_person", (q) => q.eq("person_id", args.personId))
                .collect(),
            ctx.db
                .query("meeting_attendance")
                .withIndex("by_person", (q) => q.eq("person_id", args.personId))
                .collect(),
            ctx.db
                .query("visitations")
                .withIndex("by_person", (q) => q.eq("person_id", args.personId))
                .collect(),
        ]);
        const leaderIds = new Set<Id<"people">>();
        assignments.forEach((item) => leaderIds.add(item.assigned_leader_id));
        tasks.forEach((item) => leaderIds.add(item.assigned_leader_id));
        followUps.forEach((item) => leaderIds.add(item.leader_id));
        commitments.forEach((item) => leaderIds.add(item.leader_id));
        const leaders = await Promise.all([...leaderIds].map((id) => ctx.db.get(id)));
        const leaderById = new Map(
            leaders.filter((leader): leader is Doc<"people"> => leader !== null)
                .map((leader) => [leader._id, leader]),
        );
        const activeAssignment = assignments
            .filter((assignment) => assignment.status === "active")
            .sort((a, b) => b.assigned_at.localeCompare(a.assigned_at))[0] ?? null;
        const meetings = await Promise.all(
            [...new Set(meetingAttendance.map((item) => item.meeting_id))]
                .map((id) => ctx.db.get(id)),
        );
        const meetingById = new Map(
            meetings.filter((meeting): meeting is Doc<"meetings"> => meeting !== null)
                .map((meeting) => [meeting._id, meeting]),
        );

        return {
            person,
            active_assignment: activeAssignment ? {
                ...activeAssignment,
                assigned_leader: leaderById.get(activeAssignment.assigned_leader_id) ?? null,
            } : null,
            tasks: tasks
                .map((task) => ({
                    ...task,
                    assigned_leader: leaderById.get(task.assigned_leader_id) ?? null,
                }))
                .sort((a, b) => b.created_at.localeCompare(a.created_at)),
            follow_ups: followUps
                .map((followUp) => ({
                    ...followUp,
                    leader: leaderById.get(followUp.leader_id) ?? null,
                }))
                .sort((a, b) => b.follow_up_date.localeCompare(a.follow_up_date)),
            commitments: commitments
                .map((commitment) => ({
                    ...commitment,
                    leader: leaderById.get(commitment.leader_id) ?? null,
                }))
                .sort((a, b) => b.gathering_date.localeCompare(a.gathering_date)),
            meeting_attendance: meetingAttendance
                .map((attendance) => ({
                    ...attendance,
                    meeting: meetingById.get(attendance.meeting_id) ?? null,
                }))
                .sort((a, b) =>
                    (b.meeting?.meeting_date || "").localeCompare(a.meeting?.meeting_date || ""),
                ),
            visitations: visitations.sort((a, b) => b.visit_date.localeCompare(a.visit_date)),
        };
    },
});

export const assignContact = mutationFor("crm:assignContact")({
    args: {
        personId: v.id("people"),
        assignedLeaderId: v.id("people"),
        assignedById: v.optional(v.id("people")),
        firstContactDueDate: v.optional(v.string()),
        createFirstContactTask: v.optional(v.boolean()),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const person = await requirePerson(ctx, args.personId);
        await requireLeader(ctx, args.assignedLeaderId);
        if (args.assignedById) await requirePerson(ctx, args.assignedById, "Assigning leader");

        const assignmentId = await replaceAssignment(
            ctx,
            args.personId,
            args.assignedLeaderId,
            args.assignedById,
        );
        let taskId: Id<"follow_up_tasks"> | null = null;
        if (args.createFirstContactTask !== false && isEvangelismContact(person)) {
            const existingFirstContactTasks = await ctx.db
                .query("follow_up_tasks")
                .withIndex("by_person_status", (q) =>
                    q.eq("person_id", args.personId).eq("status", "open"),
                )
                .collect();
            const existing = existingFirstContactTasks.find(
                (task) => task.task_type === "first_contact",
            );
            if (existing) {
                await ctx.db.patch(existing._id, {
                    assigned_leader_id: args.assignedLeaderId,
                    due_date: args.firstContactDueDate ?? existing.due_date,
                    reason: args.reason ?? existing.reason,
                    updated_at: isoNow(),
                });
                taskId = existing._id;
            } else {
                taskId = await insertTask(ctx, {
                    personId: args.personId,
                    assignedLeaderId: args.assignedLeaderId,
                    createdById: args.assignedById,
                    dueDate: args.firstContactDueDate ?? today(),
                    taskType: "first_contact",
                    priority: "high",
                    reason: args.reason ?? "Make the first follow-up contact",
                });
            }
        }

        return {
            assignment: await ctx.db.get(assignmentId),
            task: taskId ? await ctx.db.get(taskId) : null,
        };
    },
});

export const createTask = mutationFor("crm:createTask")({
    args: {
        personId: v.id("people"),
        assignedLeaderId: v.id("people"),
        createdById: v.optional(v.id("people")),
        dueDate: v.string(),
        taskType,
        priority: v.optional(taskPriority),
        reason: v.optional(v.string()),
        gatheringType: v.optional(gatheringType),
        gatheringDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requirePerson(ctx, args.personId);
        await requireLeader(ctx, args.assignedLeaderId);
        if (args.createdById) await requirePerson(ctx, args.createdById, "Task creator");
        if (args.gatheringDate && !args.gatheringType) {
            throw new Error("gatheringType is required when gatheringDate is provided");
        }
        const taskId = await insertTask(ctx, {
            personId: args.personId,
            assignedLeaderId: args.assignedLeaderId,
            createdById: args.createdById,
            dueDate: args.dueDate,
            taskType: args.taskType,
            priority: args.priority ?? "normal",
            reason: args.reason,
            gatheringType: args.gatheringType,
            gatheringDate: args.gatheringDate,
        });
        return await ctx.db.get(taskId);
    },
});

export const completeTask = mutationFor("crm:completeTask")({
    args: {
        taskId: v.id("follow_up_tasks"),
        completedById: v.optional(v.id("people")),
        leaderId: v.optional(v.id("people")),
        followUpDate: v.optional(v.string()),
        method: v.optional(v.string()),
        outcome: v.string(),
        notes: v.optional(v.string()),
        nextActionDate: v.optional(v.string()),
        nextTaskType: v.optional(taskType),
        nextPriority: v.optional(taskPriority),
        nextReason: v.optional(v.string()),
        gatheringType: v.optional(gatheringType),
        gatheringDate: v.optional(v.string()),
        attendanceResponse: v.optional(attendanceResponse),
        moveToLater: v.optional(v.boolean()),
        resumeDate: v.optional(v.string()),
        closeContact: v.optional(v.boolean()),
        closeReason: v.optional(v.string()),
        skipAutomaticNextTask: v.optional(v.boolean()),
        nextTask: v.optional(v.object({
            assignedLeaderId: v.optional(v.id("people")),
            dueDate: v.string(),
            taskType,
            priority: v.optional(taskPriority),
            reason: v.optional(v.string()),
            gatheringType: v.optional(gatheringType),
            gatheringDate: v.optional(v.string()),
        })),
        commitment: v.optional(v.object({
            gatheringType,
            gatheringDate: v.string(),
            response: attendanceResponse,
        })),
    },
    handler: async (ctx, args) => {
        const task = await ctx.db.get(args.taskId);
        if (!task) throw new Error("Task not found");
        if (task.status !== "open") throw new Error("Only an open task can be completed");
        const person = await requirePerson(ctx, task.person_id);
        requireFollowUpAllowed(person);
        const completedById = args.completedById ?? args.leaderId ?? task.assigned_leader_id;
        await requireLeader(ctx, completedById);
        const now = isoNow();
        const followUpDate = args.followUpDate ?? now.slice(0, 10);
        const normalizedCommitment = args.commitment ?? (
            args.attendanceResponse
                ? {
                    gatheringType: args.gatheringType,
                    gatheringDate: args.gatheringDate,
                    response: args.attendanceResponse,
                }
                : undefined
        );
        if (normalizedCommitment
            && (!normalizedCommitment.gatheringType || !normalizedCommitment.gatheringDate)) {
            throw new Error("gatheringType and gatheringDate are required with attendanceResponse");
        }
        const automaticNextTask = !args.skipAutomaticNextTask && !args.nextTask && !args.nextActionDate
            ? automaticNextTaskForOutcome(args.outcome, followUpDate)
            : null;
        const normalizedNextTask = args.nextTask ?? (
            args.nextActionDate
                ? {
                    assignedLeaderId: undefined,
                    dueDate: args.nextActionDate,
                    taskType: args.nextTaskType ?? "follow_up" as const,
                    priority: args.nextPriority,
                    reason: args.nextReason,
                    gatheringType: args.gatheringType,
                    gatheringDate: args.gatheringDate,
                }
                : automaticNextTask
                    ? {
                        assignedLeaderId: undefined,
                        dueDate: automaticNextTask.dueDate,
                        taskType: automaticNextTask.taskType,
                        priority: "normal" as const,
                        reason: automaticNextTask.reason,
                        gatheringType: undefined,
                        gatheringDate: undefined,
                    }
                    : undefined
        );

        let nextTaskId: Id<"follow_up_tasks"> | null = null;
        if (normalizedNextTask && !args.moveToLater && !args.closeContact) {
            const nextLeaderId = normalizedNextTask.assignedLeaderId ?? task.assigned_leader_id;
            await requireLeader(ctx, nextLeaderId);
            nextTaskId = await insertTask(ctx, {
                personId: task.person_id,
                assignedLeaderId: nextLeaderId,
                createdById: completedById,
                dueDate: normalizedNextTask.dueDate,
                taskType: normalizedNextTask.taskType,
                priority: normalizedNextTask.priority ?? "normal",
                reason: normalizedNextTask.reason,
                gatheringType: normalizedNextTask.gatheringType,
                gatheringDate: normalizedNextTask.gatheringDate,
            });
        }

        let commitmentId: Id<"gathering_commitments"> | null = null;
        let becameYes = false;
        if (normalizedCommitment) {
            const result = await upsertCommitment(ctx, {
                personId: task.person_id,
                leaderId: completedById,
                gatheringType: normalizedCommitment.gatheringType!,
                gatheringDate: normalizedCommitment.gatheringDate!,
                response: normalizedCommitment.response,
            });
            commitmentId = result.id;
            becameYes = result.becameYes;
        }

        const followUpId = await ctx.db.insert("follow_ups", {
            contact_id: task.person_id,
            source_task_id: task._id,
            commitment_id: commitmentId ?? undefined,
            leader_id: completedById,
            follow_up_date: followUpDate,
            method: args.method ?? "other",
            outcome: args.outcome,
            promised_date: normalizedCommitment?.response === "yes"
                ? normalizedCommitment.gatheringDate
                : undefined,
            next_action_date: normalizedNextTask?.dueDate,
            gathering_type: normalizedCommitment?.gatheringType
                ?? args.gatheringType
                ?? task.gathering_type,
            gathering_date: normalizedCommitment?.gatheringDate
                ?? args.gatheringDate
                ?? task.gathering_date,
            attendance_response: normalizedCommitment?.response,
            notes: args.notes,
            created_at: now,
        });

        await ctx.db.patch(args.taskId, {
            status: "completed",
            outcome: args.outcome,
            notes: args.notes,
            completed_at: now,
            completed_by_id: completedById,
            updated_at: now,
        });

        if (args.moveToLater) {
            await putContactOnLaterList(
                ctx,
                person,
                args.nextReason ?? args.notes ?? "follow_up_later",
                args.resumeDate ?? addUtcDays(followUpDate, 90),
            );
        }

        if (args.closeContact) {
            const openTasks = await ctx.db
                .query("follow_up_tasks")
                .withIndex("by_person_status", (q) => q.eq("person_id", person._id).eq("status", "open"))
                .collect();
            for (const openTask of openTasks) {
                if (openTask._id === args.taskId) continue;
                await ctx.db.patch(openTask._id, {
                    status: "cancelled",
                    outcome: "contact_closed",
                    completed_at: now,
                    updated_at: now,
                });
            }
        }

        const followUps = await ctx.db
            .query("follow_ups")
            .withIndex("by_contact", (q) => q.eq("contact_id", task.person_id))
            .collect();
        await ctx.db.patch(task.person_id, {
            total_follow_ups: followUps.length,
            last_follow_up_date: followUps.map(f => f.follow_up_date).sort().at(-1),
            promises_made: becameYes ? (person.promises_made ?? 0) + 1 : person.promises_made,
            ...(args.outcome === "wrong_number"
                ? { contact_category: "wrong_number", pipeline_stage: "closed" }
                : args.closeContact
                ? {
                    pipeline_stage: "closed",
                    is_paused: false,
                    pause_reason: args.closeReason ?? args.nextReason ?? args.notes ?? "Follow-up closed",
                    resume_date: undefined,
                    // "settled" is the positive exit: the person now attends regularly and
                    // moves out of follow-up into normal member care.
                    ...(args.closeReason === "settled"
                        ? {
                            member_status: "member",
                            activity_status: "regular",
                            membership_date: person.membership_date ?? followUpDate,
                        }
                        : {}),
                }
                : {
                    pipeline_stage: args.moveToLater
                        ? "paused"
                        : normalizedCommitment?.response === "yes"
                        ? "promised"
                        : person.pipeline_stage === "new" || !person.pipeline_stage
                            ? "contacted"
                            : person.pipeline_stage,
                }),
            updated_at: now,
        });

        if (normalizedCommitment && managesAttendance(ctx)) await reconcilePerson(ctx, task.person_id);
        return {
            task: await ctx.db.get(args.taskId),
            follow_up: await ctx.db.get(followUpId),
            next_task: nextTaskId ? await ctx.db.get(nextTaskId) : null,
            commitment: commitmentId ? await ctx.db.get(commitmentId) : null,
        };
    },
});

export const moveToLater = mutationFor("crm:moveToLater")({
    args: {
        personId: v.id("people"),
        movedById: v.optional(v.id("people")),
        reason: v.optional(v.string()),
        resumeDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const person = await requirePerson(ctx, args.personId);
        if (args.movedById) await requireLeader(ctx, args.movedById);
        await putContactOnLaterList(
            ctx,
            person,
            args.reason ?? "follow_up_later",
            args.resumeDate,
        );

        return {
            person: await ctx.db.get(args.personId),
            reengagement_task: null,
        };
    },
});

export const reactivateContact = mutationFor("crm:reactivateContact")({
    args: {
        personId: v.id("people"),
        assignedLeaderId: v.optional(v.id("people")),
        leaderId: v.optional(v.id("people")),
        reactivatedById: v.optional(v.id("people")),
        dueDate: v.optional(v.string()),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const person = await requirePerson(ctx, args.personId);
        if (person.contact_category === "do_not_contact") throw new Error("This person has requested no contact");
        if (args.reactivatedById) await requireLeader(ctx, args.reactivatedById);
        let leaderId = args.assignedLeaderId ?? args.leaderId;
        if (leaderId) {
            await requireLeader(ctx, leaderId);
            await replaceAssignment(ctx, args.personId, leaderId, args.reactivatedById);
        } else {
            const assignments = await getActiveAssignments(ctx, args.personId);
            leaderId = assignments.sort((a, b) => b.assigned_at.localeCompare(a.assigned_at))[0]
                ?.assigned_leader_id;
        }
        if (!leaderId) throw new Error("Assign a leader before reactivating this contact");

        const now = isoNow();
        await ctx.db.patch(args.personId, {
            is_paused: false,
            pause_reason: undefined,
            resume_date: undefined,
            pipeline_stage: person.total_follow_ups ? "contacted" : "new",
            updated_at: now,
        });
        const taskId = await insertTask(ctx, {
            personId: args.personId,
            assignedLeaderId: leaderId,
            createdById: args.reactivatedById,
            dueDate: args.dueDate ?? today(),
            taskType: "reengagement",
            priority: "high",
            reason: args.reason ?? "Contact reactivated for follow-up",
        });
        return {
            person: await ctx.db.get(args.personId),
            task: await ctx.db.get(taskId),
        };
    },
});

export const recordCommitment = mutationFor("crm:recordCommitment")({
    args: {
        personId: v.id("people"),
        leaderId: v.id("people"),
        gatheringType,
        gatheringDate: v.string(),
        response: attendanceResponse,
    },
    handler: async (ctx, args) => {
        const person = await requirePerson(ctx, args.personId);
        await requireLeader(ctx, args.leaderId);
        const result = await upsertCommitment(ctx, args);
        if (result.becameYes) {
            await ctx.db.patch(args.personId, {
                promises_made: (person.promises_made ?? 0) + 1,
                pipeline_stage: "promised",
                updated_at: isoNow(),
            });
        }
        if (managesAttendance(ctx)) await reconcilePerson(ctx, args.personId);
        return await ctx.db.get(result.id);
    },
});

export const resolveCommitment = mutationFor("crm:resolveCommitment")({
    args: {
        commitmentId: v.id("gathering_commitments"),
        serviceId: v.optional(v.id("services")),
        meetingId: v.optional(v.id("meetings")),
        resolution: v.union(
            v.literal("attended"),
            v.literal("no_show"),
            v.literal("cancelled"),
        ),
    },
    handler: async (ctx, args) => {
        const commitment = await ctx.db.get(args.commitmentId);
        if (!commitment) throw new Error("Gathering commitment not found");
        if (args.resolution === "no_show" && commitment.response !== "yes") throw new Error("Only an explicit yes can be resolved as a no-show");
        if (args.resolution === "attended" || commitment.resolution === "attended") {
            if (!managesAttendance(ctx)) throw new Error("An administrator must record or correct actual attendance");
            const gathering = await selectGathering(ctx, commitment.gathering_type, commitment.gathering_date, {
                serviceId: args.serviceId ?? commitment.service_id,
                meetingId: args.meetingId ?? commitment.meeting_id,
            });
            // The explicit link disambiguates reconciliation on a multi-gathering day.
            await ctx.db.patch(commitment._id, { service_id: "serviceId" in gathering ? gathering.serviceId : undefined, meeting_id: "meetingId" in gathering ? gathering.meetingId : undefined });
            await setActualAttendance(ctx, commitment.person_id, gathering, args.resolution === "attended");
        }
        if (args.resolution !== "attended") {
            await ctx.db.patch(commitment._id, { resolution: args.resolution, service_id: undefined, meeting_id: undefined, attendance_previous_status: undefined, resolved_at: isoNow(), updated_at: isoNow() });
            if (managesAttendance(ctx)) await reconcilePerson(ctx, commitment.person_id);
        }
        const commitments = await ctx.db.query("gathering_commitments").withIndex("by_person", q => q.eq("person_id", commitment.person_id)).collect();
        const confirmedNoShows = new Set(commitments.filter(c => c.gathering_type === "sunday_service" && c.response === "yes" && c.resolution === "no_show").map(c => c.gathering_date)).size;
        return { commitment: await ctx.db.get(commitment._id), confirmed_sunday_no_shows: confirmedNoShows, move_to_later_recommended: confirmedNoShows >= 2 };
    },
});

export const setAttendancePlan = mutationFor("crm:setAttendancePlan")({
    args: {
        personId: v.id("people"),
        serviceId: v.optional(v.id("services")),
        serviceDate: v.string(),
        status: v.union(
            v.literal("expected"),
            v.literal("away"),
            v.literal("confirmed"),
            v.literal("attended"),
            v.literal("absent"),
        ),
        leaderId: v.id("people"),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const person = await requirePerson(ctx, args.personId);
        await requireLeader(ctx, args.leaderId);
        if (!["member", "leader"].includes(person.member_status)) throw new Error("Attendance plans are for members and leaders");
        const existing = await ctx.db.query("attendance_plans").withIndex("by_person_date", q => q.eq("person_id", args.personId).eq("service_date", args.serviceDate)).collect();
        let current = existing.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
        if (args.status === "attended" || current?.status === "attended") {
            if (!managesAttendance(ctx)) throw new Error("An administrator must record or correct actual attendance");
            const gathering = await selectGathering(ctx, "sunday_service", args.serviceDate, { serviceId: args.serviceId ?? current?.service_id });
            await setActualAttendance(ctx, args.personId, gathering, args.status === "attended");
            current = (await ctx.db.query("attendance_plans").withIndex("by_person_date", q => q.eq("person_id", args.personId).eq("service_date", args.serviceDate)).collect()).sort((a,b) => b.updated_at.localeCompare(a.updated_at))[0];
            const values = { person_id: args.personId, leader_id: args.leaderId, generated_from_attendance: false, service_date: args.serviceDate, status: args.status, service_id: args.status === "attended" && "serviceId" in gathering ? gathering.serviceId : undefined, attendance_previous_status: args.status === "attended" ? current?.attendance_previous_status ?? (current?.status === "attended" ? "expected" : current?.status ?? "expected") : undefined, notes: args.notes, updated_at: isoNow() };
            const id = current?._id ?? await ctx.db.insert("attendance_plans", { ...values, created_at: isoNow() });
            if (current) await ctx.db.patch(id, values);
            for (const duplicate of existing.filter(p => p._id !== id)) await ctx.db.delete(duplicate._id);
            await reconcilePerson(ctx, args.personId);
            return await ctx.db.get(id);
        }
        const values = { person_id: args.personId, leader_id: args.leaderId, service_date: args.serviceDate, status: args.status, notes: args.notes, updated_at: isoNow() };
        const id = current?._id ?? await ctx.db.insert("attendance_plans", { ...values, created_at: isoNow() });
        if (current) await ctx.db.patch(id, values);
        for (const duplicate of existing.filter(p => p._id !== id)) await ctx.db.delete(duplicate._id);
        if (managesAttendance(ctx)) await reconcilePerson(ctx, args.personId);
        return await ctx.db.get(id);
    },
});

export const getGatheringChoices = queryFor("crm:getGatheringChoices")({
    args: { gatheringType, gatheringDate: v.string() },
    handler: async (ctx, args) => {
        if (!managesAttendance(ctx)) throw new Error("An administrator must record or correct actual attendance");
        return candidates(ctx, args.gatheringType, args.gatheringDate);
    },
});
