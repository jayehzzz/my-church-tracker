import { isCompletedService, isHeldMeeting, isWithinReportingRange, meetingAttendance } from './reportingMetrics.js';
import { exportColumns, formatBooleanForExport, formatDateForExport } from './exportUtils.js';

const date = (key, label) => ({ key, label, format: formatDateForExport });
const yesNo = (key, label) => ({ key, label, format: (value) => value == null ? '' : formatBooleanForExport(value) });
const list = (key, label) => ({ key, label, format: (value) => Array.isArray(value) ? value.join(', ') : value });
const name = (person) => [person?.preferred_name || person?.first_name, person?.last_name].filter(Boolean).join(' ');
const peopleGroups = [
    { value: 'church_members', label: 'Church members (including leaders)' },
    { value: 'member', label: 'Members without leader status' },
    { value: 'leader', label: 'Leaders only' },
    { value: 'guest', label: 'Guests' },
    { value: 'contact', label: 'Outreach contacts' },
    { value: 'archived', label: 'Archived people' },
];

function matchesPeopleGroup(row, group) {
    const status = row.member_status === 'visitor' ? 'guest' : row.member_status;
    return group === 'church_members' ? status === 'member' || status === 'leader' : status === group;
}

export const reportExportTypes = {
    people: {
        label: 'People directory',
        description: 'One row per person, including contacts, guests, members, leaders and archived records. Current profile snapshot.',
        dateFields: [date('contact_date', 'First contact date'), date('first_visit_date', 'First visit date'), date('membership_date', 'Membership date')],
        filters: [{ key: 'people_group', label: 'People group', allLabel: 'All people', options: peopleGroups }, { key: 'role', label: 'Leadership role' }, { key: 'activity_status', label: 'Activity status' }],
        personRelations: [{ key: 'self', label: 'This person' }],
        columns: [
            ...exportColumns.people,
            { key: 'preferred_name', label: 'Preferred Name' },
            { key: 'address', label: 'Address' }, { key: 'city', label: 'City' }, { key: 'state', label: 'County / State' }, { key: 'zip_code', label: 'Postcode', type: 'text' },
            { key: 'birthday', label: 'Birthday (with year)' }, { key: 'birthday_month', label: 'Birthday Month' }, { key: 'birthday_day', label: 'Birthday Day' }, { key: 'age_band', label: 'Age Band' },
            { key: 'gender', label: 'Gender' }, { key: 'marital_status', label: 'Marital Status' }, { key: 'employment_status', label: 'Employment Status' }, { key: 'degree_status', label: 'Degree Status' },
            { key: 'role', label: 'Leadership Role' }, { key: 'church_role', label: 'Church Role' }, { key: 'activity_status', label: 'Activity Status' }, list('basontas', 'Basontas'),
            date('contact_date', 'First Contact Date'), date('first_visit_date', 'First Visit Date'), { key: 'entry_point', label: 'Entry Point' },
            yesNo('is_baptised', 'Baptised'), yesNo('is_tither', 'Tither'), list('completed_schools', 'Completed Schools'),
        ],
    },
    contacts: {
        label: 'Outreach contacts',
        description: 'One row per person with a recorded contact date or evangelism entry point; includes people who later joined.',
        dateField: 'contact_date', dateLabel: 'First contact date',
        filters: [{ key: 'people_group', label: 'People group', allLabel: 'All outreach contacts', options: peopleGroups }, { key: 'response', label: 'Response category' }, { key: 'pipeline_stage', label: 'Pipeline stage' }],
        personRelations: [{ key: 'self', label: 'Contact' }, { key: 'credited', label: 'Inviter or credited collector' }],
        columns: [
            ...exportColumns.evangelismContacts,
            { key: 'status', label: 'Journey Status' },
            { key: 'contact_method', label: 'Contact Method' }, { key: 'primary_inviter_name', label: 'Primary Inviter' }, list('collector_names', 'Credited Collectors'),
            { key: 'notes', label: 'Outreach Notes' },
            { key: 'pipeline_stage', label: 'Pipeline Stage' }, { key: 'warmth_score', label: 'Warmth Score' },
            { key: 'total_follow_ups', label: 'Follow-ups' }, date('last_follow_up_date', 'Last Follow-up Date'),
            { key: 'promises_made', label: 'Promises Made' }, { key: 'promises_kept', label: 'Promises Kept' },
            yesNo('is_paused', 'Follow-ups Paused'), { key: 'pause_reason', label: 'Pause Reason' }, date('resume_date', 'Resume Date'),
        ],
    },
    services: {
        label: 'Services',
        description: 'One row per service; attendance and decision counts are totals for the whole service.',
        dateField: 'service_date', dateLabel: 'Service date', actualOnly: isCompletedService,
        filters: [{ key: 'service_type', label: 'Service type' }],
        personRelations: [{ key: 'attendee', label: 'Named attendee' }],
        columns: [
            ...exportColumns.services,
            { key: 'service_time', label: 'Time' }, { key: 'location', label: 'Location' },
            { key: 'tithers_count', label: 'Tithers' }, { key: 'unnamed_attendance_count', label: 'Unnamed Attendance' },
            { key: 'unnamed_guests_count', label: 'Unnamed Guests' }, { key: 'unnamed_decisions_count', label: 'Unnamed Decisions' },
            { key: 'named_attendees', label: 'Named Attendees', format: (_, row) => (row.individuals || []).map(name).filter(Boolean).join(', ') },
            { key: 'notes', label: 'Notes' },
        ],
    },
    meetings: {
        label: 'Meetings',
        description: 'One row per meeting; attendance is the whole meeting total, including unnamed guests.',
        dateField: 'meeting_date', dateLabel: 'Meeting date', actualOnly: isHeldMeeting,
        filters: [{ key: 'meeting_type', label: 'Meeting type' }, { key: 'status', label: 'Recorded status' }, { key: 'format', label: 'Format' }],
        personRelations: [{ key: 'attendee', label: 'Named attendee' }, { key: 'leader', label: 'Programme leader' }],
        columns: [
            ...exportColumns.meetings.filter((column) => column.key !== 'attendance_count'),
            { key: 'attendance_count', label: 'Total Attendance', format: (_, row) => meetingAttendance(row) },
            { key: 'title', label: 'Title' }, { key: 'program_name', label: 'Programme', format: (_, row) => row.program?.name || '' },
            { key: 'start_time', label: 'Start Time' }, { key: 'end_time', label: 'End Time' }, { key: 'format', label: 'Format' },
            { key: 'status', label: 'Recorded Status' }, { key: 'unnamed_guests_count', label: 'Unnamed Guests' },
            { key: 'named_attendees', label: 'Named Attendees', format: (_, row) => (row.attendees || []).map((entry) => name(entry.person)).filter(Boolean).join(', ') },
            { key: 'notes', label: 'Notes' },
        ],
    },
    care: {
        label: 'Pastoral care',
        description: 'One row per care interaction, including completed, unsuccessful and cancelled records.',
        dateField: 'visit_date', dateLabel: 'Interaction date',
        filters: [{ key: 'interaction_type', label: 'Interaction type' }, { key: 'purpose', label: 'Purpose' }, { key: 'status', label: 'Recorded status' }, { key: 'follow_up_required', label: 'Follow-up required', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] }],
        personRelations: [{ key: 'subject', label: 'Person cared for' }, { key: 'visitor', label: 'Care provider' }],
        columns: [
            ...exportColumns.visitations,
            { key: 'status', label: 'Recorded Status' }, { key: 'interaction_type', label: 'Interaction Type' }, { key: 'purpose', label: 'Purpose' },
        ],
    },
};

export function reportExportRows(type, sources, settings, range) {
    const config = reportExportTypes[type];
    if (!config) return [];
    const rows = sources[type] || [];
    return rows.filter((row) => {
        if (settings.dateMode === 'period') {
            const field = type === 'people' ? settings.peopleDateField : config.dateField;
            if (field && !isWithinReportingRange(row[field], range)) return false;
            if (config.actualOnly && !config.actualOnly(row)) return false;
        }
        for (const filter of config.filters) {
            const selected = settings.values?.[filter.key];
            if (!selected) continue;
            if (filter.key === 'people_group') {
                if (!matchesPeopleGroup(row, selected)) return false;
            } else if (filter.key === 'role' && selected === 'no_role') {
                if (row.role && row.role !== 'no_role') return false;
            } else if (String(row[filter.key] ?? '') !== selected) return false;
        }
        if (settings.personId) {
            const id = String(settings.personId);
            switch (settings.personRelation) {
                case 'credited': if (!(row.inviter_ids || []).some((item) => String(item) === id)) return false; break;
                case 'attendee':
                    if (type === 'services' ? !(row.individuals || []).some((item) => String(item.id || item._id) === id)
                        : !(row.attendee_ids || []).some((item) => String(item) === id)) return false;
                    break;
                case 'leader': if (!(row.leaders || []).some((item) => String(item.id || item._id) === id) && String(row.leader_id || '') !== id) return false; break;
                case 'visitor': if (String(row.visited_by_id || '') !== id) return false; break;
                case 'subject': if (String(row.person_id || '') !== id) return false; break;
                default: if (String(row.id || row._id) !== id) return false;
            }
        }
        return true;
    });
}

export function reportExportOptions(rows, key) {
    return [...new Set(rows.map((row) => row[key]).filter((value) => value !== undefined && value !== null && value !== '').map(String))]
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value.replaceAll('_', ' ') }));
}
