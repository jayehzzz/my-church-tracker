import { serviceHref, meetingHref } from '$lib/components/drilldown/recordHrefs.js';

/** Only explicit source fields establish a gathering link. */
export function memoryRecordLink(album) {
  const serviceId = album?.serviceId || (album?.sourceType === 'service' ? album.sourceId : null);
  if (serviceId) return { href: serviceHref(serviceId), label: 'View service' };
  if (album?.meetingId) return { href: meetingHref(album.meetingId), label: 'View meeting' };
  return null;
}
