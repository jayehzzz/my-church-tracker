<script>
  import MultiSelectFilter from "$lib/components/filters/MultiSelectFilter.svelte";
  import ChartViewToggle from "./ChartViewToggle.svelte";
  import { getNiceYScale, groupChartPoints } from "$lib/utils/chartUtils.js";

  let { series = [], title = "Attendance over time", periodLabel = "Selected period", onPointClick = null, onFilterClick = null, activeFilterCount = 0 } = $props();
  const colors = ["#06b6d4", "#f59e0b", "#8b5cf6", "#10b981", "#f43f5e", "#3b82f6"];
  let selectedIds = $state([]);
  let initialised = $state(false);
  let hoveredPoint = $state(null);
  let granularity = $state("day");
  let chartType = $state("line");
  let granularityManuallySet = $state(false);

  $effect(() => {
    if (!granularityManuallySet) granularity = /year/i.test(periodLabel) ? "month" : "day";
  });

  const options = $derived(series.map((item) => ({ value: String(item.id), label: item.label })));
  $effect(() => {
    const valid = options.map((option) => option.value);
    if (!initialised && valid.length) {
      selectedIds = valid.slice(0, Math.min(2, valid.length));
      initialised = true;
    } else if (initialised && selectedIds.some((id) => !valid.includes(id))) {
      selectedIds = selectedIds.filter((id) => valid.includes(id));
    }
  });

  const selectedSeries = $derived(series.filter((item) => selectedIds.includes(String(item.id))).map((item, index) => ({ ...item, points: groupChartPoints(item.points || [], granularity, "average"), color: colors[index % colors.length] })));
  const chart = $derived.by(() => {
    const width = 760;
    const height = 340;
    const padding = { top: 32, right: 32, bottom: 56, left: 56 };
    const points = selectedSeries.flatMap((item) => item.points || []);
    const dates = [...new Set(points.map((point) => point.date))].sort();
    const bandWidth = (width - padding.left - padding.right) / Math.max(1, dates.length);
    const yScale = getNiceYScale(Math.max(...points.map((point) => Number(point.total) || 0), 1));
    const x = (date) => padding.left + (Math.max(0, dates.indexOf(date)) + 0.5) * bandWidth;
    const y = (value) => padding.top + (1 - (Number(value) || 0) / yScale.max) * (height - padding.top - padding.bottom);
    const plotted = selectedSeries.map((item) => ({ ...item, plottedPoints: (item.points || []).map((point) => ({ ...point, x: x(point.date), y: y(point.total) })) }));
    const step = Math.max(1, Math.ceil(dates.length / 6));
    const labels = Object.fromEntries(points.map((point) => [point.date, point.label]));
    return { width, height, padding, yScale, x, y, plotted, labels, bandWidth, dates: dates.filter((_, index) => index % step === 0 || index === dates.length - 1) };
  });

  function linePath(points) {
    return points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  }
  function formatDate(date) {
    return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  const measureLabel = $derived(granularity === "day" ? "actual attendance" : "average attendance per meeting");
</script>

<section class="card-base fullscreen-chart overflow-visible p-5" aria-labelledby="meeting-comparison-title">
  <header class="mb-4 flex flex-col gap-3 pr-12 xl:flex-row xl:items-start xl:justify-between">
    <div>
      <h3 id="meeting-comparison-title" class="text-base font-semibold text-foreground">{title}</h3>
      <p class="mt-0.5 text-xs text-muted-foreground">Compare {measureLabel} by {granularity} across selected meeting types.</p>
      <p class="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{periodLabel}</p>
    </div>
    <div class="grid min-w-0 gap-2 sm:grid-cols-[auto_auto_minmax(220px,1fr)_auto] sm:items-start">
      <label class="sr-only" for="meeting-comparison-granularity">Chart time scale</label>
      <select id="meeting-comparison-granularity" bind:value={granularity} onchange={() => (granularityManuallySet = true)} class="h-10 rounded-lg border border-border bg-input px-3 text-xs font-semibold text-foreground shadow-sm focus:border-primary" aria-label="Chart time scale">
        <option value="month">Month</option>
        <option value="week">Week</option>
        <option value="day">Day</option>
      </select>
      <ChartViewToggle value={chartType} onChange={(next) => (chartType = next)} label="Meeting comparison chart view" />
      <div class="w-64 max-w-full"><MultiSelectFilter label="Meetings shown" {options} bind:selected={selectedIds} placeholder="Search meetings…" /></div>
      {#if onFilterClick}
        <button type="button" class="flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground" onclick={() => onFilterClick(title)}>
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h18l-7 9v6l-4 2v-8L3 4z" /></svg>
          Filter{activeFilterCount ? ` (${activeFilterCount})` : ""}
        </button>
      {/if}
    </div>
  </header>

  {#if selectedSeries.length}
    <div class="mb-2 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
      {#each selectedSeries as item}<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" style="background: {item.color}"></span>{item.label}</span>{/each}
    </div>
    <div class="relative">
      <svg viewBox="0 0 {chart.width} {chart.height}" class="fullscreen-chart-svg h-auto w-full overflow-visible" style="height: {chart.height}px;" role="img" aria-label="Meeting attendance comparison chart">
        {#if hoveredPoint}
          <rect x={chart.x(hoveredPoint.date) - chart.bandWidth * 0.44} y={chart.padding.top} width={chart.bandWidth * 0.88} height={chart.height - chart.padding.top - chart.padding.bottom} rx="8" fill="hsl(var(--muted-foreground))" fill-opacity="0.06" class="pointer-events-none" />
          <line x1={chart.x(hoveredPoint.date)} x2={chart.x(hoveredPoint.date)} y1={chart.padding.top} y2={chart.height - chart.padding.bottom} stroke="hsl(var(--primary))" stroke-opacity="0.3" stroke-dasharray="2 3" class="pointer-events-none" />
        {/if}
        {#each chart.yScale.ticks as tick}
          {@const tickY = chart.y(tick)}
          <line x1={chart.padding.left} x2={chart.width - chart.padding.right} y1={tickY} y2={tickY} stroke="hsl(var(--border))" stroke-opacity="0.45" stroke-dasharray={tick ? "3 4" : "none"} />
          <text x={chart.padding.left - 9} y={tickY + 4} text-anchor="end" class="fill-muted-foreground text-[11px]">{tick}</text>
        {/each}
        {#each chart.dates as date}<text x={chart.x(date)} y={chart.height - 16} text-anchor="middle" class="fill-muted-foreground text-[11px]">{formatDate(date)}</text>{/each}
        {#each chart.plotted as item, seriesIndex}
          {#if chartType === "line"}
            {#if item.plottedPoints.length > 1}<path d={linePath(item.plottedPoints)} fill="none" stroke={item.color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />{/if}
            {#each item.plottedPoints as point}
              <circle cx={point.x} cy={point.y} r="5" fill="hsl(var(--card))" stroke={item.color} stroke-width="3" class="cursor-pointer" role="button" tabindex="0" aria-label={`${item.label}, ${point.label || formatDate(point.date)}, ${point.total} ${measureLabel}`} onmouseenter={() => (hoveredPoint = { ...point, seriesLabel: item.label })} onmouseleave={() => (hoveredPoint = null)} onfocus={() => (hoveredPoint = { ...point, seriesLabel: item.label })} onblur={() => (hoveredPoint = null)} onclick={() => granularity === 'day' && onPointClick?.(point)} onkeydown={(event) => { if (granularity === 'day' && (event.key === 'Enter' || event.key === ' ')) onPointClick?.(point); }} />
            {/each}
          {:else}
            {#each item.plottedPoints as point}
              {@const barWidth = Math.max(10, Math.min(32, (chart.bandWidth * 0.72 - (selectedSeries.length - 1) * 4) / selectedSeries.length))}
              {@const barX = point.x - (selectedSeries.length * barWidth + (selectedSeries.length - 1) * 4) / 2 + seriesIndex * (barWidth + 4)}
              {@const barHeight = Math.max(point.total > 0 ? 4 : 0, chart.height - chart.padding.bottom - point.y)}
              <rect x={barX} y={point.y} width={barWidth} height={barHeight} rx="5" fill={item.color} fill-opacity="0.9" class="cursor-pointer transition-all hover:opacity-100" role="button" tabindex="0" aria-label={`${item.label}, ${point.label || formatDate(point.date)}, ${point.total} ${measureLabel}`} onmouseenter={() => (hoveredPoint = { ...point, seriesLabel: item.label })} onmouseleave={() => (hoveredPoint = null)} onfocus={() => (hoveredPoint = { ...point, seriesLabel: item.label })} onblur={() => (hoveredPoint = null)} onclick={() => granularity === 'day' && onPointClick?.(point)} onkeydown={(event) => { if (granularity === 'day' && (event.key === 'Enter' || event.key === ' ')) onPointClick?.(point); }} />
              <text x={barX + barWidth / 2} y={point.y - 8} text-anchor="middle" class="fill-foreground text-[11px] font-semibold pointer-events-none">{point.total}</text>
            {/each}
          {/if}
        {/each}
      </svg>
      {#if hoveredPoint}<div class="pointer-events-none absolute z-30 min-w-[180px] -translate-x-1/2 rounded-xl border border-border/90 bg-card/95 p-3 text-xs shadow-2xl backdrop-blur-md" style="left: clamp(100px, {(hoveredPoint.x / chart.width * 100).toFixed(1)}%, calc(100% - 100px)); top: {Math.max(12, hoveredPoint.y - 92)}px;"><p class="font-semibold text-foreground">{hoveredPoint.seriesLabel}</p><p class="mt-1 text-muted-foreground">{formatDate(hoveredPoint.date)}</p><div class="mt-2 flex items-center justify-between border-t border-border/50 pt-2"><span class="text-muted-foreground">{measureLabel}</span><strong class="text-foreground">{hoveredPoint.total}</strong></div><p class="mt-2 text-primary">Click for people and meeting details</p></div>{/if}
    </div>
    <footer class="mt-4 grid grid-cols-3 divide-x divide-border border-t border-border pt-4 text-center">
      <div><p class="text-lg font-semibold text-foreground">{selectedSeries.reduce((sum, item) => sum + item.points.length, 0)}</p><p class="text-[11px] text-muted-foreground">Meetings shown</p></div>
      <div><p class="text-lg font-semibold text-primary">{Math.round(selectedSeries.flatMap((item) => item.points).reduce((sum, point) => sum + point.total, 0) / Math.max(1, selectedSeries.flatMap((item) => item.points).length))}</p><p class="text-[11px] text-muted-foreground">Average attendance</p></div>
      <div><p class="text-lg font-semibold text-foreground">{Math.max(0, ...selectedSeries.flatMap((item) => item.points).map((point) => point.total))}</p><p class="text-[11px] text-muted-foreground">Highest attendance</p></div>
    </footer>
  {:else}
    <div class="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/10 px-6 text-center"><p class="text-sm font-semibold text-foreground">Choose meetings to compare</p><p class="mt-1 text-xs text-muted-foreground">Use “Meetings shown” above; you can select more than one.</p></div>
  {/if}
</section>
