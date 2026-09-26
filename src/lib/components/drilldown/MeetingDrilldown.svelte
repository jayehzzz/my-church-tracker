<script>
  import DrilldownDialog from './DrilldownDialog.svelte';
  import ContributionList from './ContributionList.svelte';
  import EventDetail from './EventDetail.svelte';
  import { selectedChoice } from './selection.js';
  import { meetingId, meetingName, meetingMetricLabel, selectMeetingContributions, meetingPeople } from './meetingAdapter.js';
  import { attendeeIds, meetingAttendance } from '$lib/utils/meetingAnalytics.js';
  let { state = $bindable(null), meetings = [], people = [], status = 'ready', error = '', onretry = null, onprofile = null } = $props();
  const date = value => value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unavailable';
  const name = person => [person.first_name, person.last_name].filter(Boolean).join(' ') || 'Named attendee';
  function peopleRows(rows, key, ids = null) { return meetingPeople(rows, people, key, ids).map(item => ({ id: meetingId(item.person), title: name(item.person), contribution: item.count, note: `${item.count} recorded meeting${item.count === 1 ? '' : 's'} · last ${date(item.lastDate)}${item.evidence.length && ['firstTimers','first_timers','programme_firsts','established'].includes(key) ? ` · evidence: ${item.evidence.map(({ meeting }) => date(meeting.meeting_date)).join(', ')}` : ''}` })); }
</script>

{#snippet view(current, navigate)}
  {#if status !== 'ready'}
    <ContributionList domain="meeting" {status} {error} {onretry} />
  {:else if current.kind === 'selection'}
    {#if current.selection.selectedRole === null}
      <p class="mb-3 text-sm">Choose the series to inspect.</p>
      {#each current.selection.choices as choice}
        <button type="button" class="mb-2 block w-full rounded-lg border border-border p-3 text-left" onclick={() => navigate({ kind: 'list', title: meetingMetricLabel(choice.metricKey), choice })}>Series {choice.role} · {meetingMetricLabel(choice.metricKey)} · {choice.value}</button>
      {/each}
    {:else if selectedChoice(current.selection)}
      {@render list(selectedChoice(current.selection), navigate)}
    {/if}
  {:else if current.kind === 'list'}
    {@render list(current.choice, navigate)}
  {:else if current.kind === 'people'}
    {@const currentRows = meetings.filter(meeting => current.rows.some(row => meetingId(row) === meetingId(meeting)))}
    <p class="mb-3 text-sm text-muted-foreground">{current.label} · {currentRows.length} meeting{currentRows.length === 1 ? '' : 's'}. Frequencies use only these meetings.</p>
    <ContributionList domain="person" records={peopleRows(currentRows, current.metricKey, current.ids)} onselect={onprofile ? row => onprofile(row.id, state) : null} />
  {:else if current.kind === 'meeting'}
    {@const meeting = meetings.find(item => meetingId(item) === String(current.id))}
    {#if meeting}
      {@const ids = attendeeIds(meeting)}
      {@const total = meetingAttendance(meeting)}
      <EventDetail title={meetingName(meeting)} date={date(meeting.meeting_date)} summary={`${total} recorded attendance`} facts={[
        { label: 'Programme', value: meeting.program?.name || meetingName(meeting) },
        { label: 'Time', value: [meeting.start_time, meeting.end_time].filter(Boolean).join('–') || 'Not recorded' },
        { label: 'Format', value: meeting.format || 'Not recorded' },
        { label: 'Location', value: meeting.location || meeting.online_url || 'Not recorded' },
        { label: 'Status', value: meeting.status || 'Not recorded' },
        { label: 'Named attendance', value: ids.length },
        { label: 'Unnamed headcount', value: Number(meeting.unnamed_guests_count || 0) }
      ]} />
      {#if ids.length > people.filter(person => ids.includes(meetingId(person))).length}<p class="mt-3 text-sm text-muted-foreground">Some linked attendee names are unavailable or restricted.</p>{/if}
      {#if current.personId}
        {@const selectedPerson = people.find(person => meetingId(person) === String(current.personId))}
        {@const selectedRecord = (meeting.attendance_records || meeting.attendees || []).find(record => String(record.person_id || record.person?.id || record.person?._id || record) === String(current.personId))}
        <section class="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm">
          <h3 class="font-medium">{selectedPerson ? name(selectedPerson) : 'Selected person'} · recorded participation</h3>
          <p>{selectedRecord?.first_timer ? 'First recorded church visit' : selectedRecord?.first_program_attendance ? 'First recorded programme visit' : selectedRecord ? 'Recorded attendee' : 'Participation detail unavailable'}</p>
        </section>
      {/if}
      {#if ids.length}<div class="mt-4"><ContributionList domain="person" records={peopleRows([meeting], 'uniquePeople')} onselect={onprofile ? row => onprofile(row.id, state) : null} /></div>{/if}
      {#if total > ids.length + Number(meeting.unnamed_guests_count || 0)}<p class="mt-3 text-sm text-muted-foreground">{total - ids.length - Number(meeting.unnamed_guests_count || 0)} other recorded attendances have no linked person.</p>{/if}
      {#if meeting.notes}<details class="mt-4"><summary>Notes</summary><p>{meeting.notes}</p></details>{/if}
    {:else}<p role="status">The requested meeting is unavailable or restricted.</p>{/if}
  {/if}
{/snippet}

{#snippet list(choice, navigate)}
  {@const result = selectMeetingContributions(meetings, choice)}
  <p class="mb-2 text-sm text-muted-foreground">{choice.contextLabel || 'Meetings'} · {choice.pointBounds?.startDate || choice.scopeBounds?.startDate || 'Selected period'} – {choice.pointBounds?.endDate || choice.scopeBounds?.endDate || 'today'}{choice.scopeBounds && choice.pointBounds && (choice.scopeBounds.startDate !== choice.pointBounds.startDate || choice.scopeBounds.endDate !== choice.pointBounds.endDate) ? ` · Selected scope ${choice.scopeBounds.startDate} – ${choice.scopeBounds.endDate}` : ''} · {meetingMetricLabel(choice.metricKey)}</p>
  <p class="mb-4 font-medium">{choice.metricKey === 'attendance' && choice.mode === 'average' ? result.denominator ? `${result.attendanceTotal} attendances across ${result.denominator} held meetings ≈ ${Math.round(result.displayed)} per meeting (rounded to a whole person)` : 'Average unavailable: no held meetings in this selection.' : `${result.total} ${choice.metricKey === 'uniquePeople' ? 'distinct linked people' : choice.metricKey === 'meetingCount' ? 'held meetings' : 'recorded contributions'} across ${result.denominator} held meetings`}</p>
  {#if result.personIds.length > peopleRows(result.rows, 'uniquePeople').length}<p class="mb-3 text-sm text-muted-foreground">Some linked attendee names are unavailable or restricted.</p>{/if}
  {#if choice.metricKey === 'uniquePeople' || choice.metricKey === 'firstTimers' || choice.metricKey === 'first_timers'}
    <ContributionList domain="person" records={peopleRows(result.rows, choice.metricKey, choice.metricKey === 'uniquePeople' ? result.personIds : null)} onselect={onprofile ? row => onprofile(row.id, state) : null} />
  {:else}
    <ContributionList domain="meeting" records={result.rows.map(meeting => ({ id: meetingId(meeting), title: meetingName(meeting), date: date(meeting.meeting_date), contribution: choice.metricKey === 'meetingCount' ? 1 : meetingAttendance(meeting), note: `${attendeeIds(meeting).length} named · ${Number(meeting.unnamed_guests_count || 0)} unnamed` }))} onselect={row => navigate({ kind: 'meeting', title: row.title, id: row.id }, row.id)} />
    {#if choice.metricKey === 'attendance'}<button type="button" class="mt-4 text-sm text-primary" onclick={() => navigate({ kind: 'people', title: 'Named people', label: choice.contextLabel || 'Selected meetings', rows: result.rows, metricKey: 'uniquePeople' })}>View named people for these meetings</button>{/if}
  {/if}
  {#if choice.value != null && Number(choice.value) !== (choice.mode === 'average' ? Math.round(result.displayed) : result.displayed)}<p class="mt-3 text-sm text-warning">The chart displays {choice.value}; current source records calculate {choice.mode === 'average' ? Math.round(result.displayed) : result.displayed}.</p>{/if}
{/snippet}

<DrilldownDialog bind:state renderView={view} />
