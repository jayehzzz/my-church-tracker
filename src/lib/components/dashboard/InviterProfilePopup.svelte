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
        open = false,
        person = null,
        contacts = [],
        onClose = null,
        onViewProfile = null,
    } = $props();

    // Calculate inviter stats
    const stats = $derived(() => {
        if (!person || !contacts.length) {
            return {
                totalInvited: 0,
                conversions: 0,
                conversionRate: 0,
                recentContacts: [],
            };
        }

        const invitedContacts = contacts.filter(
            (c) => c.invited_by_id === person.id,
        );
        const conversions = invitedContacts.filter(
            (c) => c.converted || c.salvation_decision,
        ).length;
        const conversionRate =
            invitedContacts.length > 0
                ? Math.round((conversions / invitedContacts.length) * 100)
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
            conversions,
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

<Modal {open} onclose={onClose} size="md">
    {#snippet title()}
        <span class="flex items-center gap-2">
            <svg
                class="w-5 h-5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
            </svg>
            Inviter Profile
        </span>
    {/snippet}

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
                            {stats().conversions}
                        </div>
                        <div class="text-xs text-muted-foreground">
                            Conversions
                        </div>
                    </div>
                    <div class="text-center p-3 rounded-lg bg-secondary/30">
                        <div class="text-2xl font-bold text-foreground">
                            {stats().conversionRate}%
                        </div>
                        <div class="text-xs text-muted-foreground">Rate</div>
                    </div>
                </div>

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
                                <div
                                    class="flex items-center justify-between p-2 rounded-lg bg-secondary/20"
                                >
                                    <div class="flex items-center gap-2">
                                        <span
                                            class="text-sm font-medium text-foreground"
                                        >
                                            {formatName(contact)}
                                        </span>
                                        {#if contact.converted}
                                            <span
                                                class="text-[10px] px-1.5 py-0.5 rounded bg-success/20 text-success"
                                            >
                                                Converted
                                            </span>
                                        {/if}
                                    </div>
                                    <span class="text-xs text-muted-foreground">
                                        {formatDate(contact.contact_date)}
                                    </span>
                                </div>
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
