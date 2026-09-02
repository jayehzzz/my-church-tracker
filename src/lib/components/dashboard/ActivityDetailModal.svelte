<!--
  ActivityDetailModal.svelte
  Interactive modal for viewing recent activity details from the dashboard.
  Provides quick actions to view profile, navigate to the relevant section (Evangelism/Visitations), or contact the person.
-->

<script>
    import { goto } from "$app/navigation";
    import Modal from "$lib/components/ui/Modal.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";

    let {
        isOpen = $bindable(false),
        activity = null,
        onclose = null,
    } = $props();

    let copyFeedback = $state(null);
    let copyTimeout = $state(null);

    function getInitials(name) {
        if (!name) return "?";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    }

    function formatDate(timestamp) {
        if (!timestamp) return "—";
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        if (isNaN(date.getTime())) return "—";
        return date.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function getActivityBadge(type) {
        const types = {
            service: { label: "Church Service", variant: "primary", icon: "church" },
            meeting: { label: "Ministry Meeting", variant: "purple", icon: "calendar" },
            contact: { label: "Evangelism Outreach", variant: "info", icon: "phone" },
            visitation: { label: "Pastoral Visit", variant: "warning", icon: "home" },
            salvation: { label: "Salvation Decision", variant: "success", icon: "heart" },
            conversion: { label: "Salvation Decision", variant: "success", icon: "heart" },
            attendance: { label: "Service Attendance", variant: "success", icon: "check" },
            event: { label: "Church Event", variant: "secondary", icon: "calendar" },
            note: { label: "Pastoral Note", variant: "secondary", icon: "note" },
        };
        return types[type] || { label: "Activity", variant: "secondary", icon: "activity" };
    }

    async function copyToClipboard(text, label) {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            copyFeedback = `${label} copied!`;
            if (copyTimeout) clearTimeout(copyTimeout);
            copyTimeout = setTimeout(() => {
                copyFeedback = null;
            }, 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    }

    function navigateToProfile() {
        if (activity?.personId) {
            isOpen = false;
            goto(`/people/${activity.personId}`);
        }
    }

    function navigateToSection() {
        if (activity?.route) {
            isOpen = false;
            goto(activity.route);
        }
    }

    function handleClose() {
        isOpen = false;
        onclose?.();
    }
</script>

<Modal bind:isOpen title="Activity Details" size="md" onclose={handleClose}>
    {#if activity}
        {@const badgeInfo = getActivityBadge(activity.type)}
        <div class="space-y-6 pt-1">
            <!-- Header Summary Card -->
            <div class="p-4 rounded-xl bg-secondary/30 border border-border/70 flex items-start gap-4">
                <!-- Avatar / Icon -->
                <div class="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary shrink-0 ring-2 ring-primary/20">
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

                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 class="text-lg font-semibold text-foreground truncate">
                            {activity.type === 'service' || activity.type === 'meeting'
                                ? activity.description
                                : (activity.person || "Unknown Person")}
                        </h3>
                        <Badge variant={badgeInfo.variant} size="sm">
                            {badgeInfo.label}
                        </Badge>
                    </div>
                    <p class="text-sm text-foreground/80 font-medium">
                        {activity.action || activity.description || "Activity recorded"}
                    </p>
                    <time class="text-xs text-muted-foreground mt-1 block">
                        {formatDate(activity.timestamp)}
                    </time>
                </div>
            </div>

            <!-- Activity Details Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Status / Outcome / Type -->
                <div class="p-3.5 rounded-lg bg-card border border-border">
                    <span class="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                        {activity.type === 'service' || activity.type === 'meeting' ? 'Category / Type' : 'Status / Outcome'}
                    </span>
                    <p class="text-sm font-semibold text-foreground capitalize">
                        {activity.statusOrOutcome ? String(activity.statusOrOutcome).replace(/_/g, " ") : (activity.action || "Completed")}
                    </p>
                </div>

                <!-- Facilitator / Preacher / Leader -->
                <div class="p-3.5 rounded-lg bg-card border border-border">
                    <span class="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                        {activity.type === 'service' ? 'Preacher / Minister' : activity.type === 'meeting' ? 'Leader / Host' : 'Facilitated By'}
                    </span>
                    <p class="text-sm font-semibold text-foreground">
                        {activity.recordedBy || activity.person || "Pastoral Team"}
                    </p>
                </div>
            </div>

            <!-- Attendance Counter for Services / Meetings -->
            {#if activity.attendeeCount !== undefined}
                <div class="p-3.5 rounded-lg bg-card border border-border flex items-center justify-between">
                    <div>
                        <span class="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                            Attendance Logged
                        </span>
                        <p class="text-lg font-bold text-foreground">
                            {activity.attendeeCount} {activity.attendeeCount === 1 ? 'Person' : 'People'}
                        </p>
                    </div>
                    <Badge variant="primary" size="md">
                        Confirmed
                    </Badge>
                </div>
            {/if}

            <!-- Contact & Quick Info (If available) -->
            {#if activity.phone || activity.email || activity.address}
                <div class="p-4 rounded-lg bg-card border border-border space-y-2.5">
                    <span class="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                        Contact Details
                    </span>
                    <div class="flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
                        {#if activity.phone}
                            <div class="flex items-center gap-2">
                                <a
                                    href="tel:{activity.phone}"
                                    class="text-primary hover:underline font-medium inline-flex items-center gap-1.5"
                                >
                                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    {activity.phone}
                                </a>
                                <button
                                    type="button"
                                    class="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-secondary transition-colors"
                                    onclick={() => copyToClipboard(activity.phone, "Phone")}
                                >
                                    Copy
                                </button>
                            </div>
                        {/if}

                        {#if activity.email}
                            <div class="flex items-center gap-2">
                                <a
                                    href="mailto:{activity.email}"
                                    class="text-primary hover:underline font-medium inline-flex items-center gap-1.5"
                                >
                                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    {activity.email}
                                </a>
                                <button
                                    type="button"
                                    class="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-secondary transition-colors"
                                    onclick={() => copyToClipboard(activity.email, "Email")}
                                >
                                    Copy
                                </button>
                            </div>
                        {/if}
                    </div>
                    {#if activity.address}
                        <p class="text-xs text-muted-foreground">
                            📍 {activity.address}
                        </p>
                    {/if}
                </div>
            {/if}

            <!-- Notes Section (if any) -->
            {#if activity.notes}
                <div class="p-3.5 rounded-lg bg-card border border-border">
                    <span class="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                        Activity Notes
                    </span>
                    <p class="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {activity.notes}
                    </p>
                </div>
            {/if}

            <!-- Toast feedback for copy -->
            {#if copyFeedback}
                <div class="p-2 rounded bg-primary/10 text-primary text-xs font-medium text-center animate-in fade-in">
                    ✓ {copyFeedback}
                </div>
            {/if}
        </div>
    {/if}

    {#snippet footer()}
        <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="w-full sm:w-auto">
                <Button variant="ghost" size="sm" fullWidth onclick={handleClose}>
                    Close
                </Button>
            </div>

            <div class="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center">
                {#if activity?.route}
                    <div class="w-full sm:w-auto">
                        <Button variant="secondary" size="sm" fullWidth onclick={navigateToSection}>
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Open {activity.routeLabel || "section"}
                        </Button>
                    </div>
                {/if}

                {#if activity?.personId}
                    <div class="w-full sm:w-auto">
                        <Button variant="primary" size="sm" fullWidth onclick={navigateToProfile}>
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            View profile
                        </Button>
                    </div>
                {/if}
            </div>
        </div>
    {/snippet}
</Modal>
