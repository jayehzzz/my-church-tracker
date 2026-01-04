<!--
  Prayer Hours Breakdown Chart
  Horizontal bar chart showing prayer hours by meeting type
  
  Props:
    - data: Array of { type: string, hours: number, label: string }
    - title: Optional chart title
-->

<script>
    /** @type {{ type: string, hours: number, label?: string }[]} */
    let { data = [], title = "Prayer Hours by Type" } = $props();

    // Meeting type colors and labels
    const typeConfig = {
        flow_prayer: { label: "Flow Prayer", color: "bg-blue-500" },
        farley_prayer: { label: "Farley Prayer", color: "bg-purple-500" },
        all_night_prayer: { label: "All Night Prayer", color: "bg-amber-500" },
        bacenta: { label: "Bacenta", color: "bg-green-500" },
        basonta: { label: "Basonta", color: "bg-cyan-500" },
        sat: { label: "SAT", color: "bg-pink-500" },
    };

    // Calculate chart data
    const chartData = $derived(() => {
        const totalHours = data.reduce((sum, d) => sum + (d.hours || 0), 0);
        const maxHours = Math.max(...data.map((d) => d.hours || 0), 1);

        return {
            totalHours: Math.round(totalHours * 10) / 10,
            bars: data
                .filter((d) => d.hours > 0)
                .sort((a, b) => b.hours - a.hours)
                .map((d) => ({
                    type: d.type,
                    hours: Math.round(d.hours * 10) / 10,
                    label: typeConfig[d.type]?.label || d.label || d.type,
                    color: typeConfig[d.type]?.color || "bg-gray-500",
                    percentage: Math.round((d.hours / maxHours) * 100),
                })),
        };
    });
</script>

<div class="card-base p-4">
    <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-muted-foreground">{title}</h3>
        <div class="text-right">
            <span class="text-2xl font-bold text-foreground"
                >{chartData().totalHours}</span
            >
            <span class="text-sm text-muted-foreground ml-1">hrs</span>
        </div>
    </div>

    {#if chartData().bars.length > 0}
        <div class="space-y-3">
            {#each chartData().bars as bar}
                <div class="space-y-1">
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-muted-foreground">{bar.label}</span>
                        <span class="font-medium text-foreground"
                            >{bar.hours}h</span
                        >
                    </div>
                    <div class="h-6 bg-secondary/30 rounded-md overflow-hidden">
                        <div
                            class="h-full {bar.color} rounded-md transition-all duration-500 ease-out flex items-center"
                            style="width: {bar.percentage}%"
                        >
                            {#if bar.percentage >= 25}
                                <span
                                    class="text-xs font-medium text-white ml-2 drop-shadow-sm"
                                >
                                    {Math.round(
                                        (bar.hours / chartData().totalHours) *
                                            100,
                                    )}%
                                </span>
                            {/if}
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="h-40 flex items-center justify-center">
            <p class="text-sm text-muted-foreground italic">
                No prayer hours recorded
            </p>
        </div>
    {/if}

    <!-- Summary stats -->
    {#if chartData().bars.length > 0}
        <div
            class="flex items-center justify-around mt-4 pt-4 border-t border-border"
        >
            <div class="text-center">
                <div class="text-lg font-bold text-foreground">
                    {chartData().bars.length}
                </div>
                <div class="text-xs text-muted-foreground">Meeting Types</div>
            </div>
            <div class="text-center">
                <div class="text-lg font-bold text-foreground">
                    {Math.round(
                        (chartData().totalHours /
                            Math.max(chartData().bars.length, 1)) *
                            10,
                    ) / 10}
                </div>
                <div class="text-xs text-muted-foreground">Avg Hours/Type</div>
            </div>
        </div>
    {/if}
</div>
