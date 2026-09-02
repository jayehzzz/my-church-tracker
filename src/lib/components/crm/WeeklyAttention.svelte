<script>
  import Button from '$lib/components/ui/Button.svelte';

  let {
    dueCount = 0,
    overdueCount = 0,
    freshUnassignedCount = 0,
    confirmedCount = 0,
    expectedCount = 0,
    otherGatheringCount = 0,
    visitationCount = 0,
    quarterlyBacklogCount = 0,
    quarterlyActiveLimit = 10,
    onOpenTeam = () => {},
    onOpenSunday = () => {},
    onOpenVisitations = () => {},
  } = $props();
</script>

<section aria-labelledby="weekly-attention-title" class="rounded-2xl border border-border bg-card">
  <div class="border-b border-border px-5 py-4">
    <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Daily check-in</p>
    <h2 id="weekly-attention-title" class="mt-1 text-lg font-semibold text-foreground">What needs attention this week</h2>
    <p class="mt-1 text-sm text-muted-foreground">Open Today each day. The workspace checks again automatically when you return to it.</p>
  </div>

  <div class="grid grid-cols-1 divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
    <div class="p-5">
      <p class="text-sm font-semibold text-foreground">Follow-up now</p>
      <p class="mt-2 text-2xl font-semibold text-foreground">{dueCount}</p>
      <p class="mt-1 text-xs text-muted-foreground">{overdueCount ? `${overdueCount} overdue — start with these.` : 'Nothing overdue.'}</p>
    </div>
    <div class="p-5">
      <p class="text-sm font-semibold text-foreground">Fresh handoffs</p>
      <p class="mt-2 text-2xl font-semibold text-foreground">{freshUnassignedCount}</p>
      <p class="mt-1 text-xs text-muted-foreground">{freshUnassignedCount ? 'Fresh people still need a leader.' : 'Every fresh person has an owner.'}</p>
      {#if freshUnassignedCount}<Button class="mt-3" variant="secondary" size="sm" onclick={onOpenTeam}>Delegate now</Button>{/if}
    </div>
    <div class="p-5">
      <p class="text-sm font-semibold text-foreground">Sunday readiness</p>
      <p class="mt-2 text-2xl font-semibold text-foreground">{confirmedCount} <span class="text-sm font-normal text-muted-foreground">confirmed · {expectedCount} expected</span></p>
      <p class="mt-1 text-xs text-muted-foreground">{otherGatheringCount} confirmed for Bacenta or a special event this week.</p>
      <Button class="mt-3" variant="secondary" size="sm" onclick={onOpenSunday}>Review plans</Button>
    </div>
  </div>

  <div class="flex flex-col gap-2 border-t border-border px-5 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
    <p>{visitationCount} visitation follow-up{visitationCount === 1 ? '' : 's'} due this week. {quarterlyBacklogCount ? `${quarterlyBacklogCount} eligible 90-day check-ins are waiting;` : '90-day check-ins are current;'} at most {quarterlyActiveLimit} are active per leader so Today stays manageable.</p>
    {#if visitationCount}<Button variant="ghost" size="sm" onclick={onOpenVisitations}>View pastoral care</Button>{/if}
  </div>
</section>
