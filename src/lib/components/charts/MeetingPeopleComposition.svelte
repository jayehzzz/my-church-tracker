<!--
  MeetingPeopleComposition.svelte
  Shows unique first timers, programme firsts, and established attendees.
-->

<script>
  let {
    data = [],
    title = "Attendance journey",
    onSegmentClick = null,
    onFilterClick = null,
    activeFilterCount = 0,
  } = $props();

  let hoveredIndex = $state(null);
  const colors = [
    "hsl(var(--warning))",
    "hsl(var(--success))",
    "hsl(var(--primary))",
  ];
  const maxValue = $derived(
    Math.max(...(data || []).map((item) => Number(item.value) || 0), 1),
  );

  function heightFor(value) {
    return (Math.max(0, Number(value) || 0) / maxValue) * 35;
  }

  function activate(item, event) {
    event.stopPropagation();
    onSegmentClick?.(item);
  }
</script>

<div class="card-base overflow-visible p-5">
  <div class="mb-4 flex items-start justify-between gap-3 pr-12">
    <div>
      <h3 class="text-sm font-semibold text-foreground">{title}</h3>
      <p class="mt-1 text-xs text-muted-foreground">
        Unique people in the selected period
      </p>
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
    <div class="relative">
      <svg
        viewBox="0 0 100 55"
        class="chart-svg h-52 w-full overflow-visible"
        role="img"
        aria-label={title}
      >
        {#each [0.25, 0.5, 0.75, 1] as ratio}
          <line
            x1="8"
            y1={43 - 35 * ratio}
            x2="94"
            y2={43 - 35 * ratio}
            stroke="currentColor"
            stroke-opacity="0.1"
            stroke-dasharray="1 2"
          />
        {/each}
        {#each data as item, index}
          {@const x = 14 + index * 29}
          {@const height = heightFor(item.value)}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <rect
            x={x}
            y={43 - height}
            width="17"
            height={height}
            rx="2.5"
            fill={colors[index % colors.length]}
            fill-opacity={hoveredIndex === index ? 1 : 0.8}
            class={onSegmentClick ? "cursor-pointer" : ""}
            role={onSegmentClick ? "button" : "presentation"}
            tabindex={onSegmentClick ? 0 : -1}
            aria-label={onSegmentClick ? `${item.label}: ${item.value}. View people.` : undefined}
            onmouseenter={() => (hoveredIndex = index)}
            onmouseleave={() => (hoveredIndex = null)}
            onfocus={() => (hoveredIndex = index)}
            onblur={() => (hoveredIndex = null)}
            onclick={(event) => activate(item, event)}
            onkeydown={(event) =>
              (event.key === "Enter" || event.key === " ") && activate(item, event)}
          />
          <text
            x={x + 8.5}
            y={Math.max(6, 41 - height)}
            text-anchor="middle"
            class="fill-foreground text-[4px] font-semibold"
          >{item.value}</text>
          <text
            x={x + 8.5}
            y="49"
            text-anchor="middle"
            class="fill-muted-foreground text-[3.2px]"
          >{item.label === "Programme firsts" ? "Programme 1sts" : item.label}</text>
        {/each}
      </svg>
    </div>
    <div class="mt-2 grid grid-cols-3 gap-2 border-t border-border pt-3">
      {#each data as item, index}
        <button
          type="button"
          onclick={(event) => activate(item, event)}
          class="rounded-lg p-2 text-center hover:bg-secondary/40"
        >
          <span class="mx-auto mb-1 block h-2 w-2 rounded-full" style="background: {colors[index % colors.length]}"></span>
          <span class="block text-[11px] text-muted-foreground">{item.label}</span>
        </button>
      {/each}
    </div>
  {:else}
    <div class="flex h-48 items-center justify-center">
      <p class="text-sm italic text-muted-foreground">No matching data</p>
    </div>
  {/if}
</div>
