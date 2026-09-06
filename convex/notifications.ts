import { query } from "./_generated/server";
import { isAdmin, requireUser } from "./lib/security";

const today = () => new Date().toISOString().slice(0, 10);

// These are derived from saved operational records rather than seeded browser
// stories. Read state is deliberately client-local; the underlying alert is
// recomputed whenever the feed is refreshed.
export const getFeed = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (user.role === "viewer") return [];
    const todayDate = today();
    const openTasks = isAdmin(user)
      ? await ctx.db.query("follow_up_tasks").withIndex("by_status_due_date", (q) => q.eq("status", "open").lt("due_date", todayDate)).collect()
      : user.person_id
        ? await ctx.db.query("follow_up_tasks").withIndex("by_assignee_status", (q) => q.eq("assigned_leader_id", user.person_id!).eq("status", "open")).collect()
        : [];
    const overdue = isAdmin(user)
      ? openTasks
      : openTasks.filter((task) => task.due_date < todayDate);

    const alerts: Array<{ id: string; type: string; category: string; priority: string; icon: string; title: string; description: string; timestamp: string; href: string }> = [];
    if (overdue.length) {
      const oldest = overdue.slice().sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
      alerts.push({
        id: "crm-overdue-work",
        type: "followup",
        category: "followup",
        priority: "urgent",
        icon: "phone",
        title: "Follow-up calls overdue",
        description: `${overdue.length} planned call${overdue.length === 1 ? " is" : "s are"} overdue.`,
        timestamp: oldest.updated_at,
        href: "/pipeline",
      });
    }

    if (isAdmin(user)) {
      const [guests, newBelievers, activeAssignments] = await Promise.all([
        ctx.db.query("people").withIndex("by_member_status", (q) => q.eq("member_status", "guest")).collect(),
        ctx.db.query("people").withIndex("by_member_status", (q) => q.eq("member_status", "new_believer")).collect(),
        ctx.db.query("follow_up_assignments").withIndex("by_status", (q) => q.eq("status", "active")).collect(),
      ]);
      const assigned = new Set(activeAssignments.map((assignment) => assignment.person_id));
      const unassigned = [...guests, ...newBelievers].filter((person) =>
        !assigned.has(person._id)
        && person.is_paused !== true
        && !["do_not_contact", "has_church"].includes(person.contact_category ?? ""),
      );
      if (unassigned.length) {
        alerts.push({
          id: "crm-fresh-unassigned",
          type: "followup",
          category: "followup",
          priority: "urgent",
          icon: "phone",
          title: "People need a worker",
          description: `${unassigned.length} ${unassigned.length === 1 ? "person needs" : "people need"} a worker.`,
          timestamp: unassigned.map((person) => person.updated_at).sort().at(-1) ?? new Date().toISOString(),
          href: "/pipeline",
        });
      }
    }

    return alerts;
  },
});
