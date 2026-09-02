import { mutation, query } from "./_generated/server";
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

export const ensureDefaults = mutation({
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

export const getAll = query({
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

export const create = mutation({
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

export const update = mutation({
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
        await ctx.db.patch(id, {
            ...updates,
            updated_at: new Date().toISOString(),
        });
        return await ctx.db.get(id);
    },
});

export const syncPeople = mutation({
    args: {
        programId: v.id("meeting_programs"),
        leaderIds: v.array(v.id("people")),
        memberIds: v.array(v.id("people")),
    },
    handler: async (ctx, args) => {
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

        await Promise.all([
            ...existingLeaders.map((link) => ctx.db.delete(link._id)),
            ...existingMembers.map((link) => ctx.db.delete(link._id)),
        ]);

        await Promise.all([
            ...args.leaderIds.map((personId, index) =>
                ctx.db.insert("meeting_program_leaders", {
                    program_id: args.programId,
                    person_id: personId,
                    is_primary: index === 0,
                    created_at: now,
                }),
            ),
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

export const archive = mutation({
    args: { id: v.id("meeting_programs") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            active: false,
            updated_at: new Date().toISOString(),
        });
        return { success: true };
    },
});
