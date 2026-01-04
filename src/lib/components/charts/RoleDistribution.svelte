<!--
  RoleDistribution.svelte
  Horizontal bar chart showing people by role
  
  Props:
    - data: Array of { role: string, count: number }
    - title: Optional chart title
-->

<script>
    /** @type {{ role: string, count: number }[]} */
    let { data = [], title = "People by Role" } = $props();

    // Calculate max for scaling
    const maxCount = $derived(() => {
        if (data.length === 0) return 1;
        return Math.max(...data.map((d) => d.count), 1);
    });

    // Total people
    const total = $derived(() => data.reduce((sum, d) => sum + d.count, 0));

    // Get bar color based on role
    function getBarColor(role) {
        const lowerRole = role?.toLowerCase() || "";
        if (lowerRole.includes("basonta")) return "bg-primary";
        if (lowerRole.includes("bacenta")) return "bg-info";
        if (lowerRole.includes("leader")) return "bg-success";
        return "bg-secondary";
    }

    // Format role name for display
    function formatRole(role) {
        const map = {
            basonta_worker: "Basonta Workers",
            bacenta_leader: "Bacenta Leaders",
            no_role: "No Role",
            leader: "Leaders",
            member: "Members",
        };
        return map[role] || role || "Other";
    }
</script>

<div class="card-base p-4">
    <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-muted-foreground">{title}</h3>
        <span class="text-xs text-muted-foreground">
            {total()} total
        </span>
    </div>

    {#if data.length > 0}
        <div class="space-y-3">
            {#each data as item}
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-sm">
                        <span class="font-medium text-foreground"
                            >{formatRole(item.role)}</span
                        >
                        <span class="text-muted-foreground">{item.count}</span>
                    </div>
                    <div
                        class="relative h-6 bg-secondary/30 rounded-full overflow-hidden"
                    >
                        <div
                            class="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out {getBarColor(
                                item.role,
                            )}"
                            style="width: {Math.max(
                                (item.count / maxCount()) * 100,
                                2,
                            )}%"
                        >
                            <!-- Shimmer effect -->
                            <div
                                class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                            ></div>
                        </div>
                        <!-- Percentage label inside bar if enough space -->
                        {#if item.count / maxCount() > 0.15}
                            <span
                                class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-white"
                            >
                                {Math.round((item.count / total()) * 100)}%
                            </span>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>

        <!-- Legend -->
        <div class="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
            {#each data as item}
                <div class="flex items-center gap-2">
                    <div
                        class="w-3 h-3 rounded-sm {getBarColor(item.role)}"
                    ></div>
                    <span class="text-xs text-muted-foreground">
                        {formatRole(item.role)}
                    </span>
                </div>
            {/each}
        </div>
    {:else}
        <div class="h-32 flex items-center justify-center">
            <p class="text-sm text-muted-foreground italic">
                No role data available
            </p>
        </div>
    {/if}
</div>

<style>
    @keyframes shimmer {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(100%);
        }
    }
    .animate-shimmer {
        animation: shimmer 2s infinite;
    }
</style>
