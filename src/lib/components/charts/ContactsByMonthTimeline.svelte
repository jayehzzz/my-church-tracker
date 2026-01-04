<!--
  ContactsByMonthTimeline.svelte
  Vertical timeline showing contacts grouped by month with inviter info.
  
  Props:
    - contacts: Array of contact objects with contact_date and invited_by_id
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
    } = $props();

    // Group contacts by month
    const groupedByMonth = $derived(() => {
        const groups = {};

        contacts.forEach((contact) => {
            if (!contact.contact_date) return;

            const date = new Date(contact.contact_date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            const label = date.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
            });

            if (!groups[key]) {
                groups[key] = {
                    key,
                    label,
                    year: date.getFullYear(),
                    month: date.getMonth(),
                    contacts: [],
                };
            }
            groups[key].contacts.push(contact);
        });

        // Sort by date descending (most recent first)
        return Object.values(groups).sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });
    });

    // Collapsed state for months
    let collapsedMonths = $state({});

    // Toggle month collapse
    function toggleMonth(key) {
        collapsedMonths = { ...collapsedMonths, [key]: !collapsedMonths[key] };
    }

    // Get inviter by ID
    function getInviter(inviterId) {
        if (!inviterId) return null;
        return people.find((p) => p.id === inviterId);
    }

    // Format inviter name
    function formatInviterName(inviter) {
        if (!inviter) return "Unknown";
        return `${inviter.first_name} ${inviter.last_name || ""}`.trim();
    }

    // Format contact name
    function formatContactName(contact) {
        return `${contact.first_name} ${contact.last_name || ""}`.trim();
    }

    // Format date
    function formatDate(dateStr) {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    }

    // Get response badge color
    function getResponseColor(response) {
        const colorMap = {
            responsive: "bg-success/20 text-success",
            non_responsive: "bg-destructive/20 text-destructive",
            has_church: "bg-secondary text-muted-foreground",
            events_only: "bg-info/20 text-info",
            big_events_only: "bg-info/20 text-info",
            bacenta_mainly: "bg-warning/20 text-warning",
            do_not_contact: "bg-destructive/20 text-destructive",
        };
        return colorMap[response] || "bg-secondary text-muted-foreground";
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
        Contacts by Month
    </h3>

    {#if groupedByMonth().length === 0}
        <div class="h-32 flex items-center justify-center">
            <p class="text-sm text-muted-foreground italic">No contacts yet</p>
        </div>
    {:else}
        <div class="relative">
            <!-- Timeline line -->
            <div class="absolute left-3 top-0 bottom-0 w-0.5 bg-border"></div>

            <div class="space-y-4">
                {#each groupedByMonth() as monthGroup}
                    <div class="relative">
                        <!-- Month header -->
                        <button
                            type="button"
                            class="flex items-center gap-3 w-full text-left group"
                            onclick={() => toggleMonth(monthGroup.key)}
                        >
                            <!-- Timeline dot -->
                            <div
                                class="relative z-10 w-6 h-6 rounded-full bg-primary/20 border-2 border-primary
                                        flex items-center justify-center shrink-0"
                            >
                                <div
                                    class="w-2 h-2 rounded-full bg-primary"
                                ></div>
                            </div>

                            <!-- Month label -->
                            <div
                                class="flex-1 flex items-center justify-between"
                            >
                                <span
                                    class="font-semibold text-foreground group-hover:text-primary transition-colors"
                                >
                                    {monthGroup.label}
                                </span>
                                <div class="flex items-center gap-2">
                                    <span
                                        class="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full"
                                    >
                                        {monthGroup.contacts.length}
                                    </span>
                                    <svg
                                        class="w-4 h-4 text-muted-foreground transition-transform {collapsedMonths[
                                            monthGroup.key
                                        ]
                                            ? ''
                                            : 'rotate-180'}"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </button>

                        <!-- Contacts list (collapsible) -->
                        {#if !collapsedMonths[monthGroup.key]}
                            <div class="ml-9 mt-2 space-y-2">
                                {#each monthGroup.contacts as contact}
                                    {@const inviter = getInviter(
                                        contact.invited_by_id,
                                    )}
                                    <div
                                        class="w-full text-left p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40
                                               border border-transparent hover:border-border transition-all group/contact cursor-pointer"
                                        onclick={() =>
                                            handleContactClick(contact)}
                                        onkeydown={(e) =>
                                            e.key === "Enter" &&
                                            handleContactClick(contact)}
                                        role="button"
                                        tabindex="0"
                                    >
                                        <div
                                            class="flex items-start justify-between gap-2"
                                        >
                                            <div class="flex-1 min-w-0">
                                                <!-- Contact name -->
                                                <div
                                                    class="flex items-center gap-2 mb-1"
                                                >
                                                    <span
                                                        class="font-medium text-foreground truncate group-hover/contact:text-primary transition-colors"
                                                    >
                                                        {formatContactName(
                                                            contact,
                                                        )}
                                                    </span>
                                                    {#if contact.converted}
                                                        <span
                                                            class="text-[10px] px-1.5 py-0.5 rounded bg-success/20 text-success"
                                                        >
                                                            Converted
                                                        </span>
                                                    {/if}
                                                </div>

                                                <!-- Inviter info -->
                                                {#if inviter}
                                                    <div
                                                        class="text-xs text-muted-foreground flex items-center gap-1"
                                                    >
                                                        <span>Invited by</span>
                                                        <button
                                                            type="button"
                                                            class="text-primary hover:underline font-medium"
                                                            onclick={(e) =>
                                                                handleInviterClick(
                                                                    e,
                                                                    inviter,
                                                                )}
                                                        >
                                                            {formatInviterName(
                                                                inviter,
                                                            )}
                                                        </button>
                                                    </div>
                                                {/if}
                                            </div>

                                            <!-- Date and response -->
                                            <div class="text-right shrink-0">
                                                <div
                                                    class="text-xs text-muted-foreground mb-1"
                                                >
                                                    {formatDate(
                                                        contact.contact_date,
                                                    )}
                                                </div>
                                                {#if contact.response}
                                                    <span
                                                        class="text-[10px] px-1.5 py-0.5 rounded {getResponseColor(
                                                            contact.response,
                                                        )}"
                                                    >
                                                        {contact.response.replace(
                                                            /_/g,
                                                            " ",
                                                        )}
                                                    </span>
                                                {/if}
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>
