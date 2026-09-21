const roles = { leader: 'Leader', member: 'Member', contact: 'Outreach contact', guest: 'Guest', visitor: 'Guest' };
export function personOption(person) {
  return {
    value: String(person.id || person._id),
    label: `${[person.first_name, person.last_name].filter(Boolean).join(' ')} · ${roles[person.member_status] || 'Unknown status'}`,
    primary: ['leader', 'member'].includes(person.member_status),
  };
}
export function personOptions(people) {
  const rank = { leader: 0, member: 1 };
  return [...people].sort((a, b) => (rank[a.member_status] ?? 2) - (rank[b.member_status] ?? 2)
    || personOption(a).label.localeCompare(personOption(b).label)).map(personOption);
}
