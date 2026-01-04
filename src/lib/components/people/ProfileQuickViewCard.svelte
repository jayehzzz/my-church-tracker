<!--
  ProfileQuickViewCard.svelte
  Quick view card for a person showing key info at a glance.
  
  Props:
    - person: Person object with all fields
    - onclick: Optional click handler
-->

<script>
    let { person = null, onclick = null } = $props();

    // Format status display
    function formatStatus(status) {
        const map = {
            visitor: "Visitor",
            guest: "Guest",
            member: "Member",
            leader: "Leader",
            archived: "Archived",
        };
        return map[status?.toLowerCase()] || status || "Guest";
    }

    // Format role display
    function formatRole(role) {
        const map = {
            basonta_worker: "Basonta Worker",
            bacenta_leader: "Bacenta Leader",
            no_role: "No Role",
        };
        return map[role] || role || "—";
    }

    // Get status badge color
    function getStatusColor(status) {
        const colorMap = {
            visitor: "bg-secondary text-secondary-foreground",
            guest: "bg-secondary text-secondary-foreground",
            member: "bg-primary/20 text-primary",
            leader: "bg-success/20 text-success",
            archived: "bg-destructive/20 text-destructive",
        };
        return (
            colorMap[status?.toLowerCase()] ||
            "bg-secondary text-muted-foreground"
        );
    }

    // Get initials
    function getInitials(p) {
        if (!p) return "?";
        return (
            (
                (p.first_name?.[0] || "") + (p.last_name?.[0] || "")
            ).toUpperCase() || "?"
        );
    }

    // Format date
    function formatDate(dateStr) {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    }
</script>

{#if person}
    <button
        type="button"
        class="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-secondary/20
               hover:border-primary/30 transition-all duration-200 group cursor-pointer"
        onclick={() => onclick?.(person)}
    >
        <div class="flex items-start gap-3">
            <!-- Avatar -->
            <div class="shrink-0">
                <div
                    class="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center
                            text-lg font-bold text-primary group-hover:scale-105 transition-transform"
                >
                    {getInitials(person)}
                </div>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <h4 class="font-medium text-foreground truncate">
                        {person.first_name || ""}
                        {person.last_name || ""}
                    </h4>
                    <span
                        class="text-xs px-2 py-0.5 rounded-full shrink-0 {getStatusColor(
                            person.member_status,
                        )}"
                    >
                        {formatStatus(person.member_status)}
                    </span>
                </div>

                <div class="text-xs text-muted-foreground space-y-0.5">
                    {#if person.role && person.role !== "no_role"}
                        <div class="flex items-center gap-1">
                            <svg
                                class="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                />
                            </svg>
                            <span>{formatRole(person.role)}</span>
                        </div>
                    {/if}

                    {#if person.phone}
                        <div class="flex items-center gap-1">
                            <svg
                                class="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
                            </svg>
                            <span class="truncate">{person.phone}</span>
                        </div>
                    {/if}

                    {#if person.last_attended}
                        <div class="flex items-center gap-1">
                            <svg
                                class="w-3 h-3"
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
                            <span>Last: {formatDate(person.last_attended)}</span
                            >
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Arrow indicator -->
            <div
                class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
                        d="M9 5l7 7-7 7"
                    />
                </svg>
            </div>
        </div>

        <!-- Quick indicators row -->
        {#if person.is_baptised || person.is_tither}
            <div class="flex gap-2 mt-3 pt-3 border-t border-border/50">
                {#if person.is_baptised}
                    <span
                        class="text-[10px] px-2 py-0.5 rounded bg-info/20 text-info"
                        >Baptised</span
                    >
                {/if}
                {#if person.is_tither}
                    <span
                        class="text-[10px] px-2 py-0.5 rounded bg-success/20 text-success"
                        >Tither</span
                    >
                {/if}
            </div>
        {/if}
    </button>
{/if}
