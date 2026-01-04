<!--
  Category Distribution Donut Chart
  Displays contact categories as a donut/pie chart with percentages
  
  Props:
    - data: Array of { category: string, count: number, color: string }
    - title: Optional chart title
-->

<script>
    /** @type {{ category: string, count: number, color: string }[]} */
    let { data = [], title = "Category Distribution" } = $props();

    // Calculate total and percentages
    const chartData = $derived(() => {
        const total = data.reduce((sum, d) => sum + d.count, 0);
        if (total === 0) return { total: 0, segments: [] };

        let cumulativePercent = 0;
        const segments = data
            .filter((d) => d.count > 0)
            .map((d) => {
                const percent = (d.count / total) * 100;
                const startPercent = cumulativePercent;
                cumulativePercent += percent;
                return {
                    ...d,
                    percent: Math.round(percent),
                    startPercent,
                    endPercent: cumulativePercent,
                };
            });

        return { total, segments };
    });

    // Convert percentage to SVG arc coordinates
    function getArcPath(
        startPercent,
        endPercent,
        innerRadius = 35,
        outerRadius = 50,
    ) {
        const startAngle = (startPercent / 100) * 360 - 90;
        const endAngle = (endPercent / 100) * 360 - 90;

        const startRadians = (startAngle * Math.PI) / 180;
        const endRadians = (endAngle * Math.PI) / 180;

        const x1 = 50 + outerRadius * Math.cos(startRadians);
        const y1 = 50 + outerRadius * Math.sin(startRadians);
        const x2 = 50 + outerRadius * Math.cos(endRadians);
        const y2 = 50 + outerRadius * Math.sin(endRadians);
        const x3 = 50 + innerRadius * Math.cos(endRadians);
        const y3 = 50 + innerRadius * Math.sin(endRadians);
        const x4 = 50 + innerRadius * Math.cos(startRadians);
        const y4 = 50 + innerRadius * Math.sin(startRadians);

        const largeArc = endPercent - startPercent > 50 ? 1 : 0;

        return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    }

    // Category color map
    const categoryColors = {
        responsive: "fill-green-500",
        non_responsive: "fill-red-400",
        has_church: "fill-blue-500",
        events_only: "fill-purple-500",
        big_events_only: "fill-amber-500",
        bacenta_mainly: "fill-cyan-500",
        do_not_contact: "fill-gray-500",
    };

    const categoryLabels = {
        responsive: "Responsive",
        non_responsive: "Non-Responsive",
        has_church: "Has Church",
        events_only: "Events Only",
        big_events_only: "Big Events Only",
        bacenta_mainly: "Bacenta Mainly",
        do_not_contact: "Do Not Contact",
    };
</script>

<div class="card-base p-4">
    <h3 class="text-sm font-medium text-muted-foreground mb-4">{title}</h3>

    <div class="flex items-start gap-6">
        <!-- Donut Chart SVG -->
        <div class="relative w-32 h-32 flex-shrink-0">
            <svg viewBox="0 0 100 100" class="w-full h-full">
                {#if chartData().segments.length > 0}
                    {#each chartData().segments as segment}
                        <path
                            d={getArcPath(
                                segment.startPercent,
                                segment.endPercent,
                            )}
                            class="{categoryColors[segment.category] ||
                                'fill-gray-400'} transition-all duration-500 hover:opacity-80"
                        />
                    {/each}
                {:else}
                    <!-- Empty state circle -->
                    <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="15"
                        class="text-secondary/50"
                    />
                {/if}
            </svg>

            <!-- Center Text -->
            <div
                class="absolute inset-0 flex flex-col items-center justify-center"
            >
                <span class="text-2xl font-bold text-foreground"
                    >{chartData().total}</span
                >
                <span class="text-xs text-muted-foreground">Total</span>
            </div>
        </div>

        <!-- Legend -->
        <div class="flex-1 space-y-2">
            {#each chartData().segments as segment}
                <div class="flex items-center justify-between text-sm">
                    <div class="flex items-center gap-2">
                        <div
                            class="w-3 h-3 rounded-sm {categoryColors[
                                segment.category
                            ]?.replace('fill-', 'bg-') || 'bg-gray-400'}"
                        ></div>
                        <span class="text-muted-foreground"
                            >{categoryLabels[segment.category] ||
                                segment.category}</span
                        >
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-medium text-foreground"
                            >{segment.count}</span
                        >
                        <span class="text-xs text-muted-foreground"
                            >({segment.percent}%)</span
                        >
                    </div>
                </div>
            {/each}

            {#if chartData().segments.length === 0}
                <p class="text-sm text-muted-foreground italic">
                    No data available
                </p>
            {/if}
        </div>
    </div>
</div>
