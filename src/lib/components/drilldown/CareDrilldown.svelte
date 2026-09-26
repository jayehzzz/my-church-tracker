<script>
  import DrilldownDialog from './DrilldownDialog.svelte';
  import ContributionList from './ContributionList.svelte';
  import EventDetail from './EventDetail.svelte';
  import { selectedChoice } from './selection.js';
  import { careContributions, careMetricLabel, careRecordRows } from './careAdapter.js';
  import { formatInteraction, formatOutcome, formatPurpose, recordId } from '$lib/utils/pastoralCare.js';
  let { state = $bindable(null), visits = [], status = 'ready', error = '', onretry = null, onprofile = null, onedit = null, ondelete = null } = $props();
</script>

{#snippet view(current, navigate)}
  {#if status !== 'ready'}
    <ContributionList domain="care" {status} {error} {onretry} />
  {:else if current.kind === 'selection'}
    {#if current.selection.selectedRole === null}
      <p class="mb-3 text-sm">Choose the series to inspect.</p>
      {#each current.selection.choices as choice}
        <button type="button" class="mb-2 block w-full rounded-lg border border-border p-3 text-left" onclick={() => navigate({ kind: 'list', choice, title: careMetricLabel(choice.metricKey) })}>Series {choice.role} · {careMetricLabel(choice.metricKey)} · {choice.value}</button>
      {/each}
    {:else if selectedChoice(current.selection)}
      {@render list(selectedChoice(current.selection), navigate)}
    {/if}
  {:else if current.kind === 'list'}
    {@render list(current.choice, navigate)}
  {:else if current.kind === 'day'}
    {@const rows = visits.filter(visit => visit.visit_date === current.date)}
    <p class="mb-3 text-sm text-muted-foreground">{current.date} · {rows.length} care interaction{rows.length === 1 ? '' : 's'}</p>
    <ContributionList domain="care" records={careRecordRows(rows)} onselect={row => navigate({ kind: 'care', id: row.id, title: row.title }, row.id)} />
  {:else if current.kind === 'care'}
    {@const visit = visits.find(item => String(recordId(item)) === String(current.id))}
    {#if visit}
      <EventDetail title={`Care for ${visit.person_visited_name || 'Unknown person'}`} date={visit.visit_date} summary={formatOutcome(visit.outcome)} facts={[
        { label: 'Interaction', value: formatInteraction(visit.interaction_type) },
        { label: 'Purpose', value: formatPurpose(visit.purpose) },
        { label: 'Care leader', value: visit.visited_by_name || 'Not recorded' },
        { label: 'Outcome', value: formatOutcome(visit.outcome) },
        { label: 'Follow-up required', value: visit.follow_up_required ? 'Yes' : 'No' },
        { label: 'Follow-up date', value: visit.follow_up_date || 'Not recorded' },
        { label: 'Next action', value: visit.next_task ? `${visit.next_task.status || 'Recorded'} · ${visit.next_task.due_date || 'date unavailable'}` : 'Not recorded' }
      ]} />
      {#if visit.notes}<section class="mt-4 rounded-xl border border-border p-3"><h3 class="font-medium">Notes</h3><p class="whitespace-pre-wrap text-sm">{visit.notes}</p></section>{/if}
      <div class="mt-4 flex gap-3 text-sm">
        {#if visit.person_id}<button type="button" class="text-primary" onclick={() => onprofile?.(visit.person_id, state)}>View profile</button>{/if}
        {#if onedit}<button type="button" class="text-primary" onclick={() => onedit(visit)}>Edit care record</button>{/if}
        {#if ondelete}<button type="button" class="text-destructive" onclick={() => ondelete(visit)}>Delete care record</button>{/if}
      </div>
    {:else}<p role="status">The requested care record is unavailable or restricted.</p>{/if}
  {/if}
{/snippet}

{#snippet list(choice, navigate)}
  {@const result = careContributions(visits, choice)}
  <p class="mb-2 text-sm text-muted-foreground">{careMetricLabel(choice.metricKey)} · {result.startDate || 'first record'} – {result.endDate || 'today'}</p>
  {#if choice.mode === 'average'}<p class="mb-3 font-medium">{result.total} interactions ÷ {result.denominator} eligible elapsed calendar days = {result.displayed ?? 'unavailable'} per day</p>
  {:else}<p class="mb-3 font-medium">{result.total} matching interaction{result.total === 1 ? '' : 's'}</p>{/if}
  {#if choice.metricKey === 'followUp'}<p class="mb-3 text-sm text-muted-foreground">This counts interactions flagged as requiring follow-up. It may differ from outstanding open tasks in Reports.</p>{/if}
  <ContributionList domain="care" records={careRecordRows(result.rows)} onselect={row => navigate({ kind: 'care', id: row.id, title: row.title }, row.id)} />
  {#if choice.value != null && Number(choice.value) !== result.displayed}<p class="mt-3 text-sm text-warning">The chart displays {choice.value}; current records calculate {result.displayed ?? 'unavailable'}.</p>{/if}
{/snippet}

<DrilldownDialog bind:state renderView={view} />
