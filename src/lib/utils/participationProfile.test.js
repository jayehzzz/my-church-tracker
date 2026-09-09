import { describe, it, expect } from 'vitest';
import { buildParticipationProfile, participationPeriod, isChurchWorker } from './participationProfile.js';
const now = new Date('2026-09-08T12:00:00');
const service = (date, extra = {}) => ({ services: { service_date: date, service_type: 'sunday_service' }, ...extra });
const meeting = (date, type, extra = {}) => ({ meeting: { meeting_date: date, meeting_type: type, status: 'completed' }, ...extra });

describe('participation evidence', () => {
  it('uses complete Monday–Sunday weeks and counts repeated attendance in a week once', () => {
    expect(participationPeriod(now, 12)).toEqual({ start: '2026-06-15', end: '2026-09-06', weeks: 12 });
    const profile = buildParticipationProfile({ now, attendance: [service('2026-09-06'), service('2026-09-06'), service('2026-08-30'), service('2026-09-13'), meeting('2026-09-08', 'bacenta'), meeting('2026-09-01', 'bacenta', { attended: false }), meeting('2026-09-01', 'bacenta', { status: 'excused' })] });
    expect(profile.axes[0]).toMatchObject({ weeks: 2, events: 3 });
    expect(profile.axes[2]).toMatchObject({ weeks: 0, events: 0 });
  });
  it('uses prayer categories and keeps meetings, invitations and explicit giving distinct', () => {
    const profile = buildParticipationProfile({ now, person: { is_tither: true }, attendance: [
      meeting('2026-09-03', 'acts_prayer'), meeting('2026-09-01', 'bacenta'),
      meeting('2026-08-30', 'workers_meeting'), service('2026-09-06', { gave_tithe: true }),
      service('2026-08-02', { gave_tithe: true }), service('2026-08-09'),
    ], contacts: [{ id: 'one', contact_date: '2026-09-01' }, { id: 'one', contact_date: '2026-09-01' }, { id: 'undated' }, { id: 'future', contact_date: '2026-09-08' }] });
    expect(profile.axes.map(axis => axis.weeks)).toEqual([3, 1, 1, 1]);
    expect(profile.tithing).toEqual({ dates: ['2026-08-02', '2026-09-06'], months: 2 });
    expect(profile.invitations).toEqual({ people: 1, weeks: 1, undated: 1 });
    expect(buildParticipationProfile({ now, person: { is_tither: true } }).tithing.dates).toEqual([]);
  });
  it('represents unavailable evidence as unavailable, never zero', () => {
    const profile = buildParticipationProfile({ now, errors: { attendance: true, outreach: true } });
    expect(profile.axes.every(axis => axis.weeks === null)).toBe(true);
    expect(profile.tithing).toBeNull();
    expect(profile.invitations).toBeNull();
  });
  it('includes special Sunday services and excludes invalid contact dates', () => {
    const profile = buildParticipationProfile({ now, attendance: [
      { services: { service_date: '2026-08-30', service_type: 'special_service' } },
      { services: { service_date: '2026-08-29', service_type: 'special_service' } },
    ], contacts: [{ id: 'invalid', contact_date: '2026-06-31' }] });
    expect(profile.axes[0]).toMatchObject({ weeks: 1, events: 1, lastDate: '2026-08-30' });
    expect(profile.invitations).toEqual({ people: 0, weeks: 0, undated: 1 });
  });
  it('recognises workers without assigning membership or leadership', () => {
    expect(isChurchWorker({ member_status: 'member', basontas: ['worship'] })).toBe(true);
    expect(isChurchWorker({ member_status: 'member' })).toBe(false);
    expect(isChurchWorker({ member_status: 'archived', role: 'bacenta_leader' })).toBe(false);
  });
});
