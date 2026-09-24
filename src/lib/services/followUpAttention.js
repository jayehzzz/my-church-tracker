// These predicates match the Dashboard attention cards. Keep the complete
// source set: member care tasks and regular members are part of those totals.
export const ATTENTION_LABELS = {
  due: 'Follow-ups needed',
  overdue: 'Overdue follow-ups',
  unassigned: 'Fresh people needing a worker',
  'expected-sunday': 'Expected this Sunday',
};

export function attentionRows(workspace, filter, today) {
  const tasks = [...(workspace?.tasks || []), ...(workspace?.member_care_tasks || [])];
  if (filter === 'due') return tasks.filter((task) => !task.due_date || task.due_date <= today).map((task) => ({ ...task, attention_kind: 'task' }));
  if (filter === 'overdue') return tasks.filter((task) => task.due_date && task.due_date < today).map((task) => ({ ...task, attention_kind: 'task' }));
  if (filter === 'unassigned') {
    const date = new Date(`${today}T00:00:00`);
    date.setDate(date.getDate() - 14);
    const since = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return (workspace?.unassigned_contacts || []).filter((person) => {
      const recorded = person.contact_date || person.created_at?.slice?.(0, 10);
      return Boolean(recorded && recorded >= since && recorded <= today);
    });
  }
  if (filter === 'expected-sunday') {
    const byId = new Map();
    for (const person of workspace?.attendance_roster || []) byId.set(String(person._id || person.id), person);
    for (const commitment of workspace?.sunday_commitments || []) {
      const person = commitment.person;
      if (person) byId.set(String(person._id || person.id), person);
    }
    return (workspace?.attendance_forecast?.expected_person_ids || []).map((id) =>
      byId.get(String(id)) || { _id: id, unavailable: true });
  }
  return [];
}
