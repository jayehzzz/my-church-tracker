<!--
  Attendance Trend Line Chart
  Shows attendance trends over time with interactive data points
  
  Props:
    - data: Array of { date: string, total: number, members?: number, guests?: number, id?: string, topic?: string }
    - title: Optional chart title
    - onPointClick: Optional callback when a data point is clicked
-->

<script>
    import { onMount } from "svelte";

    /** @type {{ date: string, total: number, members?: number, guests?: number, id?: string, topic?: string }[]} */
    let {
        data = [],
        title = "Attendance Trend",
        onPointClick = null,
    } = $props();

    // Animation state
    let mounted = $state(false);
    let hoveredIndex = $state(null);

    // Chart dimensions
    const chartWidth = 100;
    const chartHeight = 60;
    const padding = { top: 8, right: 8, bottom: 15, left: 8 };

    onMount(() => {
        // Trigger entrance animation after a brief delay
        setTimeout(() => {
            mounted = true;
        }, 100);
    });

    // Process data for chart
    const chartData = $derived(() => {
        if (data.length === 0) return { points: [], maxValue: 0 };

        const maxValue = Math.max(...data.map((d) => d.total || 0), 1);
        const minValue = 0;
        const range = maxValue - minValue || 1;

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
            members: d.members || d.total - (d.guests || 0),
            date: d.date,
            id: d.id,
            topic: d.topic || "",
            index: i,
        }));

        return { points, maxValue, minValue };
    });

    // Generate SVG path for line with smooth curves
    const linePath = $derived(() => {
        const { points } = chartData();
        if (points.length === 0) return "";
        if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

        // Create smooth curve path
        let path = `M ${points[0].x} ${points[0].y}`;

        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const cpx = (prev.x + curr.x) / 2;
            path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
        }

        return path;
    });

    // Generate SVG path for area fill
    const areaPath = $derived(() => {
        const { points } = chartData();
        if (points.length === 0) return "";

        const linePoints = linePath();
        if (!linePoints) return "";

        const bottom = `L ${points[points.length - 1].x} ${chartHeight - padding.bottom} L ${points[0].x} ${chartHeight - padding.bottom} Z`;
        return linePoints + bottom;
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

    // Format full date for tooltip
    function formatFullDate(dateStr) {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }

    // Handle point click
    function handlePointClick(point, e) {
        e.stopPropagation();
        if (onPointClick && point.id) {
            onPointClick(point);
        }
    }

    // Check if point is clickable
    const isClickable = $derived(() => !!onPointClick);
</script>

<div class="card-base p-4 overflow-visible">
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
                class="w-full h-44 overflow-visible"
                preserveAspectRatio="none"
            >
                <!-- Gradient definition -->
                <defs>
                    <linearGradient
                        id="areaGradient"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                    >
                        <stop
                            offset="0%"
                            style="stop-color: hsl(var(--primary)); stop-opacity: 0.4"
                        />
                        <stop
                            offset="100%"
                            style="stop-color: hsl(var(--primary)); stop-opacity: 0.05"
                        />
                    </linearGradient>
                    <linearGradient
                        id="lineGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                    >
                        <stop
                            offset="0%"
                            style="stop-color: hsl(var(--primary)); stop-opacity: 0.8"
                        />
                        <stop
                            offset="100%"
                            style="stop-color: hsl(var(--primary)); stop-opacity: 1"
                        />
                    </linearGradient>
                </defs>

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
                        stroke-dasharray="1 2"
                    />
                {/each}

                <!-- Area fill with animation -->
                <path
                    d={areaPath()}
                    fill="url(#areaGradient)"
                    class="transition-all duration-700 ease-out"
                    style="opacity: {mounted
                        ? 1
                        : 0}; transform: translateY({mounted ? 0 : 10}px);"
                />

                <!-- Line with animation -->
                <path
                    d={linePath()}
                    fill="none"
                    stroke="url(#lineGradient)"
                    stroke-width="0.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="transition-all duration-700 ease-out"
                    style="opacity: {mounted ? 1 : 0};"
                />

                <!-- Interactive data points -->
                {#each chartData().points as point, i}
                    <!-- Invisible larger hitbox for easier hovering -->
                    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                    <circle
                        cx={point.x}
                        cy={point.y}
                        r="3"
                        fill="transparent"
                        class={isClickable() ? "cursor-pointer" : ""}
                        role={isClickable() ? "button" : "presentation"}
                        tabindex={isClickable() ? 0 : -1}
                        aria-label={isClickable()
                            ? `View service on ${point.date}`
                            : undefined}
                        onmouseenter={() => (hoveredIndex = i)}
                        onmouseleave={() => (hoveredIndex = null)}
                        onfocus={() => (hoveredIndex = i)}
                        onblur={() => (hoveredIndex = null)}
                        onclick={(e) => handlePointClick(point, e)}
                        onkeydown={(e) =>
                            e.key === "Enter" && handlePointClick(point, e)}
                    />

                    <!-- Visible point -->
                    <circle
                        cx={point.x}
                        cy={point.y}
                        r={hoveredIndex === i ? 1.8 : 1}
                        class="fill-primary transition-all duration-200 pointer-events-none"
                        style="opacity: {mounted
                            ? 1
                            : 0}; transition-delay: {150 + i * 30}ms;"
                    />

                    <!-- Glow effect on hover -->
                    {#if hoveredIndex === i}
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r="3"
                            class="fill-primary/30 animate-pulse pointer-events-none"
                        />
                    {/if}
                {/each}
            </svg>

            <!-- Tooltip -->
            {#if hoveredIndex !== null}
                {@const point = chartData().points[hoveredIndex]}
                <div
                    class="absolute z-50 pointer-events-none bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[160px] transform -translate-x-1/2 animate-in fade-in zoom-in-95 duration-150"
                    style="left: {(point.x / chartWidth) *
                        100}%; top: -10px; transform: translateX(-50%) translateY(-100%);"
                >
                    <div class="text-xs font-medium text-foreground mb-1">
                        {formatFullDate(point.date)}
                    </div>
                    {#if point.topic}
                        <div
                            class="text-xs text-muted-foreground mb-2 line-clamp-1"
                        >
                            {point.topic}
                        </div>
                    {/if}
                    <div class="flex items-center gap-3">
                        <div>
                            <div class="text-lg font-bold text-primary">
                                {point.total}
                            </div>
                            <div class="text-[10px] text-muted-foreground">
                                Total
                            </div>
                        </div>
                        <div class="h-6 w-px bg-border"></div>
                        <div>
                            <div class="text-sm font-medium text-info">
                                {point.guests}
                            </div>
                            <div class="text-[10px] text-muted-foreground">
                                Guests
                            </div>
                        </div>
                    </div>
                    {#if isClickable() && point.id}
                        <div
                            class="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground text-center"
                        >
                            Click to view details
                        </div>
                    {/if}
                    <!-- Arrow -->
                    <div
                        class="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full"
                    >
                        <div
                            class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-popover"
                        ></div>
                    </div>
                </div>
            {/if}

            <!-- X-axis labels -->
            <div class="flex justify-between mt-2 px-1">
                {#if chartData().points.length > 0}
                    <span class="text-[10px] text-muted-foreground">
                        {formatDate(chartData().points[0]?.date)}
                    </span>
                    {#if chartData().points.length > 2}
                        <span class="text-[10px] text-muted-foreground">
                            {formatDate(
                                chartData().points[
                                    Math.floor(chartData().points.length / 2)
                                ]?.date,
                            )}
                        </span>
                    {/if}
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
        <div class="h-44 flex items-center justify-center">
            <p class="text-sm text-muted-foreground italic">
                No attendance data available
            </p>
        </div>
    {/if}
</div>
