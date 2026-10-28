import { writable } from 'svelte/store';
// Public attendee details only; no real session or giving permission.
export const session = writable({ status: 'authenticated', user: { role: 'owner', canViewGiving: false } });
