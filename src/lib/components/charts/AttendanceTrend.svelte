<!--
  Attendance Trend Line Chart
  Shows attendance trends over time (weeks/months)
  
  Props:
    - data: Array of { date: string, total: number, members: number, guests: number }
    - title: Optional chart title
-->

<script>
    /** @type {{ date: string, total: number, members?: number, guests?: number }[]} */
    let { data = [], title = "Attendance Trend" } = $props();

    // Calculate chart dimensions
    const chartWidth = 100;
    const chartHeight = 60;
    const padding = { top: 5, right: 5, bottom: 15, left: 5 };

    // Process data for chart
    const chartData = $derived(() => {
        if (data.length === 0) return { points: [], maxValue: 0 };

        const maxValue = Math.max(...data.map((d) => d.total || 0), 1);
        const minValue = 0;
        const range = maxValue - minValue;

        const chartInnerWidth = chartWidth - padding.left - padding.right;
        const chartInnerHeight = chartHeight - padding.top - padding.bottom;

        const points = data.map((d, i) => ({
            x:
                padding.left +
                (i / Math.max(data.length - 1, 1)) * chartInnerWidth,
            y:
                padding.top +
                chartInnerHeight -
                ((d.total - minValue) / range) * chartInnerHeight,
            total: d.total,
            guests: d.guests || 0,
            date: d.date,
        }));

        return { points, maxValue, minValue };
    });

    // Generate SVG path for line
    const linePath = $derived(() => {
        const { points } = chartData();
        if (points.length === 0) return "";
        return points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");
    });

    // Generate SVG path for area fill
    const areaPath = $derived(() => {
        const { points } = chartData();
        if (points.length === 0) return "";
        const line = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");
        const bottom = `L ${points[points.length - 1].x} ${chartHeight - padding.bottom} L ${points[0].x} ${chartHeight - padding.bottom} Z`;
        return line + bottom;
    });

    // Format date for display
    function formatDate(dateStr) {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    }
</script>

<div class="card-base p-4">
    <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-muted-foreground">{title}</h3>
        {#if data.length > 0}
            <span class="text-xs text-muted-foreground"
                >Last {data.length} services</span
            >
        {/if}
    </div>

    {#if data.length > 0}
        <div class="relative">
            <svg
                viewBox="0 0 {chartWidth} {chartHeight}"
                class="w-full h-40"
                preserveAspectRatio="none"
            >
                <!-- Grid lines -->
                {#each [0.25, 0.5, 0.75] as ratio}
                    <line
                        x1={padding.left}
                        y1={padding.top +
                            (chartHeight - padding.top - padding.bottom) *
                                (1 - ratio)}
                        x2={chartWidth - padding.right}
                        y2={padding.top +
                            (chartHeight - padding.top - padding.bottom) *
                                (1 - ratio)}
                        stroke="currentColor"
                        stroke-opacity="0.1"
                        stroke-dasharray="2 2"
                    />
                {/each}

                <!-- Area fill -->
                <path d={areaPath()} class="fill-primary/20" />

                <!-- Line -->
                <path
                    d={linePath()}
                    fill="none"
                    stroke="currentColor"
                    stroke-width="0.5"
                    class="text-primary"
                />

                <!-- Data points -->
                {#each chartData().points as point, i}
                    <circle
                        cx={point.x}
                        cy={point.y}
                        r="1"
                        class="fill-primary"
                    />
                {/each}
            </svg>

            <!-- X-axis labels -->
            <div class="flex justify-between mt-1 px-1">
                {#if chartData().points.length > 0}
                    <span class="text-[10px] text-muted-foreground">
                        {formatDate(chartData().points[0]?.date)}
                    </span>
                    <span class="text-[10px] text-muted-foreground">
                        {formatDate(
                            chartData().points[chartData().points.length - 1]
                                ?.date,
                        )}
                    </span>
                {/if}
            </div>
        </div>

        <!-- Legend -->
        <div
            class="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border"
        >
            <div class="text-center">
                <div class="text-lg font-bold text-foreground">
                    {data.length > 0 ? data[data.length - 1].total : 0}
                </div>
                <div class="text-xs text-muted-foreground">Latest</div>
            </div>
            <div class="text-center">
                <div class="text-lg font-bold text-foreground">
                    {data.length > 0
                        ? Math.round(
                              data.reduce((s, d) => s + d.total, 0) /
                                  data.length,
                          )
                        : 0}
                </div>
                <div class="text-xs text-muted-foreground">Average</div>
            </div>
            <div class="text-center">
                <div class="text-lg font-bold text-foreground">
                    {Math.max(...data.map((d) => d.total), 0)}
                </div>
                <div class="text-xs text-muted-foreground">Peak</div>
            </div>
        </div>
    {:else}
        <div class="h-40 flex items-center justify-center">
            <p class="text-sm text-muted-foreground italic">
                No attendance data available
            </p>
        </div>
    {/if}
</div>
