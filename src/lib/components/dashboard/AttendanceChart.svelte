<script>
  import ChartViewToggle from "$lib/components/charts/ChartViewToggle.svelte";

  let {
    data = [],
    title = "Attendance & guests",
    contextLabel = "Selected period",
  } = $props();

  let chartType = $state("bar");

  const chartData = $derived((data || []).map((item) => ({
    ...item,
    label: item.label || item.month || "",
    attendance: Number(item.attendance) || 0,
    guests: Number(item.guests) || 0,
  })));
  const hasData = $derived(chartData.length > 0);
  const maxAttendance = $derived(hasData ? Math.max(...chartData.map((item) => item.attendance), 1) : 1);
  const averageAttendance = $derived(
    hasData ? Math.round(chartData.reduce((sum, item) => sum + item.attendance, 0) / chartData.length) : 0,
  );
  const guestTotal = $derived(chartData.reduce((sum, item) => sum + item.guests, 0));
  const attendanceChange = $derived.by(() => {
    if (chartData.length < 2 || !chartData[0].attendance) return null;
    const first = chartData[0].attendance;
    const last = chartData[chartData.length - 1].attendance;
    return Math.round(((last - first) / first) * 100);
  });

  const linePoints = $derived.by(() => {
    const max = maxAttendance || 1;
    return chartData.map((item, index) => ({
      ...item,
      x: chartData.length === 1 ? 50 : (index / (chartData.length - 1)) * 100,
      y: 100 - (item.attendance / max) * 86,
      guestY: 100 - (item.guests / max) * 86,
    }));
  });
  const linePath = $derived(
    linePoints.length > 0
      ? linePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
      : "",
  );
  const guestLinePath = $derived(
    linePoints.length > 0
      ? linePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.guestY}`).join(" ")
      : "",
  );

  function barHeight(value) {
    return Math.max(5, Math.round((value / maxAttendance) * 100));
  }
</script>

<section class="chart-card" aria-labelledby="attendance-title">
  <header class="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Church health</p>
      <h2 id="attendance-title" class="mt-1.5 text-lg font-semibold text-foreground">{title}</h2>
      <p class="mt-1 text-xs text-muted-foreground">{contextLabel}</p>
    </div>
    <div class="flex flex-wrap items-center justify-end gap-3 text-xs text-muted-foreground" aria-label="Chart legend">
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm bg-primary"></span>Attendance</span>
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm bg-warning"></span>Guests</span>
      <ChartViewToggle value={chartType} onChange={(next) => (chartType = next)} />
    </div>
  </header>

  {#if hasData}
    <div class="px-4 pb-3 pt-5 sm:px-5">
      <div class="relative h-[258px]">
        <div class="pointer-events-none absolute inset-x-0 bottom-10 top-7 flex flex-col justify-between" aria-hidden="true">
          {#each [1, 2, 3, 4] as _}<span class="block border-t border-border/60"></span>{/each}
        </div>

        {#if chartType === "bar"}
          <div class="absolute inset-x-0 bottom-0 top-7 flex gap-2 sm:gap-3">
            {#each chartData as item}
              <button type="button" class="group grid h-full min-w-0 flex-1 grid-rows-[minmax(0,1fr)_2rem] gap-2 rounded-md focus-visible:ring-offset-0" aria-label={`${item.label}: ${item.attendance} attendees, ${item.guests} guests`}>
                <span class="relative flex min-h-0 items-end justify-center">
                  <span class="flex h-full w-full max-w-16 items-end justify-center gap-1">
                    <span class="relative flex h-full w-1/2 max-w-8 flex-col justify-end" style={`height: ${barHeight(item.attendance)}%`}>
                      <span class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold tabular-nums text-foreground sm:text-xs">{item.attendance}</span>
                      <span class="h-full w-full rounded-t-lg bg-gradient-to-t from-primary/55 to-primary transition-all duration-200 group-hover:brightness-110"></span>
                    </span>
                    <span class="relative flex h-full w-1/2 max-w-8 flex-col justify-end" style={`height: ${barHeight(item.guests)}%`}>
                      <span class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold tabular-nums text-warning sm:text-xs">{item.guests}</span>
                      <span class="h-full w-full rounded-t-lg bg-gradient-to-t from-warning/55 to-warning transition-all duration-200 group-hover:brightness-110"></span>
                    </span>
                  </span>
                </span>
                <span class="flex h-8 items-center justify-center whitespace-nowrap text-[10px] font-medium text-muted-foreground transition-colors group-hover:text-foreground sm:text-xs">{item.label}</span>
              </button>
            {/each}
          </div>
        {:else}
          <div class="absolute inset-x-0 bottom-9 top-7">
            <svg viewBox="0 0 100 100" class="h-full w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label={`${title} line chart`}>
              <path d={linePath} fill="none" stroke="hsl(var(--primary))" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
              <path d={guestLinePath} fill="none" stroke="hsl(var(--warning))" stroke-width="1" stroke-dasharray="3 2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
              {#each linePoints as point}
                <circle cx={point.x} cy={point.y} r="1.7" fill="hsl(var(--primary))" vector-effect="non-scaling-stroke" />
                <circle cx={point.x} cy={point.guestY} r="1.5" fill="hsl(var(--warning))" vector-effect="non-scaling-stroke" />
              {/each}
            </svg>
            <div class="absolute inset-x-0 -bottom-9 flex justify-between gap-2">
              {#each chartData as item}<span class="min-w-0 flex-1 truncate text-center text-[10px] font-medium text-muted-foreground sm:text-xs">{item.label}</span>{/each}
            </div>
            <div class="absolute inset-x-0 -top-6 flex justify-between gap-2">
              {#each chartData as item}<span class="min-w-0 flex-1 text-center text-xs font-semibold tabular-nums text-foreground">{item.attendance}</span>{/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="flex h-[300px] flex-col items-center justify-center px-6 text-center">
      <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-muted-foreground" aria-hidden="true">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M4 19V9m5 10V5m5 14v-7m5 7V3" /></svg>
      </span>
      <p class="mt-4 text-sm font-medium text-foreground">No completed Sunday services in this period</p>
      <p class="mt-1 text-xs text-muted-foreground">Choose a wider period to see the trend.</p>
    </div>
  {/if}

  <footer class="grid grid-cols-3 divide-x divide-border border-t border-border bg-secondary/10">
    <div class="px-4 py-4 text-center">
      <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Average</p>
      <p class="mt-1 text-xl font-semibold text-foreground">{averageAttendance}</p>
    </div>
    <div class="px-4 py-4 text-center">
      <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Guests</p>
      <p class="mt-1 text-xl font-semibold text-foreground">{guestTotal}</p>
    </div>
    <div class="px-4 py-4 text-center">
      <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trend</p>
      <p class="mt-1 text-xl font-semibold {attendanceChange === null ? 'text-muted-foreground' : attendanceChange >= 0 ? 'text-success' : 'text-destructive'}">
        {attendanceChange === null ? "—" : `${attendanceChange > 0 ? "+" : ""}${attendanceChange}%`}
      </p>
    </div>
  </footer>
</section>

<style>
  .chart-card {
    overflow: hidden;
    border: 1px solid hsl(var(--border));
    border-radius: 1rem;
    background: hsl(var(--card));
  }
</style>
