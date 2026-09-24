import { expect, it } from 'vitest';
import { serviceHref, meetingHref, personHref, careHref, contactHref } from './recordHrefs.js';

it('encodes exact record IDs and never links an absent ID', () => {
  expect(serviceHref('s/1')).toBe('/services?service=s%2F1');
  expect(meetingHref('m/1')).toBe('/meetings?meeting=m%2F1');
  expect(personHref('p/1')).toBe('/people/p%2F1');
  expect(careHref('c/1')).toBe('/visitation?care=c%2F1');
  expect(contactHref('o/1')).toBe('/evangelism?contact=o%2F1');
  expect(serviceHref(null)).toBeNull();
});
