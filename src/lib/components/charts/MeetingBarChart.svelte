<!--
  MeetingBarChart.svelte
  Accessible horizontal comparison chart for programme averages and roster rates.
-->

<script>
  let {
    data = [],
    title = "Programme comparison",
    subtitle = "",
    unit = "",
    color = "primary",
    onBarClick = null,
    onFilterClick = null,
    activeFilterCount = 0,
  } = $props();

  let hoveredIndex = $state(null);

  const chartWidth = 100;
  const labelWidth = 31;
  const valueWidth = 10;
  const rowHeight = 13;
  const topPadding = 4;
  const visibleData = $derived((data || []).slice(0, 8));
  const chartHeight = $derived(
    Math.max(42, topPadding * 2 + visibleData.length * rowHeight),
  );
  const maxValue = $derived(
    Math.max(...visibleData.map((item) => Number(item.value) || 0), 1),
  );
  const barColor = $derived(
    color === "success"
      ? "hsl(var(--success))"
      : color === "warning"
        ? "hsl(var(--warning))"
        : "hsl(var(--primary))",
  );

  function barWidth(value) {
    return (
      (Math.max(0, Number(value) || 0) / maxValue) *
      (chartWidth - labelWidth - valueWidth)
    );
  }

  function activate(item, event) {
    event.stopPropagation();
    onBarClick?.(item);
  }
</script>

<div class="card-base overflow-visible p-5">
  <div class="mb-4 flex items-start justify-between gap-3 pr-12">
    <div>
      <h3 class="text-sm font-semibold text-foreground">{title}</h3>
      {#if subtitle}
        <p class="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      {#if hoveredIndex !== null}
        <span class="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
          {visibleData[hoveredIndex].value}{unit}
        </span>
      {/if}
      {#if onFilterClick}
        <button
          type="button"
          onclick={() => onFilterClick(title)}
          class="relative flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
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
  </div>

  {#if visibleData.length}
    <svg
      viewBox="0 0 {chartWidth} {chartHeight}"
      class="chart-svg w-full overflow-visible"
      style="height: {Math.max(180, visibleData.length * 40)}px"
      role="img"
      aria-label={title}
    >
      {#each visibleData as item, index}
        {@const y = topPadding + index * rowHeight}
        {@const width = barWidth(item.value)}
        <text
          x="0"
          y={y + 6.1}
          class="fill-muted-foreground text-[3.4px]"
        >
          {item.label.length > 20 ? `${item.label.slice(0, 18)}…` : item.label}
        </text>
        <rect
          x={labelWidth}
          y={y + 1.5}
          width={chartWidth - labelWidth - valueWidth}
          height="6"
          rx="2"
          class="fill-secondary/50"
        />
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <rect
          x={labelWidth}
          y={y + 1.5}
          width={width}
          height="6"
          rx="2"
          fill={barColor}
          fill-opacity={hoveredIndex === index ? 1 : 0.78}
          class={onBarClick ? "cursor-pointer" : ""}
          role={onBarClick ? "button" : "presentation"}
          tabindex={onBarClick ? 0 : -1}
          aria-label={onBarClick ? `${item.label}: ${item.value}${unit}. View people.` : undefined}
          onmouseenter={() => (hoveredIndex = index)}
          onmouseleave={() => (hoveredIndex = null)}
          onfocus={() => (hoveredIndex = index)}
          onblur={() => (hoveredIndex = null)}
          onclick={(event) => activate(item, event)}
          onkeydown={(event) =>
            (event.key === "Enter" || event.key === " ") && activate(item, event)}
        />
        <text
          x={Math.min(labelWidth + width + 1.5, chartWidth - valueWidth + 1)}
          y={y + 6.1}
          class="fill-foreground text-[3.5px] font-semibold"
        >
          {item.value}{unit}
        </text>
      {/each}
    </svg>
    <div class="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
      <span>{visibleData.length} group{visibleData.length === 1 ? "" : "s"}</span>
      {#if onBarClick}<span>Click a bar to see people</span>{/if}
    </div>
  {:else}
    <div class="flex h-48 items-center justify-center">
      <p class="text-sm italic text-muted-foreground">No matching data</p>
    </div>
  {/if}
</div>
