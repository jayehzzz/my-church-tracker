<script>
    import { Badge } from "$lib/components/ui";

    let { attendanceHistory, onRecordClick } = $props();

    function formatDate(dateStr) {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }
</script>

<div class="space-y-4" id="attendance-history">
    <h2 class="text-xl font-semibold text-foreground">Attendance History</h2>

    <div
        class="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
    >
        {#if attendanceHistory.length === 0}
            <div class="p-12 text-center text-muted-foreground">
                <svg
                    class="w-12 h-12 mx-auto mb-3 opacity-50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                </svg>
                <p>No attendance records found for this person.</p>
                <p class="text-sm mt-1">
                    Check them into a service to start tracking!
                </p>
            </div>
        {:else}
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-secondary/50 border-b border-border">
                        <tr>
                            <th class="px-6 py-4 font-semibold text-foreground"
                                >Date</th
                            >
                            <th class="px-6 py-4 font-semibold text-foreground"
                                >Service</th
                            >
                            <th class="px-6 py-4 font-semibold text-foreground"
                                >Role/Type</th
                            >
                            <th class="px-6 py-4 font-semibold text-foreground"
                                >Topic</th
                            >
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                        {#each attendanceHistory as record}
                            <tr
                                class="group hover:bg-secondary/30 transition-colors cursor-pointer"
                                onclick={() => onRecordClick?.(record)}
                            >
                                <td
                                    class="px-6 py-4 font-medium text-foreground group-hover:text-primary transition-colors"
                                >
                                    {formatDate(record.services.service_date)}
                                </td>
                                <td class="px-6 py-4 text-muted-foreground">
                                    {record.services.service_time ||
                                        "Regular Time"}
                                </td>
                                <td class="px-6 py-4">
                                    <Badge variant="outline" class="capitalize">
                                        {record.services.service_type?.replace(
                                            "_",
                                            " ",
                                        ) || "Service"}
                                    </Badge>
                                </td>
                                <td class="px-6 py-4 text-muted-foreground">
                                    {record.services.sermon_topic || "-"}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
</div>
