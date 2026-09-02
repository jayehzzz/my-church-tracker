<!--
  VisitationCalendar.svelte
  Month-view calendar showing visitation activity with dots on dates with visits.
  
  Props:
    - data: Array of { visit_date, person_visited_name, outcome }
    - title: Optional title
-->

<script>
    import {
        formatInteraction,
        formatOutcome as formatCareOutcome,
        formatPurpose,
    } from "$lib/utils/pastoralCare.js";

    /** @type {{ visit_date: string, person_visited_name: string, outcome: string }[]} */
    let {
        data = [],
        title = "Visitation Calendar",
        onVisitSelect = () => {},
    } = $props();

    // Current viewing month
    let currentDate = $state(new Date());
    let selectedDate = $state(null);

    // Navigate months
    function nextMonth() {
        currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            1,
        );
        selectedDate = null;
    }

    function prevMonth() {
        currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            1,
        );
        selectedDate = null;
    }

    // Get month name and year
    const monthLabel = $derived(() => {
        return currentDate.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
        });
    });

    // Generate calendar grid for current month
    const calendarDays = $derived(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

        const days = [];

        // Empty cells for days before first of month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push({ day: null, visits: [] });
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const visits = data.filter((v) => v.visit_date === dateStr);
            days.push({ day, dateStr, visits });
        }

        return days;
    });

    // Get outcome color for dot
    function getOutcomeColor(outcome) {
        const colorMap = {
            welcomed_encouraged: "bg-success",
            prayer_request_received: "bg-info",
            invited_to_service: "bg-primary",
            concerns_shared: "bg-warning",
            follow_up_needed: "bg-warning",
            not_home: "bg-secondary",
            declined: "bg-destructive",
        };
        return colorMap[outcome] || "bg-primary";
    }

    // Check if a day is today
    function isToday(dateStr) {
        if (!dateStr) return false;
        const today = new Date().toISOString().split("T")[0];
        return dateStr === today;
    }

    // Stats for current month
    const monthStats = $derived(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

        const monthVisits = data.filter((v) => v.visit_date?.startsWith(monthPrefix));

        return {
            total: monthVisits.length,
            uniqueDays: new Set(monthVisits.map((v) => v.visit_date)).size,
        };
    });

    const selectedVisits = $derived(
        selectedDate ? data.filter((visit) => visit.visit_date === selectedDate) : [],
    );

    function fullDate(dateStr) {
        if (!dateStr) return "";
        return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    }

    function dayLabel(dateStr, visits) {
        const count = visits.length;
        return `View ${fullDate(dateStr)}: ${count} care interaction${count === 1 ? "" : "s"}`;
    }
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
            </svg>
            {title}
        </h3>
        <div class="flex items-center gap-2">
            <button
                type="button"
                onclick={prevMonth}
                class="p-1.5 rounded hover:bg-secondary transition-colors"
                aria-label="Previous month"
            >
                <svg
                    class="w-4 h-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 19l-7-7 7-7"
                    />
                </svg>
            </button>
            <span
                class="text-sm font-medium text-foreground min-w-[140px] text-center"
            >
                {monthLabel()}
            </span>
            <button
                type="button"
                onclick={nextMonth}
                class="p-1.5 rounded hover:bg-secondary transition-colors"
                aria-label="Next month"
            >
                <svg
                    class="w-4 h-4 text-muted-foreground"
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
            </button>
        </div>
    </div>

    <!-- Day headers -->
    <div class="grid grid-cols-7 gap-1 mb-2">
        {#each ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as day}
            <div
                class="text-center text-xs font-medium text-muted-foreground py-1"
            >
                {day}
            </div>
        {/each}
    </div>

    <!-- Calendar grid -->
    <div class="grid grid-cols-7 gap-1">
        {#each calendarDays() as { day, dateStr, visits }}
            {#if day}
                <button
                    type="button"
                    class="min-h-[52px] rounded border p-1 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                        {isToday(dateStr) ? 'bg-primary/10 border-primary/30' : 'border-border/50'}
                        {selectedDate === dateStr ? 'ring-2 ring-primary border-primary bg-primary/10' : ''}"
                    aria-label={dayLabel(dateStr, visits)}
                    aria-pressed={selectedDate === dateStr}
                    onclick={() => (selectedDate = dateStr)}
                >
                    <div class="text-xs font-medium text-foreground mb-1">
                        {day}
                    </div>
                    {#if visits.length > 0}
                        <div class="flex flex-wrap gap-0.5">
                            {#each visits.slice(0, 3) as visit}
                                <div
                                    class="w-2 h-2 rounded-full {getOutcomeColor(
                                        visit.outcome,
                                    )}"
                                    title="{visit.person_visited_name}: {formatCareOutcome(
                                        visit.outcome,
                                    )}"
                                ></div>
                            {/each}
                            {#if visits.length > 3}
                                <span class="text-[8px] text-muted-foreground"
                                    >+{visits.length - 3}</span
                                >
                            {/if}
                        </div>
                    {/if}
                </button>
            {:else}
                <div class="min-h-[52px] rounded border border-transparent" aria-hidden="true"></div>
            {/if}
        {/each}
    </div>

    {#if selectedDate}
        <section class="mt-4 rounded-xl border border-border bg-background/70 p-3 sm:p-4" aria-live="polite" aria-label={`Care on ${fullDate(selectedDate)}`}>
            <div class="flex items-center justify-between gap-3">
                <div>
                    <h4 class="text-sm font-semibold text-foreground">{fullDate(selectedDate)}</h4>
                    <p class="mt-0.5 text-xs text-muted-foreground">{selectedVisits.length} care interaction{selectedVisits.length === 1 ? "" : "s"}</p>
                </div>
                <button type="button" class="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground" onclick={() => (selectedDate = null)}>Close</button>
            </div>

            {#if selectedVisits.length === 0}
                <p class="mt-3 rounded-lg border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">No pastoral care was recorded on this day.</p>
            {:else}
                <div class="mt-3 grid gap-2 sm:grid-cols-2">
                    {#each selectedVisits as visit}
                        <button type="button" class="rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5" onclick={() => onVisitSelect(visit)}>
                            <div class="flex items-start justify-between gap-2">
                                <span class="text-sm font-semibold text-foreground">{visit.person_visited_name || "Unknown person"}</span>
                                <span class="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">{formatCareOutcome(visit.outcome)}</span>
                            </div>
                            <p class="mt-1 text-xs text-muted-foreground">{formatInteraction(visit.interaction_type)} · {formatPurpose(visit.purpose)}</p>
                            {#if visit.visited_by_name}<p class="mt-1 text-xs text-muted-foreground">Led by {visit.visited_by_name}</p>{/if}
                            {#if visit.notes}<p class="mt-2 line-clamp-2 text-xs leading-5 text-foreground/80">{visit.notes}</p>{/if}
                            {#if visit.follow_up_required}<p class="mt-2 text-[11px] font-medium text-warning">Follow-up required{visit.follow_up_date ? ` · ${visit.follow_up_date}` : ""}</p>{/if}
                        </button>
                    {/each}
                </div>
            {/if}
        </section>
    {/if}

    <!-- Month stats -->
    <div
        class="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border"
    >
        <div class="text-center">
            <div class="text-lg font-bold text-foreground">
                {monthStats().total}
            </div>
            <div class="text-xs text-muted-foreground">Visits</div>
        </div>
        <div class="text-center">
            <div class="text-lg font-bold text-foreground">
                {monthStats().uniqueDays}
            </div>
            <div class="text-xs text-muted-foreground">Active Days</div>
        </div>
        <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-success"></div>
            <span class="text-xs text-muted-foreground">Positive</span>
            <div class="w-2 h-2 rounded-full bg-warning"></div>
            <span class="text-xs text-muted-foreground">Follow-up</span>
        </div>
    </div>
</div>
