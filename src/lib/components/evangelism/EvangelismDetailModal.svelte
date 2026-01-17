<!--
  EvangelismDetailModal.svelte
  Modal for viewing and editing evangelism contact details.
  
  Features:
  - View mode with formatted details
  - Copy-to-clipboard on hover for contact details
  - Inline edit dropdowns matching MultiSelectFilter styling
  - Linked person names (clickable)
  - Status badges
  - Smooth animations
-->

<script>
    import { Modal, Button, Badge } from "$lib/components/ui";
    import InlineSelectDropdown from "$lib/components/ui/InlineSelectDropdown.svelte";
    import { goto } from "$app/navigation";

    let {
        isOpen = $bindable(false),
        contact = null,
        onEdit = null,
        onDelete = null,
        onConvert = null,
        onQuickUpdate = null,
    } = $props();

    // Track which field is being edited inline
    let editingField = $state(null);
    let copiedField = $state(null);
    let isUpdating = $state(false);

    // Response options for the dropdown
    const responseOptions = [
        { value: "responsive", label: "Responsive" },
        { value: "non_responsive", label: "Non-Responsive" },
        { value: "has_church", label: "Has Church" },
        { value: "events_only", label: "Events Only" },
        { value: "big_events_only", label: "Big Events Only" },
        { value: "bacenta_mainly", label: "Bacenta Mainly" },
        { value: "do_not_contact", label: "Do Not Contact" },
    ];

    // Boolean options for Yes/No fields
    const booleanOptions = [
        { value: true, label: "Yes" },
        { value: false, label: "No" },
    ];

    // Derived state for dropdown visibility
    let responseDropdownOpen = $derived(editingField === "response");
    let attendedDropdownOpen = $derived(editingField === "attended_church");
    let salvationDropdownOpen = $derived(editingField === "salvation_decision");

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

    function formatResponse(response) {
        const map = {
            responsive: "Responsive",
            non_responsive: "Non-Responsive",
            has_church: "Has Church",
            events_only: "Events Only",
            big_events_only: "Big Events Only",
            bacenta_mainly: "Bacenta Mainly",
            do_not_contact: "Do Not Contact",
        };
        return map[response] || response || "—";
    }

    function getResponseVariant(response) {
        const map = {
            responsive: "success",
            non_responsive: "secondary",
            has_church: "info",
            events_only: "warning",
            big_events_only: "warning",
            bacenta_mainly: "default",
            do_not_contact: "destructive",
        };
        return map[response] || "secondary";
    }

    function calculateDaysSince(dateStr) {
        if (!dateStr) return "—";
        const contactDate = new Date(dateStr);
        const today = new Date();
        const diffTime = Math.abs(today - contactDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays} days`;
    }

    function handleClose() {
        isOpen = false;
        editingField = null;
    }

    function handleEdit() {
        isOpen = false;
        onEdit?.(contact);
    }

    function handleDelete() {
        onDelete?.(contact);
    }

    function handleConvert() {
        onConvert?.(contact);
    }

    function navigateToPerson(personId) {
        if (personId) {
            isOpen = false;
            goto(`/people/${personId}`);
        }
    }

    async function copyToClipboard(text, fieldName) {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            copiedField = fieldName;
            setTimeout(() => {
                copiedField = null;
            }, 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    }

    async function handleQuickUpdate(field, value) {
        if (!onQuickUpdate || !contact) return;

        isUpdating = true;
        editingField = null;
        try {
            await onQuickUpdate(contact.id, { [field]: value });
            // Update local contact state
            contact = { ...contact, [field]: value };
        } catch (err) {
            console.error("Failed to update:", err);
        } finally {
            isUpdating = false;
        }
    }

    function toggleEditField(field, event) {
        event?.stopPropagation();
        if (editingField === field) {
            editingField = null;
        } else {
            editingField = field;
        }
    }

    function closeDropdowns() {
        editingField = null;
    }
</script>

<Modal bind:isOpen title="Contact Details" size="md">
    {#if contact}
        <div class="space-y-6">
            <!-- Header with name and status -->
            <div class="text-center pb-4 border-b border-border">
                <div
                    class="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center"
                >
                    <span class="text-xl font-bold text-primary">
                        {contact.first_name?.[0] || ""}{contact
                            .last_name?.[0] || ""}
                    </span>
                </div>
                <h3 class="text-xl font-bold text-foreground">
                    {contact.first_name || ""}
                    {contact.last_name || ""}
                </h3>

                <!-- Editable Response Badge -->
                <div
                    class="flex items-center justify-center gap-2 mt-2 relative"
                >
                    <div class="inline-flex items-center group relative">
                        <Badge variant={getResponseVariant(contact.response)}>
                            {formatResponse(contact.response)}
                        </Badge>
                        {#if onQuickUpdate}
                            <button
                                type="button"
                                class="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary/50 transition-all"
                                onclick={(e) => toggleEditField("response", e)}
                                title="Change category"
                            >
                                <svg
                                    class="w-3.5 h-3.5 text-muted-foreground"
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
                            </button>
                        {/if}

                        <!-- Response Dropdown -->
                        {#if editingField === "response"}
                            <InlineSelectDropdown
                                options={responseOptions}
                                value={contact.response}
                                placeholder="Search..."
                                showSearch={true}
                                disabled={isUpdating}
                                onSelect={(val) =>
                                    handleQuickUpdate("response", val)}
                                bind:isOpen={responseDropdownOpen}
                            />
                        {/if}
                    </div>
                    {#if contact.converted}
                        <Badge variant="success">Converted</Badge>
                    {/if}
                </div>
            </div>

            <!-- Contact Info with Copy to Clipboard -->
            <div class="grid grid-cols-2 gap-4 text-sm">
                {#if contact.phone}
                    <div class="group relative">
                        <span class="text-muted-foreground">Phone</span>
                        <div class="flex items-center gap-2">
                            <p class="font-medium text-foreground">
                                {contact.phone}
                            </p>
                            <button
                                type="button"
                                class="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary/50 transition-all"
                                onclick={() =>
                                    copyToClipboard(contact.phone, "phone")}
                                title="Copy phone"
                            >
                                {#if copiedField === "phone"}
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
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                {:else}
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
                                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                        />
                                    </svg>
                                {/if}
                            </button>
                        </div>
                    </div>
                {/if}
                {#if contact.email}
                    <div class="group relative">
                        <span class="text-muted-foreground">Email</span>
                        <div class="flex items-center gap-2">
                            <p class="font-medium text-foreground">
                                {contact.email}
                            </p>
                            <button
                                type="button"
                                class="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary/50 transition-all"
                                onclick={() =>
                                    copyToClipboard(contact.email, "email")}
                                title="Copy email"
                            >
                                {#if copiedField === "email"}
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
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                {:else}
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
                                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                        />
                                    </svg>
                                {/if}
                            </button>
                        </div>
                    </div>
                {/if}
                <div class="group relative">
                    <span class="text-muted-foreground">Contact Date</span>
                    <div class="flex items-center gap-2">
                        <p class="font-medium text-foreground">
                            {formatShortDate(contact.contact_date)}
                        </p>
                        <button
                            type="button"
                            class="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary/50 transition-all"
                            onclick={() =>
                                copyToClipboard(
                                    formatShortDate(contact.contact_date),
                                    "contact_date",
                                )}
                            title="Copy date"
                        >
                            {#if copiedField === "contact_date"}
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
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            {:else}
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
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                </svg>
                            {/if}
                        </button>
                    </div>
                </div>
                <div>
                    <span class="text-muted-foreground">Days Since Contact</span
                    >
                    <p class="font-medium text-foreground">
                        {calculateDaysSince(contact.contact_date)}
                    </p>
                </div>
            </div>

            <!-- Inviter Section -->
            {#if contact.invited_by_id || contact.invited_by_name}
                <div class="p-4 bg-secondary/30 rounded-lg">
                    <h4 class="text-sm font-medium text-muted-foreground mb-2">
                        Invited By
                    </h4>
                    {#if contact.invited_by_id}
                        <button
                            class="text-primary hover:underline font-medium cursor-pointer"
                            onclick={() =>
                                navigateToPerson(contact.invited_by_id)}
                        >
                            {contact.invited_by_name || "Unknown"}
                            <svg
                                class="w-3 h-3 inline ml-1"
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
                        </button>
                    {:else}
                        <span class="font-medium text-foreground"
                            >{contact.invited_by_name}</span
                        >
                    {/if}
                </div>
            {/if}

            <!-- Spiritual Journey with Inline Edit -->
            <div class="grid grid-cols-2 gap-4">
                <!-- Attended Church -->
                <div
                    class="p-3 bg-secondary/20 rounded-lg text-center relative group"
                >
                    <div
                        class="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1"
                    >
                        <span>Attended Church</span>
                        {#if onQuickUpdate}
                            <button
                                type="button"
                                class="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary/50 transition-all"
                                onclick={(e) =>
                                    toggleEditField("attended_church", e)}
                                title="Change status"
                            >
                                <svg
                                    class="w-3.5 h-3.5 text-muted-foreground"
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
                            </button>
                        {/if}
                    </div>
                    <Badge
                        variant={contact.attended_church
                            ? "success"
                            : "secondary"}
                    >
                        {contact.attended_church ? "Yes" : "No"}
                    </Badge>

                    <!-- Attended Church Dropdown -->
                    {#if editingField === "attended_church"}
                        <InlineSelectDropdown
                            options={booleanOptions}
                            value={contact.attended_church}
                            showSearch={false}
                            placement="top"
                            disabled={isUpdating}
                            onSelect={(val) =>
                                handleQuickUpdate("attended_church", val)}
                            bind:isOpen={attendedDropdownOpen}
                        />
                    {/if}
                </div>

                <!-- Salvation Decision -->
                <div
                    class="p-3 bg-secondary/20 rounded-lg text-center relative group"
                >
                    <div
                        class="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1"
                    >
                        <span>Salvation Decision</span>
                        {#if onQuickUpdate}
                            <button
                                type="button"
                                class="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary/50 transition-all"
                                onclick={(e) =>
                                    toggleEditField("salvation_decision", e)}
                                title="Change status"
                            >
                                <svg
                                    class="w-3.5 h-3.5 text-muted-foreground"
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
                            </button>
                        {/if}
                    </div>
                    <Badge
                        variant={contact.salvation_decision
                            ? "success"
                            : "secondary"}
                    >
                        {contact.salvation_decision ? "Yes" : "No"}
                    </Badge>

                    <!-- Salvation Decision Dropdown -->
                    {#if editingField === "salvation_decision"}
                        <InlineSelectDropdown
                            options={booleanOptions}
                            value={contact.salvation_decision}
                            showSearch={false}
                            placement="top"
                            disabled={isUpdating}
                            onSelect={(val) =>
                                handleQuickUpdate("salvation_decision", val)}
                            bind:isOpen={salvationDropdownOpen}
                        />
                    {/if}
                </div>
            </div>

            <!-- Follow-up Info -->
            {#if contact.follow_up_date}
                <div
                    class="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg"
                >
                    <svg
                        class="w-5 h-5 text-warning flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <div>
                        <span class="text-sm font-medium text-warning"
                            >Follow-up scheduled</span
                        >
                        <span class="text-sm text-warning/80 ml-1"
                            >{formatShortDate(contact.follow_up_date)}</span
                        >
                    </div>
                </div>
            {/if}

            <!-- Conversion Info -->
            {#if contact.converted && contact.conversion_date}
                <div
                    class="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-lg"
                >
                    <svg
                        class="w-5 h-5 text-success flex-shrink-0"
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
                    <div>
                        <span class="text-sm font-medium text-success"
                            >Converted on</span
                        >
                        <span class="text-sm text-success/80 ml-1"
                            >{formatShortDate(contact.conversion_date)}</span
                        >
                    </div>
                </div>
            {/if}

            <!-- Notes/Comments -->
            {#if contact.notes || (contact.comments && contact.comments.length > 0)}
                <div class="p-4 bg-secondary/30 rounded-lg">
                    <h4 class="text-sm font-medium text-muted-foreground mb-2">
                        Notes
                    </h4>
                    {#if contact.notes}
                        <p
                            class="text-sm text-foreground/90 whitespace-pre-wrap"
                        >
                            {contact.notes}
                        </p>
                    {/if}
                    {#if contact.comments && contact.comments.length > 0}
                        <div class="space-y-2 mt-2">
                            {#each contact.comments as comment}
                                <div
                                    class="text-sm text-foreground/80 pl-3 border-l-2 border-border"
                                >
                                    {comment}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    {:else}
        <div class="text-center py-8 text-muted-foreground">
            No contact details available.
        </div>
    {/if}

    {#snippet footer()}
        <div class="flex items-center justify-between w-full">
            <div class="flex gap-2">
                {#if onDelete && contact}
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
                {#if onConvert && contact && !contact.converted}
                    <Button variant="success" onclick={handleConvert}>
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
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        Mark Converted
                    </Button>
                {/if}
                {#if onEdit && contact}
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
