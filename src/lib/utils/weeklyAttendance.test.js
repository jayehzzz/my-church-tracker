import { describe, expect, it } from 'vitest';
import { weeklyAttendanceStatus } from './weeklyAttendance.js';
const now = new Date('2026-10-28T12:00:00Z');
const person = { id: 'p', membership_date: '2026-09-01' };
const service = { id: 's', service_date: '2026-09-06', individuals: ['other'] };
const status = (p = person, s = service, history = [], commitments = []) => weeklyAttendanceStatus(p, s, history, commitments, now).state;
const promise = { person_id: 'p', gathering_type: 'sunday_service', gathering_date: service.service_date, response: 'yes', resolution: 'no_show' };
describe('Sunday register and promise states', () => {
  it('distinguishes ordinary absence, explicit no-show and actual attendance', () => {
    expect(status()).toBe('missed');
    expect(status(person, service, [], [promise])).toBe('no-show');
    expect(status(person, { ...service, individuals: ['p'] }, [], [promise])).toBe('present');
  });
  it('does not invent a broken promise from an absent, pending, cancelled or maybe response', () => {
    for (const row of [{ ...promise, resolution: 'pending' }, { ...promise, resolution: 'cancelled' }, { ...promise, response: 'maybe' }, { ...promise, person_id: 'other' }]) expect(status(person, service, [], [row])).toBe('missed');
  });
  it('does not label pre-membership Sundays or empty and future registers absent', () => {
    expect(status({ ...person, membership_date: '2026-09-13' })).toBe('not-expected');
    expect(status(person, { ...service, individuals: [] })).toBe('not-expected');
    expect(status(person, { ...service, service_date: '2026-11-01' })).toBe('not-expected');
    expect(status(person, { ...service, status: 'cancelled' })).toBe('not-expected');
  });
  it('uses historical attendance for imported people while leaving earlier Sundays untracked', () => {
    const imported = { id: 'p', created_at: '2026-10-01' };
    const first = { service_date: '2026-08-30', individuals: [{ _id: 'p' }] };
    expect(status(imported, service, [first, service])).toBe('missed');
    expect(status(imported, { ...service, service_date: '2026-08-23' }, [first, service])).toBe('not-expected');
  });
  it('keeps people with no usable tracking evidence unassessed', () => {
    expect(status({ id: 'p' })).toBe('not-expected');
    expect(status({ id: 'p', created_at: '2026-09-01' })).toBe('missed');
  });
});
