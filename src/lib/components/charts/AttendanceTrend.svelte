<!--
  Attendance Trend Chart
  Shows attendance over time with interactive line and bar views.
  Adheres to the church dashboard standardized chart design system.
-->

<script>
  import ChartViewToggle from "./ChartViewToggle.svelte";
  import SearchableSelect from "$lib/components/ui/SearchableSelect.svelte";
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
    onFilterClick = null,
    activeFilterCount = 0,
    comparisonOptions = [],
  } = $props();

  let hoveredIndex = $state(null);
  let chartType = $state("line");
  let comparisonKey = $state("");
  let granularity = $state("day");
  let granularityManuallySet = $state(false);

  $effect(() => {
    if (!granularityManuallySet) granularity = /year/i.test(periodLabel) ? "month" : "day";
  });

  const { width: chartWidth, height: chartHeight, padding } = DEFAULT_CHART_DIMENSIONS;
  const innerWidth = chartWidth - padding.left - padding.right;
  const chartBottom = chartHeight - padding.bottom;
  const innerHeight = chartBottom - padding.top;

  const chartData = $derived(() => {
    const groupedData = groupChartPoints(data, granularity, "average");
    if (groupedData.length === 0) {
      return {
        points: [],
        maxValue: 0,
        yScale: getNiceYScale(0),
        bandWidth: innerWidth,
      };
    }

    const selectedComparison = comparisonOptions.find((option) => option.key === comparisonKey);
    const maxPrimary = Math.max(...groupedData.map((d) => Number(d.total) || 0), 0);
    const maxComparison = selectedComparison
      ? Math.max(...groupedData.map((d) => Number(d[selectedComparison.key]) || 0), 0)
      : 0;
    const overallMax = Math.max(maxPrimary, maxComparison, 1);
    const yScale = getNiceYScale(overallMax);

    const { bandWidth, getCenterX } = getBandCoordinates(groupedData.length, innerWidth, padding.left);

    const points = groupedData.map((d, i) => {
      const x = getCenterX(i);
      const y = padding.top + innerHeight - ((Number(d.total) || 0) / yScale.max) * innerHeight;
      const compVal = selectedComparison ? Number(d[selectedComparison.key]) || 0 : 0;
      const compY = selectedComparison
        ? padding.top + innerHeight - (compVal / yScale.max) * innerHeight
        : chartBottom;

      return {
        ...d,
        x,
        y,
        comparison: compVal,
        comparisonY: compY,
        total: Number(d.total) || 0,
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
    if (!comparisonOptions.length || !comparisonKey) return;
    if (!comparisonOptions.some((option) => option.key === comparisonKey)) comparisonKey = "";
  });

  const selectedComparison = $derived(comparisonOptions.find((option) => option.key === comparisonKey));
  const comparisonColorValue = $derived(getChartColor(selectedComparison?.color || "warning"));
  const pointMeasureLabel = $derived(granularity === "day" ? "Actual attendance" : "Average attendance per gathering");
  const latestMeasureLabel = $derived(granularity === "day" ? "Latest actual" : `Latest ${granularity} average`);
  const peakMeasureLabel = $derived(granularity === "day" ? "Highest actual" : `Highest ${granularity} average`);
  const averageAttendance = $derived(
    data.length ? Math.round(data.reduce((sum, item) => sum + (Number(item.total) || 0), 0) / data.length) : 0,
  );
  const averageComparison = $derived(
    selectedComparison && data.length
      ? Math.round(data.reduce((sum, item) => sum + (Number(item[selectedComparison.key]) || 0), 0) / data.length)
      : 0,
  );

  function handlePointClick(point, event) {
    event.stopPropagation();
    if (onPointClick && point.id) onPointClick(point);
  }

  const isClickable = $derived(() => !!onPointClick && granularity === "day");
</script>

<div class="card-base fullscreen-chart overflow-visible p-5" aria-labelledby="attendance-trend-title">
  <div class="mb-4 flex flex-col gap-3 pr-12 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h3 id="attendance-trend-title" class="text-base font-semibold text-foreground">{title}</h3>
      {#if data.length > 0}
        <p class="mt-0.5 text-xs text-muted-foreground">{data.length} {itemLabel} recorded</p>
      {/if}
    </div>
    <div class="flex flex-wrap items-center justify-end gap-2">
      <label class="sr-only" for="{title.replace(/\W+/g, '-').toLowerCase()}-granularity">Chart time scale</label>
      <select id="{title.replace(/\W+/g, '-').toLowerCase()}-granularity" bind:value={granularity} onchange={() => (granularityManuallySet = true)} class="h-9 rounded-lg border border-border bg-input px-3 text-xs font-semibold text-foreground shadow-sm focus:border-primary" aria-label="Chart time scale">
        <option value="month">Month</option>
        <option value="week">Week</option>
        <option value="day">Day</option>
      </select>
      {#if comparisonOptions.length}
        <div class="w-52">
          <SearchableSelect
            id="{title.replace(/\W+/g, '-').toLowerCase()}-comparison"
            label="Compare with"
            ariaLabel="Compare attendance with"
            options={[{ value: "", label: "None" }, ...comparisonOptions.map((option) => ({ value: option.key, label: option.label }))]}
            bind:value={comparisonKey}
            placeholder="None"
          />
        </div>
      {/if}
      <ChartViewToggle value={chartType} onChange={(next) => (chartType = next)} label="Attendance chart view" />
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

  {#if selectedComparison}
    <div class="mb-3 flex items-center justify-center gap-5 text-xs">
      <div class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-primary shadow-sm shadow-primary/40"></span>
        <span class="font-medium text-foreground">{pointMeasureLabel}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full shadow-sm" style="background-color: {comparisonColorValue};"></span>
        <span class="font-medium text-foreground">{selectedComparison.label}</span>
      </div>
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
        {#if hoveredIndex !== null}
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
              {point.total}
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
                {point.comparison}
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
              aria-label={isClickable() ? `View ${itemLabel.replace(/s$/, "")} on ${point.date}` : undefined}
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
                {point.total}
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
                {point.total}
              </text>

              <text
                x={barXComparison + primaryWidth / 2}
                y={point.comparisonY - 7}
                text-anchor="middle"
                fill={comparisonColorValue}
                class="text-[11px] font-semibold select-none pointer-events-none"
              >
                {point.comparison}
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
              aria-label={isClickable() ? `View ${itemLabel.replace(/s$/, "")} on ${point.date}` : undefined}
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
      {#if hoveredIndex !== null}
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
              <span class="font-bold text-foreground">{point.total}</span>
            </div>
            {#if selectedComparison}
              <div class="flex items-center justify-between gap-3 text-xs">
                <span class="flex items-center gap-1.5 text-muted-foreground">
                  <span class="h-2 w-2 rounded-full" style="background-color: {comparisonColorValue};"></span>
                  {selectedComparison.label}:
                </span>
                <span class="font-bold" style="color: {comparisonColorValue};">{point.comparison}</span>
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

    <div class="mt-4 grid {selectedComparison ? 'grid-cols-4' : 'grid-cols-3'} border-t border-border pt-4">
      <div class="text-center">
        <div class="text-lg font-bold text-foreground">{chartData().points[chartData().points.length - 1].total}</div>
        <div class="text-xs text-muted-foreground">{latestMeasureLabel}</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-bold text-primary">{averageAttendance}</div>
        <div class="text-xs text-muted-foreground">Overall average attendance</div>
        <div class="mt-0.5 text-[10px] text-muted-foreground">{periodLabel}</div>
      </div>
      {#if selectedComparison}
        <div class="text-center">
          <div class="text-lg font-bold" style="color: {comparisonColorValue};">{averageComparison}</div>
          <div class="text-xs text-muted-foreground">Overall average {selectedComparison.label.toLowerCase()}</div>
          <div class="mt-0.5 text-[10px] text-muted-foreground">{periodLabel}</div>
        </div>
      {/if}
      <div class="text-center">
        <div class="text-lg font-bold text-foreground">
          {Math.max(...chartData().points.map((item) => Number(item.total) || 0), 0)}
        </div>
        <div class="text-xs text-muted-foreground">{peakMeasureLabel}</div>
      </div>
    </div>
  {:else}
    <div class="flex h-52 items-center justify-center">
      <p class="text-sm italic text-muted-foreground">No attendance data available</p>
    </div>
  {/if}
</div>
