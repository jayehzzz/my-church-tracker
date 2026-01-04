<!--
  LeaderHeatmap.svelte
  Grid visualization showing leader attendance across meeting types.
  
  Props:
    - data: Array of { leaderId, leaderName, meetings: { type: count, ... } }
    - meetingTypes: Array of meeting type keys to show as columns
    - title: Optional chart title
-->

<script>
    /**
     * @type {{
     *   leaderId: string,
     *   leaderName: string,
     *   meetings: Record<string, number>
     * }[]}
     */
    let {
        data = [],
        meetingTypes = [
            "bacenta",
            "flow_prayer",
            "farley_prayer",
            "all_night_prayer",
            "basonta",
            "sat",
        ],
        title = "Leader Participation",
    } = $props();

    // Format meeting type for column header
    function formatType(type) {
        const map = {
            bacenta: "Bacenta",
            flow_prayer: "Flow",
            farley_prayer: "Farley",
            all_night_prayer: "All Night",
            basonta: "Basonta",
            sat: "SAT",
        };
        return map[type] || type;
    }

    // Calculate max attendance across all cells for color scaling
    const maxAttendance = $derived(() => {
        let max = 1;
        data.forEach((leader) => {
            meetingTypes.forEach((type) => {
                const count = leader.meetings[type] || 0;
                if (count > max) max = count;
            });
        });
        return max;
    });

    // Get cell color intensity based on attendance
    function getCellColor(count) {
        if (!count || count === 0) return "bg-secondary/20";
        const intensity = Math.min(count / maxAttendance(), 1);
        if (intensity > 0.75) return "bg-primary";
        if (intensity > 0.5) return "bg-primary/75";
        if (intensity > 0.25) return "bg-primary/50";
        return "bg-primary/25";
    }

    // Get text color for cell
    function getTextColor(count) {
        if (!count || count === 0) return "text-muted-foreground";
        const intensity = count / maxAttendance();
        if (intensity > 0.5) return "text-primary-foreground";
        return "text-foreground";
    }

    // Calculate totals
    const leaderTotals = $derived(() => {
        return data
            .map((leader) => {
                const total = meetingTypes.reduce((sum, type) => {
                    return sum + (leader.meetings[type] || 0);
                }, 0);
                return { ...leader, total };
            })
            .sort((a, b) => b.total - a.total);
    });

    // Calculate column totals
    const columnTotals = $derived(() => {
        const totals = {};
        meetingTypes.forEach((type) => {
            totals[type] = data.reduce((sum, leader) => {
                return sum + (leader.meetings[type] || 0);
            }, 0);
        });
        return totals;
    });
</script>

<div class="card-base p-4">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
            </svg>
            {title}
        </h3>
        <span class="text-xs text-muted-foreground">
            {data.length} leaders
        </span>
    </div>

    {#if data.length > 0}
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b border-border">
                        <th
                            class="text-left py-2 px-2 font-medium text-muted-foreground"
                            >Leader</th
                        >
                        {#each meetingTypes as type}
                            <th
                                class="text-center py-2 px-1 font-medium text-muted-foreground min-w-[50px]"
                            >
                                <span class="text-xs">{formatType(type)}</span>
                            </th>
                        {/each}
                        <th
                            class="text-center py-2 px-2 font-medium text-muted-foreground"
                            >Total</th
                        >
                    </tr>
                </thead>
                <tbody class="divide-y divide-border/50">
                    {#each leaderTotals() as leader}
                        <tr class="hover:bg-secondary/20 transition-colors">
                            <td class="py-2 px-2">
                                <div class="flex items-center gap-2">
                                    <div
                                        class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary"
                                    >
                                        {leader.leaderName
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .slice(0, 2)}
                                    </div>
                                    <span
                                        class="font-medium text-foreground truncate max-w-[100px]"
                                    >
                                        {leader.leaderName}
                                    </span>
                                </div>
                            </td>
                            {#each meetingTypes as type}
                                {@const count = leader.meetings[type] || 0}
                                <td class="py-2 px-1 text-center">
                                    <div
                                        class="w-8 h-8 mx-auto rounded flex items-center justify-center text-xs font-medium transition-all duration-200 {getCellColor(
                                            count,
                                        )} {getTextColor(count)}"
                                        title="{leader.leaderName}: {count} {formatType(
                                            type,
                                        )} meetings"
                                    >
                                        {count || "—"}
                                    </div>
                                </td>
                            {/each}
                            <td class="py-2 px-2 text-center">
                                <span class="text-sm font-bold text-foreground"
                                    >{leader.total}</span
                                >
                            </td>
                        </tr>
                    {/each}
                </tbody>
                <tfoot class="border-t border-border">
                    <tr class="bg-secondary/30">
                        <td class="py-2 px-2 font-medium text-muted-foreground"
                            >Total</td
                        >
                        {#each meetingTypes as type}
                            <td
                                class="py-2 px-1 text-center font-medium text-foreground"
                            >
                                {columnTotals()[type]}
                            </td>
                        {/each}
                        <td
                            class="py-2 px-2 text-center font-bold text-primary"
                        >
                            {Object.values(columnTotals()).reduce(
                                (a, b) => a + b,
                                0,
                            )}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <!-- Legend -->
        <div
            class="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border"
        >
            <span class="text-xs text-muted-foreground"
                >Attendance Frequency:</span
            >
            <div class="flex items-center gap-1">
                <div class="w-4 h-4 rounded bg-secondary/20"></div>
                <span class="text-xs text-muted-foreground">None</span>
            </div>
            <div class="flex items-center gap-1">
                <div class="w-4 h-4 rounded bg-primary/25"></div>
                <span class="text-xs text-muted-foreground">Low</span>
            </div>
            <div class="flex items-center gap-1">
                <div class="w-4 h-4 rounded bg-primary/50"></div>
                <span class="text-xs text-muted-foreground">Medium</span>
            </div>
            <div class="flex items-center gap-1">
                <div class="w-4 h-4 rounded bg-primary"></div>
                <span class="text-xs text-muted-foreground">High</span>
            </div>
        </div>
    {:else}
        <div class="h-32 flex items-center justify-center">
            <p class="text-sm text-muted-foreground italic">
                No leader participation data available
            </p>
        </div>
    {/if}
</div>
