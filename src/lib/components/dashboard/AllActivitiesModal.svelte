<!--
  AllActivitiesModal.svelte
  Modal showing all recent church activities with search and category filtering.
  Allows clicking any activity to view its full details.
-->

<script>
    import Modal from "$lib/components/ui/Modal.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Input from "$lib/components/ui/Input.svelte";

    let {
        isOpen = $bindable(false),
        activities = [],
        onSelectActivity = null,
        onclose = null,
    } = $props();

    let searchQuery = $state("");
    let selectedType = $state("all");

    const typeFilters = [
        { id: "all", label: "All Activities" },
        { id: "service", label: "Services" },
        { id: "meeting", label: "Meetings" },
        { id: "contact", label: "Evangelism" },
        { id: "visitation", label: "Pastoral Care" },
        { id: "salvation", label: "Salvation" },
    ];

    function getActivityColor(type) {
        const colors = {
            service: "#3b82f6", // blue
            meeting: "#8b5cf6", // purple
            contact: "#06b6d4", // cyan
            visitation: "#eab308", // amber/yellow
            salvation: "#ec4899", // pink
            conversion: "#10b981", // green
            attendance: "#10b981", // green
            event: "#8b5cf6", // purple
            note: "#6b7280", // gray
        };
        return colors[type] || colors.note;
    }

    function getInitials(name) {
        if (!name) return "?";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    }

    function formatRelativeTime(timestamp) {
        if (!timestamp) return "—";
        const now = new Date();
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        if (isNaN(date.getTime())) return "—";
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    }

    function toISOString(date) {
        if (!date) return "";
        const d = date instanceof Date ? date : new Date(date);
        return isNaN(d.getTime()) ? "" : d.toISOString();
    }

    // Filter activities by search query and type
    const filteredActivities = $derived.by(() => {
        const query = searchQuery.trim().toLowerCase();
        return activities.filter((act) => {
            // Type match
            const matchesType =
                selectedType === "all" ||
                act.type === selectedType ||
                (selectedType === "salvation" && (act.type === "salvation" || act.type === "conversion"));
            if (!matchesType) return false;

            // Query match
            if (!query) return true;
            const nameMatch = (act.person || "").toLowerCase().includes(query);
            const actionMatch = (act.action || act.description || "").toLowerCase().includes(query);
            const notesMatch = (act.notes || "").toLowerCase().includes(query);
            const outcomeMatch = (act.statusOrOutcome || "").toLowerCase().includes(query);

            return nameMatch || actionMatch || notesMatch || outcomeMatch;
        });
    });

    function handleItemClick(activity) {
        onSelectActivity?.(activity);
    }

    function handleClose() {
        isOpen = false;
        onclose?.();
    }
</script>

<Modal bind:isOpen title="All Church Activities" size="lg" onclose={handleClose}>
    <div class="space-y-4 pt-1">
        <!-- Search & Filter Controls -->
        <div class="space-y-3">
            <!-- Search Bar -->
            <div class="relative">
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Search activities by name, action, or note..."
                    class="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary/30 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
                <svg
                    class="w-4 h-4 text-muted-foreground absolute left-3.5 top-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
                {#if searchQuery}
                    <button
                        type="button"
                        class="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                        onclick={() => (searchQuery = "")}
                    >
                        ✕
                    </button>
                {/if}
            </div>

            <!-- Filter Chips -->
            <div class="flex items-center gap-1.5 flex-wrap">
                {#each typeFilters as filter}
                    <button
                        type="button"
                        class="px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 cursor-pointer
                               {selectedType === filter.id
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 border border-border'}"
                        onclick={() => (selectedType = filter.id)}
                    >
                        {filter.label}
                    </button>
                {/each}
                <span class="text-xs text-muted-foreground ml-auto">
                    {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'}
                </span>
            </div>
        </div>

        <!-- Scrollable Activities List -->
        <div class="max-h-[55vh] overflow-y-auto space-y-2 pr-1 divide-y divide-border/20">
            {#if filteredActivities.length === 0}
                <div class="py-12 text-center text-muted-foreground">
                    <svg
                        class="w-10 h-10 mx-auto mb-2 opacity-40"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.5"
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                    </svg>
                    <p class="text-sm">No matching activities found</p>
                    {#if searchQuery}
                        <p class="text-xs text-muted-foreground/70 mt-1">
                            Try adjusting your search terms or filters
                        </p>
                    {/if}
                </div>
            {:else}
                {#each filteredActivities as activity (activity.id)}
                    <button
                        type="button"
                        onclick={() => handleItemClick(activity)}
                        class="w-full text-left flex items-center gap-4 p-3.5 rounded-xl border-l-[3px] transition-all duration-200 hover:bg-secondary/30 cursor-pointer group"
                        style="border-left-color: {getActivityColor(activity.type)}"
                    >
                        <!-- Avatar / Icon with initials -->
                        <div
                            class="w-10 h-10 rounded-full bg-[#252525] flex items-center justify-center text-sm font-medium text-foreground shrink-0 group-hover:scale-105 transition-transform"
                        >
                            {#if activity.type === 'service'}
                                🏛️
                            {:else if activity.type === 'meeting'}
                                👥
                            {:else if activity.type === 'salvation'}
                                ✝️
                            {:else if activity.type === 'visitation'}
                                🏠
                            {:else}
                                {getInitials(activity.person)}
                            {/if}
                        </div>

                        <!-- Content -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-0.5">
                                <p class="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                    {activity.type === 'service' || activity.type === 'meeting' ? activity.description : activity.person}
                                </p>
                                {#if activity.statusOrOutcome}
                                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-medium uppercase tracking-wider">
                                        {activity.statusOrOutcome.replace(/_/g, " ")}
                                    </span>
                                {/if}
                            </div>
                            <p class="text-xs text-muted-foreground truncate">
                                {activity.action || activity.description}
                            </p>
                        </div>

                        <!-- Time & Arrow -->
                        <div class="flex items-center gap-2 shrink-0">
                            <time
                                datetime={toISOString(activity.timestamp)}
                                class="text-xs text-muted-foreground"
                            >
                                {formatRelativeTime(activity.timestamp)}
                            </time>
                            <svg
                                class="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
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
            {/if}
        </div>
    </div>

    {#snippet footer()}
        <div class="flex items-center justify-end w-full">
            <Button variant="outline" size="sm" onclick={handleClose}>
                Close
            </Button>
        </div>
    {/snippet}
</Modal>
