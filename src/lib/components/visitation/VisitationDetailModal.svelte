<!--
  VisitationDetailModal.svelte
  Modal for viewing and editing visitation record details.
  
  Features:
  - View mode with formatted details
  - Edit mode toggle
  - Linked person names (clickable)
  - Smooth animations
-->

<script>
    import { Modal, Button, Badge } from "$lib/components/ui";
    import { goto } from "$app/navigation";

    let {
        isOpen = $bindable(false),
        visitation = null,
        onEdit = null,
        onDelete = null,
    } = $props();

    function formatDate(dateStr) {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

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
            prayer_request_received: "Prayer Request Received",
            not_home: "Not Home",
            concerns_shared: "Concerns Shared",
            invited_to_service: "Invited to Service",
            follow_up_needed: "Follow-up Needed",
            declined: "Declined",
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
            follow_up_needed: "warning",
            declined: "destructive",
        };
        return map[outcome] || "secondary";
    }

    function handleClose() {
        isOpen = false;
    }

    function handleEdit() {
        isOpen = false;
        onEdit?.(visitation);
    }

    function handleDelete() {
        onDelete?.(visitation);
    }

    function navigateToPerson(personId) {
        if (personId) {
            isOpen = false;
            goto(`/people/${personId}`);
        }
    }
</script>

<Modal bind:isOpen title="Visitation Details" size="md">
    {#if visitation}
        <div class="space-y-6">
            <!-- Header with outcome badge -->
            <div class="text-center pb-4 border-b border-border">
                <Badge
                    variant={getOutcomeVariant(visitation.outcome)}
                    class="mb-2"
                >
                    {formatOutcome(visitation.outcome)}
                </Badge>
                <h3 class="text-xl font-bold text-foreground">
                    Visit to {visitation.person_visited_name || "Unknown"}
                </h3>
                <p class="text-muted-foreground">
                    {formatDate(visitation.visit_date)}
                </p>
            </div>

            <!-- Details Grid -->
            <div class="grid grid-cols-2 gap-4 text-sm">
                <!-- Person Visited -->
                <div>
                    <span class="text-muted-foreground">Person Visited</span>
                    {#if visitation.person_id}
                        <button
                            class="block font-medium text-primary hover:underline cursor-pointer text-left"
                            onclick={() =>
                                navigateToPerson(visitation.person_id)}
                        >
                            {visitation.person_visited_name || "View Profile"}
                        </button>
                    {:else}
                        <p class="font-medium text-foreground">
                            {visitation.person_visited_name || "—"}
                        </p>
                    {/if}
                </div>

                <!-- Visited By -->
                <div>
                    <span class="text-muted-foreground">Visited By</span>
                    {#if visitation.visited_by_id}
                        <button
                            class="block font-medium text-primary hover:underline cursor-pointer text-left"
                            onclick={() =>
                                navigateToPerson(visitation.visited_by_id)}
                        >
                            {visitation.visited_by_name || "View Profile"}
                        </button>
                    {:else}
                        <p class="font-medium text-foreground">
                            {visitation.visited_by_name || "—"}
                        </p>
                    {/if}
                </div>

                <!-- Follow-up Required -->
                <div>
                    <span class="text-muted-foreground">Follow-up Required</span
                    >
                    <p class="font-medium">
                        <Badge
                            variant={visitation.follow_up_required
                                ? "warning"
                                : "secondary"}
                        >
                            {visitation.follow_up_required ? "Yes" : "No"}
                        </Badge>
                    </p>
                </div>

                <!-- Follow-up Date -->
                {#if visitation.follow_up_required && visitation.follow_up_date}
                    <div>
                        <span class="text-muted-foreground">Follow-up Date</span
                        >
                        <p class="font-medium text-foreground">
                            {formatShortDate(visitation.follow_up_date)}
                        </p>
                    </div>
                {/if}
            </div>

            <!-- Notes Section -->
            {#if visitation.notes}
                <div class="p-4 bg-secondary/30 rounded-lg">
                    <h4 class="text-sm font-medium text-muted-foreground mb-2">
                        Notes
                    </h4>
                    <p class="text-sm text-foreground/90 whitespace-pre-wrap">
                        {visitation.notes}
                    </p>
                </div>
            {/if}

            <!-- Timestamps -->
            <div
                class="pt-4 border-t border-border text-xs text-muted-foreground"
            >
                {#if visitation.created_at}
                    <span
                        >Created: {formatShortDate(visitation.created_at)}</span
                    >
                {/if}
                {#if visitation.updated_at}
                    <span class="ml-4"
                        >Updated: {formatShortDate(visitation.updated_at)}</span
                    >
                {/if}
            </div>
        </div>
    {:else}
        <div class="text-center py-8 text-muted-foreground">
            No visitation details available.
        </div>
    {/if}

    {#snippet footer()}
        <div class="flex items-center justify-between w-full">
            <div>
                {#if onDelete && visitation}
                    <Button
                        variant="ghost"
                        class="text-destructive hover:text-destructive"
                        onclick={handleDelete}
                    >
                        <svg
                            class="w-4 h-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                        </svg>
                        Delete
                    </Button>
                {/if}
            </div>
            <div class="flex gap-2">
                <Button variant="secondary" onclick={handleClose}>Close</Button>
                {#if onEdit && visitation}
                    <Button onclick={handleEdit}>
                        <svg
                            class="w-4 h-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                        </svg>
                        Edit
                    </Button>
                {/if}
            </div>
        </div>
    {/snippet}
</Modal>
