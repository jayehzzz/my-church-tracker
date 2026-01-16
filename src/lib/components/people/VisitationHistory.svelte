<script>
    import { Card, Badge } from "$lib/components/ui";

    let { visitations } = $props();

    function formatShortDate(dateStr) {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }

    function formatOutcome(outcome) {
        const map = {
            welcomed_encouraged: "Welcomed & Encouraged",
            prayer_request_received: "Prayer Request",
            not_home: "Not Home",
            concerns_shared: "Concerns Shared",
            invited_to_service: "Invited to Service",
        };
        return map[outcome] || outcome || "—";
    }

    function getOutcomeVariant(outcome) {
        const map = {
            welcomed_encouraged: "success",
            prayer_request_received: "info",
            not_home: "secondary",
            concerns_shared: "warning",
            invited_to_service: "default",
        };
        return map[outcome] || "secondary";
    }
</script>

<Card>
    <div class="p-6">
        <h3
            class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"
        >
            <svg
                class="w-5 h-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
            </svg>
            Visitation History
        </h3>

        {#if visitations.length === 0}
            <p class="text-sm text-muted-foreground">
                No home visits recorded.
            </p>
        {:else}
            <div class="space-y-4">
                {#each visitations as visit}
                    <div
                        class="border-b border-border last:border-0 pb-3 last:pb-0 hover:bg-muted/30 p-2 rounded-lg -mx-2 transition-colors"
                    >
                        <div class="flex justify-between items-start mb-1">
                            <span class="text-sm font-medium">
                                {formatShortDate(visit.visit_date)}
                            </span>
                            <Badge
                                variant={getOutcomeVariant(visit.outcome)}
                                size="sm"
                            >
                                {formatOutcome(visit.outcome)}
                            </Badge>
                        </div>
                        <p class="text-xs text-muted-foreground mb-1">
                            Visited by:
                            {#if visit.visited_by_id}
                                <a
                                    href="/people/{visit.visited_by_id}"
                                    class="text-foreground hover:text-primary hover:underline font-medium"
                                >
                                    {visit.visited_by_name || "Unknown"}
                                </a>
                            {:else}
                                <span class="text-foreground">
                                    {visit.visited_by_name || "Unknown"}
                                </span>
                            {/if}
                        </p>
                        {#if visit.notes}
                            <p class="text-sm italic text-muted-foreground">
                                "{visit.notes}"
                            </p>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</Card>
