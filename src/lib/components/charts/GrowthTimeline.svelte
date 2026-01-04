<!--
  GrowthTimeline.svelte
  Area chart showing people added per month (last 12 months)
  with breakdown by status (guests vs members)
  
  Props:
    - data: Array of { month: string, guests: number, members: number }
    - title: Optional chart title
-->

<script>
    /** @type {{ month: string, guests: number, members: number }[]} */
    let { data = [], title = "People Growth" } = $props();

    // Calculate chart dimensions
    const chartWidth = 100;
    const chartHeight = 50;
    const padding = { top: 5, right: 5, bottom: 12, left: 5 };

    // Process data for chart
    const chartData = $derived(() => {
        if (data.length === 0) return { points: [], maxValue: 0 };

        // Calculate totals for each month
        const totals = data.map((d) => d.guests + d.members);
        const maxValue = Math.max(...totals, 1);
        const minValue = 0;
        const range = maxValue - minValue;

        const chartInnerWidth = chartWidth - padding.left - padding.right;
        const chartInnerHeight = chartHeight - padding.top - padding.bottom;

        const points = data.map((d, i) => ({
            x:
                padding.left +
                (i / Math.max(data.length - 1, 1)) * chartInnerWidth,
            yGuests:
                padding.top +
                chartInnerHeight -
                ((d.guests + d.members) / range) * chartInnerHeight,
            yMembers:
                padding.top +
                chartInnerHeight -
                (d.members / range) * chartInnerHeight,
            yBase: padding.top + chartInnerHeight,
            guests: d.guests,
            members: d.members,
            total: d.guests + d.members,
            month: d.month,
        }));

        return { points, maxValue };
    });

    // Generate SVG path for members area (bottom layer)
    const membersAreaPath = $derived(() => {
        const { points } = chartData();
        if (points.length === 0) return "";

        const topLine = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.yMembers}`)
            .join(" ");
        const bottomLine = ` L ${points[points.length - 1].x} ${points[0].yBase} L ${points[0].x} ${points[0].yBase} Z`;

        return topLine + bottomLine;
    });

    // Generate SVG path for guests area (top layer, stacked on members)
    const guestsAreaPath = $derived(() => {
        const { points } = chartData();
        if (points.length === 0) return "";

        const topLine = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.yGuests}`)
            .join(" ");
        const bottomLine = [...points]
            .reverse()
            .map((p, i) => `${i === 0 ? " L" : " L"} ${p.x} ${p.yMembers}`)
            .join("");

        return topLine + bottomLine + " Z";
    });

    // Total calculations
    const totals = $derived(() => {
        const totalGuests = data.reduce((sum, d) => sum + d.guests, 0);
        const totalMembers = data.reduce((sum, d) => sum + d.members, 0);
        return {
            guests: totalGuests,
            members: totalMembers,
            total: totalGuests + totalMembers,
        };
    });
</script>

<div class="card-base p-4">
    <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-muted-foreground">{title}</h3>
        {#if data.length > 0}
            <span class="text-xs text-muted-foreground"
                >Last {data.length} months</span
            >
        {/if}
    </div>

    {#if data.length > 0}
        <div class="relative">
            <svg
                viewBox="0 0 {chartWidth} {chartHeight}"
                class="w-full h-36"
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

                <!-- Members area (primary color, bottom layer) -->
                <path d={membersAreaPath()} class="fill-primary/40" />

                <!-- Guests area (secondary color, stacked on top) -->
                <path d={guestsAreaPath()} class="fill-info/40" />

                <!-- Line for total -->
                <path
                    d={chartData()
                        .points.map(
                            (p, i) =>
                                `${i === 0 ? "M" : "L"} ${p.x} ${p.yGuests}`,
                        )
                        .join(" ")}
                    fill="none"
                    stroke="currentColor"
                    stroke-width="0.5"
                    class="text-foreground/50"
                />

                <!-- Data points -->
                {#each chartData().points as point}
                    <circle
                        cx={point.x}
                        cy={point.yGuests}
                        r="0.8"
                        class="fill-foreground"
                    />
                {/each}
            </svg>

            <!-- X-axis labels -->
            <div class="flex justify-between mt-1 px-1">
                {#if chartData().points.length > 0}
                    <span class="text-[10px] text-muted-foreground">
                        {chartData().points[0]?.month}
                    </span>
                    <span class="text-[10px] text-muted-foreground">
                        {chartData().points[chartData().points.length - 1]
                            ?.month}
                    </span>
                {/if}
            </div>
        </div>

        <!-- Legend -->
        <div
            class="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border"
        >
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-sm bg-primary/40"></div>
                <div class="text-xs text-muted-foreground">
                    Members <span class="font-medium text-foreground"
                        >{totals().members}</span
                    >
                </div>
            </div>
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-sm bg-info/40"></div>
                <div class="text-xs text-muted-foreground">
                    Guests <span class="font-medium text-foreground"
                        >{totals().guests}</span
                    >
                </div>
            </div>
            <div class="text-xs text-muted-foreground">
                Total <span class="font-bold text-foreground"
                    >{totals().total}</span
                >
            </div>
        </div>
    {:else}
        <div class="h-36 flex items-center justify-center">
            <p class="text-sm text-muted-foreground italic">
                No growth data available
            </p>
        </div>
    {/if}
</div>
