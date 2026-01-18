<script>
    import { goto } from "$app/navigation";
    import { Badge, Button } from "$lib/components/ui";

    let {
        person,
        onUpdateStatus,
        onUpdateActivity,
        onEdit,
        updatingStatus,
        statusUpdateError,
    } = $props();

    let showStatusDropdown = $state(false);
    let showActivityDropdown = $state(false);

    // Status options for dropdown
    const statusOptions = [
        { value: "guest", label: "Guest" },
        { value: "member", label: "Member" },
        { value: "leader", label: "Leader" },
        { value: "archived", label: "Archived" },
    ];

    // Activity status options
    const activityOptions = [
        { value: "regular", label: "Regular", color: "text-success" },
        { value: "irregular", label: "Irregular", color: "text-warning" },
        { value: "dormant", label: "Dormant", color: "text-destructive" },
    ];

    function getInitials(p) {
        if (!p) return "";
        return (
            (p.first_name?.[0] || "") + (p.last_name?.[0] || "")
        ).toUpperCase();
    }

    function getStatusVariant(status) {
        const map = {
            member: "default",
            leader: "success",
            guest: "secondary",
            visitor: "secondary",
            archived: "destructive",
        };
        return map[status?.toLowerCase()] || "secondary";
    }

    function formatRole(role) {
        const map = {
            basonta_leader: "Basonta Leader",
            bacenta_leader: "Bacenta Leader",
            no_role: "No Role",
        };
        return map[role] || role || "No Role";
    }

    function formatActivityStatus(status) {
        const map = {
            regular: "Regular",
            irregular: "Irregular",
            dormant: "Dormant",
        };
        return map[status] || status || "—";
    }

    function getActivityStatusColor(status) {
        const map = {
            regular: "text-success",
            irregular: "text-warning",
            dormant: "text-destructive",
        };
        return map[status] || "text-muted-foreground";
    }

    // Helper functions for quick actions
    const isGuest = $derived(
        person?.member_status === "guest" ||
            person?.member_status === "visitor" ||
            !person?.member_status,
    );
    const isMember = $derived(person?.member_status === "member");
    const isArchived = $derived(person?.member_status === "archived");

    // Copy toast state
    let copyFeedback = $state(null);
    let copyTimeout = $state(null);

    async function copyToClipboard(text, label) {
        if (
            !text ||
            text === "No email" ||
            text === "No phone" ||
            text === "No address"
        )
            return;
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
</script>

<!-- Toolbar -->
<div class="flex items-center justify-between mb-6">
    <Button
        variant="ghost"
        onclick={() => goto("/people")}
        class="text-muted-foreground hover:text-foreground gap-2 pl-0"
    >
        <svg
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
        </svg>
        Back to Directory
    </Button>

    <Button variant="outline" onclick={onEdit} class="gap-2">
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
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
        </svg>
        Edit Profile
    </Button>
</div>

<!-- Profile Header Card -->
<div
    class="relative overflow-hidden rounded-xl border border-border p-6 shadow-sm transition-all duration-200"
    style="background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(0 0% 10%) 100%);"
>
    <!-- Decorative accentuated left border/glow -->
    <div
        class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/80 to-primary/20"
    ></div>

    <div class="flex flex-col md:flex-row gap-8 relative z-10 items-start">
        <!-- Avatar -->
        <div class="shrink-0 relative group">
            <div
                class="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-4xl font-bold text-primary ring-4 ring-primary/20 shadow-lg shadow-primary/10 transition-transform duration-300 group-hover:scale-105"
            >
                {getInitials(person)}
            </div>
            <!-- Online/Active Indicator (optional, can be based on activity) -->
            <div
                class="absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-card {person.activity_status ===
                'regular'
                    ? 'bg-success'
                    : 'bg-muted'}"
            ></div>
        </div>

        <!-- Main Info -->
        <div class="flex-1 space-y-4 pt-1">
            <div class="space-y-1">
                <div class="flex flex-wrap items-center gap-3">
                    <h1
                        class="text-4xl font-bold text-foreground tracking-tight leading-none"
                    >
                        {person.first_name}
                        {person.last_name}
                    </h1>
                </div>

                <!-- Status & Role Badges Row -->
                <div class="flex items-center gap-3 pt-2">
                    <!-- Premium Status Dropdown -->
                    <div class="relative">
                        <button
                            type="button"
                            onclick={() =>
                                (showStatusDropdown = !showStatusDropdown)}
                            class="group h-8 px-3 rounded-full flex items-center gap-2 text-sm font-medium transition-all duration-200 border cursor-pointer
                                   {person.member_status === 'member'
                                ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
                                : ''}
                                   {person.member_status === 'leader'
                                ? 'bg-success/10 border-success/20 text-success hover:bg-success/20'
                                : ''}
                                   {person.member_status === 'guest' ||
                            person.member_status === 'visitor'
                                ? 'bg-secondary border-border text-foreground hover:bg-secondary/80'
                                : ''}
                                   {person.member_status === 'archived'
                                ? 'bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20'
                                : ''}"
                            disabled={updatingStatus}
                        >
                            {#if updatingStatus}
                                <svg
                                    class="animate-spin h-3.5 w-3.5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <circle
                                        class="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        stroke-width="4"
                                    ></circle>
                                    <path
                                        class="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                    ></path>
                                </svg>
                            {:else}
                                <!-- Status Icon -->
                                <span class="relative flex h-2 w-2">
                                    {#if person.member_status === "member" || person.member_status === "leader"}
                                        <span
                                            class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-currentColor"
                                        ></span>
                                    {/if}
                                    <span
                                        class="relative inline-flex rounded-full h-2 w-2 bg-currentColor"
                                    ></span>
                                </span>
                            {/if}

                            <span class="capitalize"
                                >{person.member_status || "Guest"}</span
                            >

                            <svg
                                class="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity"
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

                        {#if showStatusDropdown}
                            <div
                                class="absolute top-full left-0 mt-2 z-50 w-48 rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm p-1 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200"
                                onclick={(e) => e.stopPropagation()}
                                role="menu"
                            >
                                <div
                                    class="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                                >
                                    Change Status
                                </div>
                                {#each statusOptions as option}
                                    <button
                                        type="button"
                                        class="w-full relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50
                                               {person.member_status ===
                                        option.value
                                            ? 'bg-accent/50 text-accent-foreground'
                                            : 'text-muted-foreground'}"
                                        onclick={() => {
                                            onUpdateStatus(option.value);
                                            showStatusDropdown = false;
                                        }}
                                        disabled={updatingStatus}
                                    >
                                        <div
                                            class="flex items-center gap-2 flex-1"
                                        >
                                            <div
                                                class="h-2 w-2 rounded-full {getStatusVariant(
                                                    option.value,
                                                ) === 'success'
                                                    ? 'bg-success'
                                                    : getStatusVariant(
                                                            option.value,
                                                        ) === 'destructive'
                                                      ? 'bg-destructive'
                                                      : getStatusVariant(
                                                              option.value,
                                                          ) === 'primary'
                                                        ? 'bg-primary'
                                                        : 'bg-muted-foreground'}"
                                            ></div>
                                            {option.label}
                                        </div>
                                        {#if person.member_status === option.value}
                                            <svg
                                                class="h-4 w-4 text-primary"
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
                                        {/if}
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </div>

                    <!-- Role Badge (Static for now, but styled similarly) -->
                    {#if person.role && person.role !== "no_role"}
                        <div
                            class="h-8 px-3 rounded-full flex items-center gap-2 text-sm font-medium border border-border bg-secondary/30 text-secondary-foreground"
                        >
                            <span class="text-xs text-muted-foreground"
                                >ROLE</span
                            >
                            {formatRole(person.role)}
                        </div>
                    {/if}
                </div>
            </div>

            {#if statusUpdateError}
                <div
                    class="text-sm text-destructive bg-destructive/10 p-2 rounded border border-destructive/20 inline-block"
                >
                    {statusUpdateError}
                </div>
            {/if}

            <!-- Contact Grid with Interactive Copy -->
            <div
                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 pt-2"
            >
                <!-- Email - Click to Copy -->
                <button
                    type="button"
                    onclick={() => copyToClipboard(person.email, "Email")}
                    class="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group/item cursor-pointer text-left"
                    title={person.email ? "Click to copy email" : undefined}
                    disabled={!person.email}
                >
                    <div
                        class="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors"
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
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                    <span class="truncate">{person.email || "No email"}</span>
                    {#if person.email}
                        <svg
                            class="w-3.5 h-3.5 opacity-0 group-hover/item:opacity-50 transition-opacity ml-auto flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <rect
                                x="9"
                                y="9"
                                width="13"
                                height="13"
                                rx="2"
                                ry="2"
                                stroke-width="2"
                            />
                            <path
                                d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                                stroke-width="2"
                            />
                        </svg>
                    {/if}
                </button>

                <!-- Phone - Click to Copy or Call -->
                <button
                    type="button"
                    onclick={() => copyToClipboard(person.phone, "Phone")}
                    class="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group/item cursor-pointer text-left"
                    title={person.phone ? "Click to copy phone" : undefined}
                    disabled={!person.phone}
                >
                    <div
                        class="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors"
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
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                        </svg>
                    </div>
                    <span class="truncate">{person.phone || "No phone"}</span>
                    {#if person.phone}
                        <svg
                            class="w-3.5 h-3.5 opacity-0 group-hover/item:opacity-50 transition-opacity ml-auto flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <rect
                                x="9"
                                y="9"
                                width="13"
                                height="13"
                                rx="2"
                                ry="2"
                                stroke-width="2"
                            />
                            <path
                                d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                                stroke-width="2"
                            />
                        </svg>
                    {/if}
                </button>

                <!-- Address - Click to Copy -->
                <button
                    type="button"
                    onclick={() =>
                        copyToClipboard(
                            person.address || person.city,
                            "Address",
                        )}
                    class="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group/item cursor-pointer text-left"
                    title={person.address || person.city
                        ? "Click to copy address"
                        : undefined}
                    disabled={!person.address && !person.city}
                >
                    <div
                        class="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors"
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
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                    </div>
                    <span class="truncate"
                        >{person.address || person.city || "No address"}</span
                    >
                    {#if person.address || person.city}
                        <svg
                            class="w-3.5 h-3.5 opacity-0 group-hover/item:opacity-50 transition-opacity ml-auto flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <rect
                                x="9"
                                y="9"
                                width="13"
                                height="13"
                                rx="2"
                                ry="2"
                                stroke-width="2"
                            />
                            <path
                                d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                                stroke-width="2"
                            />
                        </svg>
                    {/if}
                </button>
            </div>

            <!-- Copy Feedback Toast -->
            {#if copyFeedback}
                <div
                    class="absolute top-4 right-4 bg-success text-success-foreground px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 z-50"
                >
                    ✓ {copyFeedback}
                </div>
            {/if}

            <!-- Activity Chips (Compact) -->
            <div class="flex flex-wrap gap-2 pt-1">
                <button
                    type="button"
                    onclick={() =>
                        (showActivityDropdown = !showActivityDropdown)}
                    class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent hover:bg-secondary/80 transition-colors cursor-pointer
                           {person.activity_status === 'regular'
                        ? 'bg-success/10 text-success'
                        : person.activity_status === 'irregular'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-destructive/10 text-destructive'}"
                >
                    <span class="w-1.5 h-1.5 rounded-full bg-currentColor"
                    ></span>
                    {formatActivityStatus(person.activity_status)}
                    <!-- Dropdown would go here similar to status if needed, keeping it simple for now -->
                </button>
            </div>
        </div>
    </div>

    <!-- Backdrop Blur Effect (Optional polish) -->
    <div
        class="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"
    ></div>
</div>

<!-- Backdrops for dropdowns (to close on outside click) -->
{#if showStatusDropdown}
    <button
        class="fixed inset-0 z-40 cursor-default"
        onclick={() => (showStatusDropdown = false)}
        aria-label="Close menu"
    ></button>
{/if}
