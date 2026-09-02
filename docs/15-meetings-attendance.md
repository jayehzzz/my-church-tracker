# Meetings & Attendance

The `/meetings` area is attendance-first. Sunday services remain in `/services`;
this module covers Bacentas, Flow Service, Acts Prayer, Shemen Prayer, Workers
Meetings, future recurring programmes, and genuinely one-off events.

## Data structure

1. `meeting_programs` stores the reusable programme name, type, format,
   schedule, location, and online link.
2. `meeting_program_leaders` and `meeting_program_members` store programme
   leaders and optional rosters. Rosters are primarily useful for Bacentas and
   Workers Meetings.
3. `meetings` stores one dated occurrence and its attendance status. A recurring
   occurrence uses `program_id`; a one-off event instead uses its own `title` and
   event `meeting_type`.
4. `meeting_attendance` links named people to the occurrence. The cached total
   is named present attendees plus `unnamed_guests_count`.

`meeting_attendance` has a `by_meeting_person` index. The sync mutation also
deduplicates input, so one person cannot be counted twice in the same meeting.
Deleting a meeting deletes its linked attendance records.

## Default programmes

The application creates these definitions when the page first loads:

- Bacenta
- Flow Service
- Acts Prayer
- Shemen Prayer
- Workers Meeting

Farley Prayer records are migrated to Acts Prayer, and Flow Prayer records are
migrated to Flow Service. Legacy types without a current programme remain
available as historical meeting records.

## Interface

- **Overview** shows attendance KPIs, trends, programme comparison, attendee
  composition, roster attendance, and records that still need attendance.
- **Attendance** lists dated occurrences and opens the person-by-person
  attendance form.
- **Meeting setup** manages programmes, multiple leaders, usual schedules, and
  rosters. Multiple Bacentas are created as separate programmes.

The **One-off event** action records an evangelistic event, special event,
training/workshop, fellowship/social, or another rare gathering without adding
a permanent programme. A normal Sunday service still belongs in `/services`,
even when the sermon or service has an evangelistic focus. A separate Sunday
event can be recorded as a one-off meeting.

## Guests, first timers, and programme firsts

- **Guest** is the same person record everywhere: Sunday Services, Meetings &
  Attendance, Evangelism, and the People Directory. Older `visitor` records are
  displayed and handled as Guests.
- **First timer** means the person's first-ever gathering with this church. A
  named first timer is added to the People Directory and can then be followed
  across future services and meetings.
- **First Bacenta**, **First Acts Prayer**, and similar labels mean the person's
  first attendance at that recurring programme. This is calculated separately
  and does not turn an existing member or guest into a church first timer.
- **Unnamed guests** increase a meeting's total but do not create individual
  people or attendance histories. Use quick add when the person's name is known.

## What a roster means

A roster is the expected group for one recurring programme—for example, the
people assigned to a particular Bacenta. It is a shortcut for taking attendance,
not proof that everyone attended. Leaders still mark who was actually present.
Prayer meetings and open events can work without a roster.

Flow Service attendance is manually confirmed. YouTube view counts are not
treated as individual member attendance.

## Analytics and filters

The date selector and the Meetings analytics filters work together. Users can
filter the overview and attendance list by programme, meeting category, leader,
format, record status, named person, person status, attendance journey, guest
recording method, and a minimum or maximum attendance. Filter choices are stored
in the page URL, so a filtered report can be bookmarked or shared. The current
filtered meeting list can also be exported as CSV.

To keep the overview easy to scan, the detailed filters are not permanently
shown on the page. Each graph has a **Filter** action that opens the shared
analytics filter window. The Attendance tab has the same filter action for the
record list. The four most commonly used filters appear first; less common
options are kept under **More filters**. Active filters are summarised beside
the results and can be cleared without reopening the window.

The dashboard reports:

- **Meetings held** excludes cancelled records.
- **Total attendance** includes named people and unnamed guests.
- **Unique people** counts each named person once in the selected period.
- **Average attendance** is total attendance divided by held meetings.
- **First timers** counts named people whose record is marked as their
  first-ever church attendance.
- **First-timer return rate** is the percentage of those first timers who attend
  a later selected meeting.

When previous-period comparison is enabled, each KPI is compared with the
immediately preceding date range of the same length. Charts show attendance over
time, unique people by attendance journey, programme averages, and roster
attendance. Chart elements can be selected to open a person-level drill-down.

Roster attendance measures attended roster places divided by total roster
opportunities across held meetings. For example, a roster of ten people across
four meetings creates forty opportunities. This is different from unique people
and from overall attendance, because visitors and non-roster attendees do not
increase the roster rate.

## Key files

- `convex/meetingPrograms.ts`
- `convex/meetings.ts`
- `src/lib/services/meetingProgramsService.js`
- `src/lib/services/meetingsService.js`
- `src/lib/components/forms/MeetingProgramForm.svelte`
- `src/lib/components/forms/MeetingForm.svelte`
- `src/routes/meetings/+page.svelte`
