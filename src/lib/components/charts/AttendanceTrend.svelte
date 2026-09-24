<!--
  Attendance Trend Chart
  Shows attendance over time with interactive line and bar views.
  Adheres to the church dashboard standardized chart design system.
-->

<script>
  import { createChoice, createSelection } from "$lib/components/drilldown/selection.js";
  import { roundedAverage } from "$lib/utils/comparisonMetrics.js";
  import { pointInsight } from "$lib/utils/chartInsights.js";
  import ComparisonControls from "./ComparisonControls.svelte";
  import ChartPointDetails from "./ChartPointDetails.svelte";
  let detail = $state(null);
  import ChartViewToggle from "./ChartViewToggle.svelte";
  import {
    DEFAULT_CHART_DIMENSIONS,
    getNiceYScale,
    getBandCoordinates,
    groupChartPoints,
    makeSmoothCurve,
    makeAreaPath,
    formatChartDate,
    getChartColor,
  } from "$lib/utils/chartUtils.js";

  /** @type {{ date: string, total: number, members?: number, guests?: number, id?: string, topic?: string }[]} */
  let {
    data = [],
    title = "Attendance Trend",
    itemLabel = "meetings",
    periodLabel = "Selected period",
    onPointClick = null,
    onDrilldown = null,
    domain = "service",
    filters = {},
    onFilterClick = null,
    activeFilterCount = 0,
    comparisonOptions = [],
    wholeNumberValues = false,
    showSummaryFooter = true,
  } = $props();

  let hoveredIndex = $state(null);
  let chartType = $state("line");
  let primaryKey = $state("total");
  let comparisonKey = $state("");
  let granularity = $state("day");
  let granularityManuallySet = $state(false);
  let primaryAggregationMode = $state("average");
  let comparisonAggregationMode = $state("average");

  $effect(() => {
    if (!granularityManuallySet) granularity = /year/i.test(periodLabel) ? "month" : "day";
  });

  const { width: chartWidth, height: chartHeight, padding } = DEFAULT_CHART_DIMENSIONS;
  const innerWidth = chartWidth - padding.left - padding.right;
  const chartBottom = chartHeight - padding.bottom;
  const innerHeight = chartBottom - padding.top;

  const metricOptions = $derived.by(() => {
    const options = [{ key: "total", label: "Attendance", color: "primary" }, ...comparisonOptions];
    return options.filter((option, index) => options.findIndex((candidate) => candidate.key === option.key) === index);
  });

  const selectedPrimary = $derived(metricOptions.find((option) => option.key === primaryKey) || metricOptions[0]);
  const selectedComparison = $derived(metricOptions.find((option) => option.key === comparisonKey));


  function aggregateSeries(mode) {
    return groupChartPoints(data, granularity, mode === "total" ? "sum" : "average");
  }

  const chartData = $derived(() => {
    const primaryGrouped = aggregateSeries(primaryAggregationMode);
    const comparisonGrouped = selectedComparison ? aggregateSeries(comparisonAggregationMode) : [];
    if (primaryGrouped.length === 0) {
      return {
        points: [],
        maxValue: 0,
        yScale: getNiceYScale(0),
        bandWidth: innerWidth,
      };
    }

    const maxPrimary = Math.max(...primaryGrouped.map((d) => Number(d[selectedPrimary.key]) || 0), 0);
    const maxComparison = selectedComparison
      ? Math.max(...comparisonGrouped.map((d) => Number(d[selectedComparison.key]) || 0), 0)
      : 0;
    const overallMax = Math.max(maxPrimary, maxComparison, 1);
    const yScale = getNiceYScale(overallMax);

    const { bandWidth, getCenterX } = getBandCoordinates(primaryGrouped.length, innerWidth, padding.left);

    const points = primaryGrouped.map((d, i) => {
      const x = getCenterX(i);
      const primaryValue = Number(d[selectedPrimary.key]) || 0;
      const comparisonPoint = comparisonGrouped.find((candidate) => candidate.date === d.date) || comparisonGrouped[i];
      const y = padding.top + innerHeight - (primaryValue / yScale.max) * innerHeight;
      const compVal = selectedComparison ? Number(comparisonPoint?.[selectedComparison.key]) || 0 : 0;
      const compY = selectedComparison
        ? padding.top + innerHeight - (compVal / yScale.max) * innerHeight
        : chartBottom;

      return {
        ...d,
        comparisonPoint,
        x,
        y,
        primary: primaryValue,
        comparison: compVal,
        comparisonY: compY,
        total: primaryValue,
        guests: Number(d.guests) || 0,
        members: Number(d.members) || (Number(d.total) || 0) - (Number(d.guests) || 0),
        date: d.date,
        id: d.id,
        topic: d.topic || "",
        index: i,
        bandWidth,
      };
    });

    return {
      points,
      maxValue: maxPrimary,
      selectedComparison,
      yScale,
      bandWidth,
    };
  });

  $effect(() => {
    if (!metricOptions.some((option) => option.key === primaryKey)) primaryKey = "total";
    if (comparisonKey && !metricOptions.some((option) => option.key === comparisonKey)) comparisonKey = "";
  });

  // Series colours describe chart roles, not metric types. Keeping Series A
  // primary and Series B warning guarantees a visible distinction even when
  // Attendance is moved from the primary series into the comparison series.
  const comparisonColorValue = $derived(getChartColor("warning"));
  const primaryMetricLabel = $derived(selectedPrimary?.label || "Attendance");
  const primaryMetricLower = $derived(primaryMetricLabel.toLowerCase());
  const comparisonMetricLower = $derived((selectedComparison?.label || "comparison").toLowerCase());
  const pointMeasureLabel = $derived(
    granularity === "day"
      ? primaryMetricLabel
      : primaryAggregationMode === "total"
        ? `Total ${primaryMetricLower}`
        : `Average ${primaryMetricLower} per gathering`,
  );
  const latestMeasureLabel = $derived(
    granularity === "day"
      ? `Latest ${primaryMetricLower}`
      : primaryAggregationMode === "total"
        ? `Latest ${granularity} total ${primaryMetricLower}`
        : `Latest ${granularity} average ${primaryMetricLower}`,
  );
  const peakMeasureLabel = $derived(
    granularity === "day"
      ? `Highest ${primaryMetricLower}`
      : primaryAggregationMode === "total"
        ? `Highest ${granularity} total ${primaryMetricLower}`
        : `Highest ${granularity} average ${primaryMetricLower}`,
  );
  const averagePrimary = $derived(
    data.length ? roundedAverage(data.reduce((sum, item) => sum + (Number(item[selectedPrimary?.key]) || 0), 0), data.length) : 0,
  );
  const averageComparison = $derived(
    selectedComparison && data.length
      ? roundedAverage(data.reduce((sum, item) => sum + (Number(item[selectedComparison.key]) || 0), 0), data.length)
      : 0,
  );
  const periodAttendance = $derived(
    primaryAggregationMode === "total"
      ? data.reduce((sum, item) => sum + (Number(item[selectedPrimary?.key]) || 0), 0)
      : averagePrimary,
  );
  const periodComparison = $derived(
    selectedComparison && comparisonAggregationMode === "total"
      ? data.reduce((sum, item) => sum + (Number(item[selectedComparison.key]) || 0), 0)
      : averageComparison,
  );
  const periodMeasureLabel = $derived(
    primaryAggregationMode === "total" ? `Period total ${primaryMetricLower}` : `Overall average ${primaryMetricLower}`,
  );
  const comparisonMeasureLabel = $derived(
    comparisonAggregationMode === "total"
      ? `Period total ${comparisonMetricLower}`
      : `Overall average ${comparisonMetricLower}`,
  );

  function displayValue(value) {
    const numeric = Number(value) || 0;
    return wholeNumberValues ? Math.round(numeric) : numeric;
  }

  function handlePointClick(point, event) {
    event.preventDefault();
    event.stopPropagation();
    const choices = [
      createChoice({ domain, metricKey: selectedPrimary.key, mode: primaryAggregationMode, role: 'A', point, value: point.primary, filters }),
      selectedComparison && createChoice({ domain, metricKey: selectedComparison.key, mode: comparisonAggregationMode, role: 'B', point: point.comparisonPoint || point, value: point.comparison, filters }),
    ];
    const selection = createSelection(choices);
    if (onDrilldown) onDrilldown(selection);
    else if (onPointClick && point.id && granularity === "day") onPointClick(point, selection);
    else detail = {
      title: point.label || point.date,
      subtitle: `${title} · ${periodLabel}`,
      ...pointInsight(chartData().points, point.index, item => item.primary, pointMeasureLabel.toLowerCase()),
      metrics: [
        { label: pointMeasureLabel, value: displayValue(point.primary) },
        ...(selectedComparison ? [{ label: `${selectedComparison.label}${granularity === 'day' ? '' : ` (${comparisonAggregationMode})`}`, value: displayValue(point.comparison) }] : []),
      ],
    };
  }

  const isClickable = () => true;
</script>

<div class="card-base fullscreen-chart overflow-visible p-5" aria-labelledby="attendance-trend-title">
  <div class="mb-4 flex flex-col gap-3 pr-12">
    <div>
      <h3 id="attendance-trend-title" class="text-base font-semibold text-foreground">{title}</h3>
      {#if data.length > 0}
        <p class="mt-0.5 text-xs text-muted-foreground">{data.length} {itemLabel} recorded</p>
      {/if}
    </div>
    <div class="flex flex-wrap items-end gap-2 justify-start w-full">
      <label class="block text-xs text-muted-foreground">Group by
        <select bind:value={granularity} onchange={() => granularityManuallySet = true} class="ml-2 h-9 rounded-lg border border-border bg-input px-3 text-xs text-foreground" aria-label="Chart time scale"><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select>
      </label>
      <ChartViewToggle value={chartType} onChange={(next) => chartType = next} label="Attendance chart view" />
      <ComparisonControls options={metricOptions} bind:primaryKey bind:comparisonKey bind:primaryMode={primaryAggregationMode} bind:comparisonMode={comparisonAggregationMode} comparisonLabel="Compare attendance with" />
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
  </div>

  {#if selectedComparison || primaryKey !== "total"}
    <div class="mb-3 flex flex-wrap items-center justify-center gap-3 text-xs">
      <div class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-primary shadow-sm shadow-primary/40"></span>
        <span class="font-medium text-foreground">{pointMeasureLabel}</span>
      </div>
      {#if selectedComparison}
        <div class="flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 rounded-full shadow-sm" style="background-color: {comparisonColorValue};"></span>
          <span class="font-medium text-foreground">{granularity === "day" ? selectedComparison.label : comparisonAggregationMode === "total" ? `Total ${comparisonMetricLower}` : `Average ${comparisonMetricLower} per gathering`}</span>
        </div>
      {/if}
    </div>
  {/if}

  {#if data.length > 0}
    <div class="relative w-full">
      <svg
        viewBox="0 0 {chartWidth} {chartHeight}"
        class="fullscreen-chart-svg w-full h-auto overflow-visible"
        style="height: {chartHeight}px;"
        role="img"
        aria-label={`${title} ${chartType} chart shown by ${granularity}`}
      >
        <title>{`${title} ${chartType} view`}</title>
        <defs>
          <linearGradient id="attendanceAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="hsl(var(--primary))" stop-opacity="0.28" />
            <stop offset="85%" stop-color="hsl(var(--primary))" stop-opacity="0.03" />
            <stop offset="100%" stop-color="hsl(var(--primary))" stop-opacity="0.0" />
          </linearGradient>

          <linearGradient id="attendanceBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="hsl(var(--primary))" stop-opacity="0.98" />
            <stop offset="100%" stop-color="hsl(var(--primary))" stop-opacity="0.75" />
          </linearGradient>
        </defs>

        <!-- Horizontal Grid Lines and Y-Axis Ticks -->
        {#each chartData().yScale.ticks as tick}
          {@const yPos = padding.top + innerHeight - (tick / chartData().yScale.max) * innerHeight}
          <line
            x1={padding.left}
            y1={yPos}
            x2={chartWidth - padding.right}
            y2={yPos}
            stroke="hsl(var(--border))"
            stroke-opacity={tick === 0 ? "0.65" : "0.35"}
            stroke-dasharray={tick === 0 ? "none" : "3 4"}
          />
          <text
            x={padding.left - 8}
            y={yPos + 4}
            text-anchor="end"
            class="fill-muted-foreground/75 text-[11px] font-medium select-none pointer-events-none"
          >
            {tick}
          </text>
        {/each}

        <!-- Hover background band -->
        {#if hoveredIndex !== null && chartData().points[hoveredIndex]}
          {@const activePoint = chartData().points[hoveredIndex]}
          <rect
            x={activePoint.x - activePoint.bandWidth * 0.44}
            y={padding.top}
            width={activePoint.bandWidth * 0.88}
            height={innerHeight}
            fill="hsl(var(--muted-foreground))"
            fill-opacity="0.05"
            rx="8"
            class="pointer-events-none transition-all duration-150"
          />
          {#if chartType === "line"}
            <line
              x1={activePoint.x}
              y1={padding.top}
              x2={activePoint.x}
              y2={chartBottom}
              stroke="hsl(var(--primary))"
              stroke-opacity="0.3"
              stroke-dasharray="2 3"
              class="pointer-events-none"
            />
          {/if}
        {/if}

        {#if chartType === "line"}
          <!-- Gradient Area -->
          <path
            d={makeAreaPath(chartData().points, "y", chartBottom)}
            fill="url(#attendanceAreaGradient)"
            class="transition-opacity duration-300"
          />

          <!-- Primary Curve -->
          <path
            d={makeSmoothCurve(chartData().points, "y")}
            fill="none"
            stroke="hsl(var(--primary))"
            stroke-width="2.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="transition-all duration-300"
          />

          <!-- Comparison Curve (if active) -->
          {#if selectedComparison}
            <path
              d={makeSmoothCurve(chartData().points, "comparisonY")}
              fill="none"
              stroke={comparisonColorValue}
              stroke-width="2.25"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-dasharray="5 4"
              class="transition-all duration-300"
            />
          {/if}

          <!-- Data Points and Values -->
          {#each chartData().points as point, i}
            {@const isHovered = hoveredIndex === i}
            {@const valuesClose = selectedComparison && Math.abs(point.y - point.comparisonY) < 22}

            <!-- Primary Data Dot -->
            {#if isHovered}
              <circle
                cx={point.x}
                cy={point.y}
                r="13"
                fill="hsl(var(--primary))"
                fill-opacity="0.18"
                class="pointer-events-none"
              />
            {/if}
            <circle
              cx={point.x}
              cy={point.y}
              r={isHovered ? 5.5 : 4}
              fill="hsl(var(--card))"
              stroke="hsl(var(--primary))"
              stroke-width={isHovered ? 3 : 2.5}
              class="pointer-events-none transition-all duration-200"
            />
            <circle
              cx={point.x}
              cy={point.y}
              r="2"
              fill="hsl(var(--primary))"
              class="pointer-events-none"
            />

            <!-- Comparison Data Dot -->
            {#if selectedComparison}
              <circle
                cx={point.x}
                cy={point.comparisonY}
                r={isHovered ? 4.5 : 3.5}
                fill="hsl(var(--card))"
                stroke={comparisonColorValue}
                stroke-width="2"
                class="pointer-events-none transition-all duration-200"
              />
              <circle
                cx={point.x}
                cy={point.comparisonY}
                r="1.5"
                fill={comparisonColorValue}
                class="pointer-events-none"
              />
            {/if}

            <!-- Primary Value Label -->
            <text
              x={point.x}
              y={valuesClose && point.y > point.comparisonY ? point.y + 16 : point.y - 10}
              text-anchor="middle"
              class="fill-foreground text-xs font-semibold pointer-events-none select-none transition-colors duration-150 {isHovered ? 'fill-primary font-bold text-[13px]' : ''}"
            >
              {displayValue(point.total)}
            </text>

            <!-- Comparison Value Label -->
            {#if selectedComparison}
              <text
                x={point.x}
                y={valuesClose && point.comparisonY > point.y ? point.comparisonY + 16 : point.comparisonY - 10}
                text-anchor="middle"
                fill={comparisonColorValue}
                class="text-[11px] font-semibold pointer-events-none select-none transition-all duration-150"
              >
                {displayValue(point.comparison)}
              </text>
            {/if}

            <!-- Interactive Trigger -->
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <rect
              x={point.x - point.bandWidth / 2}
              y={padding.top}
              width={point.bandWidth}
              height={innerHeight}
              fill="transparent"
              class={isClickable() ? "cursor-pointer" : ""}
              role={isClickable() ? "button" : "presentation"}
              tabindex={isClickable() ? 0 : -1}
              aria-label={isClickable() ? `View ${point.label || point.date} details` : undefined}
              onmouseenter={() => (hoveredIndex = i)}
              onmouseleave={() => (hoveredIndex = null)}
              onfocus={() => (hoveredIndex = i)}
              onblur={() => (hoveredIndex = null)}
              onclick={(event) => handlePointClick(point, event)}
              onkeydown={(event) => (event.key === "Enter" || event.key === " ") && handlePointClick(point, event)}
            />
          {/each}
        {:else}
          {@const hasComparison = Boolean(selectedComparison)}
          {@const primaryWidth = hasComparison
            ? Math.min(26, Math.max(14, chartData().bandWidth * 0.28))
            : Math.min(48, Math.max(20, chartData().bandWidth * 0.42))}
          {@const barGap = 4}

          {#each chartData().points as point, i}
            {@const isHovered = hoveredIndex === i}
            {@const primaryHeight = Math.max(point.total > 0 ? 5 : 0, chartBottom - point.y)}

            {#if !hasComparison}
              <!-- Single Bar Mode -->
              {@const barX = point.x - primaryWidth / 2}
              <rect
                x={barX}
                y={point.y}
                width={primaryWidth}
                height={primaryHeight}
                rx="6"
                ry="6"
                fill="url(#attendanceBarGradient)"
                class="transition-all duration-200 {isHovered ? 'brightness-125 filter drop-shadow-[0_4px_12px_rgba(6,182,212,0.35)]' : 'brightness-100'}"
              />

              <!-- Value label above bar -->
              <text
                x={point.x}
                y={point.y - 8}
                text-anchor="middle"
                class="fill-foreground text-xs font-semibold select-none pointer-events-none transition-all {isHovered ? 'fill-primary font-bold' : ''}"
              >
                {displayValue(point.total)}
              </text>
            {:else}
              <!-- Clustered Two-Bar Mode -->
              {@const barXPrimary = point.x - primaryWidth - barGap / 2}
              {@const barXComparison = point.x + barGap / 2}
              {@const comparisonHeight = Math.max(point.comparison > 0 ? 5 : 0, chartBottom - point.comparisonY)}

              <rect
                x={barXPrimary}
                y={point.y}
                width={primaryWidth}
                height={primaryHeight}
                rx="5"
                ry="5"
                fill="url(#attendanceBarGradient)"
                class="transition-all duration-200 {isHovered ? 'brightness-125 filter drop-shadow-[0_3px_10px_rgba(6,182,212,0.3)]' : 'brightness-100'}"
              />

              <rect
                x={barXComparison}
                y={point.comparisonY}
                width={primaryWidth}
                height={comparisonHeight}
                rx="5"
                ry="5"
                fill={comparisonColorValue}
                fill-opacity="0.88"
                class="transition-all duration-200 {isHovered ? 'brightness-125 filter drop-shadow-[0_3px_10px_rgba(245,158,11,0.25)]' : 'brightness-100'}"
              />

              <text
                x={barXPrimary + primaryWidth / 2}
                y={point.y - 7}
                text-anchor="middle"
                class="fill-primary text-[11px] font-semibold select-none pointer-events-none"
              >
                {displayValue(point.total)}
              </text>

              <text
                x={barXComparison + primaryWidth / 2}
                y={point.comparisonY - 7}
                text-anchor="middle"
                fill={comparisonColorValue}
                class="text-[11px] font-semibold select-none pointer-events-none"
              >
                {displayValue(point.comparison)}
              </text>
            {/if}

            <!-- Interactive Trigger -->
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <rect
              x={point.x - point.bandWidth / 2}
              y={padding.top}
              width={point.bandWidth}
              height={innerHeight}
              fill="transparent"
              class={isClickable() ? "cursor-pointer" : ""}
              role={isClickable() ? "button" : "presentation"}
              tabindex={isClickable() ? 0 : -1}
              aria-label={isClickable() ? `View ${point.label || point.date} details` : undefined}
              onmouseenter={() => (hoveredIndex = i)}
              onmouseleave={() => (hoveredIndex = null)}
              onfocus={() => (hoveredIndex = i)}
              onblur={() => (hoveredIndex = null)}
              onclick={(event) => handlePointClick(point, event)}
              onkeydown={(event) => (event.key === "Enter" || event.key === " ") && handlePointClick(point, event)}
            />
          {/each}
        {/if}

        <!-- X-Axis Baseline -->
        <line
          x1={padding.left}
          y1={chartBottom}
          x2={chartWidth - padding.right}
          y2={chartBottom}
          stroke="hsl(var(--border))"
          stroke-opacity="0.75"
          stroke-width="1"
        />

        <!-- X-Axis Date Labels -->
        {#each chartData().points as point, i}
          {@const isHovered = hoveredIndex === i}
          <text
            x={point.x}
            y={chartBottom + 18}
            text-anchor="middle"
            class="text-xs transition-colors duration-150 select-none pointer-events-none {isHovered ? 'fill-foreground font-semibold' : 'fill-muted-foreground font-medium'}"
          >
            {granularity === "week" ? formatChartDate(point.date, "short") : point.label || formatChartDate(point.date, "short")}
          </text>
        {/each}
      </svg>

      <!-- Floating Hover Tooltip -->
      {#if hoveredIndex !== null && chartData().points[hoveredIndex]}
        {@const point = chartData().points[hoveredIndex]}
        {@const percentX = ((point.x / chartWidth) * 100).toFixed(1)}
        <div
          class="pointer-events-none absolute z-30 min-w-[170px] -translate-x-1/2 rounded-xl border border-border/90 bg-card/95 p-3 shadow-2xl backdrop-blur-md transition-all duration-100"
          style="left: clamp(90px, {percentX}%, calc(100% - 90px)); top: clamp(12px, {Math.max(12, point.y - 96)}px, calc(100% - 112px));"
        >
          <div class="mb-1 text-xs font-semibold text-foreground">{point.label || formatChartDate(point.date, 'full')}</div>
          {#if point.topic}
            <div class="mb-2 line-clamp-1 text-xs text-muted-foreground">{point.topic}</div>
          {/if}
          <div class="mt-2 space-y-1.5 border-t border-border/50 pt-2">
            <div class="flex items-center justify-between gap-3 text-xs">
              <span class="flex items-center gap-1.5 text-muted-foreground">
                <span class="h-2 w-2 rounded-full bg-primary"></span>
                {pointMeasureLabel}:
              </span>
              <span class="font-bold text-foreground">{displayValue(point.total)}</span>
            </div>
            {#if selectedComparison}
              <div class="flex items-center justify-between gap-3 text-xs">
                <span class="flex items-center gap-1.5 text-muted-foreground">
                  <span class="h-2 w-2 rounded-full" style="background-color: {comparisonColorValue};"></span>
                  {selectedComparison.label}:
                </span>
                <span class="font-bold" style="color: {comparisonColorValue};">{displayValue(point.comparison)}</span>
              </div>
            {/if}
          </div>
          {#if isClickable() && point.id}
            <div class="mt-2 border-t border-border/50 pt-2 text-center text-[10px] text-muted-foreground">
              Click to view details
            </div>
          {/if}
        </div>
      {/if}
    </div>

    {#if showSummaryFooter}
    <div class="mt-4 grid {selectedComparison ? 'grid-cols-2 gap-y-4 sm:grid-cols-4' : 'grid-cols-3'} border-t border-border pt-4">
      <div class="text-center">
        <div class="text-lg font-bold text-foreground">{displayValue(chartData().points[chartData().points.length - 1].total)}</div>
        <div class="text-xs text-muted-foreground">{latestMeasureLabel}</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-bold text-primary">{displayValue(periodAttendance)}</div>
        <div class="text-xs text-muted-foreground">{periodMeasureLabel}</div>
        <div class="mt-0.5 text-[10px] text-muted-foreground">{periodLabel}</div>
      </div>
      {#if selectedComparison}
        <div class="text-center">
          <div class="text-lg font-bold" style="color: {comparisonColorValue};">{displayValue(periodComparison)}</div>
          <div class="text-xs text-muted-foreground">{comparisonMeasureLabel}</div>
          <div class="mt-0.5 text-[10px] text-muted-foreground">{periodLabel}</div>
        </div>
      {/if}
      <div class="text-center">
        <div class="text-lg font-bold text-foreground">
          {displayValue(Math.max(...chartData().points.map((item) => Number(item.total) || 0), 0))}
        </div>
        <div class="text-xs text-muted-foreground">{peakMeasureLabel}</div>
      </div>
    </div>
    {/if}
  {:else}
    <div class="flex h-52 items-center justify-center">
      <p class="text-sm italic text-muted-foreground">No attendance data available</p>
    </div>
  {/if}
</div>

<ChartPointDetails bind:detail />
