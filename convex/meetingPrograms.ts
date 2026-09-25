import { queryFor, mutationFor, authenticatedUser, isAdmin, forbidden } from "./lib/security";

import { v } from "convex/values";

const DEFAULT_PROGRAMS = [
    {
        code: "bacenta-main",
        name: "Bacenta",
        meeting_type: "bacenta",
        category: "bacenta",
        description: "Midweek fellowship meeting",
        default_format: "in_person",
        default_location: "Coffee shop",
    },
    {
        code: "flow-service",
        name: "Flow Service",
        meeting_type: "flow_service",
        category: "prayer",
        description: "Online YouTube prayer service with the main church",
        default_format: "online",
        default_location: "YouTube",
    },
    {
        code: "acts-prayer",
        name: "Acts Prayer",
        meeting_type: "acts_prayer",
        category: "prayer",
        description: "Weekly morning prayer meeting, formerly Farley Morning Prayer",
        default_format: "in_person",
    },
    {
        code: "shemen-prayer",
        name: "Shemen Prayer",
        meeting_type: "shemen_prayer",
        category: "prayer",
        description: "Friday evening prayer meeting",
        default_day: "friday",
        default_format: "in_person",
    },
    {
        code: "workers-meeting",
        name: "Workers Meeting",
        meeting_type: "workers_meeting",
        category: "workers",
        description: "Teaching and church planning meeting for workers",
        default_format: "in_person",
    },
];

async function hydrateProgram(ctx: any, program: any) {
    const leaderLinks = await ctx.db
        .query("meeting_program_leaders")
        .withIndex("by_program", (q: any) => q.eq("program_id", program._id))
        .collect();
    const memberLinks = await ctx.db
        .query("meeting_program_members")
        .withIndex("by_program", (q: any) => q.eq("program_id", program._id))
        .collect();

    const leaders = (await Promise.all(
        leaderLinks.map(async (link: any) => {
            const person = await ctx.db.get(link.person_id);
            return person ? { ...person, is_primary: link.is_primary } : null;
        }),
    )).filter(Boolean);
    const members = (await Promise.all(
        memberLinks
            .filter((link: any) => link.status === "active")
            .map((link: any) => ctx.db.get(link.person_id)),
    )).filter(Boolean);

    return {
        ...program,
        leaders,
        leader_ids: leaderLinks.map((link: any) => link.person_id),
        members,
        member_ids: memberLinks
            .filter((link: any) => link.status === "active")
            .map((link: any) => link.person_id),
    };
}

export const ensureDefaults = mutationFor("meetingPrograms:ensureDefaults")({
    args: {},
    handler: async (ctx) => {
        const now = new Date().toISOString();
        const created = [];

        for (const definition of DEFAULT_PROGRAMS) {
            const existing = await ctx.db
                .query("meeting_programs")
                .withIndex("by_code", (q) => q.eq("code", definition.code))
                .first();
            if (!existing) {
                const id = await ctx.db.insert("meeting_programs", {
                    ...definition,
                    active: true,
                    created_at: now,
                    updated_at: now,
                });
                created.push(id);
            }
        }

        return { created: created.length };
    },
});

export const getAll = queryFor("meetingPrograms:getAll")({
    args: { includeArchived: v.optional(v.boolean()) },
    handler: async (ctx, args) => {
        const programs = await ctx.db.query("meeting_programs").collect();
        const visible = args.includeArchived
            ? programs
            : programs.filter((program) => program.active);
        const hydrated = await Promise.all(
            visible.map((program) => hydrateProgram(ctx, program)),
        );
        return hydrated.sort((a, b) => {
            if (a.category === "bacenta" && b.category !== "bacenta") return -1;
            if (b.category === "bacenta" && a.category !== "bacenta") return 1;
            return a.name.localeCompare(b.name);
        });
    },
});

// One scoped read for the leader's daily workspace. The security wrapper
// filters every table before these records are assembled.
export const getLeaderWorkspace = queryFor("meetingPrograms:getLeaderWorkspace")({
    args: {},
    handler: async (ctx) => {
        const user = authenticatedUser(ctx);
        if (user.role !== "leader" || !user.person_id) forbidden();
        const programs = (await ctx.db.query("meeting_programs").collect())
            .filter(program => program.active && program.category === "bacenta");
        const hydrated = await Promise.all(programs.map(program => hydrateProgram(ctx, program)));
        const people = (await ctx.db.query("people").collect())
            .filter(person => person.member_status !== "archived");
        const [assignments, openTasks, commitments, visits, meetingsByProgram] = await Promise.all([
            ctx.db.query("follow_up_assignments").withIndex("by_leader_status", q => q.eq("assigned_leader_id", user.person_id!).eq("status", "active")).collect(),
            ctx.db.query("follow_up_tasks").withIndex("by_status_due_date", q => q.eq("status", "open")).collect(),
            ctx.db.query("gathering_commitments").collect(),
            user.can_view_confidential ? ctx.db.query("visitations").collect() : Promise.resolve([]),
            Promise.all(hydrated.map(program => ctx.db.query("meetings")
                .withIndex("by_program", q => q.eq("program_id", program._id)).collect())),
        ]);
        const meetings = meetingsByProgram.flat().sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));
        const meetingRows = (await Promise.all(meetings.filter(meeting => meeting.status === "completed")
            .map(meeting => ctx.db.query("meeting_attendance").withIndex("by_meeting", q => q.eq("meeting_id", meeting._id)).collect()))).flat();
        return {
            leaderId: user.person_id, programs: hydrated, people, assignments,
            tasks: openTasks, commitments: commitments.filter(row => row.gathering_type === "sunday_service"),
            visits, meetings, meetingRows,
        };
    },
});

export const create = mutationFor("meetingPrograms:create")({
    args: {
        code: v.string(),
        name: v.string(),
        meeting_type: v.string(),
        category: v.string(),
        description: v.optional(v.string()),
        default_day: v.optional(v.string()),
        default_start_time: v.optional(v.string()),
        default_end_time: v.optional(v.string()),
        default_format: v.string(),
        default_location: v.optional(v.string()),
        online_url: v.optional(v.string()),
        active: v.optional(v.boolean()),
        leader_ids: v.optional(v.array(v.id("people"))),
        member_ids: v.optional(v.array(v.id("people"))),
    },
    handler: async (ctx, args) => {
        const { leader_ids = [], member_ids = [], ...program } = args;
        const duplicate = await ctx.db
            .query("meeting_programs")
            .withIndex("by_code", (q) => q.eq("code", program.code))
            .first();
        if (duplicate) throw new Error("A meeting programme with this name already exists.");

        const now = new Date().toISOString();
        const id = await ctx.db.insert("meeting_programs", {
            ...program,
            active: program.active ?? true,
            created_at: now,
            updated_at: now,
        });

        await Promise.all([
            ...leader_ids.map((personId, index) =>
                ctx.db.insert("meeting_program_leaders", {
                    program_id: id,
                    person_id: personId,
                    is_primary: index === 0,
                    created_at: now,
                }),
            ),
            ...member_ids.map((personId) =>
                ctx.db.insert("meeting_program_members", {
                    program_id: id,
                    person_id: personId,
                    status: "active",
                    joined_at: now,
                }),
            ),
        ]);

        return await ctx.db.get(id);
    },
});

export const update = mutationFor("meetingPrograms:update")({
    args: {
        id: v.id("meeting_programs"),
        name: v.optional(v.string()),
        meeting_type: v.optional(v.string()),
        category: v.optional(v.string()),
        description: v.optional(v.string()),
        default_day: v.optional(v.string()),
        default_start_time: v.optional(v.string()),
        default_end_time: v.optional(v.string()),
        default_format: v.optional(v.string()),
        default_location: v.optional(v.string()),
        online_url: v.optional(v.string()),
        active: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const existing = await ctx.db.get(id);
        if (!existing) forbidden();
        if (!isAdmin(authenticatedUser(ctx)) &&
            (updates.active !== undefined && updates.active !== existing.active ||
             updates.meeting_type !== undefined && updates.meeting_type !== existing.meeting_type ||
             updates.category !== undefined && updates.category !== existing.category)) forbidden();
        await ctx.db.patch(id, {
            ...updates,
            updated_at: new Date().toISOString(),
        });
        return await ctx.db.get(id);
    },
});

export const syncPeople = mutationFor("meetingPrograms:syncPeople")({
    args: {
        programId: v.id("meeting_programs"),
        leaderIds: v.array(v.id("people")),
        memberIds: v.array(v.id("people")),
    },
    handler: async (ctx, args) => {
        const user = authenticatedUser(ctx);
        if (!await ctx.db.get(args.programId)) forbidden();
        const now = new Date().toISOString();
        const [existingLeaders, existingMembers] = await Promise.all([
            ctx.db
                .query("meeting_program_leaders")
                .withIndex("by_program", (q) => q.eq("program_id", args.programId))
                .collect(),
            ctx.db
                .query("meeting_program_members")
                .withIndex("by_program", (q) => q.eq("program_id", args.programId))
                .collect(),
        ]);

        if (!isAdmin(user)) {
            const current = existingLeaders.map(link => String(link.person_id)).sort();
            const requested = args.leaderIds.map(String).sort();
            if (JSON.stringify(current) !== JSON.stringify(requested)) forbidden();
            for (const personId of args.memberIds) if (!await ctx.db.get(personId)) forbidden();
        }

        await Promise.all([
            ...(isAdmin(user) ? existingLeaders.map((link) => ctx.db.delete(link._id)) : []),
            ...existingMembers.map((link) => ctx.db.delete(link._id)),
        ]);

        await Promise.all([
            ...(isAdmin(user) ? args.leaderIds.map((personId, index) =>
                ctx.db.insert("meeting_program_leaders", {
                    program_id: args.programId,
                    person_id: personId,
                    is_primary: index === 0,
                    created_at: now,
                }),
            ) : []),
            ...args.memberIds.map((personId) =>
                ctx.db.insert("meeting_program_members", {
                    program_id: args.programId,
                    person_id: personId,
                    status: "active",
                    joined_at: now,
                }),
            ),
        ]);

        await ctx.db.patch(args.programId, { updated_at: now });
        return { success: true };
    },
});

export const archive = mutationFor("meetingPrograms:archive")({
    args: { id: v.id("meeting_programs") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            active: false,
            updated_at: new Date().toISOString(),
        });
        return { success: true };
    },
});

export const addGuest = mutationFor("meetingPrograms:addGuest")({
    args: {
        programId: v.id("meeting_programs"), firstName: v.string(), lastName: v.string(), phone: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const program = await ctx.db.get(args.programId);
        if (!program || !program.active) forbidden();
        const firstName = args.firstName.trim();
        const lastName = args.lastName.trim();
        const phone = args.phone?.trim();
        if (!firstName || !lastName || firstName.length > 100 || lastName.length > 100) throw new Error("Enter the guest's first and last name");
        if (phone && phone.length > 40) throw new Error("Keep the phone number within 40 characters");
        const visiblePeople = await ctx.db.query("people").collect();
        const duplicate = visiblePeople.find(person =>
            phone && person.phone?.replace(/\D/g, "") === phone.replace(/\D/g, "")
            || person.first_name.trim().toLowerCase() === firstName.toLowerCase() && person.last_name.trim().toLowerCase() === lastName.toLowerCase());
        if (duplicate) throw new Error("A matching person is already available. Select their existing profile instead.");
        const now = new Date().toISOString();
        const id = await ctx.db.insert("people", {
            first_name: firstName, last_name: lastName, phone: phone || undefined,
            member_status: "guest", entry_point: program.meeting_type === "bacenta" ? "bacenta_meeting" : "other",
            created_at: now, updated_at: now,
        });
        const user = authenticatedUser(ctx);
        if (user.person_id && !isAdmin(user)) await ctx.db.insert("follow_up_assignments", {
            person_id: id, assigned_leader_id: user.person_id, status: "active",
            assigned_at: now, created_at: now, updated_at: now,
        });
        return await ctx.db.get(id);
    },
});
