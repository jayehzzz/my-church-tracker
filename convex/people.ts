import { queryFor, mutationFor } from "./lib/security";

import { v } from "convex/values";
import {
    canonicalMemberStatus,
    clearablePersonFields,
    normalizeEmail,
    normalizePhone,
    validatePersonInput,
} from "./peopleValidation";

function canonicalPerson<T extends { member_status?: string }>(person: T) {
    return {
        ...person,
        member_status: canonicalMemberStatus(person.member_status),
    };
}

const clearableFields = new Set<string>(clearablePersonFields);

function personSummary(person: any, matchingFields: string[] = []) {
    return {
        id: person._id,
        first_name: person.first_name,
        last_name: person.last_name,
        member_status: canonicalMemberStatus(person.member_status),
        email: person.email,
        phone: person.phone,
        matching_fields: matchingFields,
    };
}

async function historyCounts(ctx: any, personId: any) {
    const [
        attendance, meetingAttendance, programmeLeaders, programmeMembers,
        visitations, visitsLed, followUps, followUpsLed, assignments,
        assignmentsLed, tasks, tasksAssigned, commitments, commitmentsLed,
        plans, plansLed, invitedPeople,
    ] = await Promise.all([
        ctx.db.query("attendance").withIndex("by_person", (q: any) => q.eq("person_id", personId)).collect(),
        ctx.db.query("meeting_attendance").withIndex("by_person", (q: any) => q.eq("person_id", personId)).collect(),
        ctx.db.query("meeting_program_leaders").withIndex("by_person", (q: any) => q.eq("person_id", personId)).collect(),
        ctx.db.query("meeting_program_members").withIndex("by_person", (q: any) => q.eq("person_id", personId)).collect(),
        ctx.db.query("visitations").withIndex("by_person", (q: any) => q.eq("person_id", personId)).collect(),
        ctx.db.query("visitations").withIndex("by_visitor", (q: any) => q.eq("visited_by_id", personId)).collect(),
        ctx.db.query("follow_ups").withIndex("by_contact", (q: any) => q.eq("contact_id", personId)).collect(),
        ctx.db.query("follow_ups").withIndex("by_leader", (q: any) => q.eq("leader_id", personId)).collect(),
        ctx.db.query("follow_up_assignments").withIndex("by_person", (q: any) => q.eq("person_id", personId)).collect(),
        ctx.db.query("follow_up_assignments").withIndex("by_leader_status", (q: any) => q.eq("assigned_leader_id", personId)).collect(),
        ctx.db.query("follow_up_tasks").withIndex("by_person", (q: any) => q.eq("person_id", personId)).collect(),
        ctx.db.query("follow_up_tasks").withIndex("by_assignee_status", (q: any) => q.eq("assigned_leader_id", personId)).collect(),
        ctx.db.query("gathering_commitments").withIndex("by_person", (q: any) => q.eq("person_id", personId)).collect(),
        ctx.db.query("gathering_commitments").withIndex("by_leader_date", (q: any) => q.eq("leader_id", personId)).collect(),
        ctx.db.query("attendance_plans").withIndex("by_person_date", (q: any) => q.eq("person_id", personId)).collect(),
        ctx.db.query("attendance_plans").withIndex("by_leader_date", (q: any) => q.eq("leader_id", personId)).collect(),
        ctx.db.query("people").withIndex("by_invited_by", (q: any) => q.eq("invited_by_id", personId)).collect(),
    ]);

    return {
        attendance, meetingAttendance, programmeLeaders, programmeMembers,
        visitations, visitsLed, followUps, followUpsLed, assignments,
        assignmentsLed, tasks, tasksAssigned, commitments, commitmentsLed,
        plans, plansLed, invitedPeople,
    };
}

function countReferences(references: Record<string, any[]>) {
    return Object.values(references).reduce((total, records) => total + records.length, 0);
}

// Get all people sorted by last name
export const getAll = queryFor("people:getAll")({
    args: {},
    handler: async (ctx) => {
        const people = await ctx.db.query("people").collect();
        return people
            .map(canonicalPerson)
            .sort((a, b) => a.last_name.localeCompare(b.last_name));
    },
});

// Get person by ID
export const getById = queryFor("people:getById")({
    args: { id: v.id("people") },
    handler: async (ctx, args) => {
        const person = await ctx.db.get(args.id);
        if (!person) return null;

        // Resolve invited_by name if ID exists
        let invited_by = null;
        if (person.invited_by_id) {
            const inviter = await ctx.db.get(person.invited_by_id);
            if (inviter) {
                invited_by = `${inviter.first_name} ${inviter.last_name}`;
            }
        }

        return {
            ...canonicalPerson(person),
            invited_by,
        };
    },
});

// Create a new person
export const create = mutationFor("people:create")({
    args: {
        first_name: v.string(),
        last_name: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),

        // Address
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zip_code: v.optional(v.string()),

        // Demographics
        preferred_name: v.optional(v.string()),
        birthday: v.optional(v.string()),
        date_of_birth: v.optional(v.string()), // Alias
        gender: v.optional(v.string()),
        marital_status: v.optional(v.string()),
        employment_status: v.optional(v.string()),
        degree_status: v.optional(v.string()),
        basontas: v.optional(v.array(v.string())),

        // Status & Role
        member_status: v.string(),
        church_role: v.optional(v.string()),
        role: v.optional(v.string()),
        activity_status: v.optional(v.string()),
        leader_id: v.optional(v.string()),

        // Evangelism / Contact Info
        contact_category: v.optional(v.string()),
        contact_date: v.optional(v.string()),
        contact_method: v.optional(v.string()),
        invited_by_id: v.optional(v.id("people")),
        entry_point: v.optional(v.string()), // How they found the church
        notes: v.optional(v.string()),

        // Spiritual Milestones
        first_visit_date: v.optional(v.string()),
        membership_date: v.optional(v.string()),
        is_baptised: v.optional(v.boolean()),
        is_tither: v.optional(v.boolean()),
        completed_schools: v.optional(v.array(v.string())),

        // System
        lat: v.optional(v.float64()),
        lng: v.optional(v.float64()),
        avatar_url: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        validatePersonInput(args, true);
        const { date_of_birth, ...rest } = args;
        const now = new Date().toISOString();

        const peopleData: any = {
            ...rest,
            first_name: rest.first_name.trim(),
            last_name: rest.last_name.trim(),
            email: normalizeEmail(rest.email),
            phone: rest.phone?.trim() || undefined,
            member_status: canonicalMemberStatus(rest.member_status),
            created_at: now,
            updated_at: now,
        };

        if (date_of_birth) {
            peopleData.birthday = date_of_birth;
        }

        const id = await ctx.db.insert("people", peopleData);
        return await ctx.db.get(id);
    },
});

// Update a person
export const update = mutationFor("people:update")({
    args: {
        id: v.id("people"),

        // Identity
        first_name: v.optional(v.string()),
        last_name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),

        // Address
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zip_code: v.optional(v.string()),

        // Demographics
        preferred_name: v.optional(v.string()),
        birthday: v.optional(v.string()),
        date_of_birth: v.optional(v.string()), // Alias for birthday
        gender: v.optional(v.string()),
        marital_status: v.optional(v.string()),
        employment_status: v.optional(v.string()),
        degree_status: v.optional(v.string()),
        basontas: v.optional(v.array(v.string())), // Ministry groups

        // Status & Role
        member_status: v.optional(v.string()),
        church_role: v.optional(v.string()),
        role: v.optional(v.string()),
        activity_status: v.optional(v.string()),
        leader_id: v.optional(v.string()),

        // Evangelism / Contact Info
        contact_category: v.optional(v.string()),
        contact_date: v.optional(v.string()),
        contact_method: v.optional(v.string()),
        invited_by_id: v.optional(v.id("people")),
        entry_point: v.optional(v.string()), // How they found the church
        notes: v.optional(v.string()),

        // Spiritual Milestones
        first_visit_date: v.optional(v.string()),
        membership_date: v.optional(v.string()),
        is_baptised: v.optional(v.boolean()),
        is_tither: v.optional(v.boolean()),
        completed_schools: v.optional(v.array(v.string())),

        // System
        lat: v.optional(v.float64()),
        lng: v.optional(v.float64()),
        avatar_url: v.optional(v.string()),
        clear_fields: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const { id, date_of_birth, clear_fields = [], ...rest } = args;
        validatePersonInput({ ...rest, ...(date_of_birth ? { date_of_birth } : {}) });

        for (const field of clear_fields) {
            if (field === "date_of_birth") continue;
            if (!clearableFields.has(field)) {
                throw new Error(`The field ${field} cannot be cleared`);
            }
        }

        const updates: any = { ...rest };

        if (updates.first_name !== undefined) updates.first_name = updates.first_name.trim();
        if (updates.last_name !== undefined) updates.last_name = updates.last_name.trim();
        if (updates.email !== undefined) updates.email = normalizeEmail(updates.email);
        if (updates.phone !== undefined) updates.phone = updates.phone.trim() || undefined;

        if (rest.member_status !== undefined) {
            updates.member_status = canonicalMemberStatus(rest.member_status);
        }

        // Map date_of_birth to birthday if provided
        if (date_of_birth !== undefined) {
            updates.birthday = date_of_birth;
        }

        for (const field of clear_fields) {
            updates[field === "date_of_birth" ? "birthday" : field] = undefined;
        }

        await ctx.db.patch(id, {
            ...updates,
            updated_at: new Date().toISOString(),
        });
        const person = await ctx.db.get(id);
        return person ? canonicalPerson(person) : null;
    },
});

// Archive is the normal removal path. It preserves the person and all linked history.
export const archive = mutationFor("people:archive")({
    args: { id: v.id("people") },
    handler: async (ctx, args) => {
        const person = await ctx.db.get(args.id);
        if (!person) throw new Error("Person not found");
        await ctx.db.patch(args.id, {
            member_status: "archived",
            updated_at: new Date().toISOString(),
        });
        return await ctx.db.get(args.id);
    },
});

// Permanent removal is reserved for a record with no related history.
export const remove = mutationFor("people:remove")({
    args: { id: v.id("people") },
    handler: async (ctx, args) => {
        const person = await ctx.db.get(args.id);
        if (!person) throw new Error("Person not found");
        const references = await historyCounts(ctx, args.id);
        const relatedCount = countReferences(references);
        if (relatedCount > 0) {
            throw new Error("This person has recorded history and cannot be permanently deleted. Archive them instead.");
        }
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

// Find possible duplicates by normalized email and/or phone, never by name alone.
export const findDuplicates = queryFor("people:findDuplicates")({
    args: {
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        excludeId: v.optional(v.id("people")),
    },
    handler: async (ctx, args) => {
        const email = normalizeEmail(args.email);
        const phone = normalizePhone(args.phone);
        if (!email && !phone) return [];

        const people = await ctx.db.query("people").collect();
        return people
            .filter((person) => person._id !== args.excludeId && person.member_status !== "archived")
            .map((person) => {
                const matching_fields = [
                    ...(email && normalizeEmail(person.email) === email ? ["email"] : []),
                    ...(phone && normalizePhone(person.phone) === phone ? ["phone"] : []),
                ];
                return personSummary(person, matching_fields);
            })
            .filter((person) => person.matching_fields.length > 0)
            .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));
    },
});

async function mergeSafety(ctx: any, sourceId: any, targetId: any) {
    const [source, target] = await Promise.all([ctx.db.get(sourceId), ctx.db.get(targetId)]);
    if (!source || !target) throw new Error("Both people must still exist before they can be merged");
    if (sourceId === targetId) throw new Error("Choose two different people to merge");
    if (source.merged_into_id) throw new Error("This duplicate has already been merged");
    if (target.member_status === "archived") throw new Error("Choose an active record to retain");

    const [sourceReferences, targetReferences, allAssignments, allTasks] = await Promise.all([
        historyCounts(ctx, sourceId),
        historyCounts(ctx, targetId),
        ctx.db.query("follow_up_assignments").collect(),
        ctx.db.query("follow_up_tasks").collect(),
    ]);
    const conflicts: string[] = [];
    const hasSame = (sourceRows: any[], targetRows: any[], key: (row: any) => string) => {
        const targetKeys = new Set(targetRows.map(key));
        return sourceRows.some((row) => targetKeys.has(key(row)));
    };

    if (hasSame(sourceReferences.attendance, targetReferences.attendance, (row) => String(row.service_id))) {
        conflicts.push("Both records have attendance for the same service.");
    }
    if (hasSame(sourceReferences.meetingAttendance, targetReferences.meetingAttendance, (row) => String(row.meeting_id))) {
        conflicts.push("Both records have attendance for the same meeting.");
    }
    if (hasSame(sourceReferences.programmeLeaders, targetReferences.programmeLeaders, (row) => String(row.program_id))) {
        conflicts.push("Both records lead the same meeting programme.");
    }
    if (hasSame(sourceReferences.programmeMembers, targetReferences.programmeMembers, (row) => String(row.program_id))) {
        conflicts.push("Both records belong to the same meeting programme.");
    }
    if (hasSame(sourceReferences.commitments, targetReferences.commitments, (row) => `${row.gathering_type}:${row.gathering_date}`)) {
        conflicts.push("Both records have a commitment for the same gathering.");
    }
    if (hasSame(sourceReferences.plans, targetReferences.plans, (row) => row.service_date)) {
        conflicts.push("Both records have an attendance plan for the same service date.");
    }
    if (hasSame(
        sourceReferences.assignments.filter((row: any) => row.status === "active"),
        targetReferences.assignments.filter((row: any) => row.status === "active"),
        (row) => String(row.assigned_leader_id),
    )) {
        conflicts.push("Both records have the same active follow-up owner.");
    }

    const sourceLeadershipReferences = [
        ...sourceReferences.visitsLed,
        ...sourceReferences.followUpsLed,
        ...sourceReferences.assignmentsLed,
        ...sourceReferences.tasksAssigned,
        ...sourceReferences.commitmentsLed,
        ...sourceReferences.plansLed,
        ...allAssignments.filter((row: any) => row.assigned_by_id === sourceId),
        ...allTasks.filter((row: any) => row.created_by_id === sourceId || row.completed_by_id === sourceId),
    ];
    if (sourceLeadershipReferences.length && target.member_status !== "leader") {
        conflicts.push("The retained record is not a leader but the duplicate owns leadership history.");
    }

    return {
        source,
        target,
        sourceReferences,
        allAssignments,
        allTasks,
        conflicts,
        counts: Object.fromEntries(
            Object.entries(sourceReferences).map(([name, records]) => [name, (records as any[]).length]),
        ),
    };
}

// A merge must be previewed first. Only conflict-free relationships are moved.
export const getMergePreview = queryFor("people:getMergePreview")({
    args: { sourceId: v.id("people"), targetId: v.id("people") },
    handler: async (ctx, args) => {
        const review = await mergeSafety(ctx, args.sourceId, args.targetId);
        return {
            source: personSummary(review.source),
            target: personSummary(review.target),
            sourceUpdatedAt: review.source.updated_at,
            targetUpdatedAt: review.target.updated_at,
            relationshipCounts: review.counts,
            conflictReasons: review.conflicts,
            canMerge: review.conflicts.length === 0,
        };
    },
});

export const mergeReviewed = mutationFor("people:mergeReviewed")({
    args: {
        sourceId: v.id("people"),
        targetId: v.id("people"),
        sourceUpdatedAt: v.string(),
        targetUpdatedAt: v.string(),
    },
    handler: async (ctx, args) => {
        const review = await mergeSafety(ctx, args.sourceId, args.targetId);
        if (
            review.source.updated_at !== args.sourceUpdatedAt ||
            review.target.updated_at !== args.targetUpdatedAt
        ) {
            throw new Error("The records changed after this review. Refresh the merge preview before continuing.");
        }
        if (review.conflicts.length) {
            throw new Error(`This merge needs manual reconciliation: ${review.conflicts.join(" ")}`);
        }

        const now = new Date().toISOString();
        const patchAll = async (records: any[], values: Record<string, any>) => {
            await Promise.all(records.map((record) => ctx.db.patch(record._id, values)));
        };
        const refs = review.sourceReferences;
        await patchAll(refs.attendance, { person_id: args.targetId });
        await patchAll(refs.meetingAttendance, { person_id: args.targetId });
        await patchAll(refs.programmeLeaders, { person_id: args.targetId });
        await patchAll(refs.programmeMembers, { person_id: args.targetId });
        await patchAll(refs.visitations, { person_id: args.targetId });
        await patchAll(refs.visitsLed, { visited_by_id: args.targetId });
        await patchAll(refs.followUps, { contact_id: args.targetId });
        await patchAll(refs.followUpsLed, { leader_id: args.targetId });
        await patchAll(refs.assignments, { person_id: args.targetId });
        await patchAll(refs.assignmentsLed, { assigned_leader_id: args.targetId });
        await patchAll(refs.tasks, { person_id: args.targetId });
        await patchAll(refs.tasksAssigned, { assigned_leader_id: args.targetId });
        await patchAll(refs.commitments, { person_id: args.targetId });
        await patchAll(refs.commitmentsLed, { leader_id: args.targetId });
        await patchAll(refs.plans, { person_id: args.targetId });
        await patchAll(refs.plansLed, { leader_id: args.targetId });
        await patchAll(refs.invitedPeople, { invited_by_id: args.targetId });
        await patchAll(review.allAssignments.filter((row: any) => row.assigned_by_id === args.sourceId), { assigned_by_id: args.targetId });
        await patchAll(review.allTasks.filter((row: any) => row.created_by_id === args.sourceId), { created_by_id: args.targetId });
        await patchAll(review.allTasks.filter((row: any) => row.completed_by_id === args.sourceId), { completed_by_id: args.targetId });

        await ctx.db.patch(args.sourceId, {
            member_status: "archived",
            merged_into_id: args.targetId,
            updated_at: now,
        });
        await ctx.db.patch(args.targetId, { updated_at: now });
        return { sourceId: args.sourceId, targetId: args.targetId, archived: true };
    },
});

// Get people by member status
export const getByStatus = queryFor("people:getByStatus")({
    args: { status: v.string() },
    handler: async (ctx, args) => {
        const requestedStatus = canonicalMemberStatus(args.status) || args.status;
        const statuses = requestedStatus === "guest" ? ["guest", "visitor"] : [requestedStatus];
        const people = (
            await Promise.all(
                statuses.map((status) =>
                    ctx.db
                        .query("people")
                        .withIndex("by_member_status", (q) =>
                            q.eq("member_status", status),
                        )
                        .collect(),
                ),
            )
        ).flat();
        return people
            .map(canonicalPerson)
            .sort((a, b) => a.last_name.localeCompare(b.last_name));
    },
});

// Search people by name
export const search = queryFor("people:search")({
    args: { searchTerm: v.string() },
    handler: async (ctx, args) => {
        const term = args.searchTerm.toLowerCase();
        const allPeople = await ctx.db.query("people").collect();
        return allPeople
            .filter(
                (p) =>
                    p.first_name.toLowerCase().includes(term) ||
                    p.last_name.toLowerCase().includes(term)
            )
            .map(canonicalPerson)
            .sort((a, b) => a.last_name.localeCompare(b.last_name));
    },
});
