import { completeMonthlySeries, roundedAverage } from './comparisonMetrics.js';
import { buildPeopleJourneySummary, hasJoinedChurch, hasOpenCareFollowUp, hasOutreachSalvation, isCompletedService, isHeldMeeting, isPrayerMeeting, isSuccessfulCare, isWithinReportingRange, meetingAttendance } from './reportingMetrics.js';

const id = row => String(row?.id ?? row?._id ?? '');
const name = row => row?.full_name || [row?.first_name, row?.last_name].filter(Boolean).join(' ') || 'Name unavailable';
const number = value => Number(value) || 0;
const within = (rows, field, range) => rows.filter(row => isWithinReportingRange(row[field], range));

/** Report-specific definitions are retained here: service attendance uses the stored raw total,
 * outreach membership includes legacy conversion evidence, and open care tasks use the report predicate.
 * The same selected rows and contribution accessor drive headline, average, and dialog evidence. */
export function reportMetricGroups({ people = [], contacts = [], services = [], meetings = [], visitations = [] } = {}, range = {}, now = new Date()) {
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  const effectiveRange = { ...range, endDate: [range.endDate, today].filter(Boolean).sort()[0] };
  const active = people.filter(row => row.member_status !== 'archived');
  const outreach = within(contacts, 'contact_date', effectiveRange);
  const sunday = within(services, 'service_date', effectiveRange).filter(row => isCompletedService(row, now));
  const held = within(meetings, 'meeting_date', effectiveRange).filter(row => isHeldMeeting(row, now));
  const care = within(visitations, 'visit_date', effectiveRange);
  const make = (domain, key, label, rows, dateField, contribution = () => 1, averageType = null, note = '', scopeRows = rows) => {
    const total = key === 'prayerHours' ? rows.reduce((sum, row) => sum + number(row.duration_minutes), 0) / 60 : rows.reduce((sum, row) => sum + contribution(row), 0);
    // With an open start, use the first date in the full domain cohort, like reportingMonths.
    const monthRows = averageType === 'month' ? completeMonthlySeries([], { ...effectiveRange, startDate: range.startDate || scopeRows.map(row => row[dateField]).filter(Boolean).sort()[0], endDate: range.endDate || scopeRows.map(row => row[dateField]).filter(Boolean).sort().at(-1) }, [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')) : [];
    const denominator = averageType === 'month' ? monthRows.length : averageType === 'gathering' ? rows.length : undefined;
    const metric = { domain, key, label, rows, dateField, contribution, total, denominator,
      averageLabel: averageType === 'month' ? 'Average per calendar month' : averageType === 'gathering' ? `Average per ${domain === 'services' ? 'service' : 'held meeting'}` : undefined,
      periodLabel: domain === 'people' ? 'Current people snapshot' : undefined, note,
      months: monthRows.map(month => ({ key: `${month.year}-${String(month.month).padStart(2, '0')}`, total: rows.filter(row => String(row[dateField] || '').startsWith(`${month.year}-${String(month.month).padStart(2, '0')}`)).reduce((sum, row) => sum + contribution(row), 0) })) };
    metric.average = roundedAverage(total, denominator);
    metric.displayTotal = key === 'prayerHours' ? Math.round(total * 10) / 10 : total;
    metric.sourceIds = rows.map(id).filter(Boolean);
    return metric;
  };
  const journey = buildPeopleJourneySummary(active);
  const peopleGroups = [
    ['outreachContacts', 'Outreach contacts', row => row.member_status === 'contact'],
    ['guests', 'Non-members', row => ['guest', 'visitor'].includes(row.member_status)],
    ['members', 'Members', row => ['member', 'leader'].includes(row.member_status)],
    ['bacentaLeaders', 'Bacenta leaders', row => row.role === 'bacenta_leader'],
    ['basontaLeaders', 'Basonta leaders', row => row.role === 'basonta_leader'],
    ['basontaMembers', 'Basonta members', row => row.church_role === 'basonta'],
  ].map(([key, label, match]) => make('people', key, label, active.filter(match), null));
  // Keep journey reconciliation explicit while permitting overlapping role lists.
  for (const metric of peopleGroups) if (metric.total !== journey[metric.key]) throw new Error(`Report people mismatch: ${metric.key}`);
  return {
    people: [make('people', 'totalPeople', 'Total people', active, null), ...peopleGroups],
    evangelism: [
      make('evangelism', 'newContacts', 'People reached', outreach, 'contact_date', undefined, 'month'),
      make('evangelism', 'joinedChurch', 'Reached people who joined', outreach.filter(hasJoinedChurch), 'contact_date', undefined, 'month', '', outreach),
      make('evangelism', 'outreachDecisions', 'Outreach salvation decisions', outreach.filter(hasOutreachSalvation), 'contact_date', undefined, 'month', '', outreach),
      ...[['responsive','Responsive'],['has_church','Has Church'],['non_responsive','Non-Responsive']].map(([key,label]) => make('evangelism', key, label, outreach.filter(row => row.response === key), 'contact_date')),
    ],
    services: [
      make('services', 'attendance', 'Sunday attendance', sunday, 'service_date', row => number(row.total_attendance), 'gathering', 'Stored service total attendance; individual named people may be fewer than this count.'),
      make('services', 'nonMemberAttendance', 'Non-member attendance', sunday, 'service_date', row => number(row.guests_count)),
      make('services', 'decisions', 'Sunday salvation decisions', sunday, 'service_date', row => number(row.salvation_decisions), 'gathering'),
    ],
    meetings: [
      make('meetings', 'meetingAttendance', 'Meeting attendance', held, 'meeting_date', meetingAttendance, 'gathering'),
      make('meetings', 'leadersAttended', 'Leaders attended', held, 'meeting_date', row => number(row.leaders_count)),
      make('meetings', 'prayerHours', 'Prayer hours', held.filter(isPrayerMeeting), 'meeting_date', row => number(row.duration_minutes) / 60, null, 'Held prayer meeting durations; displayed hours are rounded to one decimal place.'),
    ],
    visitation: [
      make('visitation', 'careCompleted', 'Completed care', care.filter(isSuccessfulCare), 'visit_date', undefined, 'month', '', care),
      make('visitation', 'welcomed', 'Welcomed', care.filter(row => row.outcome === 'welcomed_encouraged'), 'visit_date'),
      make('visitation', 'prayerRequests', 'Prayer requests', care.filter(row => row.outcome === 'prayer_request_received'), 'visit_date'),
      make('visitation', 'followUps', 'Outstanding follow-ups', care.filter(hasOpenCareFollowUp), 'visit_date'),
    ],
  };
}

export function reportDisplayRow(metric, row) {
  const domain = metric.domain;
  return { id: id(row), title: domain === 'people' || domain === 'evangelism' ? name(row) : domain === 'services' ? row.sermon_topic || row.title || 'Service' : domain === 'meetings' ? row.program?.name || row.title || row.meeting_type || 'Meeting' : `Care for ${row.person_visited_name || 'person'}`,
    date: metric.dateField ? row[metric.dateField] : null,
    contribution: metric.key === 'prayerHours' ? `${(number(row.duration_minutes) / 60).toFixed(1)} hours (${number(row.duration_minutes)} minutes)` : metric.contribution(row),
    note: domain === 'services' && metric.key === 'attendance' ? 'Stored attendance total' : domain === 'meetings' && metric.key === 'prayerHours' ? `${number(row.duration_minutes)} minutes` : undefined,
    personId: domain === 'people' ? id(row) : domain === 'evangelism' ? row.person_id : domain === 'visitation' ? row.person_id : null };
}
