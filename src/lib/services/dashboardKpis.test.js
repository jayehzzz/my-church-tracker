import { expect, it, vi } from 'vitest';
import { getDashboardKPIs } from './dashboardService.js';
import { getJourneyOverview } from './followUpCrmService.js';
vi.mock('./followUpCrmService.js', () => ({ getJourneyOverview: vi.fn() }));
vi.mock('./peopleService.js', () => ({ getAll: async () => ({ data: [] }), getByStatus: async () => ({ data: [] }) }));
vi.mock('./attendanceService.js', () => ({ getAll: async () => ({ data: [] }) }));
vi.mock('./servicesService.js', () => ({ getByDateRange: async start => ({ data: start === '2026-09-01' ? [
  { id: 'sun', service_type: 'sunday_service', service_date: '2026-09-06', total_attendance: 8, guests_count: 4 },
  { id: 'special', service_type: 'special_service', service_date: '2026-09-13', total_attendance: 10, guests_count: 5 },
] : [{ id: 'prior', service_type: 'special_service', service_date: '2026-08-16', total_attendance: 3, guests_count: 1 }] }) }));
it('counts distinct first-timer people across all service types, excludes returners, and uses the same list for drilldown', async () => {
  getJourneyOverview.mockResolvedValue({ data: { first_timers: [
    { person: { id: 'first' }, events: [{ id: 'sun', date: '2026-09-06' }] },
    { person: { id: 'special-first' }, events: [{ id: 'special', date: '2026-09-13', label: 'special service' }] },
    { person: { id: 'prior-first' }, events: [{ id: 'prior', date: '2026-08-16' }] },
  ] } });
  const result = await getDashboardKPIs({ startDate: '2026-09-01', endDate: '2026-09-30' });
  expect(result.kpis.find(kpi => kpi.id === 'firstTimers')).toMatchObject({ title: 'First timers', value: 2, trend: 100 });
  expect(result.kpis.some(kpi => kpi.id === 'guests')).toBe(false);
  expect(result.sources.firstTimerPeople.map(row => row.person.id)).toEqual(['first', 'special-first']);
});
it('reports unavailable first-timer records instead of displaying a false zero', async () => {
  getJourneyOverview.mockResolvedValue({ error: new Error('First timer records unavailable') });
  await expect(getDashboardKPIs({ startDate: '2026-09-01', endDate: '2026-09-30' })).rejects.toThrow('First timer records unavailable');
});
