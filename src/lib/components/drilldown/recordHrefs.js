// Exact-record routes are only returned where the target page currently
// consumes an ID. Other domains stay in the shared dialog until adapters land.
const id = value => value == null || value === '' ? null : encodeURIComponent(String(value));
export const serviceHref = value => id(value) && `/services?service=${id(value)}`;
export const personHref = value => id(value) && `/people/${id(value)}`;
export const meetingHref = value => id(value) && `/meetings?meeting=${id(value)}`;
export const careHref = value => id(value) && `/visitation?care=${id(value)}`;
export const contactHref = value => id(value) && `/evangelism?contact=${id(value)}`;
