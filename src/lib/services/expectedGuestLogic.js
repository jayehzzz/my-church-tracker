// Invitations have their own identity until an owner explicitly links a person.
// Labels are never legal names, and a reported invitation is never attendance.
export const guestInvitationKey = row => row.person_id ? `person:${row.person_id}` : `invitation:${row._id || row.id}`;
export const guestInvitationVersion = row => `${row.revision || 0}:${row.updated_at}`;
export const guestInvitationResult = row => row.attendance_service_id ? 'attended' : row.state;
export function guestInvitationName(row) {
  return row.person?.name || [row.person?.preferred_name || row.person?.first_name, row.person?.last_name].filter(Boolean).join(' ')
    || (row.name_unknown ? `${row.inviter_name || 'Inviter'}'s friend${row.friend_number > 1 ? ` ${row.friend_number}` : ''}` : [row.first_name, row.last_name].filter(Boolean).join(' '));
}
export const activeGuestInvitation = row => !row.entered_in_error && !row.person_archived && row.state === 'coming' && !row.attendance_service_id;

export function extendGuestForecast(forecast = {}, invitations = []) {
  const confirmed = new Set((forecast.expected_person_ids || []).map(id => `person:${id}`));
  const expected = new Set(confirmed), coming = new Set(), tentative = new Set(), extra = [];
  for (const row of invitations.filter(activeGuestInvitation)) {
    const key = guestInvitationKey(row);
    coming.add(key);
    if (!expected.has(key)) { expected.add(key); extra.push(row._id || row.id); }
  }
  for (const row of invitations.filter(row => !row.entered_in_error && !row.person_archived && row.state === 'tentative' && !row.attendance_service_id)) {
    const key = guestInvitationKey(row);
    if (!expected.has(key)) tentative.add(key);
  }
  return {
    ...forecast, expected_total: expected.size, total_expected: expected.size,
    expected_person_ids: [...expected].filter(key => key.startsWith('person:')).map(key => key.slice(7)),
    expected_guest_invitation_ids: extra,
    invitation_coming: coming.size, additional_expected_guests: extra.length,
    tentative_guest_count: tentative.size,
    unnamed_expected_guests: invitations.filter(row => extra.includes(row._id || row.id) && row.name_unknown).length,
  };
}
