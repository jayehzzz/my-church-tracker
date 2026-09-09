<!--
  MeetingPeopleComposition.svelte
  Shows unique first timers, programme firsts, and established attendees.
-->

<script>
  let {
    data = [],
    title = "People by attendance experience",
    onSegmentClick = null,
    onFilterClick = null,
    activeFilterCount = 0,
  } = $props();

  const colors = [
    "hsl(var(--warning))",
    "hsl(var(--success))",
    "hsl(var(--primary))",
  ];
  const descriptions = {
    "First timers": "Their first recorded church gathering",
    "Programme firsts": "Their first time at this meeting programme",
    Established: "They had attended this programme before",
  };

  function activate(item, event) {
    event.stopPropagation();
    onSegmentClick?.(item);
  }
</script>

<div class="card-base overflow-visible p-5">
  <div class="mb-4 flex items-start justify-between gap-3 pr-12">
    <div>
      <h3 class="text-sm font-semibold text-foreground">{title}</h3>
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
    <div class="grid gap-3 sm:grid-cols-3">
      {#each data as item, index}
        <button
          type="button"
          onclick={(event) => activate(item, event)}
          class="rounded-xl border border-border bg-secondary/15 p-4 text-left transition-colors hover:border-primary/40 hover:bg-secondary/35"
        >
          <span class="flex items-center justify-between gap-3">
            <span class="block text-xs font-semibold text-foreground">{item.label}</span>
            <span class="h-2.5 w-2.5 rounded-full" style="background: {colors[index % colors.length]}"></span>
          </span>
          <span class="mt-3 block text-3xl font-semibold text-foreground">{item.value}</span>
          <span class="mt-1 block text-[11px] leading-4 text-muted-foreground">{descriptions[item.label] || "Unique people in this group"}</span>
          {#if onSegmentClick}<span class="mt-3 block text-[11px] font-medium text-primary">View people →</span>{/if}
        </button>
      {/each}
    </div>
  {:else}
    <div class="flex h-48 items-center justify-center">
      <p class="text-sm italic text-muted-foreground">No matching data</p>
    </div>
  {/if}
</div>
