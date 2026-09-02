<script>
  import ChartViewToggle from "$lib/components/charts/ChartViewToggle.svelte";

  let {
    data = [],
    title = "Outreach over time",
    subtitle = "Track outreach and the outcomes recorded each month.",
    periodLabel = "Selected period",
    comparisonOptions = [],
  } = $props();

  let chartType = $state("line");
  let comparisonKey = $state("");
  let hoveredIndex = $state(null);

  const chartWidth = 100;
  const chartHeight = 62;
  const padding = { top: 8, right: 5, bottom: 15, left: 5 };
  const chartBottom = chartHeight - padding.bottom;

  const chartData = $derived(() => {
    const points = (data || []).map((item, index) => ({
      ...item,
      index,
      count: Number(item.count) || 0,
      label: item.label || formatMonth(item.month),
      monthLabel: formatMonth(item.month),
    }));
    const selected = comparisonOptions.find((option) => option.key === comparisonKey);
    const maxCount = Math.max(...points.map((item) => item.count), 1);
    const maxComparison = selected
      ? Math.max(...points.map((item) => Number(item[selected.key]) || 0), 1)
      : 1;
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartBottom - padding.top;

    return {
      selected,
      maxCount,
      maxComparison,
      points: points.map((item) => ({
        ...item,
        comparison: selected ? Number(item[selected.key]) || 0 : 0,
        x: points.length === 1
          ? chartWidth / 2
          : padding.left + (item.index / (points.length - 1)) * innerWidth,
        y: padding.top + innerHeight - (item.count / maxCount) * innerHeight,
        comparisonY: selected
          ? padding.top + innerHeight - ((Number(item[selected.key]) || 0) / maxComparison) * innerHeight
          : chartBottom,
      })),
    };
  });

  $effect(() => {
    if (comparisonKey && !comparisonOptions.some((option) => option.key === comparisonKey)) comparisonKey = "";
  });

  const primaryPath = $derived(() => makePath(chartData().points, "y"));
  const comparisonPath = $derived(() => makePath(chartData().points, "comparisonY"));
  const comparisonColor = $derived(() => {
    const color = chartData().selected?.color || "warning";
    return `hsl(var(--${color}))`;
  });

  function formatMonth(month) {
    const monthIndex = Number(month) - 1;
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthIndex] || month || "";
  }

  function makePath(points, key) {
    if (!points.length) return "";
    return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point[key]}`).join(" ");
  }

  function barHeight(value, max) {
    return Math.max(value > 0 ? 4 : 0, Math.round((value / max) * 100));
  }
</script>

<section class="card-base overflow-visible p-5" aria-labelledby="outreach-trend-title">
  <header class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h3 id="outreach-trend-title" class="text-base font-semibold text-foreground">{title}</h3>
      <p class="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      <p class="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{periodLabel}</p>
    </div>
    <div class="flex flex-wrap items-center justify-end gap-2">
      <label class="sr-only" for="outreach-comparison">Compare outreach with</label>
      <div class="flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/30 px-2 py-1.5">
        <span class="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Compare with</span>
        <select id="outreach-comparison" bind:value={comparisonKey} class="min-w-28 border-0 bg-transparent px-1 py-0.5 text-[11px] font-semibold text-foreground outline-none focus:ring-1 focus:ring-primary" aria-label="Compare outreach with">
          <option value="">None</option>
          {#each comparisonOptions as option}<option value={option.key}>{option.label}</option>{/each}
        </select>
      </div>
      <ChartViewToggle value={chartType} onChange={(next) => (chartType = next)} label="Outreach chart view" />
    </div>
  </header>

  {#if chartData().points.length}
    <div class="relative">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} class="h-64 w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label={`${title} ${chartType} chart`}>
        <title>{title} {chartType} view</title>
        {#each [0.25, 0.5, 0.75] as ratio}
          <line x1={padding.left} y1={padding.top + (chartBottom - padding.top) * (1 - ratio)} x2={chartWidth - padding.right} y2={padding.top + (chartBottom - padding.top) * (1 - ratio)} stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="1 2" />
        {/each}

        {#if chartType === "line"}
          <path d={primaryPath()} fill="none" stroke="hsl(var(--primary))" stroke-width="0.7" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
          {#if chartData().selected}<path d={comparisonPath()} fill="none" stroke={comparisonColor()} stroke-width="0.65" stroke-dasharray="1.5 1" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />{/if}
          {#each chartData().points as point, index}
            <circle cx={point.x} cy={point.y} r={hoveredIndex === index ? 2.2 : 1.3} fill="hsl(var(--primary))" class="transition-all" />
            {#if chartData().selected}<circle cx={point.x} cy={point.comparisonY} r="1.2" fill={comparisonColor()} />{/if}
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <circle cx={point.x} cy={point.y} r="4" fill="transparent" tabindex="0" role="button" aria-label={`${point.label}: ${point.count} contacts${chartData().selected ? `, ${point.comparison} ${chartData().selected.label.toLowerCase()}` : ""}`} onmouseenter={() => (hoveredIndex = index)} onmouseleave={() => (hoveredIndex = null)} onfocus={() => (hoveredIndex = index)} onblur={() => (hoveredIndex = null)} />
            <text x={point.x} y={Math.max(padding.top + 2, point.y - 2.5)} text-anchor="middle" fill="hsl(var(--foreground))" stroke="hsl(var(--card))" stroke-width="0.9" paint-order="stroke" font-size="2.8" font-weight="600">{point.count}</text>
            {#if chartData().selected}<text x={point.x} y={Math.max(padding.top + 2, point.comparisonY - 2.5)} text-anchor="middle" fill={comparisonColor()} stroke="hsl(var(--card))" stroke-width="0.9" paint-order="stroke" font-size="2.5" font-weight="700">{point.comparison}</text>{/if}
          {/each}
        {:else}
          {#each chartData().points as point, index}
            {@const width = chartData().selected ? 4.2 : 6}
            <rect x={point.x - (chartData().selected ? width * 0.95 : width / 2)} y={point.y} width={width} height={Math.max(0, chartBottom - point.y)} rx="1" fill="hsl(var(--primary))" fill-opacity={hoveredIndex === index ? "1" : "0.82"} />
            {#if chartData().selected}<rect x={point.x + width * 0.05} y={point.comparisonY} width={width} height={Math.max(0, chartBottom - point.comparisonY)} rx="1" fill={comparisonColor()} fill-opacity="0.85" />{/if}
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <rect x={point.x - 4} y={padding.top} width="8" height={chartBottom - padding.top} fill="transparent" tabindex="0" role="button" aria-label={`${point.label}: ${point.count} contacts${chartData().selected ? `, ${point.comparison} ${chartData().selected.label.toLowerCase()}` : ""}`} onmouseenter={() => (hoveredIndex = index)} onmouseleave={() => (hoveredIndex = null)} onfocus={() => (hoveredIndex = index)} onblur={() => (hoveredIndex = null)} />
            <text x={point.x - (chartData().selected ? width * 0.95 : 0)} y={Math.max(padding.top + 2, point.y - 2)} text-anchor="middle" fill="hsl(var(--foreground))" stroke="hsl(var(--card))" stroke-width="0.9" paint-order="stroke" font-size="2.8" font-weight="600">{point.count}</text>
            {#if chartData().selected}<text x={point.x + width * 1.05} y={Math.max(padding.top + 2, point.comparisonY - 2)} text-anchor="middle" fill={comparisonColor()} stroke="hsl(var(--card))" stroke-width="0.9" paint-order="stroke" font-size="2.5" font-weight="700">{point.comparison}</text>{/if}
          {/each}
        {/if}
      </svg>

      {#if hoveredIndex !== null}
        {@const point = chartData().points[hoveredIndex]}
        <div class="pointer-events-none absolute z-20 min-w-[165px] -translate-x-1/2 -translate-y-full transform rounded-lg border border-border bg-card p-3 shadow-xl" style={`left: ${(point.x / chartWidth) * 100}%; top: 0;`}>
          <p class="text-xs font-medium text-foreground">{point.label} {point.year}</p>
          <div class="mt-2 flex items-center gap-3">
            <div><p class="text-lg font-bold text-primary">{point.count}</p><p class="text-[10px] text-muted-foreground">Contacts</p></div>
            {#if chartData().selected}<div class="h-7 w-px bg-border"></div><div><p class="text-lg font-bold" style={`color: ${comparisonColor()}`}>{point.comparison}</p><p class="text-[10px] text-muted-foreground">{chartData().selected.label}</p></div>{/if}
          </div>
        </div>
      {/if}

      <div class="mt-1 flex justify-between gap-2 px-1">
        {#each chartData().points as point}<span class="min-w-0 flex-1 truncate text-center text-[10px] font-medium text-muted-foreground sm:text-xs">{point.monthLabel}</span>{/each}
      </div>
    </div>

    <footer class="mt-4 grid grid-cols-3 divide-x divide-border border-t border-border pt-4 text-center">
      <div><p class="text-lg font-semibold text-foreground">{chartData().points.reduce((sum, item) => sum + item.count, 0)}</p><p class="text-[11px] text-muted-foreground">Total contacts</p></div>
      <div><p class="text-lg font-semibold text-foreground">{Math.round(chartData().points.reduce((sum, item) => sum + item.count, 0) / chartData().points.length)}</p><p class="text-[11px] text-muted-foreground">Avg/month</p></div>
      <div><p class="text-lg font-semibold text-primary">{chartData().maxCount}</p><p class="text-[11px] text-muted-foreground">Peak month</p></div>
    </footer>
  {:else}
    <div class="flex h-64 items-center justify-center text-sm text-muted-foreground">No outreach outcomes recorded for this period.</div>
  {/if}
</section>
