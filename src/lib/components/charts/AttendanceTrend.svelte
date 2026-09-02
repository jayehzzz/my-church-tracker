<!--
  Attendance Trend Chart
  Shows attendance over time with interactive line and bar views.
-->

<script>
  import ChartViewToggle from "./ChartViewToggle.svelte";

  /** @type {{ date: string, total: number, members?: number, guests?: number, id?: string, topic?: string }[]} */
  let {
    data = [],
    title = "Attendance Trend",
    itemLabel = "meetings",
    secondaryLabel = "Guests",
    onPointClick = null,
    onFilterClick = null,
    activeFilterCount = 0,
    comparisonOptions = [],
  } = $props();

  let hoveredIndex = $state(null);
  let chartType = $state("line");
  let comparisonKey = $state("");

  const chartWidth = 100;
  const chartHeight = 60;
  const padding = { top: 8, right: 8, bottom: 15, left: 8 };
  const chartBottom = chartHeight - padding.bottom;

  const chartData = $derived(() => {
    if (data.length === 0) return { points: [], maxValue: 0 };

    const maxValue = Math.max(...data.map((d) => Number(d.total) || 0), 1);
    const selectedComparison = comparisonOptions.find((option) => option.key === comparisonKey);
    const comparisonMax = selectedComparison
      ? Math.max(...data.map((d) => Number(d[selectedComparison.key]) || 0), 1)
      : 1;
    const chartInnerWidth = chartWidth - padding.left - padding.right;
    const chartInnerHeight = chartBottom - padding.top;
    const points = data.map((d, i) => ({
      ...d,
      x: padding.left + (i / Math.max(data.length - 1, 1)) * chartInnerWidth,
      y: padding.top + chartInnerHeight - ((Number(d.total) || 0) / maxValue) * chartInnerHeight,
      comparison: selectedComparison ? Number(d[selectedComparison.key]) || 0 : 0,
      comparisonY: selectedComparison
        ? padding.top + chartInnerHeight - ((Number(d[selectedComparison.key]) || 0) / comparisonMax) * chartInnerHeight
        : chartBottom,
      total: Number(d.total) || 0,
      guests: Number(d.guests) || 0,
      members: Number(d.members) || (Number(d.total) || 0) - (Number(d.guests) || 0),
      date: d.date,
      id: d.id,
      topic: d.topic || "",
      index: i,
    }));

    return { points, maxValue, comparisonMax };
  });

  $effect(() => {
    if (!comparisonOptions.length || !comparisonKey) return;
    if (!comparisonOptions.some((option) => option.key === comparisonKey)) comparisonKey = "";
  });

  const linePath = $derived(() => {
    const { points } = chartData();
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return path;
  });

  const areaPath = $derived(() => {
    const { points } = chartData();
    if (points.length === 0 || !linePath()) return "";
    return `${linePath()} L ${points[points.length - 1].x} ${chartBottom} L ${points[0].x} ${chartBottom} Z`;
  });

  const comparisonPath = $derived(() => {
    const points = chartData().points;
    if (!points.length || !comparisonKey) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].comparisonY}`;

    let path = `M ${points[0].x} ${points[0].comparisonY}`;
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      path += ` C ${cpx} ${prev.comparisonY}, ${cpx} ${curr.comparisonY}, ${curr.x} ${curr.comparisonY}`;
    }
    return path;
  });

  const selectedComparison = $derived(comparisonOptions.find((option) => option.key === comparisonKey));
  const comparisonColor = $derived(selectedComparison?.color || "warning");
  const comparisonColorValue = $derived.by(() => {
    const supportedColors = new Set(["primary", "success", "warning", "destructive"]);
    const color = supportedColors.has(comparisonColor) ? comparisonColor : "warning";
    return `hsl(var(--${color}))`;
  });

  const barWidth = $derived(() => {
    const count = chartData().points.length;
    return Math.max(2.5, Math.min(10, ((chartWidth - padding.left - padding.right) / Math.max(count, 1)) * 0.58));
  });

  function formatDate(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function formatFullDate(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  function handlePointClick(point, event) {
    event.stopPropagation();
    if (onPointClick && point.id) onPointClick(point);
  }

  const isClickable = $derived(() => !!onPointClick);
</script>

<div class="card-base overflow-visible p-4">
  <div class="mb-4 flex items-start justify-between gap-3 pr-12">
    <h3 class="text-sm font-medium text-muted-foreground">{title}</h3>
    <div class="flex flex-wrap items-center justify-end gap-2">
      {#if data.length > 0}<span class="text-xs text-muted-foreground">{data.length} {itemLabel}</span>{/if}
      {#if comparisonOptions.length}
        <label class="sr-only" for="{title.replace(/\W+/g, '-').toLowerCase()}-comparison">Compare attendance with</label>
        <div class="flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/30 px-2 py-1.5">
          <span class="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Compare with</span>
          <select id="{title.replace(/\W+/g, '-').toLowerCase()}-comparison" bind:value={comparisonKey} class="min-w-24 max-w-40 border-0 bg-transparent px-1 py-0.5 text-[11px] font-semibold text-foreground outline-none focus:ring-1 focus:ring-primary" aria-label="Compare attendance with">
            <option value="">None</option>
          {#each comparisonOptions as option}<option value={option.key}>{option.label}</option>{/each}
          </select>
        </div>
      {/if}
      <ChartViewToggle value={chartType} onChange={(next) => (chartType = next)} />
      {#if onFilterClick}
        <button type="button" onclick={() => onFilterClick(title)} class="flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground" aria-label={`Filter ${title}`}>
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-width="2" d="M3 4h18l-7 9v6l-4 2v-8L3 4z" /></svg>
          Filter
          {#if activeFilterCount > 0}<span class="rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none text-primary-foreground">{activeFilterCount}</span>{/if}
        </button>
      {/if}
    </div>
  </div>

  {#if data.length > 0}
    <div class="relative">
      <svg viewBox="0 0 {chartWidth} {chartHeight}" class="chart-svg h-44 w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label={`${title} ${chartType} chart`}>
        <title>{title} {chartType} view</title>
        <defs>
          <linearGradient id="attendanceAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color: hsl(var(--primary)); stop-opacity: 0.4" />
            <stop offset="100%" style="stop-color: hsl(var(--primary)); stop-opacity: 0.05" />
          </linearGradient>
          <linearGradient id="attendanceLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color: hsl(var(--primary)); stop-opacity: 0.8" />
            <stop offset="100%" style="stop-color: hsl(var(--primary)); stop-opacity: 1" />
          </linearGradient>
        </defs>

        {#each [0.25, 0.5, 0.75] as ratio}
          <line x1={padding.left} y1={padding.top + (chartBottom - padding.top) * (1 - ratio)} x2={chartWidth - padding.right} y2={padding.top + (chartBottom - padding.top) * (1 - ratio)} stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="1 2" />
        {/each}

        {#if chartType === "line"}
          <path d={areaPath()} fill="url(#attendanceAreaGradient)" />
          <path d={linePath()} fill="none" stroke="url(#attendanceLineGradient)" stroke-width="0.6" stroke-linecap="round" stroke-linejoin="round" />
          {#if selectedComparison}<path d={comparisonPath()} fill="none" stroke={comparisonColorValue} stroke-width="0.55" stroke-dasharray="1.2 0.8" stroke-linecap="round" stroke-linejoin="round" />{/if}
          {#each chartData().points as point, i}
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <circle cx={point.x} cy={point.y} r="3" fill="transparent" class={isClickable() ? "cursor-pointer" : ""} role={isClickable() ? "button" : "presentation"} tabindex={isClickable() ? 0 : -1} aria-label={isClickable() ? `View ${itemLabel.replace(/s$/, "")} on ${point.date}` : undefined} onmouseenter={() => (hoveredIndex = i)} onmouseleave={() => (hoveredIndex = null)} onfocus={() => (hoveredIndex = i)} onblur={() => (hoveredIndex = null)} onclick={(event) => handlePointClick(point, event)} onkeydown={(event) => event.key === "Enter" && handlePointClick(point, event)} />
            <circle cx={point.x} cy={point.y} r={hoveredIndex === i ? 1.8 : 1} class="fill-primary pointer-events-none" />
            {#if selectedComparison}<circle cx={point.x} cy={point.comparisonY} r="1" fill={comparisonColorValue} class="pointer-events-none" />{/if}
            <text x={point.x - (selectedComparison ? 1.5 : 0)} y={Math.max(padding.top + 2, point.y - 2)} text-anchor="middle" fill="hsl(var(--foreground))" stroke="hsl(var(--card))" stroke-width="0.9" paint-order="stroke" font-size="2.7" font-weight="600">{point.total}</text>
            {#if selectedComparison}<text x={point.x + 1.5} y={Math.max(padding.top + 2, point.comparisonY - 2)} text-anchor="middle" fill={comparisonColorValue} stroke="hsl(var(--card))" stroke-width="0.9" paint-order="stroke" font-size="2.5" font-weight="700">{point.comparison}</text>{/if}
            {#if hoveredIndex === i}<circle cx={point.x} cy={point.y} r="3" class="fill-primary/30 animate-pulse pointer-events-none" />{/if}
          {/each}
        {:else}
          {#each chartData().points as point, i}
            {@const width = barWidth()}
            <rect x={point.x - (selectedComparison ? width * 0.58 : width / 2)} y={point.y} width={selectedComparison ? width * 0.8 : width} height={Math.max(0, chartBottom - point.y)} rx="1.2" class="fill-primary/85 transition-all duration-200 {hoveredIndex === i ? 'brightness-125' : ''}" />
            {#if selectedComparison}<rect x={point.x + width * 0.05} y={point.comparisonY} width={width * 0.8} height={Math.max(0, chartBottom - point.comparisonY)} rx="1.2" fill={comparisonColorValue} fill-opacity="0.82" />{/if}
            <text x={point.x - (selectedComparison ? width * 0.58 : 0)} y={Math.max(padding.top + 2, point.y - 1.5)} text-anchor="middle" fill="hsl(var(--foreground))" stroke="hsl(var(--card))" stroke-width="0.9" paint-order="stroke" font-size="2.7" font-weight="600">{point.total}</text>
            {#if selectedComparison}<text x={point.x + width * 0.45} y={Math.max(padding.top + 2, point.comparisonY - 1.5)} text-anchor="middle" fill={comparisonColorValue} stroke="hsl(var(--card))" stroke-width="0.9" paint-order="stroke" font-size="2.5" font-weight="700">{point.comparison}</text>{/if}
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <rect x={point.x - Math.max(width, 3)} y={padding.top} width={Math.max(width * 2, 6)} height={chartBottom - padding.top} fill="transparent" class={isClickable() ? "cursor-pointer" : ""} role={isClickable() ? "button" : "presentation"} tabindex={isClickable() ? 0 : -1} aria-label={isClickable() ? `View ${itemLabel.replace(/s$/, "")} on ${point.date}` : undefined} onmouseenter={() => (hoveredIndex = i)} onmouseleave={() => (hoveredIndex = null)} onfocus={() => (hoveredIndex = i)} onblur={() => (hoveredIndex = null)} onclick={(event) => handlePointClick(point, event)} onkeydown={(event) => (event.key === "Enter" || event.key === " ") && handlePointClick(point, event)} />
          {/each}
        {/if}
      </svg>

      {#if hoveredIndex !== null}
        {@const point = chartData().points[hoveredIndex]}
        <div class="pointer-events-none absolute z-50 min-w-[160px] -translate-x-1/2 -translate-y-full transform rounded-lg border border-border bg-card p-3 shadow-xl" style={`left: ${(point.x / chartWidth) * 100}%; top: -10px;`}>
          <div class="mb-1 text-xs font-medium text-foreground">{formatFullDate(point.date)}</div>
          {#if point.topic}<div class="mb-2 line-clamp-1 text-xs text-muted-foreground">{point.topic}</div>{/if}
          <div class="flex items-center gap-3">
            <div><div class="text-lg font-bold text-primary">{point.total}</div><div class="text-[10px] text-muted-foreground">Total</div></div>
            <div class="h-6 w-px bg-border"></div>
            <div><div class="text-sm font-medium text-info">{point.guests}</div><div class="text-[10px] text-muted-foreground">{secondaryLabel}</div></div>
          </div>
          {#if isClickable() && point.id}<div class="mt-2 border-t border-border pt-2 text-center text-[10px] text-muted-foreground">Click to view details</div>{/if}
        </div>
      {/if}

      <div class="mt-2 flex justify-between px-1">
        <span class="text-[10px] text-muted-foreground">{formatDate(chartData().points[0]?.date)}</span>
        {#if chartData().points.length > 2}<span class="text-[10px] text-muted-foreground">{formatDate(chartData().points[Math.floor(chartData().points.length / 2)]?.date)}</span>{/if}
        <span class="text-[10px] text-muted-foreground">{formatDate(chartData().points[chartData().points.length - 1]?.date)}</span>
      </div>
      {#if selectedComparison}
        <p class="mt-2 text-center text-[10px] text-muted-foreground">Compared with {selectedComparison.label}; labels show actual values.</p>
      {/if}
    </div>

    <div class="mt-4 flex items-center justify-center gap-6 border-t border-border pt-4">
      <div class="text-center"><div class="text-lg font-bold text-foreground">{data[data.length - 1].total}</div><div class="text-xs text-muted-foreground">Latest</div></div>
      <div class="text-center"><div class="text-lg font-bold text-foreground">{Math.round(data.reduce((sum, item) => sum + (Number(item.total) || 0), 0) / data.length)}</div><div class="text-xs text-muted-foreground">Average</div></div>
      <div class="text-center"><div class="text-lg font-bold text-foreground">{Math.max(...data.map((item) => Number(item.total) || 0), 0)}</div><div class="text-xs text-muted-foreground">Peak</div></div>
    </div>
  {:else}
    <div class="flex h-44 items-center justify-center"><p class="text-sm italic text-muted-foreground">No attendance data available</p></div>
  {/if}
</div>
