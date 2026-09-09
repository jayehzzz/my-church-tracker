import { describe, it, expect, vi } from 'vitest';
import { hasMapLocation, personAddress, recordedAttendance, profileRequest } from './peopleView.js';

describe('people view data', () => {
  it('accepts zero coordinates and excludes missing or invalid locations', () => {
    expect(hasMapLocation({ lat: 0, lng: 0 })).toBe(true);
    for (const person of [{}, { lat: 51, lng: null }, { lat: NaN, lng: 1 }, { lat: 91, lng: 1 }, { lat: 51, lng: 181 }, { lat: '51', lng: 0 }]) {
      expect(hasMapLocation(person)).toBe(false);
    }
    expect(personAddress({ address: '12 Road', city: 'Luton', zip_code: 'LU1' })).toBe('12 Road, Luton, LU1');
  });
  it('excludes future, cancelled, scheduled and absent attendance and sorts actuals', () => {
    const past = { services: { service_date: '2026-09-06' } };
    const latest = { meeting: { meeting_date: '2026-09-07', status: 'completed' } };
    const records = [past, latest,
      { services: { service_date: '2026-09-13' } },
      { services: { service_date: '2026-09-06', status: 'cancelled' } },
      { meeting: { meeting_date: '2026-09-07', status: 'scheduled' } },
      { ...past, present: false }, {},
    ];
    expect(recordedAttendance(records, new Date('2026-09-08T12:00:00'))).toEqual([latest, past]);
  });
  it('preserves successful empty data but propagates request failure', async () => {
    await expect(profileRequest(Promise.resolve({ data: [] }))).resolves.toEqual([]);
    await expect(profileRequest(Promise.resolve({ data: null, error: new Error('Unavailable') }))).rejects.toThrow('Unavailable');
    await expect(profileRequest(Promise.reject(new Error('Offline')))).rejects.toThrow('Offline');
  });
  it('rejects a timeout instead of returning invented history', async () => {
    vi.useFakeTimers();
    try {
      const assertion = expect(profileRequest(new Promise(() => {}), 50)).rejects.toThrow('timed out');
      await vi.advanceTimersByTimeAsync(50);
      await assertion;
    } finally { vi.useRealTimers(); }
  });
});
