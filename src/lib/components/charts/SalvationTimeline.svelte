<!--
  SalvationTimeline.svelte
  Timeline visualization of salvation decisions with inviter info.
  
  Props:
    - contacts: Array of converted contacts with salvation_decision = true
    - people: Array of people for inviter lookup
    - onInviterClick: Callback when inviter name is clicked
    - onContactClick: Callback when contact is clicked
-->

<script>
    let {
        contacts = [],
        people = [],
        onInviterClick = null,
        onContactClick = null,
        maxItems = 10,
    } = $props();

    // Filter to only salvation decisions and sort by date
    const salvationDecisions = $derived(() => {
        return contacts
            .filter((c) => c.salvation_decision || c.converted)
            .sort((a, b) => {
                const dateA = new Date(
                    a.conversion_date || a.contact_date || 0,
                );
                const dateB = new Date(
                    b.conversion_date || b.contact_date || 0,
                );
                return dateB - dateA; // Most recent first
            })
            .slice(0, maxItems);
    });

    // Get inviter by ID
    function getInviter(inviterId) {
        if (!inviterId) return null;
        return people.find((p) => p.id === inviterId);
    }

    // Format name
    function formatName(person) {
        if (!person) return "Unknown";
        return `${person.first_name} ${person.last_name || ""}`.trim();
    }

    // Format date
    function formatDate(dateStr) {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }

    // Get time ago
    function getTimeAgo(dateStr) {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    }

    // Handle inviter click
    function handleInviterClick(e, inviter) {
        e.stopPropagation();
        if (onInviterClick && inviter) {
            onInviterClick(inviter);
        }
    }

    // Handle contact click
    function handleContactClick(contact) {
        if (onContactClick) {
            onContactClick(contact);
        }
    }
</script>

<div class="card-base p-4">
    <h3
        class="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2"
    >
        <svg
            class="w-4 h-4 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
        </svg>
        Salvation Decisions
        {#if salvationDecisions().length > 0}
            <span
                class="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full ml-auto"
            >
                {salvationDecisions().length}
            </span>
        {/if}
    </h3>

    {#if salvationDecisions().length === 0}
        <div class="h-32 flex items-center justify-center">
            <p class="text-sm text-muted-foreground italic">
                No salvation decisions recorded
            </p>
        </div>
    {:else}
        <div class="relative">
            <!-- Timeline line -->
            <div
                class="absolute left-3 top-0 bottom-0 w-0.5 bg-success/30"
            ></div>

            <div class="space-y-3">
                {#each salvationDecisions() as contact, index}
                    {@const inviter = getInviter(contact.invited_by_id)}
                    {@const decisionDate =
                        contact.conversion_date || contact.contact_date}

                    <div
                        class="relative flex items-start gap-3 w-full text-left group cursor-pointer"
                        onclick={() => handleContactClick(contact)}
                        onkeydown={(e) =>
                            e.key === "Enter" && handleContactClick(contact)}
                        role="button"
                        tabindex="0"
                    >
                        <!-- Timeline dot with animation -->
                        <div class="relative z-10 shrink-0">
                            <div
                                class="w-6 h-6 rounded-full bg-success/20 border-2 border-success
                                        flex items-center justify-center group-hover:scale-110 transition-transform"
                            >
                                <svg
                                    class="w-3 h-3 text-success"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fill-rule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clip-rule="evenodd"
                                    />
                                </svg>
                            </div>

                            <!-- Pulse animation for recent -->
                            {#if index === 0}
                                <div
                                    class="absolute inset-0 rounded-full bg-success/20 animate-ping"
                                ></div>
                            {/if}
                        </div>

                        <!-- Content -->
                        <div class="flex-1 pb-3 min-w-0">
                            <div
                                class="p-3 rounded-lg bg-success/5 border border-success/20
                                        group-hover:bg-success/10 group-hover:border-success/30 transition-all"
                            >
                                <div
                                    class="flex items-start justify-between gap-2"
                                >
                                    <div class="flex-1 min-w-0">
                                        <!-- Person name -->
                                        <div
                                            class="font-medium text-foreground truncate group-hover:text-success transition-colors"
                                        >
                                            {formatName(contact)}
                                        </div>

                                        <!-- Inviter -->
                                        {#if inviter}
                                            <div
                                                class="text-xs text-muted-foreground mt-1 flex items-center gap-1"
                                            >
                                                <span>Led by</span>
                                                <button
                                                    type="button"
                                                    class="text-primary hover:underline font-medium"
                                                    onclick={(e) =>
                                                        handleInviterClick(
                                                            e,
                                                            inviter,
                                                        )}
                                                >
                                                    {formatName(inviter)}
                                                </button>
                                            </div>
                                        {/if}
                                    </div>

                                    <!-- Date -->
                                    <div class="text-right shrink-0">
                                        <div
                                            class="text-xs text-success font-medium"
                                        >
                                            {getTimeAgo(decisionDate)}
                                        </div>
                                        <div
                                            class="text-[10px] text-muted-foreground"
                                        >
                                            {formatDate(decisionDate)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <!-- View more link if there are more -->
        {#if contacts.filter((c) => c.salvation_decision || c.converted).length > maxItems}
            <div class="mt-4 text-center">
                <span class="text-xs text-muted-foreground">
                    Showing {maxItems} of {contacts.filter(
                        (c) => c.salvation_decision || c.converted,
                    ).length} decisions
                </span>
            </div>
        {/if}
    {/if}
</div>
