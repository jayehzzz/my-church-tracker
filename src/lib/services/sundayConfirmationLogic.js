// Shared by the secured Convex dashboard and explicit local demo. Ownership is
// permanent; every response/plan lookup is restricted to the selected Sunday.
const id = row => String(row?._id || row?.id || '');
const name = row => row?.name || [row?.preferred_name || row?.first_name, row?.last_name].filter(Boolean).join(' ') || 'Person unavailable';

/** @param {any[]} rows */
export function latestSundayCommitments(rows = []) {
  const byPersonDate = new Map();
  for (const row of rows.slice().sort((a, b) => String(a.updated_at || '').localeCompare(String(b.updated_at || '')) || (a._creationTime || 0) - (b._creationTime || 0))) {
    if (row.gathering_type && row.gathering_type !== 'sunday_service') continue;
    byPersonDate.set(`${row.person_id || row.contact_id}:${row.gathering_date || row.service_date || row.promised_date}`, row);
  }
  // A newer correction invalidating a legacy duplicate must not resurrect Yes.
  return [...byPersonDate.values()].filter(row => !row.entered_in_error);
}

/** @param {{people?: any[], assignments?: any[], commitments?: any[], plans?: any[], serviceDate?: string, leaderId?: string}} options */
export function sundayConfirmationRows({ people = [], assignments = [], commitments = [], plans = [], serviceDate, leaderId } = {}) {
  const owners = new Map(assignments.filter(row => row.status === 'active')
    .slice().sort((a, b) => String(a.assigned_at).localeCompare(String(b.assigned_at)) || (a._creationTime || 0) - (b._creationTime || 0))
    .map(row => [String(row.person_id), row]));
  const peopleById = new Map(people.map(row => [id(row), row]));
  const responses = new Map(latestSundayCommitments(commitments).filter(row => row.gathering_date === serviceDate).map(row => [String(row.person_id), row]));
  const datedPlans = new Map(plans.filter(row => row.service_date === serviceDate).slice()
    .sort((a, b) => String(a.updated_at).localeCompare(String(b.updated_at)) || (a._creationTime || 0) - (b._creationTime || 0)).map(row => [String(row.person_id), row]));
  return [...peopleById.values()].filter(person => ['member', 'leader', 'contact', 'guest', 'visitor', 'new_believer'].includes(person.member_status))
    .filter(person => !leaderId || String(owners.get(id(person))?.assigned_leader_id || '') === String(leaderId))
    .map(person => {
      const assignment = owners.get(id(person));
      const commitment = responses.get(id(person)) || null;
      const plan = datedPlans.get(id(person)) || null;
      const hasRecordedResponse = commitments.some(row => String(row.person_id) === id(person) && row.gathering_type === 'sunday_service' && row.gathering_date === serviceDate);
      const response = commitment
        ? (commitment.resolution === 'cancelled' && commitment.response === 'yes' ? 'cancelled' : commitment.response)
        : hasRecordedResponse ? 'not_contacted' : plan?.status === 'confirmed' ? 'yes' : plan?.status === 'away' ? 'no' : 'not_contacted';
      const history = commitment?.history || [];
      const latestNote = history.slice().reverse().find(change => change.note);
      return {
        ...person, name: name(person), assignment_id: assignment?._id || null,
        assigned_leader_id: assignment?.assigned_leader_id || null,
        assigned_leader_name: assignment ? name(peopleById.get(String(assignment.assigned_leader_id))) : null,
        sunday_response: response, sunday_commitment: commitment, attendance_plan: plan,
        response_updated_at: commitment?.updated_at || plan?.updated_at || null,
        response_note: latestNote?.note || commitment?.resolution_note || commitment?.confirmation_note || null,
        response_note_at: latestNote?.at || commitment?.updated_at || plan?.updated_at || null,
        actual_result: plan?.status === 'attended' || commitment?.resolution === 'attended' ? 'attended'
          : plan?.status === 'absent' || commitment?.resolution === 'no_show' ? 'no_show' : null,
        contact_blocked: person.contact_category === 'do_not_contact' || person.is_paused === true,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
}

export function sundayResponseVersion(commitment, plan) {
  return JSON.stringify([
    commitment ? [commitment._id || commitment.id, commitment.updated_at, commitment.correction_revision || 0, commitment.history?.length || 0, commitment.response, commitment.resolution, commitment.confirmation_note || null, commitment.resolution_note || null] : null,
    plan ? [plan._id || plan.id, plan.updated_at, plan.status] : null,
  ]);
}
