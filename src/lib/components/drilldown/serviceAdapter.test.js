import { describe, expect, it } from 'vitest';
import { selectServiceContributions, namedServicePeople } from './serviceAdapter.js';

const services = [
  { id: 'a', service_date: '2026-09-06', service_type: 'sunday_service', total_attendance: 10, guests_count: 2, individuals: ['p'] },
  { id: 'b', service_date: '2026-09-06', service_type: 'sunday_service', total_attendance: 20, guests_count: 1, individuals: ['p'] },
  { id: 'c', service_date: '2026-09-13', service_type: 'sunday_service', total_attendance: 60, guests_count: 0 }
];
const attendance = [{ service_id: 'a', person_id: 'p', first_timer: true }];
const people = [{ id: 'p', first_name: 'Ada', member_status: 'member' }];

describe('service contribution selection', () => {
  it('keeps two services on the same date and computes the average from raw attendance', () => {
    const result = selectServiceContributions(services, { metricKey: 'total', mode: 'average', sourceIds: ['a', 'b'] }, attendance, people);
    expect(result.rows.map(row => row.service.id)).toEqual(['a', 'b']);
    expect(result.total).toBe(30);
    expect(result.displayed).toBe(15);
  });
  it('uses historical first-timer rows even for a current member and keeps unnamed visits unnamed', () => {
    const first = selectServiceContributions(services, { metricKey: 'firstTimers', mode: 'total', sourceIds: ['a', 'b'] }, attendance, people);
    expect(first.rows.map(row => row.contribution)).toEqual([1, 0]);
    expect(namedServicePeople(services[0], 'firstTimers', attendance, people).map(item => item.id)).toEqual(['p']);
    expect(namedServicePeople(services[0], 'guests', attendance, people)).toHaveLength(1);
    expect(namedServicePeople(services[0], 'tithers', attendance, people)).toHaveLength(0);
  });
  it('selects exact ids over a coincidentally matching date range', () => {
    const result = selectServiceContributions(services, { metricKey: 'total', mode: 'total', sourceIds: ['c'], pointBounds: { startDate: '2026-09-06', endDate: '2026-09-06' } });
    expect(result.rows.map(row => row.service.id)).toEqual(['c']);
    expect(selectServiceContributions(services, { metricKey: 'total', sourceIds: [] }).rows).toEqual([]);
  });
});
