<script>
    import { Badge } from "$lib/components/ui";

    let { attendanceHistory, onRecordClick } = $props();

    let visibleCount = $state(15);
    $effect(() => { attendanceHistory; visibleCount = 15; });

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
            <ul class="mobile-attendance divide-y divide-border">
                {#each attendanceHistory.slice(0, visibleCount) as record}
                    <li class="p-5 space-y-2">
                        <div class="flex items-start justify-between gap-3">
                            <p class="font-medium text-foreground">{gatheringName(record)}</p>
                            <span class="text-xs text-muted-foreground whitespace-nowrap">{gatheringTime(record)}</span>
                        </div>
                        <p class="text-sm text-muted-foreground">{formatDate(gatheringDate(record))}</p>
                        {#if gathering(record).sermon_topic || gathering(record).notes}<p class="text-xs text-muted-foreground break-words">{gathering(record).sermon_topic || gathering(record).notes}</p>{/if}
                        {#if record.first_timer || record.first_program_attendance}<p class="text-xs text-primary">First attendance</p>{/if}
                        {#if !record.meeting && onRecordClick}<button type="button" class="text-sm text-primary hover:underline" onclick={() => onRecordClick(record)} aria-label="View service on {formatDate(gatheringDate(record))}">View service →</button>{/if}
                    </li>
                {/each}
            </ul>
            <div class="desktop-attendance overflow-x-auto">
                <table class="w-full min-w-[600px] text-left text-sm">
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
                        {#each attendanceHistory.slice(0, visibleCount) as record}
                            <tr
                                class="group hover:bg-secondary/30 transition-colors"
                            >
                                <td
                                    class="px-6 py-4 font-medium text-foreground group-hover:text-primary transition-colors"
                                >
                                    {#if !record.meeting && onRecordClick}
                                        <button type="button" class="text-primary hover:underline text-left" onclick={() => onRecordClick(record)} aria-label="View service on {formatDate(gatheringDate(record))}">{formatDate(gatheringDate(record))}</button>
                                    {:else}
                                        {formatDate(gatheringDate(record))}
                                    {/if}
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
            <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4 text-sm text-muted-foreground">
                <span>Showing {Math.min(visibleCount, attendanceHistory.length)} of {attendanceHistory.length} records</span>
                {#if visibleCount < attendanceHistory.length}<button type="button" class="text-primary hover:underline" onclick={() => visibleCount += 15}>Show more attendance</button>{/if}
            </div>
        {/if}
    </div>
</div>

<style>
    .mobile-attendance { display: none; }
    @media(max-width: 639px) { .mobile-attendance { display: block; } .desktop-attendance { display: none; } }
</style>
