import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getAttendanceChartData } from './dashboardService.js';
import * as services from './servicesService.js';
vi.mock('./servicesService.js', () => ({ getByDateRange: vi.fn(), getAll: vi.fn() }));
vi.mock('./attendanceService.js', () => ({ getAll: vi.fn(async () => ({ data: [] })) }));
vi.mock('./peopleService.js', () => ({ getAll: vi.fn(async () => ({ data: [] })) }));
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-28T12:00:00Z')); vi.clearAllMocks(); });
afterEach(() => vi.useRealTimers());
const range = { startDate: '2026-09-01', endDate: '2026-09-30', label: 'September' };
it('includes Sunday and weekday special services, Easter, Christmas and midweek records', async () => {
  const rows = ['sunday_service', 'special_service', 'easter_service', 'christmas_service', 'midweek_service'].map((service_type, index) => ({ id: String(index), service_type, service_date: '2026-09-16', total_attendance: 10 + index }));
  services.getByDateRange.mockResolvedValue({ data: [...rows, { id: 'future', service_type: 'special_service', service_date: '2026-11-01', total_attendance: 50 }] });
  const result = await getAttendanceChartData(range);
  expect(result.data.map(point => point.id)).toEqual(rows.map(row => row.id));
  expect(result.data[1].attendance).toBe(11);
  expect(result.data[1].service).toEqual(rows[1]);
  expect(services.getAll).not.toHaveBeenCalled();
});
it('keeps a period containing only a special service instead of falling back to old Sundays', async () => {
  services.getByDateRange.mockResolvedValue({ data: [{ id: 'special', service_type: 'special_service', service_date: '2026-09-16', total_attendance: 20, guests_count: 3 }] });
  const result = await getAttendanceChartData(range);
  expect(result.isFallback).toBe(false);
  expect(result.contextLabel).toBe('September');
  expect(result.data[0]).toMatchObject({ id: 'special', attendance: 20, guests: 3 });
  expect(services.getAll).not.toHaveBeenCalled();
});
it('labels fallback services honestly and retains their original IDs', async () => {
  services.getByDateRange.mockResolvedValue({ data: [] });
  services.getAll.mockResolvedValue({ data: [{ id: 'special', service_type: 'special_service', service_date: '2026-08-05', total_attendance: 9 }] });
  const result = await getAttendanceChartData(range);
  expect(result.contextLabel).toContain('completed services · no service in selected period');
  expect(result.isFallback).toBe(true);
  expect(result.data[0].id).toBe('special');
});
