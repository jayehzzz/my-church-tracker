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

    function gathering(record) {
        return record.meeting || record.services || record;
    }

    function gatheringName(record) {
        const item = gathering(record);
        if (record.meeting) {
            return item.title || item.program?.name || formatType(item.meeting_type);
        }
        return formatType(item.service_type || "sunday_service");
    }

    function formatType(type) {
        const names = {
            sunday_service: "Sunday Service",
            special_service: "Special Service",
            bacenta: "Bacenta",
            flow_service: "Flow Service",
            flow_prayer: "Flow Service",
            acts_prayer: "Acts Prayer",
            farley_prayer: "Acts Prayer",
            shemen_prayer: "Shemen Prayer",
            workers_meeting: "Workers Meeting",
            evangelistic_event: "Evangelistic Event",
            special_event: "Special Event",
            training: "Training / Workshop",
            fellowship: "Fellowship / Social",
        };
        return names[type] || String(type || "Gathering").replaceAll("_", " ");
    }

    function gatheringDate(record) {
        const item = gathering(record);
        return item.meeting_date || item.service_date || record.created_at;
    }

    function gatheringTime(record) {
        const item = gathering(record);
        return item.start_time || item.service_time || "Regular time";
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
                    Mark them present at a Sunday service or meeting to start tracking.
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
                                >Gathering</th
                            >
                            <th class="px-6 py-4 font-semibold text-foreground"
                                >Time</th
                            >
                            <th class="px-6 py-4 font-semibold text-foreground"
                                >Notes</th
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
                                    {formatDate(gatheringDate(record))}
                                </td>
                                <td class="px-6 py-4">
                                    <div class="flex flex-wrap items-center gap-1.5">
                                        <Badge variant="outline" class="capitalize">
                                            {gatheringName(record)}
                                        </Badge>
                                        {#if record.first_timer}
                                            <Badge variant="info" size="sm">First timer</Badge>
                                        {:else if record.first_program_attendance}
                                            <Badge variant="success" size="sm">
                                                First {gatheringName(record)}
                                            </Badge>
                                        {/if}
                                    </div>
                                </td>
                                <td class="px-6 py-4 text-muted-foreground">
                                    {gatheringTime(record)}
                                </td>
                                <td class="px-6 py-4 text-muted-foreground">
                                    {gathering(record).sermon_topic ||
                                        gathering(record).notes ||
                                        "—"}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
</div>
