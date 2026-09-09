import { developmentGatherings, developmentPresent } from "../src/lib/utils/developmentRecords.js";
import { queryFor, mutationFor, authenticatedUser, forbidden, isAdmin } from "./lib/security";

import { v } from "convex/values";
import {
    assertDate,
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
        plans, plansLed, invitedPeople, agreements, agreementReviews, collectedPeople, supportedAgreements,
        collectorCredits, collectedContactCredits, registerEntries, visitEvidence, importRows,
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
        ctx.db.query("growth_agreements").withIndex("by_person", (q: any) => q.eq("person_id", personId)).collect(),
        ctx.db.query("growth_agreement_reviews").withIndex("by_person", (q: any) => q.eq("person_id", personId)).collect(),
        ctx.db.query("people").withIndex("by_collected_by", (q: any) => q.eq("collected_by_id", personId)).collect(),
        ctx.db.query("growth_agreements").withIndex("by_supporter", (q: any) => q.eq("supporting_person_id", personId)).collect(),
        ctx.db.query("contact_collectors").withIndex("by_collector", (q: any) => q.eq("collector_id", personId)).collect(),
        ctx.db.query("contact_collectors").withIndex("by_person", (q: any) => q.eq("person_id", personId)).collect(),
        ctx.db.query("service_register_entries").withIndex("by_person", (q: any) => q.eq("person_id", personId)).collect(),
        ctx.db.query("attendance_visit_evidence").withIndex("by_person", (q: any) => q.eq("person_id", personId)).collect(),
        ctx.db.query("church_import_rows").collect().then((rows: any[]) => rows.filter(row => row.target_person_id === personId)),
    ]);

    return {
        attendance, meetingAttendance, programmeLeaders, programmeMembers,
        visitations, visitsLed, followUps, followUpsLed, assignments,
        assignmentsLed, tasks, tasksAssigned, commitments, commitmentsLed,
        plans, plansLed, invitedPeople, agreements, agreementReviews, collectedPeople, supportedAgreements,
        collectorCredits, collectedContactCredits, registerEntries, visitEvidence, importRows,
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
            .sort((a, b) => (a.last_name || "").localeCompare(b.last_name || ""));
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
        last_name: v.optional(v.string()),
        surname_status: v.optional(v.union(v.literal("known"), v.literal("missing"))),
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
        birthday_month: v.optional(v.float64()),
        birthday_day: v.optional(v.float64()),
        age_band: v.optional(v.string()),
        source_church_role: v.optional(v.string()),
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
        collected_by_id: v.optional(v.id("people")),
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
            last_name: rest.last_name?.trim() || "",
            surname_status: rest.surname_status || (rest.last_name?.trim() ? "known" : "missing"),
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
        surname_status: v.optional(v.union(v.literal("known"), v.literal("missing"))),
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
        birthday_month: v.optional(v.float64()),
        birthday_day: v.optional(v.float64()),
        age_band: v.optional(v.string()),
        source_church_role: v.optional(v.string()),
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
        collected_by_id: v.optional(v.id("people")),
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
        if (updates.last_name === "") updates.surname_status = "missing";
        if (updates.last_name && updates.surname_status === undefined) updates.surname_status = "known";
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
    if (hasSame(sourceReferences.registerEntries, targetReferences.registerEntries, (row) => String(row.service_id))) {
        conflicts.push("Both records have a source register entry for the same service.");
    }
    if (hasSame(sourceReferences.collectorCredits, targetReferences.collectorCredits, (row) => String(row.person_id))) {
        conflicts.push("Both records are credited as collectors for the same contact.");
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
        await patchAll(refs.agreements, { person_id: args.targetId });
        await patchAll(refs.agreementReviews, { person_id: args.targetId });
        await patchAll(refs.collectedPeople, { collected_by_id: args.targetId });
        await patchAll(refs.collectorCredits, { collector_id: args.targetId });
        await patchAll(refs.collectedContactCredits, { person_id: args.targetId });
        await patchAll(refs.registerEntries, { person_id: args.targetId });
        await patchAll(refs.visitEvidence, { person_id: args.targetId });
        await patchAll(refs.importRows, { target_person_id: args.targetId });
        await patchAll(refs.supportedAgreements, { supporting_person_id: args.targetId });
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
            .sort((a, b) => (a.last_name || "").localeCompare(b.last_name || ""));
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
                    (p.last_name || "").toLowerCase().includes(term)
            )
            .map(canonicalPerson)
            .sort((a, b) => (a.last_name || "").localeCompare(b.last_name || ""));
    },
});

// Shared collection credit remains deliberately independent from both an
// inviter and follow-up assignment. This replaces the single legacy field for
// new shared-attribution work without rewriting existing records.
export const getCollectors = queryFor("people:getCollectors")({
    args: { personId: v.id("people") },
    handler: async (ctx, args) => {
        const rows = await ctx.db.query("contact_collectors")
            .withIndex("by_person", q => q.eq("person_id", args.personId)).collect();
        return (await Promise.all(rows.map(async row => {
            const collector = await ctx.db.get(row.collector_id);
            return collector ? { id: collector._id, first_name: collector.first_name, last_name: collector.last_name, source_key: row.source_key } : null;
        }))).filter(Boolean);
    },
});

export const setCollectors = mutationFor("people:setCollectors")({
    args: { personId: v.id("people"), collectorIds: v.array(v.id("people")) },
    handler: async (ctx, args) => {
        const user = authenticatedUser(ctx);
        if (!isAdmin(user)) forbidden();
        if (!await ctx.db.get(args.personId)) throw new Error("Person not found");
        const ids = [...new Set(args.collectorIds.map(String))];
        if (ids.length !== args.collectorIds.length) throw new Error("Choose each collector once");
        if (ids.includes(String(args.personId))) throw new Error("A contact cannot collect themselves");
        for (const collectorId of args.collectorIds) if (!await ctx.db.get(collectorId)) throw new Error("Collector not found");
        const existing = await ctx.db.query("contact_collectors")
            .withIndex("by_person", q => q.eq("person_id", args.personId)).collect();
        const wanted = new Set(ids);
        for (const row of existing) if (!wanted.has(String(row.collector_id))) await ctx.db.delete(row._id);
        for (const collectorId of args.collectorIds) {
            if (!existing.some(row => row.collector_id === collectorId)) {
                await ctx.db.insert("contact_collectors", { person_id: args.personId, collector_id: collectorId, created_at: new Date().toISOString() });
            }
        }
        return await ctx.db.query("contact_collectors").withIndex("by_person", q => q.eq("person_id", args.personId)).collect();
    },
});

// Reviews preserve earlier conversations; account roles and membership never change here.
export const addDiscipleshipReview = mutationFor("people:addDiscipleshipReview")({
    args: {
        id: v.id("people"),
        focus: v.union(v.literal("getting_connected"), v.literal("foundations"), v.literal("growing_in_faith"), v.literal("serving"), v.literal("preparing_to_lead"), v.literal("leading")),
        understanding: v.string(),
        next_step: v.string(),
        conversation_date: v.string(),
        next_review_date: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = authenticatedUser(ctx);
        if (!user.can_view_confidential) forbidden();
        const person = await ctx.db.get(args.id);
        if (!person) throw new Error("Person not found or unavailable");
        assertDate("Conversation date", args.conversation_date);
        const now = new Date().toISOString();
        if (args.conversation_date > now.slice(0, 10)) throw new Error("The conversation date cannot be in the future");
        if (args.next_review_date) {
            assertDate("Next review date", args.next_review_date);
            if (args.next_review_date < args.conversation_date) throw new Error("Next review must be on or after the conversation");
        }
        const understanding = args.understanding.trim();
        const next_step = args.next_step.trim();
        if (!understanding || !next_step) throw new Error("Record the conversation and an agreed next step");
        if (understanding.length > 3000 || next_step.length > 1500) throw new Error("Keep the conversation within 3000 characters and next step within 1500");
        const review = {
            focus: args.focus, understanding, next_step,
            conversation_date: args.conversation_date,
            ...(args.next_review_date ? { next_review_date: args.next_review_date } : {}),
            recorded_at: now, recorded_by_user_id: user._id,
            recorded_by_name: user.display_name || "Church leader",
        };
        await ctx.db.patch(args.id, {
            discipleship_reviews: [...(person.discipleship_reviews || []), review],
            updated_at: now,
        });
        return await ctx.db.get(args.id);
    },
});

const developmentDate = (label: string, value: string) => assertDate(label, value);
const developmentText = (label: string, value: string, max: number) => {
    const text = value.trim();
    if (!text) throw new Error(`${label} is required`);
    if (text.length > max) throw new Error(`${label} must be ${max} characters or fewer`);
    return text;
};

// This is intentionally a person-scoped evidence response, not a replacement
// for the admin gathering APIs. RLS has already established that every person
// and attendance row is in the caller's scope before this handler runs.
export const getDevelopmentSummary = queryFor("people:getDevelopmentSummary")({
    args: { ids: v.array(v.id("people")), from: v.optional(v.string()), to: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (args.ids.length < 1 || args.ids.length > 2) throw new Error("Choose one or two people");
        const ids = [...new Set(args.ids.map(String))];
        if (ids.length !== args.ids.length) throw new Error("Choose each person once");
        const people = await Promise.all(args.ids.map(id => ctx.db.get(id)));
        if (people.some(person => !person || person.member_status === "archived")) throw new Error("Person not found or unavailable");
        const user = authenticatedUser(ctx);
        const now = new Date();
        const from = args.from || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1)).toISOString().slice(0, 10);
        const to = args.to || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)).toISOString().slice(0, 10);
        developmentDate("Period start", from); developmentDate("Period end", to);
        if (from > to || to > now.toISOString().slice(0, 10) || Number(to.slice(0,4)) - Number(from.slice(0,4)) >= 10) throw new Error("Invalid reporting period");
        const [allServices, allMeetings] = await Promise.all([
            ctx.db.query("services").withIndex("by_service_date", q => q.gte("service_date", from).lte("service_date", to)).collect(),
            ctx.db.query("meetings").withIndex("by_meeting_date", q => q.gte("meeting_date", from).lte("meeting_date", to)).collect(),
        ]);
        const programmes = (await Promise.all([
            ...[...new Set(allMeetings.flatMap(m => m.program_id ? [m.program_id] : []))].map(id => ctx.db.get(id)),
            ...[...new Set(allMeetings.filter(m => !m.program_id).map(m => ({ flow_prayer:"flow_service", farley_prayer:"acts_prayer" }[m.meeting_type] || m.meeting_type)))].map(type => ctx.db.query("meeting_programs").withIndex("by_meeting_type", q => q.eq("meeting_type",type)).first()),
        ])).filter(Boolean);
        const opportunities = developmentGatherings(allServices, allMeetings, programmes);
        const services = new Map(opportunities.filter(g => g.kind === "service").map(g => [g.id, g]));
        return await Promise.all(people.map(async person => {
            const id = person!._id;
            const [serviceRows, meetingRows, collected, sharedCollectorRows, invited, agreements] = await Promise.all([
                ctx.db.query("attendance").withIndex("by_person", q => q.eq("person_id", id)).collect(),
                ctx.db.query("meeting_attendance").withIndex("by_person", q => q.eq("person_id", id)).collect(),
                ctx.db.query("people").withIndex("by_collected_by", q => q.eq("collected_by_id", id)).collect(),
                ctx.db.query("contact_collectors").withIndex("by_collector", q => q.eq("collector_id", id)).collect(),
                ctx.db.query("people").withIndex("by_invited_by", q => q.eq("invited_by_id", id)).collect(),
                ctx.db.query("growth_agreements").withIndex("by_person", q => q.eq("person_id", id)).collect(),
            ]);
            const agreementReviews = (await Promise.all(agreements.map(a => ctx.db.query("growth_agreement_reviews").withIndex("by_agreement", q => q.eq("agreement_id", a._id)).collect()))).flat();
            return {
                person: canonicalPerson(person!),
                opportunities: [...new Map([...opportunities, ...developmentGatherings(
                    (await Promise.all(serviceRows.filter(r => !services.has(String(r.service_id))).map(r => ctx.db.get(r.service_id)))).filter(Boolean),
                    (await Promise.all(meetingRows.filter(r => !opportunities.some(g => g.id === String(r.meeting_id))).map(r => ctx.db.get(r.meeting_id)))).filter(Boolean),
                    programmes,
                )].map(g => [g.id, g])).values()],
                attendance: [
                    ...serviceRows.map(r => ({ event_id: String(r.service_id), present: true, gave_tithe: user.can_view_confidential ? r.gave_tithe === true : undefined })),
                    ...meetingRows.map(r => ({ event_id: String(r.meeting_id), present: developmentPresent(r), gave_tithe: user.can_view_confidential ? r.gave_tithe === true : undefined })),
                ],
                givingAvailable: Boolean(user.can_view_confidential),
                // RLS can expose only a subset of an inviter's contacts. Label this
                // response explicitly; never present partial scope as church totals.
                outreachComplete: user.role === "owner" || user.role === "admin",
                collectedContacts: [...new Map([
                    ...collected.filter(c => c.member_status !== "archived").map(c => [String(c._id), { id: c._id, contact_date: c.contact_date }] as const),
                    ...(await Promise.all(sharedCollectorRows.map(async row => {
                        const contact = await ctx.db.get(row.person_id);
                        return contact && contact.member_status !== "archived" ? [String(contact._id), { id: contact._id, contact_date: contact.contact_date }] as const : null;
                    }))).filter(Boolean) as Array<readonly [string, { id: any; contact_date: string | undefined }]>,
                ]).values()],
                invitedPeople: await Promise.all(invited.filter(c => c.member_status !== "archived").map(async contact => {
                    const rows = await ctx.db.query("attendance").withIndex("by_person", q => q.eq("person_id", contact._id)).collect();
                    const gatherings = await Promise.all(rows.map(async r => services.get(String(r.service_id)) || developmentGatherings([await ctx.db.get(r.service_id)].filter(Boolean))[0]));
                    const dates = gatherings.filter(g => g && g.category === "sunday").map(g => g!.date).sort();
                    return { id: contact._id, service_dates: [...new Set(dates)] };
                })),
                agreements, agreementReviews,
            };
        }));
    },
});

export const createGrowthAgreement = mutationFor("people:createGrowthAgreement")({
    args: { personId: v.id("people"), requestId: v.optional(v.string()), action: v.string(), supportingPersonId: v.optional(v.id("people")), agreedDate: v.string(), dueDate: v.optional(v.string()), nextReviewDate: v.optional(v.string()), notes: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const user = authenticatedUser(ctx);
        if (!user.can_view_confidential) forbidden();
        if (!await ctx.db.get(args.personId)) throw new Error("Person not found or unavailable");
        if (args.supportingPersonId && !await ctx.db.get(args.supportingPersonId)) throw new Error("Supporting person not found or unavailable");
        developmentDate("Agreed date", args.agreedDate);
        if (args.agreedDate > new Date().toISOString().slice(0, 10)) throw new Error("Agreed date cannot be in the future");
        if (args.nextReviewDate && args.nextReviewDate < args.agreedDate) throw new Error("Next review cannot be before the agreement");
        if (args.requestId) {
            const existing = await ctx.db.query("growth_agreements").withIndex("by_person_request", q => q.eq("person_id", args.personId).eq("request_id", args.requestId)).unique();
            if (existing) return existing;
        }
        for (const [label, value] of [["Due date", args.dueDate], ["Next review date", args.nextReviewDate]] as const) if (value) developmentDate(label, value);
        if (args.dueDate && args.dueDate < args.agreedDate) throw new Error("Due date cannot be before the agreed date");
        const now = new Date().toISOString();
        const id = await ctx.db.insert("growth_agreements", { person_id: args.personId, ...(args.requestId ? { request_id: args.requestId } : {}), action: developmentText("Agreed action", args.action, 1500), ...(args.supportingPersonId ? { supporting_person_id: args.supportingPersonId } : {}), agreed_date: args.agreedDate, ...(args.dueDate ? { due_date: args.dueDate } : {}), ...(args.nextReviewDate ? { next_review_date: args.nextReviewDate } : {}), ...(args.notes?.trim() ? { notes: developmentText("Notes", args.notes, 3000) } : {}), status: "in_progress", created_at: now, created_by_user_id: user._id, created_by_name: user.display_name || "Church leader" });
        return await ctx.db.get(id);
    },
});

export const reviewGrowthAgreement = mutationFor("people:reviewGrowthAgreement")({
    args: { agreementId: v.id("growth_agreements"), note: v.string(), reviewDate: v.string(), nextReviewDate: v.optional(v.string()), status: v.union(v.literal("in_progress"), v.literal("completed")), requestId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const user = authenticatedUser(ctx);
        if (!user.can_view_confidential) forbidden();
        const agreement = await ctx.db.get(args.agreementId);
        if (!agreement) throw new Error("Agreement not found or unavailable");
        developmentDate("Review date", args.reviewDate);
        if (args.reviewDate < agreement.agreed_date || args.reviewDate > new Date().toISOString().slice(0, 10)) throw new Error("Review date must be between agreement date and today");
        if (args.nextReviewDate) developmentDate("Next review date", args.nextReviewDate);
        if (args.nextReviewDate && args.nextReviewDate < args.reviewDate) throw new Error("Next review cannot be before this review");
        if (args.requestId) { const duplicate = await ctx.db.query("growth_agreement_reviews").withIndex("by_agreement_request", (q: any) => q.eq("agreement_id", args.agreementId).eq("request_id", args.requestId)).unique(); if (duplicate) return duplicate; }
        const now = new Date().toISOString();
        const review = { agreement_id: args.agreementId, person_id: agreement.person_id, note: developmentText("Progress note", args.note, 3000), review_date: args.reviewDate, ...(args.nextReviewDate ? { next_review_date: args.nextReviewDate } : {}), status: args.status, ...(args.requestId ? { request_id: args.requestId } : {}), created_at: now, created_by_user_id: user._id, created_by_name: user.display_name || "Church leader" };
        const reviewId = await ctx.db.insert("growth_agreement_reviews", review);
        await ctx.db.patch(args.agreementId, { status: args.status, next_review_date: args.nextReviewDate || undefined, completed_at: args.status === "completed" ? now : undefined });
        return await ctx.db.get(reviewId);
    },
});
