<!--
  VisitationCalendar.svelte
  Month-view calendar showing visitation activity with dots on dates with visits.
  
  Props:
    - data: Array of { visit_date, person_visited_name, outcome }
    - title: Optional title
-->

<script>
    /** @type {{ visit_date: string, person_visited_name: string, outcome: string }[]} */
    let { data = [], title = "Visitation Calendar" } = $props();

    // Current viewing month
    let currentDate = $state(new Date());

    // Navigate months
    function nextMonth() {
        currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            1,
        );
    }

    function prevMonth() {
        currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            1,
        );
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

    // Format outcome for tooltip
    function formatOutcome(outcome) {
        const map = {
            welcomed_encouraged: "Welcomed",
            prayer_request_received: "Prayer Request",
            invited_to_service: "Invited",
            concerns_shared: "Concerns",
            follow_up_needed: "Follow-up",
            not_home: "Not Home",
            declined: "Declined",
        };
        return map[outcome] || outcome;
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
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

        const monthVisits = data.filter((v) => {
            const visitDate = new Date(v.visit_date);
            return visitDate >= monthStart && visitDate <= monthEnd;
        });

        return {
            total: monthVisits.length,
            uniqueDays: new Set(monthVisits.map((v) => v.visit_date)).size,
        };
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
            <div
                class="min-h-[48px] p-1 rounded border transition-colors
                    {day
                    ? 'border-border/50 hover:border-primary/50'
                    : 'border-transparent'}
                    {isToday(dateStr) ? 'bg-primary/10 border-primary/30' : ''}"
            >
                {#if day}
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
                                    title="{visit.person_visited_name}: {formatOutcome(
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
                {/if}
            </div>
        {/each}
    </div>

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
