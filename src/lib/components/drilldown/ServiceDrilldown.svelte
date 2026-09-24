<script>
  import { session } from '$lib/auth/session.js';
  import DrilldownDialog from './DrilldownDialog.svelte';
  import ContributionList from './ContributionList.svelte';
  import EventDetail from './EventDetail.svelte';
  import { selectedChoice } from './selection.js';
  import { serviceId, metricLabels, selectServiceContributions, serviceContribution, namedServicePeople } from './serviceAdapter.js';
  let { state = $bindable(null), services = [], attendance = [], people = [], status = 'ready', error = '', onretry = null, onedit = null, onprofile = null, wholeNumberAverages = false } = $props();
  const confidential = $derived($session.status === 'demo' || $session.user?.canViewConfidential === true);
  function date(value) { return value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date unavailable'; }
  function title(service) { return service.sermon_topic || String(service.service_type || 'Service').replaceAll('_', ' '); }
  function name(person) { return [person.first_name, person.last_name].filter(Boolean).join(' ') || person.name || 'Named attendee'; }
  function rowsFor(choice) { return selectServiceContributions(services, choice, attendance, people); }
</script>

{#snippet view(current, navigate)}
  {#if status !== 'ready'}
    <ContributionList domain="service" status={status} {error} {onretry} />
  {:else if current.kind === 'selection'}
    {#if current.selection.selectedRole === null}
      <p class="mb-3 text-sm">Choose the series to inspect.</p>
      {#each current.selection.choices as choice}
        <button type="button" class="mb-2 block w-full rounded-lg border border-border p-3 text-left" onclick={() => navigate({ kind: 'list', title: metricLabels[choice.metricKey] || choice.metricKey, choice })}>Series {choice.role} · {metricLabels[choice.metricKey] || choice.metricKey} · {choice.value}</button>
      {/each}
    {:else}
      {@const choice = selectedChoice(current.selection)}
      {#if choice}
        {@render list(choice, navigate)}
      {/if}
    {/if}
  {:else if current.kind === 'list'}
    {@render list(current.choice, navigate)}
  {:else if current.kind === 'history'}
    {@const matching = (current.statuses || []).map(status => ({ ...status, service: services.find(service => serviceId(service) === serviceId(status.service)) })).filter(status => status.service)}
    <p class="mb-3 text-sm">Sunday history for the selected person. Here, missed and before tracked period follow the selected matrix filters.</p>
    <ContributionList domain="service" records={matching.map(status => ({ id: serviceId(status.service), title: title(status.service), date: date(status.service.service_date), note: status.state === 'present' ? 'Here' : status.state === 'missed' ? 'Missed' : 'Before tracked period' }))} onselect={row => navigate({ kind: "service", title: row.title, id: row.id, metricKey: "total", personId: current.personId }, row.id)} />
  {:else if current.kind === 'service'}
    {@const service = services.find(item => serviceId(item) === current.id)}
    {#if service}
      {@const metric = current.metricKey || 'total'}
      {@const named = namedServicePeople(service, metric, attendance, people, confidential)}
      {@const count = serviceContribution(service, metric, attendance, people)}
      <EventDetail title={title(service)} date={date(service.service_date)} summary={`${metricLabels[metric] || metric}: ${count}`} facts={[
        { label: 'Type', value: String(service.service_type || 'Unrecorded').replaceAll('_', ' ') },
        ...(service.sermon_speaker ? [{ label: 'Speaker', value: service.sermon_speaker }] : []),
        ...(service.location ? [{ label: 'Location', value: service.location }] : []),
        { label: 'Linked names available', value: metric === 'tithers' && !confidential ? 'Restricted' : named.length },
        { label: 'Contributions without an available linked name', value: metric === 'tithers' && !confidential ? 'Restricted' : Math.max(0, count - named.length) }
      ]} />
      {#if metric === 'tithers' && !confidential}<p class="mt-3 text-sm text-muted-foreground">Individual giving details are restricted.</p>{:else if count > named.length}<p class="mt-3 text-sm text-muted-foreground">Some recorded contributions have no linked name available here. This can include unnamed attendance or records outside your access.</p>{/if}
      {#if current.personId}<p class="mt-4 text-sm font-medium">Selected person: {[...people, ...(service.individuals || [])].filter(item => typeof item === "object").find(item => serviceId(item) === current.personId)?.first_name || "Recorded attendee"}</p>{/if}
      <div class="mt-4"><ContributionList domain="person" records={named.map(item => ({ id: item.id, title: name(item.person), note: item.row?.first_timer ? 'First recorded visit' : '' }))} onselect={onprofile ? row => onprofile(row.id, state) : null} /></div>
      {#if onedit}<button type="button" class="mt-4 text-sm text-primary" onclick={() => onedit(service)}>Open full service details</button>{/if}
      {#if service.notes || service.photos?.length}<details class="mt-4"><summary>Notes and photos</summary>{#if service.notes}<p>{service.notes}</p>{/if}{#if service.photos?.length}<div class="mt-2 grid grid-cols-2 gap-2">{#each service.photos as photo, index}<a href={photo} target="_blank" rel="noopener noreferrer" aria-label={`Open service photo ${index + 1}`}><img src={photo} alt={`Service photo ${index + 1}`} class="aspect-video w-full rounded-lg object-cover" /></a>{/each}</div>{/if}</details>{/if}
    {:else}<p role="status">The requested service is unavailable or restricted.</p>{/if}
  {/if}
{/snippet}

{#snippet list(choice, navigate)}
  {@const result = rowsFor(choice)}
  <p class="mb-2 text-sm text-muted-foreground">{choice.contextLabel ? `${choice.contextLabel} · ` : ""}{choice.pointBounds?.startDate || choice.scopeBounds?.startDate || 'Selected period'} – {choice.pointBounds?.endDate || choice.scopeBounds?.endDate || 'today'}{choice.scopeBounds && choice.pointBounds && (choice.scopeBounds.startDate !== choice.pointBounds.startDate || choice.scopeBounds.endDate !== choice.pointBounds.endDate) ? ` · Selected scope ${choice.scopeBounds.startDate} – ${choice.scopeBounds.endDate}` : ''} · {metricLabels[choice.metricKey] || choice.metricKey}</p>
  {@const shown = choice.mode === "average" && (choice.displayPrecision === 0 || wholeNumberAverages) ? Math.round(result.displayed) : result.displayed}
  <p class="mb-2 font-medium">{choice.mode === 'average' ? result.denominator ? `${result.total} across ${result.denominator} services = ${shown} per service${shown !== result.displayed ? ` (${result.displayed} before display rounding)` : ""}` : 'Average unavailable: no recorded services in this selection.' : `${result.total} across ${result.denominator} services`}</p>
  <p class="mb-4 text-sm text-muted-foreground">This breakdown shows how each service contributes to the selected number. A 0 means the service is included in the period but added nothing to this measure.</p>
  <ContributionList domain="service" records={result.rows.map(({ service, contribution }) => ({ id: serviceId(service), title: title(service), date: date(service.service_date), contribution, note: String(service.service_type || '').replaceAll('_', ' ') }))} countLabel={`${result.denominator} service${result.denominator === 1 ? '' : 's'} included`} contributionLabel={metricLabels[choice.metricKey] || choice.metricKey} onselect={row => navigate({ kind: 'service', title: row.title, id: row.id, metricKey: choice.metricKey }, row.id)} />
  {#if choice.value != null && Number(choice.value) !== result.displayed && Number(choice.value) !== shown}<p class="mt-3 text-sm text-warning">The chart displays {choice.value}; source records currently calculate {shown}. Refresh the page if records changed.</p>{/if}
{/snippet}

<DrilldownDialog bind:state renderView={view} />
