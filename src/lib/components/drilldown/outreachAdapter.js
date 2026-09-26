import { completeMonthlySeries, roundedAverage } from '$lib/utils/comparisonMetrics.js';
import { contactId, hasFirstAttended, hasJoinedChurch, isOutreachSalvation, monthlyOutreach } from '$lib/utils/evangelismView.js';

export const outreachMetricLabel = key => ({ count: 'Contacts reached', saved: 'Saved on outreach', visited: 'First timers', joined: 'Joined church' })[key] || 'Outreach';
const qualifies = (row, key) => key === 'saved' ? isOutreachSalvation(row) : key === 'visited' ? hasFirstAttended(row) : key === 'joined' ? hasJoinedChurch(row) : true;
const inBounds = (date, bounds) => Boolean(date) && (!bounds?.startDate || date >= bounds.startDate) && (!bounds?.endDate || date <= bounds.endDate);

export function outreachContributions(rows, choice) {
  const point = choice.pointBounds;
  const scope = choice.mode === 'average' ? choice.scopeBounds : point;
  const cohort = rows.filter(row => inBounds(row.contact_date, scope));
  const matches = cohort.filter(row => qualifies(row, choice.metricKey));
  const monthRows = monthlyOutreach(cohort, Infinity);
  const months = completeMonthlySeries(monthRows, scope);
  const total = matches.length;
  const denominator = months.length;
  return {
    matches,
    months: months.map(month => ({ ...month, key: `${month.year}-${String(month.month).padStart(2, '0')}` })),
    total,
    denominator,
    displayed: choice.mode === 'average' ? roundedAverage(total, denominator) : total,
    clickedMonth: point?.startDate?.slice(0, 7),
    scope,
  };
}

export function inviterMatches(rows, inviterId) {
  return rows.filter(row => [...new Set((Array.isArray(row.inviter_ids) && row.inviter_ids.length ? row.inviter_ids : [row.invited_by_id]).filter(Boolean).map(String))].includes(String(inviterId)));
}

export function outreachOutcomeNote(row, key) {
  if (key === 'saved') return `Saved on outreach${row.outreach_salvation_date ? ` · ${row.outreach_salvation_date}` : ''}`;
  if (key === 'visited') return `First attendance${row.first_visit_date ? ` · ${row.first_visit_date}` : ''}`;
  if (key === 'joined') return `Current church status: ${row.member_status || 'member'}`;
  return `Reached by ${row.reached_by_name || 'not recorded'} · assigned to ${row.assigned_worker_name || 'unassigned'} · ${row.follow_up_label || 'No next action'}`;
}

export function outreachRecordRows(rows, key) {
  return rows.map(row => ({ id: contactId(row), title: row.full_name || [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Unknown person', date: row.contact_date, note: outreachOutcomeNote(row, key) }));
}
