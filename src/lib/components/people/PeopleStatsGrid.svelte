<script>
    import { Card } from "$lib/components/ui";

    let { totalAttendance, lastAttended, prayerMeetingsCount, activityScore } =
        $props();

    function formatDate(dateStr) {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }

    // Scroll to section helper
    function scrollTo(id) {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
    }
</script>

<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <!-- Total Attendance -->
    <button
        class="text-left card-interactive hover-lift group relative overflow-hidden p-5 rounded-xl border border-border transition-transform active:scale-95"
        onclick={() => scrollTo("attendance-history")}
    >
        <div class="flex flex-col h-full justify-between relative z-10">
            <span class="text-sm text-muted-foreground mb-1 block"
                >Total Services</span
            >
            <div class="flex items-baseline gap-2">
                <span
                    class="text-4xl font-semibold tracking-tight text-foreground transition-all duration-300 group-hover:scale-105 group-hover:text-primary origin-left"
                >
                    {totalAttendance}
                </span>
                <span
                    class="text-xs text-muted-foreground font-medium uppercase tracking-wider"
                    >All time</span
                >
            </div>
        </div>
    </button>

    <!-- Last Attended -->
    <div
        class="card-interactive hover-lift group relative overflow-hidden p-5 rounded-xl border border-border"
    >
        <div class="flex flex-col h-full justify-between relative z-10">
            <span class="text-sm text-muted-foreground mb-1 block"
                >Last Seen</span
            >
            <div>
                <span
                    class="text-xl font-medium text-foreground block truncate"
                >
                    {formatDate(lastAttended)}
                </span>
                <span class="text-xs text-muted-foreground mt-1 block">
                    {lastAttended
                        ? "Latest service check-in"
                        : "No records found"}
                </span>
            </div>
        </div>
    </div>

    <!-- Prayer Meetings -->
    <div
        class="card-interactive hover-lift group relative overflow-hidden p-5 rounded-xl border border-border"
    >
        <div class="flex flex-col h-full justify-between relative z-10">
            <span class="text-sm text-muted-foreground mb-1 block"
                >Prayer Activity</span
            >
            <div class="flex items-baseline gap-2">
                <span
                    class="text-4xl font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors duration-300"
                >
                    {prayerMeetingsCount}
                </span>
                <span class="text-xs text-muted-foreground">meetings</span>
            </div>
        </div>
    </div>

    <!-- Activity Score -->
    <div
        class="card-interactive hover-lift group relative overflow-hidden p-5 rounded-xl border border-border"
    >
        <div class="flex flex-col h-full justify-between relative z-10">
            <span class="text-sm text-muted-foreground mb-1 block"
                >Activity Score</span
            >
            <div class="flex items-baseline gap-2">
                <span
                    class="text-4xl font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors duration-300"
                >
                    {activityScore}%
                </span>
            </div>
            <div class="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                    class="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                    style="width: {activityScore}%"
                ></div>
            </div>
        </div>
    </div>
</div>
