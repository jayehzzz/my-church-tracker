<!--
  MonthlyContactsBar.svelte
  Vertical bar chart showing contact counts per month.
  Supports fullscreen mode with embedded filters.
  
  Props:
    - data: Array of { month: string, count: number, year: number }
    - title: Chart title
    - onMonthClick: Callback when a bar is clicked
-->

<script>
    import FullscreenWrapper from "$lib/components/ui/FullscreenWrapper.svelte";

    let {
        data = [],
        title = "Contacts by Month",
        onMonthClick = null,
        filterContent = null,
    } = $props();

    // Chart dimensions (in pixels for the chart area)
    const chartHeight = 160; // pixels for the bar area

    // Calculate max value for scaling
    const maxCount = $derived(() => {
        if (data.length === 0) return 1;
        return Math.max(...data.map((d) => d.count), 1);
    });

    // Month names for display
    const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];

    // Format month label
    function formatMonth(item) {
        const monthIndex = parseInt(item.month) - 1;
        return monthNames[monthIndex] || item.month;
    }

    // Get bar height in pixels
    function getBarHeightPx(count) {
        if (maxCount() === 0) return 0;
        return Math.max((count / maxCount()) * chartHeight, count > 0 ? 4 : 0);
    }

    // Get bar color based on value
    function getBarColor(count) {
        const ratio = count / maxCount();
        if (ratio >= 0.8) return "bg-primary";
        if (ratio >= 0.5) return "bg-primary/80";
        if (ratio >= 0.3) return "bg-primary/60";
        return "bg-primary/40";
    }

    // Handle bar click
    function handleBarClick(item) {
        if (onMonthClick) {
            onMonthClick(item);
        }
    }
</script>

<FullscreenWrapper {title} class="card-base">
    {#snippet filters()}
        {#if filterContent}
            {@render filterContent()}
        {/if}
    {/snippet}

    {#snippet children()}
        <div class="p-4">
            <h3 class="text-sm font-medium text-muted-foreground mb-4">
                {title}
            </h3>

            {#if data.length === 0}
                <div class="h-48 flex items-center justify-center">
                    <p class="text-sm text-muted-foreground italic">
                        No data available
                    </p>
                </div>
            {:else}
                <!-- Chart Container -->
                <div class="relative" style="height: {chartHeight + 40}px;">
                    <!-- Y-axis labels -->
                    <div
                        class="absolute left-0 top-0 bottom-6 w-6 flex flex-col justify-between text-right pr-1"
                    >
                        <span class="text-[10px] text-muted-foreground/60"
                            >{maxCount()}</span
                        >
                        <span class="text-[10px] text-muted-foreground/60"
                            >{Math.round(maxCount() * 0.75)}</span
                        >
                        <span class="text-[10px] text-muted-foreground/60"
                            >{Math.round(maxCount() * 0.5)}</span
                        >
                        <span class="text-[10px] text-muted-foreground/60"
                            >{Math.round(maxCount() * 0.25)}</span
                        >
                        <span class="text-[10px] text-muted-foreground/60"
                            >0</span
                        >
                    </div>

                    <!-- Chart area with grid lines -->
                    <div
                        class="absolute left-7 right-0 top-0"
                        style="height: {chartHeight}px;"
                    >
                        <!-- Grid lines -->
                        <div
                            class="absolute inset-0 flex flex-col justify-between pointer-events-none"
                        >
                            {#each [0, 1, 2, 3, 4] as _}
                                <div
                                    class="w-full border-t border-border/20"
                                ></div>
                            {/each}
                        </div>

                        <!-- Bars container -->
                        <div
                            class="relative h-full flex items-end justify-around gap-1 px-1"
                        >
                            {#each data as item}
                                <button
                                    type="button"
                                    class="relative flex-1 flex flex-col items-center justify-end cursor-pointer group"
                                    onclick={() => handleBarClick(item)}
                                    title="{formatMonth(
                                        item,
                                    )} {item.year}: {item.count} contacts"
                                >
                                    <!-- Bar with fixed pixel height -->
                                    <div
                                        class="{getBarColor(
                                            item.count,
                                        )} w-full max-w-10 rounded-t transition-all duration-500 ease-out
                                               group-hover:brightness-125 group-hover:shadow-lg group-hover:shadow-primary/30 relative"
                                        style="height: {getBarHeightPx(
                                            item.count,
                                        )}px;"
                                    >
                                        <!-- Value tooltip on hover -->
                                        <div
                                            class="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100
                                                    transition-opacity bg-popover text-popover-foreground px-2 py-1 rounded text-xs font-medium
                                                    shadow-lg whitespace-nowrap z-10 border border-border"
                                        >
                                            {item.count}
                                        </div>
                                    </div>
                                </button>
                            {/each}
                        </div>
                    </div>

                    <!-- X-axis labels -->
                    <div
                        class="absolute left-7 right-0 flex justify-around"
                        style="top: {chartHeight + 4}px;"
                    >
                        {#each data as item}
                            <span
                                class="text-[10px] text-muted-foreground text-center flex-1"
                            >
                                {formatMonth(item)}
                            </span>
                        {/each}
                    </div>
                </div>

                <!-- Summary -->
                <div
                    class="mt-4 pt-4 border-t border-border flex justify-around text-center"
                >
                    <div>
                        <div class="text-lg font-bold text-foreground">
                            {data.reduce((sum, d) => sum + d.count, 0)}
                        </div>
                        <div class="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div>
                        <div class="text-lg font-bold text-foreground">
                            {Math.round(
                                data.reduce((sum, d) => sum + d.count, 0) /
                                    data.length,
                            )}
                        </div>
                        <div class="text-xs text-muted-foreground">
                            Avg/Month
                        </div>
                    </div>
                    <div>
                        <div class="text-lg font-bold text-primary">
                            {maxCount()}
                        </div>
                        <div class="text-xs text-muted-foreground">Peak</div>
                    </div>
                </div>
            {/if}
        </div>
    {/snippet}
</FullscreenWrapper>
