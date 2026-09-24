import { describe, expect, it } from 'vitest';
import { reportExportRows, reportExportTypes } from './reportExports.js';
import { dataToCSV } from './exportUtils.js';

const range = { startDate: '2026-09-01', endDate: '2026-09-30' };
const settings = (overrides = {}) => ({ dateMode: 'period', personId: '', personRelation: 'self', values: {}, ...overrides });

describe('CSV report selection', () => {
    it('filters the current directory by status and a chosen milestone date', () => {
        const sources = { people: [
            { id: 'a', member_status: 'member', membership_date: '2026-09-01' },
            { id: 'b', member_status: 'member', membership_date: '2026-08-31' },
            { id: 'c', member_status: 'guest', membership_date: '2026-09-02' },
        ] };
        expect(reportExportRows('people', sources, settings({ peopleDateField: 'membership_date', values: { people_group: 'church_members' } }), range)).toEqual([sources.people[0]]);
        expect(reportExportRows('people', sources, settings(), range)).toHaveLength(3);
    });

    it('treats members and leaders as church members while keeping quick groups distinct', () => {
        const sources = { people: [
            { id: 'm', member_status: 'member', role: 'no_role' },
            { id: 'l', member_status: 'leader', role: 'bacenta_leader' },
            { id: 'g', member_status: 'guest' },
            { id: 'v', member_status: 'visitor' },
            { id: 'c', member_status: 'contact' },
            { id: 'a', member_status: 'archived' },
        ] };
        const group = (people_group) => reportExportRows('people', sources, settings({ values: { people_group } }), range).map(({ id }) => id);
        expect(group('church_members')).toEqual(['m', 'l']);
        expect(group('member')).toEqual(['m']);
        expect(group('leader')).toEqual(['l']);
        expect(group('guest')).toEqual(['g', 'v']);
        expect(group('contact')).toEqual(['c']);
        expect(group('archived')).toEqual(['a']);
        expect(reportExportRows('people', sources, settings({ values: { people_group: 'church_members', role: 'no_role' } }), range).map(({ id }) => id)).toEqual(['m']);
    });

    it('selects an outreach contact by credited collector and keeps its own journey', () => {
        const sources = { contacts: [
            { id: 'c1', contact_date: '2026-09-30', inviter_ids: ['p1'], response: 'responsive', member_status: 'member' },
            { id: 'c2', contact_date: '2026-09-30', inviter_ids: ['p2'], response: 'responsive', member_status: 'guest' },
        ] };
        expect(reportExportRows('contacts', sources, settings({ personId: 'p1', personRelation: 'credited', values: { response: 'responsive' } }), range)).toEqual([sources.contacts[0]]);
        expect(reportExportRows('contacts', sources, settings({ values: { people_group: 'church_members' } }), range)).toEqual([sources.contacts[0]]);
    });

    it('uses named attendance to select a gathering while retaining whole-gathering counts', () => {
        const sources = { services: [
            { id: 's1', service_date: '2026-09-01', service_type: 'sunday_service', individuals: [{ _id: 'p1' }], total_attendance: 20 },
            { id: 's2', service_date: '2026-09-02', service_type: 'special_service', individuals: [{ _id: 'p2' }], total_attendance: 5 },
        ], meetings: [
            { id: 'm1', meeting_date: '2026-09-01', status: 'completed', attendee_ids: ['p1'], total_attendance: 10 },
            { id: 'm2', meeting_date: '2026-09-02', status: 'scheduled', attendee_ids: ['p1'], total_attendance: 0 },
        ] };
        expect(reportExportRows('services', sources, settings({ personId: 'p1', personRelation: 'attendee' }), range)).toEqual([sources.services[0]]);
        expect(reportExportRows('meetings', sources, settings({ personId: 'p1', personRelation: 'attendee' }), range)).toEqual([sources.meetings[0]]);
        expect(reportExportRows('meetings', sources, settings({ dateMode: 'all', personId: 'p1', personRelation: 'attendee' }), range)).toHaveLength(2);
        expect(dataToCSV([sources.services[0]], reportExportTypes.services.columns.filter((column) => column.key === 'total_attendance'))).toContain('20');
    });

    it('filters care by provider, type, status and follow-up flag', () => {
        const sources = { care: [
            { id: 'v1', visit_date: '2026-09-05', person_id: 'p1', visited_by_id: 'leader', interaction_type: 'phone_call', status: 'completed', follow_up_required: true },
            { id: 'v2', visit_date: '2026-09-06', person_id: 'p2', visited_by_id: 'leader', interaction_type: 'home_visit', status: 'cancelled', follow_up_required: false },
        ] };
        expect(reportExportRows('care', sources, settings({ personId: 'leader', personRelation: 'visitor', values: { interaction_type: 'phone_call', follow_up_required: 'true' } }), range)).toEqual([sources.care[0]]);
    });
});
