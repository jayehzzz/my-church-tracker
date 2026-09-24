<script>
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { completedSundayWindow, recentMissedSundayPeople } from '$lib/utils/missedSundayHistory.js';

  let {
    history = [],
    today = '',
    onOpen = () => {},
    onEditReason = () => {},
    onPlanCall = () => {},
  } = $props();

  let view = $state('recent');
  let search = $state('');
  const window = $derived(completedSundayWindow(today));
  const recentPeople = $derived(recentMissedSundayPeople(history, today));
  const repeatedCount = $derived(recentPeople.filter(person => person.missed_count > 1).length);
  const historyRows = $derived(history.flatMap(person => (person.missed_sundays || []).map(commitment => ({ person, commitment }))));
  const matchingHistory = $derived(historyRows.filter(row => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [personName(row.person.person), personName(row.person.assigned_leader), row.commitment.gathering_date, displayedReason(row.commitment)]
      .some(value => String(value || '').toLowerCase().includes(query));
  }).sort((a, b) => b.commitment.gathering_date.localeCompare(a.commitment.gathering_date)));

  function personName(person) {
    return person?.name || [person?.preferred_name || person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Unknown person';
  }
  function dateLabel(value) {
    if (!value) return 'Unknown Sunday';
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function displayedReason(commitment) {
    const note = commitment?.resolution_note?.trim();
    return !note || note === 'Not in the recorded Sunday attendance.' ? 'Reason not recorded' : note;
  }
  function canPlan(person) {
    return !person?.is_paused && person?.contact_category !== 'do_not_contact';
  }
</script>

<section class="overflow-hidden rounded-xl border border-border bg-card" aria-label="Missed after saying yes">
  <div class="border-b border-border px-5 py-4">
    <h2 class="text-lg font-semibold text-foreground">Missed after saying yes</h2>
    <p class="mt-1 text-sm text-muted-foreground">Sunday confirmations with a recorded missed result. Cancellations and results still awaiting attendance are not included.</p>
  </div>

  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
    <div class="flex rounded-lg border border-border bg-secondary/40 p-1" role="group" aria-label="Missed Sunday view">
      <button type="button" aria-pressed={view === 'recent'} class="rounded-md px-3 py-1.5 text-sm font-semibold {view === 'recent' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}" onclick={() => view = 'recent'}>Recent</button>
      <button type="button" aria-pressed={view === 'history'} class="rounded-md px-3 py-1.5 text-sm font-semibold {view === 'history' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}" onclick={() => view = 'history'}>History</button>
    </div>
    {#if view === 'history'}
      <label class="w-full sm:w-72"><span class="sr-only">Search missed Sunday history</span><input type="search" bind:value={search} placeholder="Search person, worker, date or reason" class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" /></label>
    {/if}
  </div>

  {#if view === 'recent'}
    <div class="flex flex-wrap gap-x-5 gap-y-1 border-b border-border bg-secondary/20 px-5 py-3 text-sm">
      <span><strong class="text-foreground">{recentPeople.length}</strong> {recentPeople.length === 1 ? 'person' : 'people'} missed in the last four completed Sundays</span>
      <span class="text-muted-foreground">{repeatedCount} missed more than once</span>
    </div>
    {#if recentPeople.length}
      <div class="divide-y divide-border">
        {#each recentPeople as row (row.person_id)}
          {@const latest = row.missed_sundays.find(item => item.gathering_date >= window.start && item.gathering_date <= window.end)}
          {@const nextTask = row.next_task}
          <article class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" class="text-left font-semibold text-foreground hover:underline" onclick={() => onOpen(row.person)}>{personName(row.person)}</button>
                {#if row.missed_count > 1}<Badge size="sm" variant="warning">Repeated miss</Badge>{/if}
              </div>
              <p class="mt-1 text-sm text-muted-foreground">Missed {row.missed_count} of {row.decided_count} confirmed Sundays · latest {dateLabel(latest?.gathering_date)}</p>
              <p class="mt-1 text-sm text-foreground">Reason: {displayedReason(latest)}</p>
              <p class="mt-1 text-xs text-muted-foreground">Worker: {personName(row.assigned_leader)}{nextTask ? ` · ${String(nextTask.task_type || 'Follow-up').replaceAll('_', ' ')} due ${dateLabel(nextTask.due_date)}` : ' · No next call planned'}</p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-2">
              <Button size="sm" variant="secondary" onclick={() => onEditReason(latest)}> {displayedReason(latest) === 'Reason not recorded' ? 'Add reason' : 'Edit reason'}</Button>
              {#if nextTask}
                <Button size="sm" variant="ghost" onclick={() => onOpen(row.person)}>View person</Button>
              {:else if canPlan(row.person) && row.assigned_leader_id}
                <Button size="sm" onclick={() => onPlanCall(row)}>Plan a call</Button>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    {:else}
      <p class="px-5 py-12 text-center text-sm text-muted-foreground">No confirmed Sunday misses in the last four completed Sundays.</p>
    {/if}
  {:else if matchingHistory.length}
    <div class="divide-y divide-border">
      {#each matchingHistory as row (`${row.commitment._id || row.commitment.id}-${row.commitment.gathering_date}`)}
        <article class="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <button type="button" class="font-semibold text-foreground hover:underline" onclick={() => onOpen(row.person.person)}>{personName(row.person.person)}</button>
            <p class="mt-0.5 text-sm text-muted-foreground">{dateLabel(row.commitment.gathering_date)} · Worker: {personName(row.person.assigned_leader)}</p>
            <p class="mt-1 text-sm text-foreground">Reason: {displayedReason(row.commitment)}</p>
          </div>
          <Button size="sm" variant="secondary" onclick={() => onEditReason(row.commitment)}>{displayedReason(row.commitment) === 'Reason not recorded' ? 'Add reason' : 'Edit reason'}</Button>
        </article>
      {/each}
    </div>
  {:else}
    <p class="px-5 py-12 text-center text-sm text-muted-foreground">{historyRows.length ? 'No history matches your search.' : 'No missed Sunday confirmations have been recorded.'}</p>
  {/if}
</section>
