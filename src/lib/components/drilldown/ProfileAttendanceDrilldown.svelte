<script>
  import DrilldownDialog from './DrilldownDialog.svelte';
  import ContributionList from './ContributionList.svelte';
  import EventDetail from './EventDetail.svelte';
  import { meetingId, meetingName } from './meetingAdapter.js';
  import { attendeeIds, meetingAttendance } from '$lib/utils/meetingAnalytics.js';
  import { serviceId, serviceContribution, namedServicePeople } from './serviceAdapter.js';
  let { state = $bindable(null), history = [], person = null, event = null, attendees = [], status = 'loading', error = '', onretry = null, onrecord = null } = $props();
  const date = value => value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unavailable';
  const name = value => [value?.first_name, value?.last_name].filter(Boolean).join(' ') || 'Named attendee';
  const title = record => record.meeting ? meetingName(record.meeting) : record.services?.sermon_topic || String(record.services?.service_type || 'Sunday service').replaceAll('_', ' ');
  const recordId = record => record.meeting ? meetingId(record.meeting) : serviceId(record.services);
</script>

{#snippet view(current, navigate)}
  {#if current.kind === 'history'}
    <p class="mb-3 text-sm text-muted-foreground">{name(person)} · {history.length} recorded gatherings. Select an event to inspect its details.</p>
    <ContributionList domain="meeting" records={history.map(record => ({ id: recordId(record), domain: record.meeting ? 'meeting' : 'service', title: title(record), date: date(record.meeting?.meeting_date || record.services?.service_date), note: record.meeting ? 'Meeting' : 'Sunday service' }))} onselect={row => { const record = history.find(item => recordId(item) === row.id && Boolean(item.meeting) === (row.domain === 'meeting')); onrecord?.(record); navigate({ kind: 'event', title: row.title, record }, row.id); }} />
  {:else if status === 'loading'}
    <p role="status">Loading event details…</p>
  {:else if status !== 'ready'}
    <p role="status">{error || 'The requested event is unavailable or restricted.'}</p>
    {#if onretry}<button type="button" onclick={onretry}>Retry</button>{/if}
  {:else if current.record?.meeting && event}
    {@const ids = attendeeIds(event)}
    {@const classification = current.record.first_timer ? 'First recorded church visit' : current.record.first_program_attendance ? 'First recorded programme visit' : 'Recorded attendee'}
    <section class="mb-3 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm"><h3 class="font-medium">{name(person)} · recorded participation</h3><p>{classification} · {date(event.meeting_date)}</p></section>
    <EventDetail title={meetingName(event)} date={date(event.meeting_date)} summary={`${meetingAttendance(event)} recorded attendance`} facts={[
      { label: 'Programme', value: event.program?.name || meetingName(event) },
      { label: 'Time', value: [event.start_time, event.end_time].filter(Boolean).join('–') || 'Not recorded' },
      { label: 'Format', value: event.format || 'Not recorded' },
      { label: 'Location', value: event.location || event.online_url || 'Not recorded' },
      { label: 'Status', value: event.status || 'Not recorded' },
      { label: 'Named attendance', value: ids.length },
      { label: 'Unnamed headcount', value: Number(event.unnamed_guests_count || 0) }
    ]} />
    {#if ids.length > attendees.filter(row => row.people && (!row.status || row.status === 'present' || row.attended)).length}<p class="mt-3 text-sm text-muted-foreground">Some linked attendee names are unavailable or restricted.</p>{/if}
    <div class="mt-4"><ContributionList domain="person" records={attendees.filter(row => !row.status || row.status === 'present' || row.attended).filter(row => row.people).map(row => ({ id: String(row.person_id), title: name(row.people) }))} /></div>
    {#if event.notes}<details class="mt-4"><summary>Notes</summary><p>{event.notes}</p></details>{/if}
  {:else if event}
    {@const named = namedServicePeople(event, 'total', attendees, attendees.map(row => row.people).filter(Boolean))}
    <section class="mb-3 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm"><h3 class="font-medium">{name(person)} · recorded participation</h3><p>{current.record.first_timer ? 'First recorded church visit' : 'Recorded attendee'} · {date(event.service_date)}</p></section>
    <EventDetail title={event.sermon_topic || String(event.service_type || 'Service').replaceAll('_', ' ')} date={date(event.service_date)} summary={`${serviceContribution(event, 'total', attendees)} recorded attendance`} facts={[
      { label: 'Type', value: String(event.service_type || 'Unrecorded').replaceAll('_', ' ') },
      { label: 'Speaker', value: event.sermon_speaker || 'Not recorded' },
      { label: 'Location', value: event.location || 'Not recorded' },
      { label: 'Named linked people', value: named.length }
    ]} />
    {#if serviceContribution(event, 'total', attendees) > named.length}<p class="mt-3 text-sm text-muted-foreground">Some recorded attendances have no linked name available here.</p>{/if}
    <div class="mt-4"><ContributionList domain="person" records={named.map(item => ({ id: item.id, title: name(item.person) }))} /></div>
    {#if event.notes}<details class="mt-4"><summary>Notes</summary><p>{event.notes}</p></details>{/if}
  {/if}
{/snippet}

<DrilldownDialog bind:state renderView={view} />
