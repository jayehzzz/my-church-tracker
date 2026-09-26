<script>
  import DrilldownDialog from '$lib/components/drilldown/DrilldownDialog.svelte';
  import { monthsInRange } from '$lib/utils/developmentEvidence.js';
  let { state = $bindable(null), profiles = [], evidence = [], range, loading = false, error = '', onretry = null } = $props();
  const id = person => String(person?.id || person?._id || '');
  const date = value => value ? new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unavailable';
  const eventUrl = event => event?.kind === 'service' ? `/services?service=${encodeURIComponent(event.id)}` : `/meetings?meeting=${encodeURIComponent(event.id)}`;
  const eventLabel = event => event?.kind === 'service' ? 'View service' : 'View meeting';
  const personUrl = personId => `/people/${encodeURIComponent(personId)}`;
  const profile = personId => profiles.find(p => id(p.person) === String(personId));
  const data = personId => evidence.find(row => row.personId === String(personId))?.data;
  const personName = personId => { const p = profile(personId)?.person; return [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Person unavailable'; };
  const contactName = contact => [contact?.first_name, contact?.last_name].filter(Boolean).join(' ') || 'Name unavailable';
  const gathering = (personId, eventId) => data(personId)?.axes.flatMap(axis => axis.sources.gatherings).find(g => String(g.id) === String(eventId)) || profile(personId)?.opportunities?.find(g => String(g.id) === String(eventId));
  const status = (personId, event) => {
    if (!event?.register_known) return 'Register unknown · excluded';
    return profile(personId)?.attendance?.some(row => String(row.event_id) === String(event.id) && row.present === true) ? 'Recorded present' : 'No attendance record';
  };
  const outreachDate = (contact, key) => key === 'collected' ? contact.contact_date : key === 'brought' ? contact.dates?.[0] : contact.dates?.find(d => d > contact.dates[0] && d >= range.from && d <= range.to);
</script>
{#snippet view(current, navigate)}
  {@const personId = current.personId}
  {@const summary = data(personId)}
  <p class="mb-3 text-sm text-muted-foreground">{personName(personId)} · {date(range.from)} – {date(range.to)} <a class="underline" href={personUrl(personId)}>View profile</a></p>
  {#if loading}<p role="status">Loading development evidence…</p>
  {:else if error}<p role="alert">{error} <button class="underline" onclick={onretry}>Retry evidence</button></p>
  {:else if !summary}<p role="status">Evidence unavailable for this person.</p>
  {:else if current.kind === 'attendance'}
    {@const axis = current.programmeId ? summary.breakdown.find(a => a.id === current.programmeId) : summary.axes.find(a => a.key === current.axisKey)}
    {#if axis}
      <p class="text-sm">{current.comparisonAverage ? `${axis.meetings.attended} recorded attendances / ${axis.weeks.offered} offered weeks ≈ ${axis.weeks.offered ? Math.round(axis.meetings.attended / axis.weeks.offered) : 'unavailable'} attendances per offered week (rounded)` : current.basis === 'weeks' ? `${axis.weeks.attended} weeks with recorded attendance / ${axis.weeks.offered} weeks with known registers` : `${axis.meetings.attended} recorded attendances / ${axis.meetings.offered} gatherings with known registers`}</p>
      <p class="mb-3 text-xs text-muted-foreground">Selected gatherings establish the denominator; missing attendance is not proof that this person was expected or absent. {axis.unknown} unknown registers excluded.</p>
      {#if current.basis === 'weeks'}
        {#each axis.sources.weekly as week}
          <h3 class="mt-4 font-medium">Week of {date(week.week)} · {week.attended.length ? 'attendance recorded' : 'no recorded attendance'} · {week.offered.length ? 'known register' : 'no known register'}</h3>
          {#each [...week.offered, ...week.unknown] as event}
            <button class="evidence-row" data-drilldown-focus={event.id} onclick={() => navigate({ kind:'event', title:event.name, personId, eventId:event.id }, event.id)}>{date(event.date)} · {event.name} · {status(personId,event)} →</button>
          {/each}
        {/each}
      {:else}
        {#each axis.sources.gatherings as event}
          <button class="evidence-row" data-drilldown-focus={event.id} onclick={() => navigate({ kind:'event', title:event.name, personId, eventId:event.id }, event.id)}>{date(event.date)} · {event.name} · {status(personId,event)} →</button>
        {/each}
      {/if}
      {#if !axis.sources.gatherings.length}<p class="text-sm">No qualifying gatherings in this selection.</p>{/if}
    {/if}
  {:else if current.kind === 'event'}
    {@const event = gathering(personId,current.eventId)}
    {#if event}<p>{date(event.date)} · {event.name}</p>{#if current.evidenceKind === 'giving'}<p class="text-sm">Giving recorded on {date(event.date)} for this gathering.</p>{/if}<p class="text-sm text-muted-foreground">Attendance: {status(personId,event)}</p><a class="evidence-link" href={eventUrl(event)}>{eventLabel(event)} →</a>{:else}<p>Gathering unavailable.</p>{/if}
  {:else if current.kind === 'givingSummary'}
    {#if !summary.tithing.available}<p>Confidential access required.</p>
    {:else}<p class="text-sm">{summary.tithing.months.filter(m => m.complete).reduce((count,m) => count + m.dates.length,0)} distinct recorded dates across {summary.tithing.eligible} eligible complete months{current.mode === 'average' ? summary.tithing.eligible ? ` ≈ ${Math.round(summary.tithing.months.filter(m => m.complete).reduce((count,m) => count + m.dates.length,0) / summary.tithing.eligible)} per eligible month (rounded)` : ' · average unavailable: no eligible months' : ''}.</p>
      {#each summary.tithing.months as month}<button class="evidence-row" data-drilldown-focus={month.month} onclick={() => navigate({kind:'giving',title:`Monthly giving · ${month.month}`,personId,month:month.month},month.month)}>{month.month} · {month.dates.length} recorded {month.dates.length === 1 ? 'date' : 'dates'} · {month.complete ? 'eligible' : month.reason} →</button>{/each}
    {/if}
  {:else if current.kind === 'giving'}
    {@const month = summary.tithing.months.find(m => m.month === current.month)}
    {#if !summary.tithing.available}<p>Confidential access required.</p>
    {:else if month}
      <p class="text-sm">{month.complete ? 'Eligible complete month' : month.reason || 'Not eligible'} · {month.dates.length} distinct recorded {month.dates.length === 1 ? 'date' : 'dates'}</p>
      <p class="mb-3 text-xs text-muted-foreground">The profile tither flag is separate from dated giving evidence. No record means no recorded evidence.</p>
      {#each month.dates as givingDate}<h3 class="mt-3 font-medium">{date(givingDate)}</h3>{#each month.events.filter(event => event.date === givingDate) as event}<button class="evidence-row" data-drilldown-focus={event.id} onclick={() => navigate({kind:'event',title:event.name,personId,eventId:event.id,evidenceKind:'giving'},event.id)}>{event.name} · Giving recorded · {eventLabel(event)} →</button>{/each}{/each}
      {#if !month.dates.length}<p>No recorded giving dates in this month.</p>{/if}
    {/if}
  {:else if current.kind === 'outreach'}
    {@const people = summary.outreach.sources[current.metricKey] || []}
    <p class="text-sm">{people.length} distinct {people.length === 1 ? 'person' : 'people'}{current.mode === 'average' ? current.denominator ? ` / ${current.denominator} calendar months ≈ ${Math.round(people.length / current.denominator)} per month (rounded)` : ' · average unavailable: no calendar months' : ''} · {summary.outreach.complete ? 'permitted records' : 'only contacts in your permitted scope'}</p>
    {#if current.mode === 'average'}<p class="text-xs text-muted-foreground">Calendar months in the selected period, including months with no matching records:</p>{#each monthsInRange(range) as month}<p class="text-xs text-muted-foreground">{month.month}: {people.filter(contact => outreachDate(contact,current.metricKey)?.startsWith(month.month)).length}</p>{/each}{/if}
    {#each people as contact}
      <button class="evidence-row" data-drilldown-focus={String(contact.id)} onclick={() => navigate({kind:'contact',title:contactName(contact),personId,contactId:String(contact.id),metricKey:current.metricKey},String(contact.id))}>
        {contactName(contact)} · {current.metricKey === 'collected' ? `contacted ${date(contact.contact_date)}` : `first recorded Sunday ${date(contact.dates?.[0])}`}{current.metricKey === 'returned' ? ` · returned ${date(outreachDate(contact,'returned'))}` : ''} →
      </button>
    {/each}
    {#if !people.length}<p>No matching recorded contacts.</p>{/if}
  {:else if current.kind === 'contact'}
    {@const contact = summary.outreach.sources[current.metricKey]?.find(p => String(p.id) === current.contactId)}
    {#if contact}
      <p>{contactName(contact)}</p>
      {#if contact.contact_date}<p>Contact date: {date(contact.contact_date)}</p>{/if}
      {#if contact.dates?.length}<p>First recorded Sunday: {date(contact.dates[0])}</p>{#if current.metricKey === 'returned'}<p>Return: {date(contact.dates.find(d => d > contact.dates[0] && d >= range.from && d <= range.to))}</p>{/if}{#each contact.services || [] as service}<a class="evidence-link" href={`/services?service=${encodeURIComponent(service.id)}`}>{date(service.date)} · View service →</a>{/each}{/if}
      <a class="evidence-link" href={`/evangelism?contact=${encodeURIComponent(contact.id)}`}>View contact →</a>
      <a class="evidence-link" href={personUrl(contact.id)}>View profile →</a>
    {:else}<p>Contact unavailable.</p>{/if}
  {/if}
{/snippet}
<DrilldownDialog bind:state renderView={view}/>
<style>
  .evidence-row,.evidence-link{display:block;width:100%;padding:11px 12px;margin-top:6px;text-align:left;border:1px solid hsl(var(--border));border-radius:8px;font-size:13px}.evidence-row:hover,.evidence-link:hover{background:hsl(var(--secondary)/.6)}
</style>
