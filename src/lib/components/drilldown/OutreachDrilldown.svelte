<script>
  import DrilldownDialog from './DrilldownDialog.svelte';
  import ContributionList from './ContributionList.svelte';
  import EventDetail from './EventDetail.svelte';
  import { selectedChoice } from './selection.js';
  import { outreachContributions, outreachMetricLabel, outreachRecordRows } from './outreachAdapter.js';
  import { contactId } from '$lib/utils/evangelismView.js';
  import { meetingHref, careHref, serviceHref } from './recordHrefs.js';
  let { state = $bindable(null), rows = [], status = 'ready', error = '', onretry = null,
    profile = null, profileStatus = 'ready', profileError = '', onretryprofile = null,
    oncontact = null, onprofile = null, onedit = null, onleave = null } = $props();
  const monthName = key => key ? new Date(`${key}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Month';
  const readable = value => String(value || 'Not recorded').replaceAll('_', ' ');
</script>

{#snippet view(current, navigate)}
  {#if status !== 'ready'}
    <ContributionList domain="contact" {status} {error} {onretry} />
  {:else if current.kind === 'selection'}
    {#if current.selection.selectedRole === null}
      <p class="mb-3 text-sm">Choose a series to inspect.</p>
      {#each current.selection.choices as choice}
        <button type="button" class="mb-2 block w-full rounded-lg border border-border p-3 text-left" onclick={() => navigate({ kind: 'list', title: outreachMetricLabel(choice.metricKey), choice })}>Series {choice.role} · {outreachMetricLabel(choice.metricKey)} · {choice.value}</button>
      {/each}
    {:else if selectedChoice(current.selection)}
      {@render list(selectedChoice(current.selection), navigate)}
    {/if}
  {:else if current.kind === 'list'}
    {@render list(current.choice, navigate)}
  {:else if current.kind === 'inviter'}
    {@const freshRows = rows.filter(row => current.rows.some(saved => String(contactId(saved)) === String(contactId(row))))}
    <p class="mb-4 text-sm text-muted-foreground">{current.periodLabel} · {freshRows.length} matching contacts. A contact can credit more than one inviter; each receives shared credit.</p>
    <ContributionList domain="contact" records={outreachRecordRows(freshRows, 'count')} onselect={row => { oncontact?.(row.id); navigate({ kind: 'contact', id: row.id, title: row.title }, row.id); }} />
  {:else if current.kind === 'contact'}
    {@const contact = rows.find(row => String(contactId(row)) === String(current.id))}
    {#if !contact}
      <p role="status">The requested contact is unavailable or restricted.</p>
    {:else}
      <EventDetail title={contact.full_name || current.title} date={contact.contact_date_label || contact.contact_date} summary="Outreach contact" facts={[
        { label: 'Shared outreach credit', value: contact.reached_by_name || 'Not recorded' },
        { label: 'Assigned worker', value: contact.assigned_worker_name || 'Unassigned' },
        { label: 'Response', value: readable(contact.response || contact.contact_category) },
        { label: 'Church status', value: readable(contact.member_status) },
        { label: 'Next action', value: contact.follow_up_label || 'No next action' },
        { label: 'First attendance', value: contact.first_visit_date || (contact.attended_church ? 'Recorded; date unavailable' : 'Not recorded') },
        { label: 'Outreach salvation', value: contact.outreach_salvation_decision ? (contact.outreach_salvation_date || 'Recorded; date unavailable') : 'Not recorded' },
      ]} />
      {#if contact.notes}<section class="mt-4 rounded-xl border border-border p-3"><h3 class="font-medium">Notes</h3><p class="whitespace-pre-wrap text-sm">{contact.notes}</p></section>{/if}
      {#if profileStatus === 'loading'}<p role="status" class="mt-4">Loading contact context…</p>
      {:else if profileStatus !== 'ready'}<p role="alert" class="mt-4">{profileError || 'Contact context unavailable.'} <button type="button" class="text-primary" onclick={onretryprofile}>Retry</button></p>
      {:else if profile}
        {@const openTasks = (profile.tasks || []).filter(task => task.status === 'open')}
        {@const nextTask = contact.crm_next_task || openTasks[0]}
        <section class="mt-4 rounded-xl border border-border p-3 text-sm">
          <h3 class="font-medium">Next action</h3>
          {#if nextTask}<p class="mt-1">{readable(nextTask.task_type)} · due {nextTask.due_date || 'date not recorded'}{nextTask.reason ? ` · ${nextTask.reason}` : ''}</p>
          {:else}<p class="mt-1 text-muted-foreground">No open task recorded.</p>{/if}
          {#if profile.active_assignment?.assigned_leader}<p class="mt-1">Assigned to {[profile.active_assignment.assigned_leader.first_name, profile.active_assignment.assigned_leader.last_name].filter(Boolean).join(' ')}</p>{/if}
        </section>
        <details class="mt-4 rounded-xl border border-border p-3 text-sm"><summary class="cursor-pointer font-medium">Follow-up activity · {(profile.follow_ups || []).length + (profile.tasks || []).length}</summary>
          <div class="mt-2 space-y-2">
            {#each profile.follow_ups || [] as item}<div class="border-t border-border pt-2">{item.created_at || item.follow_up_date || 'Date unavailable'} · {readable(item.method)} · {readable(item.outcome)}{#if item.notes}<p class="whitespace-pre-wrap text-muted-foreground">{item.notes}</p>{/if}</div>{/each}
            {#each profile.tasks || [] as task}<div class="border-t border-border pt-2">{task.due_date || task.created_at || 'Date unavailable'} · {readable(task.task_type)} · {readable(task.status)}{#if task.reason}<p class="text-muted-foreground">{task.reason}</p>{/if}</div>{/each}
            {#if !profile.follow_ups?.length && !profile.tasks?.length}<p class="text-muted-foreground">No follow-up activity recorded.</p>{/if}
          </div>
        </details>
        <details class="mt-3 rounded-xl border border-border p-3 text-sm"><summary class="cursor-pointer font-medium">Gathering plans · {profile.commitments?.length ?? 0}</summary>
          <div class="mt-2 space-y-2">{#each profile.commitments || [] as item}<div class="border-t border-border pt-2">{item.gathering_date || 'Date unavailable'} · {readable(item.gathering_type)} · {readable(item.response)} · {readable(item.resolution)}
            {#if item.resolution_note || item.confirmation_note}<p class="text-muted-foreground">{item.resolution_note || item.confirmation_note}</p>{/if}
            {#if item.service_id}<a class="text-primary" href={serviceHref(item.service_id)} onclick={() => onleave?.(state)}>View service</a>{/if}
            {#if item.meeting_id}<a class="text-primary" href={meetingHref(item.meeting_id)} onclick={() => onleave?.(state)}>View meeting</a>{/if}
          </div>{:else}<p class="text-muted-foreground">No gathering plans recorded.</p>{/each}</div>
        </details>
        <details class="mt-3 rounded-xl border border-border p-3 text-sm"><summary class="cursor-pointer font-medium">Meeting attendance · {profile.meeting_attendance?.length ?? 0}</summary>
          <div class="mt-2 space-y-2">{#each profile.meeting_attendance || [] as item}<div class="border-t border-border pt-2">{item.meeting?.meeting_date || 'Date unavailable'} · {item.meeting?.title || item.meeting?.topic || readable(item.meeting?.meeting_type, 'Meeting')}
            {#if item.meeting?._id || item.meeting?.id}<a class="ml-2 text-primary" href={meetingHref(item.meeting._id || item.meeting.id)} onclick={() => onleave?.(state)}>View meeting</a>{/if}
          </div>{:else}<p class="text-muted-foreground">No meeting attendance recorded.</p>{/each}</div>
        </details>
        <details class="mt-3 rounded-xl border border-border p-3 text-sm"><summary class="cursor-pointer font-medium">Care interactions · {profile.visitations?.length ?? 0}</summary>
          <div class="mt-2 space-y-2">{#each profile.visitations || [] as item}<div class="border-t border-border pt-2">{item.visit_date || 'Date unavailable'} · {readable(item.outcome)} · {item.visited_by_name || 'Care leader not recorded'}{item.follow_up_required ? ' · follow-up required' : ''}
            {#if item._id || item.id}<a class="ml-2 text-primary" href={careHref(item._id || item.id)} onclick={() => onleave?.(state)}>View care record</a>{/if}
          </div>{:else}<p class="text-muted-foreground">No care interactions recorded.</p>{/each}</div>
        </details>
      {/if}
      <div class="mt-4 flex flex-wrap gap-3 text-sm">
        {#if contactId(contact)}<button type="button" class="text-primary" onclick={() => onprofile?.(contactId(contact), state)}>View profile</button>{/if}
        {#if onedit}<button type="button" class="text-primary" onclick={() => onedit(contact)}>Edit contact</button>{/if}
      </div>
    {/if}
  {/if}
{/snippet}

{#snippet list(choice, navigate)}
  {@const result = outreachContributions(rows, choice)}
  <p class="mb-2 text-sm text-muted-foreground">{outreachMetricLabel(choice.metricKey)} · contact cohort {result.scope?.startDate || 'first record'} – {result.scope?.endDate || 'today'}</p>
  {#if choice.mode === 'average'}
    <p class="mb-3 font-medium">{result.total} qualifying contacts ÷ {result.denominator} calendar months ≈ {result.denominator ? Math.round(result.total / result.denominator) : 'unavailable'} per month (rounded to a whole person)</p>
    <p class="mb-3 text-sm text-muted-foreground">The chart repeats this full-period average at each point. Months with no contacts and partial months count in the denominator.</p>
    <ul class="mb-4 space-y-1 text-sm" aria-label="Contributing months">
      {#each result.months as month}
        <li class={month.key === result.clickedMonth ? 'rounded bg-primary/10 px-2 py-1 font-semibold' : 'px-2 py-1'}>{monthName(month.key)}: {month[choice.metricKey] || 0}{month.key === result.clickedMonth ? ' · selected month' : ''}</li>
      {/each}
    </ul>
  {:else}<p class="mb-3 font-medium">{result.total} matching contact{result.total === 1 ? '' : 's'} {choice.aggregateScope === 'period' ? 'in the selected period' : `in ${monthName(result.clickedMonth)}`}</p>{/if}
  {#if choice.metricKey !== 'count'}<p class="mb-3 text-sm text-muted-foreground">These outcomes belong to people first contacted in this cohort; the outcome may have been recorded later.</p>{/if}
  <ContributionList domain="contact" records={outreachRecordRows(result.matches, choice.metricKey)} onselect={row => { oncontact?.(row.id); navigate({ kind: 'contact', title: row.title, id: row.id }, row.id); }} />
  {#if choice.value != null && Number(choice.value) !== (choice.mode === 'average' ? Math.round(result.total / result.denominator) : result.displayed)}<p class="mt-3 text-sm text-warning">The chart displays {choice.value}; current records calculate {choice.mode === 'average' ? Math.round(result.total / result.denominator) : result.displayed}.</p>{/if}
{/snippet}

<DrilldownDialog bind:state renderView={view} />
