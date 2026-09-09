<script>
  import ChartViewToggle from "$lib/components/charts/ChartViewToggle.svelte";
  import {
    DEFAULT_CHART_DIMENSIONS,
    getNiceYScale,
    getBandCoordinates,
    makeSmoothCurve,
    makeAreaPath,
    formatMonthLabel,
    getChartColor,
  } from "$lib/utils/chartUtils.js";

  let {
    data = [],
    title = "Outreach over time",
    subtitle = "Track outreach and the outcomes recorded each month.",
    periodLabel = "Selected period",
    comparisonOptions = [],
    onPointClick = null,
  } = $props();

  let chartType = $state("bar");
  let comparisonKey = $state("");
  let hoveredIndex = $state(null);

  const { width: chartWidth, height: chartHeight, padding } = DEFAULT_CHART_DIMENSIONS;
  const innerWidth = chartWidth - padding.left - padding.right;
  const chartBottom = chartHeight - padding.bottom;
  const innerHeight = chartBottom - padding.top;

  const chartData = $derived(() => {
    const rawPoints = (data || []).map((item, index) => ({
      ...item,
      index,
      count: Number(item.count) || 0,
      label: item.label || formatMonthLabel(item.month),
      monthLabel: formatMonthLabel(item.month),
    }));

    const selected = comparisonOptions.find((option) => option.key === comparisonKey);
    const maxRawCount = Math.max(...rawPoints.map((item) => item.count), 0);
    const maxComparisonRaw = selected
      ? Math.max(...rawPoints.map((item) => Number(item[selected.key]) || 0), 0)
      : 0;

    const overallMax = Math.max(maxRawCount, maxComparisonRaw, 1);
    const yScale = getNiceYScale(overallMax);

    const { bandWidth, getCenterX } = getBandCoordinates(rawPoints.length, innerWidth, padding.left);

    const points = rawPoints.map((item, i) => {
      const x = getCenterX(i);
      const y = padding.top + innerHeight - (item.count / yScale.max) * innerHeight;
      const comparisonVal = selected ? Number(item[selected.key]) || 0 : 0;
      const comparisonY = selected
        ? padding.top + innerHeight - (comparisonVal / yScale.max) * innerHeight
        : chartBottom;

      return {
        ...item,
        x,
        y,
        comparison: comparisonVal,
        comparisonY,
        bandWidth,
      };
    });

    return {
      selected,
      maxCount: maxRawCount,
      yScale,
      bandWidth,
      points,
    };
  });

  $effect(() => {
    if (comparisonKey && !comparisonOptions.some((option) => option.key === comparisonKey)) {
      comparisonKey = "";
    }
  });

  const comparisonColor = $derived(() => {
    return getChartColor(chartData().selected?.color || "warning");
  });
  const averageCount = $derived(
    chartData().points.length
      ? Math.round(chartData().points.reduce((sum, item) => sum + item.count, 0) / chartData().points.length)
      : 0,
  );
  const averageComparison = $derived(
    chartData().selected && chartData().points.length
      ? Math.round(chartData().points.reduce((sum, item) => sum + (Number(item[chartData().selected.key]) || 0), 0) / chartData().points.length)
      : 0,
  );

  function selectPoint(point, event) {
    event?.stopPropagation();
    onPointClick?.(point);
  }
</script>

<section class="card-base fullscreen-chart overflow-visible p-5" aria-labelledby="outreach-trend-title">
  <header class="mb-4 flex flex-col gap-3 pr-12 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h3 id="outreach-trend-title" class="text-base font-semibold text-foreground">{title}</h3>
      <p class="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      <p class="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{periodLabel}</p>
    </div>
    <div class="flex flex-wrap items-center justify-end gap-2">
      <label class="sr-only" for="outreach-comparison">Compare outreach with</label>
      <div class="flex items-center gap-2 rounded-xl border border-border bg-input px-2.5 py-1.5 shadow-sm">
        <span class="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Compare with</span>
        <select
          id="outreach-comparison"
          bind:value={comparisonKey}
          class="min-w-36 rounded-md border border-border bg-card px-2 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          aria-label="Compare outreach with"
        >
          <option value="">None</option>
          {#each comparisonOptions as option}
            <option value={option.key}>{option.label}</option>
          {/each}
        </select>
      </div>
      <ChartViewToggle value={chartType} onChange={(next) => (chartType = next)} label="Outreach chart view" />
    </div>
  </header>

  {#if chartData().selected}
    <div class="mb-3 flex items-center justify-center gap-5 text-xs">
      <div class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-primary shadow-sm shadow-primary/40"></span>
        <span class="font-medium text-foreground">Monthly contacts reached</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full shadow-sm" style="background-color: {comparisonColor()};"></span>
        <span class="font-medium text-foreground">{chartData().selected.label}</span>
      </div>
    </div>
  {/if}

  {#if chartData().points.length}
    <div class="relative w-full">
      <svg
        viewBox="0 0 {chartWidth} {chartHeight}"
        class="fullscreen-chart-svg w-full h-auto overflow-visible"
        style="height: {chartHeight}px;"
        role="img"
        aria-label={`${title} ${chartType} chart`}
      >
        <title>{`${title} ${chartType} view`}</title>

        <defs>
          <!-- Primary Area Gradient for Line View -->
          <linearGradient id="outreachPrimaryArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="hsl(var(--primary))" stop-opacity="0.28" />
            <stop offset="85%" stop-color="hsl(var(--primary))" stop-opacity="0.03" />
            <stop offset="100%" stop-color="hsl(var(--primary))" stop-opacity="0.0" />
          </linearGradient>

          <!-- Primary Bar Gradient -->
          <linearGradient id="outreachPrimaryBar" x1="0" y1="0" x2="0" y2="1">
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
            <!-- Vertical guide line -->
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

        <!-- Line Chart View -->
        {#if chartType === "line"}
          <!-- Gradient Area -->
          <path
            d={makeAreaPath(chartData().points, "y")}
            fill="url(#outreachPrimaryArea)"
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
          {#if chartData().selected}
            <path
              d={makeSmoothCurve(chartData().points, "comparisonY")}
              fill="none"
              stroke={comparisonColor()}
              stroke-width="2.25"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-dasharray="5 4"
              class="transition-all duration-300"
            />
          {/if}

          <!-- Data Points and Values -->
          {#each chartData().points as point, index}
            {@const isHovered = hoveredIndex === index}
            {@const valuesClose = chartData().selected && Math.abs(point.y - point.comparisonY) < 22}

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
            {#if chartData().selected}
              <circle
                cx={point.x}
                cy={point.comparisonY}
                r={isHovered ? 4.5 : 3.5}
                fill="hsl(var(--card))"
                stroke={comparisonColor()}
                stroke-width="2"
                class="pointer-events-none transition-all duration-200"
              />
              <circle
                cx={point.x}
                cy={point.comparisonY}
                r="1.5"
                fill={comparisonColor()}
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
              {point.count}
            </text>

            <!-- Comparison Value Label -->
            {#if chartData().selected}
              <text
                x={point.x}
                y={valuesClose && point.comparisonY > point.y ? point.comparisonY + 16 : point.comparisonY - 10}
                text-anchor="middle"
                fill={comparisonColor()}
                class="text-[11px] font-semibold pointer-events-none select-none transition-all duration-150"
              >
                {point.comparison}
              </text>
            {/if}

            <!-- Invisible accessible interactive trigger -->
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <rect
              x={point.x - point.bandWidth / 2}
              y={padding.top}
              width={point.bandWidth}
              height={innerHeight}
              fill="transparent"
              tabindex="0"
              role="button"
              aria-label={`${point.label}: ${point.count} contacts${chartData().selected ? `, ${point.comparison} ${chartData().selected.label.toLowerCase()}` : ""}`}
              onmouseenter={() => (hoveredIndex = index)}
              onmouseleave={() => (hoveredIndex = null)}
              onfocus={() => (hoveredIndex = index)}
              onblur={() => (hoveredIndex = null)}
              onclick={(event) => selectPoint(point, event)}
              onkeydown={(event) => (event.key === "Enter" || event.key === " ") && selectPoint(point, event)}
            />
          {/each}

        <!-- Bar Chart View -->
        {:else}
          {@const hasComparison = Boolean(chartData().selected)}
          {@const primaryWidth = hasComparison
            ? Math.min(26, Math.max(14, chartData().bandWidth * 0.28))
            : Math.min(48, Math.max(22, chartData().bandWidth * 0.42))}
          {@const barGap = 4}

          {#each chartData().points as point, index}
            {@const isHovered = hoveredIndex === index}
            {@const primaryHeight = Math.max(point.count > 0 ? 5 : 0, chartBottom - point.y)}

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
                fill="url(#outreachPrimaryBar)"
                class="transition-all duration-200 {isHovered ? 'brightness-125 filter drop-shadow-[0_4px_12px_rgba(6,182,212,0.35)]' : 'brightness-100'}"
              />

              <!-- Value label above bar -->
              <text
                x={point.x}
                y={point.y - 8}
                text-anchor="middle"
                class="fill-foreground text-xs font-semibold select-none pointer-events-none transition-all {isHovered ? 'fill-primary font-bold' : ''}"
              >
                {point.count}
              </text>

            {:else}
              <!-- Clustered Two-Bar Mode -->
              {@const barXPrimary = point.x - primaryWidth - barGap / 2}
              {@const barXComparison = point.x + barGap / 2}
              {@const comparisonHeight = Math.max(point.comparison > 0 ? 5 : 0, chartBottom - point.comparisonY)}

              <!-- Primary Bar -->
              <rect
                x={barXPrimary}
                y={point.y}
                width={primaryWidth}
                height={primaryHeight}
                rx="5"
                ry="5"
                fill="url(#outreachPrimaryBar)"
                class="transition-all duration-200 {isHovered ? 'brightness-125 filter drop-shadow-[0_3px_10px_rgba(6,182,212,0.3)]' : 'brightness-100'}"
              />

              <!-- Comparison Bar -->
              <rect
                x={barXComparison}
                y={point.comparisonY}
                width={primaryWidth}
                height={comparisonHeight}
                rx="5"
                ry="5"
                fill={comparisonColor()}
                fill-opacity="0.88"
                class="transition-all duration-200 {isHovered ? 'brightness-125 filter drop-shadow-[0_3px_10px_rgba(245,158,11,0.25)]' : 'brightness-100'}"
              />

              <!-- Primary Value Label -->
              <text
                x={barXPrimary + primaryWidth / 2}
                y={point.y - 7}
                text-anchor="middle"
                class="fill-primary text-[11px] font-semibold select-none pointer-events-none"
              >
                {point.count}
              </text>

              <!-- Comparison Value Label -->
              <text
                x={barXComparison + primaryWidth / 2}
                y={point.comparisonY - 7}
                text-anchor="middle"
                fill={comparisonColor()}
                class="text-[11px] font-semibold select-none pointer-events-none"
              >
                {point.comparison}
              </text>
            {/if}

            <!-- Invisible accessible interactive trigger -->
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <rect
              x={point.x - point.bandWidth / 2}
              y={padding.top}
              width={point.bandWidth}
              height={innerHeight}
              fill="transparent"
              tabindex="0"
              role="button"
              aria-label={`${point.label}: ${point.count} contacts${chartData().selected ? `, ${point.comparison} ${chartData().selected.label.toLowerCase()}` : ""}`}
              onmouseenter={() => (hoveredIndex = index)}
              onmouseleave={() => (hoveredIndex = null)}
              onfocus={() => (hoveredIndex = index)}
              onblur={() => (hoveredIndex = null)}
              onclick={(event) => selectPoint(point, event)}
              onkeydown={(event) => (event.key === "Enter" || event.key === " ") && selectPoint(point, event)}
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

        <!-- X-Axis Month & Year Labels -->
        {#each chartData().points as point, index}
          {@const isHovered = hoveredIndex === index}
          <text
            x={point.x}
            y={chartBottom + 18}
            text-anchor="middle"
            class="text-xs transition-colors duration-150 select-none pointer-events-none {isHovered ? 'fill-foreground font-semibold' : 'fill-muted-foreground font-medium'}"
          >
            {point.monthLabel}
          </text>
          {#if point.year}
            <text
              x={point.x}
              y={chartBottom + 31}
              text-anchor="middle"
              class="text-[10px] fill-muted-foreground/60 select-none pointer-events-none"
            >
              {point.year}
            </text>
          {/if}
        {/each}
      </svg>

      <!-- Floating Hover Tooltip -->
      {#if hoveredIndex !== null}
        {@const point = chartData().points[hoveredIndex]}
        {@const percentX = ((point.x / chartWidth) * 100).toFixed(1)}
        <div
          class="pointer-events-none absolute z-30 min-w-[170px] -translate-x-1/2 -translate-y-full transform rounded-xl border border-border/90 bg-card/95 p-3 shadow-2xl backdrop-blur-md transition-all duration-100"
          style="left: clamp(90px, {percentX}%, calc(100% - 90px)); top: -8px;"
        >
          <p class="text-xs font-semibold text-foreground">{point.monthLabel} {point.year || ""}</p>
          <div class="mt-2 space-y-1.5 border-t border-border/50 pt-2">
            <div class="flex items-center justify-between gap-3 text-xs">
              <span class="flex items-center gap-1.5 text-muted-foreground">
                <span class="h-2 w-2 rounded-full bg-primary"></span>
                Contacts in month:
              </span>
              <span class="font-bold text-foreground">{point.count}</span>
            </div>
            {#if chartData().selected}
              <div class="flex items-center justify-between gap-3 text-xs">
                <span class="flex items-center gap-1.5 text-muted-foreground">
                  <span class="h-2 w-2 rounded-full" style="background-color: {comparisonColor()};"></span>
                  {chartData().selected.label}:
                </span>
                <span class="font-bold" style="color: {comparisonColor()};">
                  {point.comparison}
                  {#if point.count > 0}
                    <span class="text-[10px] font-normal text-muted-foreground">
                      ({Math.round((point.comparison / point.count) * 100)}%)
                    </span>
                  {/if}
                </span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <!-- Stats Footer -->
    <footer class="mt-4 grid {chartData().selected ? 'grid-cols-4' : 'grid-cols-3'} divide-x divide-border border-t border-border pt-4 text-center">
      <div>
        <p class="text-lg font-semibold text-foreground">
          {chartData().points.reduce((sum, item) => sum + item.count, 0)}
        </p>
        <p class="text-[11px] text-muted-foreground">Total contacts in period</p>
      </div>
      <div>
        <p class="text-lg font-semibold text-primary">{averageCount}</p>
        <p class="text-[11px] text-muted-foreground">Average monthly contacts</p>
        <p class="text-[10px] text-muted-foreground">{periodLabel}</p>
      </div>
      {#if chartData().selected}
        <div>
          <p class="text-lg font-semibold" style="color: {comparisonColor()};">{averageComparison}</p>
          <p class="text-[11px] text-muted-foreground">Average monthly {chartData().selected.label.toLowerCase()}</p>
          <p class="text-[10px] text-muted-foreground">{periodLabel}</p>
        </div>
      {/if}
      <div>
        <p class="text-lg font-semibold text-foreground">{chartData().maxCount}</p>
        <p class="text-[11px] text-muted-foreground">Highest monthly contacts</p>
      </div>
    </footer>
  {:else}
    <div class="flex h-56 items-center justify-center text-sm text-muted-foreground">
      No outreach outcomes recorded for this period.
    </div>
  {/if}
</section>
