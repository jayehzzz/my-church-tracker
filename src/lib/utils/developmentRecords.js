/** Minimal, shared gathering projection for live and explicitly selected demo data. */
export function developmentGatherings(services = [], meetings = [], programmes = []) {
  const aliases = { flow_prayer: 'flow_service', farley_prayer: 'acts_prayer' };
  const label = value => String(value || 'Meeting').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  return [
    ...services.map(s => ({ id: String(s._id || s.id), kind: 'service', date: s.service_date, type: s.service_type,
      category: s.service_type === 'sunday_service' || (s.service_type === 'special_service' && new Date(`${s.service_date}T00:00:00Z`).getUTCDay() === 0) ? 'sunday' : 'other',
      program_id: `service:${s.service_type}`, name: label(s.service_type), status: s.status,
      register_known: typeof s.total_attendance === 'number' })),
    ...meetings.map(m => {
      const type = aliases[m.meeting_type] || m.meeting_type;
      const p = programmes.find(p => String(p._id || p.id) === String(m.program_id)) || m.program || (!m.program_id ? programmes.find(p => p.meeting_type === type) : null);
      const category = p?.category || ({ bacenta: 'bacenta', workers_meeting: 'workers', acts_prayer: 'prayer', shemen_prayer: 'prayer', all_night_prayer: 'prayer' })[type] || 'other';
      return { id: String(m._id || m.id), kind: 'meeting', date: m.meeting_date, type, category,
        program_id: String(p?._id || p?.id || m.program_id || `type:${type}`), name: p?.name || label(type), status: m.status,
        register_known: m.status === 'completed' || Boolean(m.attendance_completed_at) || (!m.status && typeof m.attendance_count === 'number') };
    }),
  ];
}
export const developmentPresent = row => row.status ? row.status === 'present' : row.attended !== false && row.present !== false;
