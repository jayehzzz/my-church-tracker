<!--
  InviterProfilePopup.svelte
  Modal popup showing inviter profile with their stats and contacts.
  
  Props:
    - open: Boolean for modal visibility
    - person: Person object for the inviter
    - contacts: All contacts to calculate stats
    - onClose: Callback to close modal
    - onViewProfile: Callback to navigate to full profile
-->

<script>
    import Modal from "$lib/components/ui/Modal.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import ProfileQuickViewCard from "$lib/components/people/ProfileQuickViewCard.svelte";

    let {
        isOpen = $bindable(false),
        person = null,
        contacts = [],
        periodLabel = "Selected period",
        onClose = null,
        onViewProfile = null,
        onViewContact = null,
    } = $props();

    // Calculate inviter stats
    const stats = $derived(() => {
        if (!person || !contacts.length) {
            return {
                totalInvited: 0,
                joined: 0,
                conversionRate: 0,
                recentContacts: [],
            };
        }

        const personId = person._id || person.id;
        const invitedContacts = contacts.filter(
            (c) => String(c.invited_by_id) === String(personId),
        );
        const joined = invitedContacts.filter(
            (c) => c.converted || c.status === "member" || c.member_status === "member" || c.member_status === "leader",
        ).length;
        const conversionRate =
            invitedContacts.length > 0
                ? Math.round((joined / invitedContacts.length) * 100)
                : 0;

        // Get recent contacts (sorted by date, max 5)
        const recentContacts = [...invitedContacts]
            .sort(
                (a, b) =>
                    new Date(b.contact_date || 0) -
                    new Date(a.contact_date || 0),
            )
            .slice(0, 5);

        return {
            totalInvited: invitedContacts.length,
            joined,
            conversionRate,
            recentContacts,
        };
    });

    // Format contact name
    function formatName(contact) {
        return `${contact.first_name} ${contact.last_name || ""}`.trim();
    }

    // Format date
    function formatDate(dateStr) {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    }

    // Handle view profile click
    function handleViewProfile() {
        if (onViewProfile && person) {
            onViewProfile(person);
        }
    }
</script>

<Modal bind:isOpen onclose={onClose} title="Connection impact" size="md">
    {#snippet children()}
        {#if person}
            <div class="space-y-4">
                <!-- Profile Quick View Card -->
                <ProfileQuickViewCard {person} onclick={handleViewProfile} />

                <!-- Stats Section -->
                <div class="grid grid-cols-3 gap-3">
                    <div class="text-center p-3 rounded-lg bg-secondary/30">
                        <div class="text-2xl font-bold text-primary">
                            {stats().totalInvited}
                        </div>
                        <div class="text-xs text-muted-foreground">Invited</div>
                    </div>
                    <div class="text-center p-3 rounded-lg bg-secondary/30">
                        <div class="text-2xl font-bold text-success">
                            {stats().joined}
                        </div>
                        <div class="text-xs text-muted-foreground">Joined</div>
                    </div>
                    <div class="text-center p-3 rounded-lg bg-secondary/30">
                        <div class="text-2xl font-bold text-foreground">
                            {stats().conversionRate}%
                        </div>
                        <div class="text-xs text-muted-foreground">Rate</div>
                    </div>
                </div>
                <p class="text-center text-xs text-muted-foreground">Results for {periodLabel}</p>

                <!-- Recent Contacts -->
                {#if stats().recentContacts.length > 0}
                    <div>
                        <h4
                            class="text-sm font-medium text-muted-foreground mb-2"
                        >
                            Recent Invited Contacts
                        </h4>
                        <div class="space-y-2">
                            {#each stats().recentContacts as contact}
                                <button
                                    type="button"
                                    class="flex w-full items-center justify-between rounded-lg bg-secondary/20 p-2 text-left transition-colors hover:bg-secondary/40"
                                    onclick={() => onViewContact?.(contact)}
                                >
                                    <div class="flex items-center gap-2">
                                        <span
                                            class="text-sm font-medium text-foreground"
                                        >
                                            {formatName(contact)}
                                        </span>
                                        {#if contact.converted || contact.status === "member" || contact.member_status === "member" || contact.member_status === "leader"}
                                            <span
                                                class="text-[10px] px-1.5 py-0.5 rounded bg-success/20 text-success"
                                            >
                                                Joined
                                            </span>
                                        {/if}
                                    </div>
                                    <span class="text-xs text-muted-foreground">
                                        {formatDate(contact.contact_date)}
                                    </span>
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    {/snippet}

    {#snippet footer()}
        <div class="flex justify-end gap-2">
            <Button variant="ghost" onclick={onClose}>Close</Button>
            <Button onclick={handleViewProfile}>
                <svg
                    class="w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                </svg>
                View Full Profile
            </Button>
        </div>
    {/snippet}
</Modal>
