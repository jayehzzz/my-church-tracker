import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run after midnight UTC. The mutation is idempotent: an open task prevents a
// second quarterly/restart task for the same person, including a retry.
crons.daily(
  "synchronise quarterly re-engagement",
  { hourUTC: 0, minuteUTC: 10 },
  internal.crm.runQuarterlyReengagement,
  {},
);

export default crons;
