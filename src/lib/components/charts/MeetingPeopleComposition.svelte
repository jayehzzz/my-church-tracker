<!--
  MeetingPeopleComposition.svelte
  Shows unique first timers, programme firsts, and established attendees.
-->

<script>
  import MetricComparison from "./MetricComparison.svelte";
  let {
    data = [],
    title = "People by attendance experience",
    onSegmentClick = null,
    onFilterClick = null,
    activeFilterCount = 0,
  } = $props();

</script>

<div class="card-base overflow-visible p-5">
  <div class="mb-4 flex items-start justify-between gap-3 pr-12">
    <div>
      <h3 class="text-base font-semibold text-foreground">{title}</h3>
      <p class="mt-1 text-xs text-muted-foreground">A simple count of where each person was in their attendance journey.</p>
    </div>
    {#if onFilterClick}
      <button
        type="button"
        onclick={() => onFilterClick(title)}
        class="flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        aria-label={`Filter ${title}`}
      >
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h18l-7 9v6l-4 2v-8L3 4z" />
        </svg>
        Filter
        {#if activeFilterCount > 0}
          <span class="rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none text-primary-foreground">{activeFilterCount}</span>
        {/if}
      </button>
    {/if}
  </div>

  {#if data.length}
    <MetricComparison metrics={data.map(item=>({key:item.label,label:item.label,total:item.value,item}))} periodLabel="Unique people in the selected period" onSelect={onSegmentClick ? metric=>onSegmentClick(metric.item) : null} />
    <p class="mt-3 text-xs text-muted-foreground">These are unique people across the whole period, so a per-meeting average does not apply.</p>
  {:else}
    <div class="flex h-48 items-center justify-center">
      <p class="text-sm italic text-muted-foreground">No matching data</p>
    </div>
  {/if}
</div>
