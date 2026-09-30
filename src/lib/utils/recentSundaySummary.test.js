import { describe, expect, it } from 'vitest';
import { recentSundaySummary } from './recentSundaySummary.js';

describe('recentSundaySummary', () => {
  it('counts distinct recorded visits within the latest six completed Sundays', () => {
    const services = Array.from({ length: 8 }, (_, index) => ({ id: `s${index}`, service_type: 'sunday_service', service_date: `2026-08-${String(index + 1).padStart(2, '0')}` }));
    services.push({ id: 'future', service_type: 'sunday_service', service_date: '2026-10-01' });
    expect(recentSundaySummary(services, [{ service_id: 's7' }, { service_id: 's7' }, { service_id: 's0' }, { service_id: 'future' }], new Date('2026-09-01T12:00:00')))
      .toBe('1 recorded Sunday visit in the last 6 past services.');
  });

  it('keeps unavailable data distinct from zero recorded visits', () => {
    expect(recentSundaySummary(null, [])).toContain('unavailable');
    expect(recentSundaySummary([{ id: 's', service_type: 'sunday_service', service_date: '2026-08-01' }], [], new Date('2026-09-01T12:00:00')))
      .toBe('0 recorded Sunday visits in the last 1 past service.');
  });
});
