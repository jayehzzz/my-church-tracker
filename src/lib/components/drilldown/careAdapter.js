import { reportingDays } from '$lib/utils/comparisonMetrics.js';
import { todayDate } from '$lib/utils/reportingMetrics.js';
import { recordId } from '$lib/utils/pastoralCare.js';

export const careMetricLabel = key => key === 'followUp' ? 'Interactions requiring follow-up' : 'Care interactions';
export function careContributions(visits, choice, today = todayDate()) {
  const bounds = choice.scopeBounds || choice.pointBounds || {};
  const startDate = bounds.startDate;
  const endDate = [bounds.endDate, today].filter(Boolean).sort()[0];
  const rows = visits.filter(visit => (!startDate || visit.visit_date >= startDate) && (!endDate || visit.visit_date <= endDate)
    && (choice.metricKey !== 'followUp' || Boolean(visit.follow_up_required)));
  const denominator = reportingDays({ startDate, endDate }, today);
  const total = rows.length;
  return { rows, total, denominator, displayed: choice.mode === 'average' ? denominator ? Math.round(total / denominator * 10) / 10 : null : total, startDate, endDate };
}
export function careRecordRows(visits) {
  return visits.map(visit => ({ id: recordId(visit), title: visit.person_visited_name || 'Unknown person', date: visit.visit_date,
    note: [visit.interaction_type, visit.purpose, visit.visited_by_name && `Led by ${visit.visited_by_name}`, visit.outcome, visit.follow_up_required && `Follow-up required${visit.follow_up_date ? ` · ${visit.follow_up_date}` : ''}`].filter(Boolean).join(' · ') }));
}
