import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Follow-Up Pipeline Module
 * =========================
 * Tracks every leader-contact interaction for the Follow-Up Pipeline.
 * Manages warmth scoring, promise tracking, pause/snooze, and leader stats.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const PAUSE_OUTCOMES = ["on_holiday", "asked_to_pause", "busy_period"];

// ─── Warmth Computation Helper ───────────────────────────────────────────────

/**
 * Compute warmth score for a contact based on:
 * - Days since first contact (contact_date)
 * - Days since last follow-up
 * - Number of follow-ups with no progress
 * - Promise-to-attendance ratio
 */
function computeWarmthScore(contact: any, followUps: any[]): string {
    // If paused, warmth is frozen
    if (contact.is_paused) return contact.warmth_score || "warm";

    const now = new Date();
    const contactDate = contact.contact_date ? new Date(contact.contact_date) : new Date(contact.created_at);
    const daysSinceContact = Math.floor((now.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24));

    // Find last follow-up date
    const lastFollowUp = followUps.length > 0
        ? new Date(followUps.sort((a, b) => new Date(b.follow_up_date).getTime() - new Date(a.follow_up_date).getTime())[0].follow_up_date)
        : null;
    const daysSinceLastFollowUp = lastFollowUp
        ? Math.floor((now.getTime() - lastFollowUp.getTime()) / (1000 * 60 * 60 * 24))
        : daysSinceContact;

    // Count no-response follow-ups
    const noResponseCount = followUps.filter(f => f.outcome === "no_response" || f.outcome === "not_interested").length;

    // Promise stats
    const promisesMade = contact.promises_made || 0;
    const promisesKept = contact.promises_kept || 0;
    const brokenPromises = promisesMade - promisesKept;

    // Dead lead: 30+ days no contact, or 3+ broken promises with no shows, or 5+ no responses
    if (daysSinceLastFollowUp >= 30 || (brokenPromises >= 3 && promisesKept === 0) || noResponseCount >= 7) {
        return "dead";
    }

    // Cold: 14+ days no follow-up, or 5+ no-responses
    if (daysSinceLastFollowUp >= 14 || noResponseCount >= 5) {
        return "cold";
    }

    // Cool: 7-14 days no follow-up, or 3+ no-responses
    if (daysSinceLastFollowUp >= 7 || noResponseCount >= 3) {
        return "cool";
    }

    // Warm: 3-7 days since follow-up, some engagement
    if (daysSinceLastFollowUp >= 3) {
        return "warm";
    }

    // Hot: contacted < 3 days ago, responsive or promised
    return "hot";
}

/**
 * Determine pipeline stage from the latest follow-up outcome
 */
function determinePipelineStage(outcome: string, currentStage: string | undefined): string {
    if (PAUSE_OUTCOMES.includes(outcome)) return "paused";
    if (outcome === "promised_to_come") return "promised";
    if (outcome === "came_to_church") return "showed_up";
    if (outcome === "not_interested" || outcome === "wrong_number") return "cold";
    // If they've been contacted at all, move from "new" to "contacted"
    if (currentStage === "new" || !currentStage) return "contacted";
    return currentStage;
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Log a follow-up interaction.
 * Auto-updates warmth score, pipeline stage, and pause status on the contact.
 */
export const create = mutation({
    args: {
        contact_id: v.id("people"),
        leader_id: v.id("people"),
        follow_up_date: v.string(),
        method: v.string(),
        outcome: v.string(),
        promised_date: v.optional(v.string()),
        resume_date: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();

        // Insert the follow-up record
        const followUpId = await ctx.db.insert("follow_ups", {
            ...args,
            created_at: now,
        });

        // Get the contact and all their follow-ups for warmth recalc
        const contact = await ctx.db.get(args.contact_id);
        if (!contact) return await ctx.db.get(followUpId);

        const allFollowUps = await ctx.db
            .query("follow_ups")
            .withIndex("by_contact", (q) => q.eq("contact_id", args.contact_id))
            .collect();

        // Build update payload for the contact
        const updates: any = {
            total_follow_ups: allFollowUps.length,
            last_follow_up_date: args.follow_up_date,
            updated_at: now,
        };

        // Handle promise tracking
        if (args.outcome === "promised_to_come") {
            updates.promises_made = (contact.promises_made || 0) + 1;
        }

        // Handle pause/snooze
        if (PAUSE_OUTCOMES.includes(args.outcome)) {
            updates.is_paused = true;
            updates.pause_reason = args.outcome;
            if (args.resume_date) {
                updates.resume_date = args.resume_date;
            }
            updates.pipeline_stage = "paused";
        } else {
            // If was paused, unpause
            if (contact.is_paused) {
                updates.is_paused = false;
                updates.pause_reason = undefined;
                updates.resume_date = undefined;
            }
            updates.pipeline_stage = determinePipelineStage(args.outcome, contact.pipeline_stage || undefined);
        }

        // Recompute warmth
        updates.warmth_score = computeWarmthScore({ ...contact, ...updates }, allFollowUps);

        await ctx.db.patch(args.contact_id, updates);

        return await ctx.db.get(followUpId);
    },
});

/**
 * Resolve a promise — mark whether the contact showed up or not.
 */
export const resolvePromise = mutation({
    args: {
        follow_up_id: v.id("follow_ups"),
        fulfilled: v.boolean(),
    },
    handler: async (ctx, args) => {
        const followUp = await ctx.db.get(args.follow_up_id);
        if (!followUp) return null;

        // Update the follow-up record
        await ctx.db.patch(args.follow_up_id, {
            promise_fulfilled: args.fulfilled,
        });

        // Update the contact's promise stats and stage
        const contact = await ctx.db.get(followUp.contact_id);
        if (!contact) return await ctx.db.get(args.follow_up_id);

        const updates: any = {
            updated_at: new Date().toISOString(),
        };

        if (args.fulfilled) {
            updates.promises_kept = (contact.promises_kept || 0) + 1;
            updates.pipeline_stage = "showed_up";
            updates.warmth_score = "hot";
            // Set first_visit_date if not already set
            if (!contact.first_visit_date) {
                updates.first_visit_date = followUp.promised_date || new Date().toISOString().split('T')[0];
            }
        } else {
            updates.pipeline_stage = "no_show";
            // Recompute warmth with the broken promise
            const allFollowUps = await ctx.db
                .query("follow_ups")
                .withIndex("by_contact", (q) => q.eq("contact_id", followUp.contact_id))
                .collect();
            updates.warmth_score = computeWarmthScore({ ...contact, ...updates }, allFollowUps);
        }

        await ctx.db.patch(followUp.contact_id, updates);
        return await ctx.db.get(args.follow_up_id);
    },
});

/**
 * Bulk resolve promises from the Sunday Confirmation Sheet.
 */
export const bulkResolvePromises = mutation({
    args: {
        resolutions: v.array(v.object({
            follow_up_id: v.id("follow_ups"),
            fulfilled: v.boolean(),
        })),
    },
    handler: async (ctx, args) => {
        const results = [];
        for (const resolution of args.resolutions) {
            const followUp = await ctx.db.get(resolution.follow_up_id);
            if (!followUp) continue;

            await ctx.db.patch(resolution.follow_up_id, {
                promise_fulfilled: resolution.fulfilled,
            });

            const contact = await ctx.db.get(followUp.contact_id);
            if (!contact) continue;

            const updates: any = {
                updated_at: new Date().toISOString(),
            };

            if (resolution.fulfilled) {
                updates.promises_kept = (contact.promises_kept || 0) + 1;
                updates.pipeline_stage = "showed_up";
                updates.warmth_score = "hot";
                if (!contact.first_visit_date) {
                    updates.first_visit_date = followUp.promised_date || new Date().toISOString().split('T')[0];
                }
            } else {
                updates.pipeline_stage = "no_show";
                const allFollowUps = await ctx.db
                    .query("follow_ups")
                    .withIndex("by_contact", (q) => q.eq("contact_id", followUp.contact_id))
                    .collect();
                updates.warmth_score = computeWarmthScore({ ...contact, ...updates }, allFollowUps);
            }

            await ctx.db.patch(followUp.contact_id, updates);
            results.push({ contact_id: followUp.contact_id, fulfilled: resolution.fulfilled });
        }
        return results;
    },
});

/**
 * Resume paused contacts that have passed their resume date.
 */
export const resumePausedContacts = mutation({
    args: {},
    handler: async (ctx) => {
        const today = new Date().toISOString().split('T')[0];

        const allGuests = await ctx.db
            .query("people")
            .withIndex("by_member_status", (q) => q.eq("member_status", "guest"))
            .collect();

        const pausedContacts = allGuests.filter(
            (p) => p.is_paused && p.resume_date && p.resume_date <= today
        );

        const resumed = [];
        for (const contact of pausedContacts) {
            const allFollowUps = await ctx.db
                .query("follow_ups")
                .withIndex("by_contact", (q) => q.eq("contact_id", contact._id))
                .collect();

            await ctx.db.patch(contact._id, {
                is_paused: false,
                pause_reason: undefined,
                resume_date: undefined,
                pipeline_stage: "contacted",
                warmth_score: computeWarmthScore({ ...contact, is_paused: false }, allFollowUps),
                updated_at: new Date().toISOString(),
            });
            resumed.push(contact._id);
        }
        return resumed;
    },
});

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Get all follow-ups for a specific contact (timeline view).
 */
export const getByContact = query({
    args: { contactId: v.id("people") },
    handler: async (ctx, args) => {
        const followUps = await ctx.db
            .query("follow_ups")
            .withIndex("by_contact", (q) => q.eq("contact_id", args.contactId))
            .collect();

        // Enrich with leader info
        const results = await Promise.all(followUps.map(async (f) => {
            const leader = await ctx.db.get(f.leader_id);
            return {
                ...f,
                leader_name: leader ? `${leader.first_name} ${leader.last_name}`.trim() : "Unknown",
            };
        }));

        return results.sort(
            (a, b) => new Date(b.follow_up_date).getTime() - new Date(a.follow_up_date).getTime()
        );
    },
});

/**
 * Get all follow-ups by a specific leader (activity log).
 */
export const getByLeader = query({
    args: { leaderId: v.id("people") },
    handler: async (ctx, args) => {
        const followUps = await ctx.db
            .query("follow_ups")
            .withIndex("by_leader", (q) => q.eq("leader_id", args.leaderId))
            .collect();

        const results = await Promise.all(followUps.map(async (f) => {
            const contact = await ctx.db.get(f.contact_id);
            return {
                ...f,
                contact_name: contact ? `${contact.first_name} ${contact.last_name}`.trim() : "Unknown",
            };
        }));

        return results.sort(
            (a, b) => new Date(b.follow_up_date).getTime() - new Date(a.follow_up_date).getTime()
        );
    },
});

/**
 * Get contacts who promised to come this week (for the Sunday Confirmation Sheet).
 * Returns follow-ups with outcome "promised_to_come" where the promised_date
 * falls within the current week (Mon-Sun) and hasn't been resolved yet.
 */
export const getPromisedThisWeek = query({
    args: {},
    handler: async (ctx) => {
        const now = new Date();
        // Get Monday of current week
        const dayOfWeek = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        monday.setHours(0, 0, 0, 0);

        // Get Sunday of current week
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const mondayStr = monday.toISOString().split('T')[0];
        const sundayStr = sunday.toISOString().split('T')[0];

        // Get all follow-ups (we filter in memory since promised_date index doesn't support range)
        const allFollowUps = await ctx.db.query("follow_ups").collect();

        const promises = allFollowUps.filter(f =>
            f.outcome === "promised_to_come" &&
            f.promised_date &&
            f.promised_date >= mondayStr &&
            f.promised_date <= sundayStr &&
            f.promise_fulfilled === undefined // Not yet resolved
        );

        // Enrich with contact and leader info
        const results = await Promise.all(promises.map(async (f) => {
            const contact = await ctx.db.get(f.contact_id);
            const leader = await ctx.db.get(f.leader_id);
            return {
                ...f,
                contact_name: contact ? `${contact.first_name} ${contact.last_name}`.trim() : "Unknown",
                contact_phone: contact?.phone || "",
                leader_name: leader ? `${leader.first_name} ${leader.last_name}`.trim() : "Unknown",
                contact,
            };
        }));

        return results.sort(
            (a, b) => (a.promised_date || "").localeCompare(b.promised_date || "")
        );
    },
});

/**
 * Get pipeline contacts grouped by stage for the Kanban board.
 * Also computes freshness for each contact.
 */
export const getPipelineByStage = query({
    args: {},
    handler: async (ctx) => {
        // Get all guests/evangelism contacts
        const guests = await ctx.db
            .query("people")
            .withIndex("by_member_status", (q) => q.eq("member_status", "guest"))
            .collect();

        // Also get contacts who came from evangelism but are now members (showed_up)
        const members = await ctx.db
            .query("people")
            .withIndex("by_member_status", (q) => q.eq("member_status", "member"))
            .collect();
        const evangelismMembers = members.filter(m => m.entry_point === "evangelism" && m.pipeline_stage === "showed_up");

        const allContacts = [...guests, ...evangelismMembers];
        const now = new Date();

        // Enrich each contact with freshness and inviter info
        const enriched = await Promise.all(allContacts.map(async (contact) => {
            const contactDate = contact.contact_date ? new Date(contact.contact_date) : new Date(contact.created_at);
            const daysSinceContact = Math.floor((now.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24));

            let freshness: string;
            if (daysSinceContact <= 7) freshness = "this_week";
            else if (daysSinceContact <= 14) freshness = "last_week";
            else if (daysSinceContact <= 28) freshness = "two_plus_weeks";
            else freshness = "month_plus";

            // Get inviter/leader info
            let leaderName = null;
            if (contact.invited_by_id) {
                const inviter = await ctx.db.get(contact.invited_by_id);
                if (inviter) leaderName = `${inviter.first_name} ${inviter.last_name}`.trim();
            }

            return {
                ...contact,
                freshness,
                days_since_contact: daysSinceContact,
                leader_name: leaderName,
                pipeline_stage: contact.pipeline_stage || "new",
            };
        }));

        // Group by pipeline stage
        const stages: Record<string, typeof enriched> = {
            new: [],
            contacted: [],
            promised: [],
            showed_up: [],
            no_show: [],
            cold: [],
            paused: [],
        };

        for (const contact of enriched) {
            const stage = contact.pipeline_stage;
            if (stages[stage]) {
                stages[stage].push(contact);
            } else {
                stages.new.push(contact);
            }
        }

        // Sort each stage by freshness (newest first)
        for (const stage in stages) {
            stages[stage].sort((a, b) => a.days_since_contact - b.days_since_contact);
        }

        return stages;
    },
});

/**
 * Get contacts added in the last 7 days (new this week).
 */
export const getNewThisWeek = query({
    args: {},
    handler: async (ctx) => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        const guests = await ctx.db
            .query("people")
            .withIndex("by_member_status", (q) => q.eq("member_status", "guest"))
            .collect();

        return guests.filter(g => {
            const contactDate = g.contact_date || g.created_at.split('T')[0];
            return contactDate >= sevenDaysAgoStr;
        }).sort((a, b) => {
            const dateA = b.contact_date || b.created_at;
            const dateB = a.contact_date || a.created_at;
            return new Date(dateA).getTime() - new Date(dateB).getTime();
        });
    },
});

/**
 * Get stale contacts (2+ weeks with no progress, excluding paused).
 */
export const getStaleContacts = query({
    args: {},
    handler: async (ctx) => {
        const guests = await ctx.db
            .query("people")
            .withIndex("by_member_status", (q) => q.eq("member_status", "guest"))
            .collect();

        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0];

        const stale = guests.filter(g => {
            if (g.is_paused) return false;
            if (g.pipeline_stage === "showed_up") return false;

            const lastActivity = g.last_follow_up_date || g.contact_date || g.created_at.split('T')[0];
            return lastActivity < twoWeeksAgoStr;
        });

        return await Promise.all(stale.map(async (contact) => {
            let leaderName = null;
            if (contact.invited_by_id) {
                const inviter = await ctx.db.get(contact.invited_by_id);
                if (inviter) leaderName = `${inviter.first_name} ${inviter.last_name}`.trim();
            }
            return { ...contact, leader_name: leaderName };
        }));
    },
});

/**
 * Get paused contacts.
 */
export const getPausedContacts = query({
    args: {},
    handler: async (ctx) => {
        const guests = await ctx.db
            .query("people")
            .withIndex("by_member_status", (q) => q.eq("member_status", "guest"))
            .collect();

        return guests.filter(g => g.is_paused);
    },
});

/**
 * Get aggregated stats per leader for the Leader Scoreboard.
 */
export const getLeaderStats = query({
    args: {},
    handler: async (ctx) => {
        // Get all leaders
        const allPeople = await ctx.db.query("people").collect();
        const leaders = allPeople.filter(p => p.member_status === "leader");

        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        const stats = await Promise.all(leaders.map(async (leader) => {
            // Get all follow-ups by this leader
            const followUps = await ctx.db
                .query("follow_ups")
                .withIndex("by_leader", (q) => q.eq("leader_id", leader._id))
                .collect();

            const thisWeekFollowUps = followUps.filter(f => f.follow_up_date >= sevenDaysAgoStr);
            const thisMonthFollowUps = followUps.filter(f => f.follow_up_date >= thirtyDaysAgoStr);

            // Unique contacts reached this week
            const uniqueContactsThisWeek = new Set(thisWeekFollowUps.map(f => f.contact_id)).size;
            const uniqueContactsTotal = new Set(followUps.map(f => f.contact_id)).size;

            // Contacts assigned to this leader (invited_by_id)
            const assignedContacts = allPeople.filter(
                p => p.invited_by_id === leader._id && p.member_status === "guest"
            );

            // Stale contacts (2+ weeks without follow-up)
            const staleContacts = assignedContacts.filter(c => {
                if (c.is_paused) return false;
                const lastActivity = c.last_follow_up_date || c.contact_date || c.created_at.split('T')[0];
                return lastActivity < sevenDaysAgoStr;
            });

            // Contacts that showed up
            const showedUp = assignedContacts.filter(c => c.pipeline_stage === "showed_up").length;
            const converted = allPeople.filter(
                p => p.invited_by_id === leader._id && p.member_status === "member" && p.entry_point === "evangelism"
            ).length;

            // Last activity
            const lastActivity = followUps.length > 0
                ? followUps.sort((a, b) => b.follow_up_date.localeCompare(a.follow_up_date))[0].follow_up_date
                : null;

            return {
                leader_id: leader._id,
                leader_name: `${leader.first_name} ${leader.last_name}`.trim(),
                total_follow_ups: followUps.length,
                follow_ups_this_week: thisWeekFollowUps.length,
                follow_ups_this_month: thisMonthFollowUps.length,
                unique_contacts_this_week: uniqueContactsThisWeek,
                unique_contacts_total: uniqueContactsTotal,
                assigned_contacts: assignedContacts.length,
                stale_contacts: staleContacts.length,
                showed_up: showedUp,
                converted: converted,
                last_activity: lastActivity,
            };
        }));

        return stats.sort((a, b) => b.follow_ups_this_week - a.follow_ups_this_week);
    },
});

/**
 * Get conversion funnel stats.
 * New Contact → Contacted → Promised → Visited → Member
 */
export const getConversionFunnel = query({
    args: {},
    handler: async (ctx) => {
        const allPeople = await ctx.db.query("people").collect();

        // All evangelism contacts (current guests + converted members from evangelism)
        const evangelismContacts = allPeople.filter(
            p => p.entry_point === "evangelism" || p.contact_date
        );

        const totalContacts = evangelismContacts.length;

        // Contacted = have at least one follow-up
        const contacted = evangelismContacts.filter(
            p => (p.total_follow_ups || 0) > 0
        ).length;

        // Promised = have made at least one promise
        const promised = evangelismContacts.filter(
            p => (p.promises_made || 0) > 0
        ).length;

        // Visited = have a first_visit_date
        const visited = evangelismContacts.filter(
            p => p.first_visit_date
        ).length;

        // Converted to member
        const converted = evangelismContacts.filter(
            p => p.member_status === "member"
        ).length;

        return {
            total_contacts: totalContacts,
            contacted,
            promised,
            visited,
            converted,
            rates: {
                contact_rate: totalContacts > 0 ? Math.round((contacted / totalContacts) * 100) : 0,
                promise_rate: contacted > 0 ? Math.round((promised / contacted) * 100) : 0,
                visit_rate: promised > 0 ? Math.round((visited / promised) * 100) : 0,
                conversion_rate: visited > 0 ? Math.round((converted / visited) * 100) : 0,
            },
        };
    },
});

/**
 * Get all leaders (people with member_status "leader").
 */
export const getLeaders = query({
    args: {},
    handler: async (ctx) => {
        const leaders = await ctx.db
            .query("people")
            .withIndex("by_member_status", (q) => q.eq("member_status", "leader"))
            .collect();
        return leaders.sort((a, b) => a.first_name.localeCompare(b.first_name));
    },
});
