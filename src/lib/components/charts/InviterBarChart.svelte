<!--
  InviterBarChart.svelte
  Horizontal bar chart showing top inviters with click-to-view profile.
  Supports fullscreen mode with embedded filters.
  
  Props:
    - data: Array of { id, name, count, conversions }
    - title: Chart title
    - onInviterClick: Callback when an inviter bar is clicked
    - filterContent: Optional filter snippet for fullscreen mode
-->

<script>
    import FullscreenWrapper from "$lib/components/ui/FullscreenWrapper.svelte";

    let {
        data = [],
        title = "Top Inviters",
        onInviterClick = null,
        filterContent = null,
        maxItems = 10,
    } = $props();

    // Calculate max for scaling
    const maxCount = $derived(() => {
        if (data.length === 0) return 1;
        return Math.max(...data.map((d) => d.count), 1);
    });

    // Get limited data
    const displayData = $derived(() => data.slice(0, maxItems));

    // Get bar width percentage
    function getBarWidth(count) {
        return (count / maxCount()) * 100;
    }

    // Get conversion rate
    function getConversionRate(item) {
        if (!item.count || item.count === 0) return 0;
        return Math.round((item.conversions / item.count) * 100);
    }

    // Get rank badge style
    function getRankStyle(index) {
        if (index === 0) return "bg-amber-500 text-amber-950"; // Gold
        if (index === 1) return "bg-gray-300 text-gray-700"; // Silver
        if (index === 2) return "bg-amber-700 text-amber-100"; // Bronze
        return "bg-secondary text-muted-foreground";
    }

    // Handle inviter click
    function handleClick(item) {
        if (onInviterClick) {
            onInviterClick(item);
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
            <div class="flex items-center justify-between mb-4">
                <h3
                    class="text-sm font-medium text-muted-foreground flex items-center gap-2"
                >
                    <svg
                        class="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        />
                    </svg>
                    {title}
                </h3>
                {#if data.length > 0}
                    <span class="text-xs text-muted-foreground">
                        {data.length}
                        {data.length === 1 ? "inviter" : "inviters"}
                    </span>
                {/if}
            </div>

            {#if displayData().length === 0}
                <div class="h-40 flex items-center justify-center">
                    <p class="text-sm text-muted-foreground italic">
                        No inviter data yet
                    </p>
                </div>
            {:else}
                <div class="space-y-3">
                    {#each displayData() as item, index}
                        <button
                            type="button"
                            class="w-full group cursor-pointer text-left"
                            onclick={() => handleClick(item)}
                            title="Click to view {item.name}'s profile"
                        >
                            <div class="flex items-center gap-3">
                                <!-- Rank Badge -->
                                <div
                                    class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                            {getRankStyle(index)}"
                                >
                                    {index + 1}
                                </div>

                                <!-- Name and Bar -->
                                <div class="flex-1 min-w-0">
                                    <div
                                        class="flex items-center justify-between mb-1"
                                    >
                                        <span
                                            class="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors"
                                        >
                                            {item.name}
                                        </span>
                                        <div
                                            class="flex items-center gap-2 shrink-0"
                                        >
                                            <span
                                                class="text-xs text-muted-foreground"
                                            >
                                                {getConversionRate(item)}% conv
                                            </span>
                                            <span
                                                class="text-sm font-bold text-foreground"
                                            >
                                                {item.count}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Progress Bar -->
                                    <div
                                        class="h-2 bg-secondary/30 rounded-full overflow-hidden"
                                    >
                                        <div
                                            class="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full
                                                   transition-all duration-500 ease-out group-hover:brightness-110"
                                            style="width: {getBarWidth(
                                                item.count,
                                            )}%"
                                        ></div>
                                    </div>
                                </div>

                                <!-- Arrow indicator -->
                                <svg
                                    class="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M9 5l7 7-7 7"
                                    />
                                </svg>
                            </div>
                        </button>
                    {/each}
                </div>

                <!-- Legend -->
                <div
                    class="mt-4 pt-4 border-t border-border flex items-center justify-center gap-4 text-xs text-muted-foreground"
                >
                    <div class="flex items-center gap-1">
                        <div class="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span>1st</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <div class="w-3 h-3 rounded-full bg-gray-300"></div>
                        <span>2nd</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <div class="w-3 h-3 rounded-full bg-amber-700"></div>
                        <span>3rd</span>
                    </div>
                </div>
            {/if}
        </div>
    {/snippet}
</FullscreenWrapper>
