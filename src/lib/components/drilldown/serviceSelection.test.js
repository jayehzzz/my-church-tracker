import { describe, expect, it } from 'vitest';
import { createChoice, createSelection } from './selection.js';
import { bindServiceSources, periodServiceSelection } from './serviceSelection.js';
import { selectServiceContributions } from './serviceAdapter.js';

const records = [
  { id: 's1', service_date: '2026-09-06', total_attendance: 41, guests_count: 2 },
  { id: 's2', service_date: '2026-09-13', total_attendance: 42, guests_count: 1 },
  { id: 's3', service_date: '2026-08-30', total_attendance: 5 }
];
describe('page to drilldown service wiring', () => {
  it('KPI callback retains exact Sunday sources and rounds the displayed average', () => {
    const selected = periodServiceSelection('total', records.slice(0, 2), { mode: 'average', range: { startDate: '2026-09-01', endDate: '2026-09-30' } });
    expect(selected.choices[0].sourceIds).toEqual(['s1', 's2']);
    const result = selectServiceContributions(records, selected.choices[0]);
    expect(result.rows.map(row => row.service.id)).toEqual(['s1', 's2']);
    expect(result.total).toBe(83);
    expect(Math.round(result.displayed)).toBe(42);
  });
  it('MetricComparison callback binds the current filtered cohort even though its choice has no point IDs', () => {
    const selection = createSelection([createChoice({ domain: 'service', metricKey: 'guests', role: 'B', mode: 'total', point: { date: '2026-09-01' } })], 'B');
    const bound = bindServiceSources(selection, records.slice(0, 2));
    expect(selectServiceContributions(records, bound.choices[0]).rows.map(row => row.service.id)).toEqual(['s1', 's2']);
    expect(selectServiceContributions(records, bound.choices[0]).total).toBe(3);
  });
});
