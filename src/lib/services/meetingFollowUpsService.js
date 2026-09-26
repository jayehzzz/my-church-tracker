import { api } from "../../../convex/_generated/api.js";
import { getConvexHttpClient, isDemoMode, unavailableError } from "$lib/convex.js";

const result = (data, error = null) => ({ data, error });

export async function getForProgram(programId) {
  const client = getConvexHttpClient();
  if (!client) return isDemoMode() ? result({ meetings: [], rows: [], tasks: [], openTasks: [] }) : result(null, unavailableError());
  try { return result(await client.query(api.meetingFollowUps.getForProgram, { programId })); }
  catch (error) { return result(null, error); }
}

export async function setAbsenceReason(meetingId, personId, absenceReason) {
  const client = getConvexHttpClient();
  if (!client) return isDemoMode() ? result({ meeting_id: meetingId, person_id: personId, absence_reason: absenceReason }) : result(null, unavailableError());
  try { return result(await client.mutation(api.meetingFollowUps.setAbsenceReason, { meetingId, personId, absenceReason })); }
  catch (error) { return result(null, error); }
}

export async function createTask(meetingId, personId, assignedLeaderId, dueDate) {
  const client = getConvexHttpClient();
  if (!client) return isDemoMode() ? result({ meeting_id: meetingId, person_id: personId, assigned_leader_id: assignedLeaderId, due_date: dueDate, status: "open" }) : result(null, unavailableError());
  try { return result(await client.mutation(api.meetingFollowUps.createTask, { meetingId, personId, assignedLeaderId, dueDate })); }
  catch (error) { return result(null, error); }
}
