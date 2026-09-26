import { describe, it, expect } from 'vitest';
import { memoryRecordLink } from './memoryRecordLink.js';

describe('memory gathering links', () => {
  it('uses explicit service and meeting IDs with exact encoded destinations', () => {
    expect(memoryRecordLink({ sourceType: 'service', sourceId: 'a/b' })).toEqual({ href: '/services?service=a%2Fb', label: 'View service' });
    expect(memoryRecordLink({ sourceType: 'album', meetingId: 'm&2' })).toEqual({ href: '/meetings?meeting=m%262', label: 'View meeting' });
    expect(memoryRecordLink({ recordHref: '/services', sourceType: 'album' })).toBeNull();
  });
});
