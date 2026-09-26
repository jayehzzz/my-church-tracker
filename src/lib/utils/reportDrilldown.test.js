import { describe, it, expect } from 'vitest';
import { reportMetricGroups, reportDisplayRow } from './reportDrilldown.js';
import { buildReportSummary } from './reportingMetrics.js';

const metric = (groups, key) => Object.values(groups).flat().find(row => row.key === key);
const now = new Date(2026, 8, 24);

describe('report source reconciliation', () => {
  it('uses full outreach and care cohorts for open-ended monthly averages, including zero months', () => {
    const sources = {
      contacts: [
        { id: 'early', contact_date: '2026-07-08', member_status: 'guest' },
        { id: 'joined', contact_date: '2026-09-03', member_status: 'leader', outreach_salvation_decision: true },
      ],
      visitations: [
        { id: 'failed', visit_date: '2026-07-09', status: 'cancelled' },
        { id: 'done', visit_date: '2026-09-10', status: 'completed' },
      ],
    };
    const groups = reportMetricGroups(sources, {}, now);
    for (const key of ['joinedChurch', 'outreachDecisions', 'careCompleted']) {
      const result = metric(groups, key);
      expect(result.total).toBe(1);
      expect(result.denominator).toBe(3);
      expect(result.average).toBe(0.3);
      expect(result.months.map(row => row.total)).toEqual([0, 0, 1]);
    }
  });

  it('reconciles each group and does not fabricate averages or people from roles', () => {
    const sources = {
      people: [
        { id: 'one', member_status: 'leader', role: 'bacenta_leader', church_role: 'basonta' },
        { id: 'old', member_status: 'archived', role: 'bacenta_leader' },
      ],
      contacts: [{ id: 'legacy', contact_date: '2026-09-01', converted: true }],
      services: [
        { id: 's1', service_date: '2026-09-06', total_attendance: 31, salvation_decisions: 2 },
        { id: 's2', service_date: '2026-09-13', total_attendance: 0 },
        { id: 'cancelled', service_date: '2026-09-20', status: 'cancelled', total_attendance: 100 },
      ],
      meetings: [
        { id: 'm1', meeting_date: '2026-09-04', status: 'completed', category: 'prayer', duration_minutes: 20, total_attendance: 7 },
        { id: 'future', meeting_date: '2026-10-04', status: 'completed', category: 'prayer', duration_minutes: 60 },
      ],
      visitations: [
        { id: 'v1', visit_date: '2026-09-02', status: 'completed', follow_up_required: true, next_task: { status: 'open' } },
        { id: 'v2', visit_date: '2026-09-03', status: 'cancelled', follow_up_required: true, next_task: { status: 'closed' } },
      ],
    };
    const groups = reportMetricGroups(sources, { startDate: '2026-09-01', endDate: '2026-09-30' }, now);
    const summary = buildReportSummary({ ...sources, services: sources.services.slice(0, 2), meetings: sources.meetings.slice(0, 1), visitations: sources.visitations });
    expect(metric(groups, 'totalPeople').total).toBe(summary.totalPeople);
    expect(metric(groups, 'members').sourceIds).toEqual(['one']);
    expect(metric(groups, 'bacentaLeaders').sourceIds).toEqual(['one']);
    expect(metric(groups, 'members').denominator).toBeUndefined();
    expect(metric(groups, 'joinedChurch').total).toBe(summary.joinedChurch);
    expect(metric(groups, 'attendance').rows.map(row => row.id)).toEqual(['s1', 's2']);
    expect(metric(groups, 'attendance').total).toBe(summary.totalAttendance);
    expect(metric(groups, 'attendance').average).toBe(15.5);
    expect(metric(groups, 'decisions').total).toBe(summary.salvationDecisions);
    expect(metric(groups, 'meetingAttendance').total).toBe(7);
    expect(metric(groups, 'prayerHours').total).toBeCloseTo(1 / 3);
    expect(reportDisplayRow(metric(groups, 'prayerHours'), sources.meetings[0]).contribution).toBe('0.3 hours (20 minutes)');
    expect(metric(groups, 'careCompleted').total).toBe(summary.visitsCompleted);
    expect(metric(groups, 'followUps').total).toBe(summary.followUpsNeeded);
    const empty = reportMetricGroups({}, { startDate: '2026-11-01', endDate: '2026-11-30' }, now);
    expect(metric(empty, 'attendance').average).toBeNull();
    expect(metric(empty, 'joinedChurch').average).toBeNull();
  });
});
