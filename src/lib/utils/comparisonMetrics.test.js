import { describe, expect, it } from 'vitest';
import { completeMonthlySeries, reportingDays, reportingMonths, roundedAverage } from './comparisonMetrics.js';

describe('comparison denominators', () => {
  it('includes empty months and excludes future months, including partial boundaries', () => {
    const range={startDate:'2026-07-12',endDate:'2026-12-31'};
    const rows=completeMonthlySeries([{year:2026,month:'7',count:31}],range,'2026-09-20');
    expect(rows.map(row=>row.count)).toEqual([31,0,0]);
    expect(roundedAverage(31,rows.length)).toBe(10.3);
    expect(reportingMonths(range,[],'2026-09-20')).toBe(3);
  });
  it('does not invent a denominator for an empty all-time view or future range', () => {
    expect(reportingMonths({},[],'2026-09-20')).toBe(0);
    expect(reportingDays({startDate:'2026-10-01'},'2026-09-20')).toBe(0);
    expect(roundedAverage(0,0)).toBeNull();
    expect(roundedAverage(null,12)).toBeNull();
  });
  it('counts calendar days across daylight-saving changes and clips at today', () => {
    expect(reportingDays({startDate:'2026-03-28',endDate:'2026-03-30'},'2026-04-01')).toBe(3);
    expect(reportingDays({startDate:'2026-09-10',endDate:'2026-09-30'},'2026-09-20')).toBe(11);
    expect(reportingMonths({},['2025-12-31','2026-02-01'],'2026-09-20')).toBe(3);
  });
});
