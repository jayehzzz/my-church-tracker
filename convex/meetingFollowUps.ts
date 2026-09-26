import { v } from "convex/values";
import { queryFor, mutationFor, authenticatedUser, isAdmin, forbidden } from "./lib/security";
import { requireFollowUpAllowed } from "./lib/contactPolicy";

export const getForProgram = queryFor("meetingFollowUps:getForProgram")({
  args: { programId: v.id("meeting_programs") },
  handler: async (ctx, args) => {
    if (!await ctx.db.get(args.programId)) forbidden();
    const meetings = await ctx.db.query("meetings").withIndex("by_program", q => q.eq("program_id", args.programId)).collect();
    const completed = meetings.filter(meeting => meeting.status === "completed")
      .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));
    const rows = (await Promise.all(completed.map(meeting => ctx.db.query("meeting_attendance")
      .withIndex("by_meeting", q => q.eq("meeting_id", meeting._id)).collect()))).flat();
    const tasks = (await Promise.all(completed.map(meeting => ctx.db.query("follow_up_tasks")
      .withIndex("by_meeting", q => q.eq("meeting_id", meeting._id)).collect()))).flat();
    const openTasks = (await Promise.all([...new Set(rows.map(row => row.person_id))].map(personId => ctx.db.query("follow_up_tasks")
      .withIndex("by_person_status", q => q.eq("person_id", personId).eq("status", "open")).collect()))).flat();
    return { meetings: completed.map(meeting => ({ id: meeting._id, date: meeting.meeting_date })), rows, tasks, openTasks };
  },
});

export const setAbsenceReason = mutationFor("meetingFollowUps:setAbsenceReason")({
  args: { meetingId: v.id("meetings"), personId: v.id("people"), absenceReason: v.string() },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting || meeting.status !== "completed" || !meeting.program_id) forbidden();
    if (!await ctx.db.get(args.personId)) forbidden();
    const row = await ctx.db.query("meeting_attendance").withIndex("by_meeting_person", q => q.eq("meeting_id", args.meetingId).eq("person_id", args.personId)).first();
    if (!row || !["absent", "excused"].includes(row.status || "")) forbidden();
    const reason = args.absenceReason.trim();
    if (reason.length > 500) throw new Error("Keep the attendance reason within 500 characters");
    await ctx.db.patch(row._id, { absence_reason: reason || undefined });
    return await ctx.db.get(row._id);
  },
});

export const createTask = mutationFor("meetingFollowUps:createTask")({
  args: {
    meetingId: v.id("meetings"), personId: v.id("people"), assignedLeaderId: v.id("people"),
    dueDate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = authenticatedUser(ctx);
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting || meeting.status !== "completed" || !meeting.program_id) forbidden();
    const program = await ctx.db.get(meeting.program_id);
    const person = await ctx.db.get(args.personId);
    if (!program || !person) forbidden();
    requireFollowUpAllowed(person);
    const row = await ctx.db.query("meeting_attendance").withIndex("by_meeting_person", q => q.eq("meeting_id", args.meetingId).eq("person_id", args.personId)).first();
    if (!row || !(row.status === "absent" || row.first_timer || row.first_program_attendance)) forbidden();
    const leaders = await ctx.db.query("meeting_program_leaders").withIndex("by_program", q => q.eq("program_id", meeting.program_id!)).collect();
    if (!leaders.some(link => link.person_id === args.assignedLeaderId)) forbidden();
    if (!isAdmin(user) && user.person_id !== args.assignedLeaderId) forbidden();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.dueDate)) throw new Error("Choose a valid due date");
    const existing = await ctx.db.query("follow_up_tasks").withIndex("by_meeting", q => q.eq("meeting_id", args.meetingId)).collect();
    const open = existing.find(task => task.person_id === args.personId && task.status === "open");
    if (open) return open;
    const now = new Date().toISOString();
    const id = await ctx.db.insert("follow_up_tasks", {
      person_id: args.personId, meeting_id: meeting._id, program_id: meeting.program_id,
      assigned_leader_id: args.assignedLeaderId, created_by_id: user.person_id,
      due_date: args.dueDate, status: "open", task_type: row.status === "absent" ? "reengagement" : "first_contact",
      priority: "normal", created_at: now, updated_at: now,
    });
    return await ctx.db.get(id);
  },
});
