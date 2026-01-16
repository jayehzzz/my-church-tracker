<script>
    import { Card, Badge, Button } from "$lib/components/ui";

    let { person, currentAge, isGuest, outreachContacts, visitations } =
        $props();

    function formatShortDate(dateStr) {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }

    function formatGender(gender) {
        const map = {
            male: "Male",
            female: "Female",
            prefer_not_to_say: "Prefer not to say",
        };
        return map[gender] || gender || "—";
    }

    function formatMaritalStatus(status) {
        const map = {
            single: "Single",
            married: "Married",
            beloved: "Beloved",
        };
        return map[status] || status || "—";
    }

    function formatEmploymentStatus(status) {
        const map = {
            employed: "Employed",
            self_employed: "Self-Employed",
            student: "Student",
            other: "Other",
        };
        return map[status] || status || "—";
    }

    function formatRole(role) {
        const map = {
            basonta_worker: "Basonta Worker",
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

    function formatContactCategory(category) {
        const map = {
            responsive: "Responsive",
            non_responsive: "Non-Responsive",
            has_church: "Has Church",
            events_only: "Events Only",
            big_events_only: "Big Events Only",
            bacenta_mainly: "Bacenta Mainly",
            do_not_contact: "Do Not Contact",
        };
        return map[category] || category || "—";
    }

    // Notes editing state
    let editingNotes = $state(false);
    let notesValue = $state(person?.notes || "");
    let savingNotes = $state(false);

    // Update notesValue when person changes
    $effect(() => {
        notesValue = person?.notes || "";
    });

    async function saveNotes() {
        savingNotes = true;
        try {
            // In a real app, this would call the API
            // For now, just close the editor
            editingNotes = false;
        } finally {
            savingNotes = false;
        }
    }
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Demographics Card -->
    <Card>
        <div class="p-6">
            <div class="flex items-center justify-between mb-4">
                <h3
                    class="text-lg font-semibold text-foreground flex items-center gap-2"
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
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                    </svg>
                    Demographics
                </h3>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <span class="text-xs text-muted-foreground">Birthday</span>
                    <p class="text-sm font-medium text-foreground">
                        {formatShortDate(person.date_of_birth)}
                    </p>
                </div>
                <div>
                    <span class="text-xs text-muted-foreground">Age</span>
                    <p class="text-sm font-medium text-foreground">
                        {currentAge !== null ? `${currentAge} years` : "—"}
                    </p>
                </div>
                <div>
                    <span class="text-xs text-muted-foreground">Gender</span>
                    <p class="text-sm font-medium text-foreground">
                        {formatGender(person.gender)}
                    </p>
                </div>
                <div>
                    <span class="text-xs text-muted-foreground"
                        >Marital Status</span
                    >
                    <p class="text-sm font-medium text-foreground">
                        {formatMaritalStatus(person.marital_status)}
                    </p>
                </div>
                <div class="col-span-2">
                    <span class="text-xs text-muted-foreground">Employment</span
                    >
                    <p class="text-sm font-medium text-foreground">
                        {formatEmploymentStatus(person.employment_status)}
                    </p>
                </div>
            </div>
        </div>
    </Card>

    <!-- Church Role & Status Card -->
    <Card>
        <div class="p-6">
            <h3
                class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"
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
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                </svg>
                Church Details
            </h3>

            <div class="space-y-4">
                <div
                    class="flex justify-between items-center py-2 border-b border-border/50"
                >
                    <span class="text-muted-foreground">Status</span>
                    <Badge variant={getStatusVariant(person.member_status)}>
                        {person.member_status || "—"}
                    </Badge>
                </div>
                <div
                    class="flex justify-between items-center py-2 border-b border-border/50"
                >
                    <span class="text-muted-foreground">Membership Date</span>
                    <span class="font-medium text-foreground"
                        >{formatShortDate(person.membership_date)}</span
                    >
                </div>
                <div
                    class="flex justify-between items-center py-2 border-b border-border/50"
                >
                    <span class="text-muted-foreground">Baptized</span>
                    <Badge
                        variant={person.is_baptized ? "success" : "secondary"}
                    >
                        {person.is_baptized ? "Yes" : "No"}
                    </Badge>
                </div>
                <div
                    class="flex justify-between items-center py-2 border-b border-border/50"
                >
                    <span class="text-muted-foreground">Tithing</span>
                    <Badge
                        variant={person.is_tithing ? "success" : "secondary"}
                    >
                        {person.is_tithing ? "Active" : "Inactive"}
                    </Badge>
                </div>
                {#if person.ministries && person.ministries.length > 0}
                    <div class="py-2 border-b border-border/50">
                        <span class="block text-muted-foreground mb-2"
                            >Ministries</span
                        >
                        <div class="flex flex-wrap gap-2">
                            {#each person.ministries as ministry}
                                <Badge variant="outline" class="bg-secondary/50"
                                    >{ministry}</Badge
                                >
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </Card>

    <!-- Guest Info (Conditional) -->
    {#if isGuest}
        <div
            class="card-interactive hover-lift transition-all duration-300 group rounded-xl border border-border p-6 md:col-span-2 relative overflow-hidden"
        >
            <!-- Guest decorative background -->
            <div
                class="absolute top-0 right-0 w-32 h-32 bg-secondary/30 rounded-full blur-3xl -mr-10 -mt-10"
            ></div>

            <div class="flex items-center gap-3 mb-6 relative z-10">
                <div
                    class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors"
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
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                    </svg>
                </div>
                <h3 class="text-section-title text-xl">Guest Information</h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <div class="space-y-4">
                    <div
                        class="flex justify-between items-center py-2 border-b border-border/50"
                    >
                        <span class="text-muted-foreground">First Visit</span>
                        <span class="font-medium text-foreground"
                            >{formatShortDate(person.first_visit_date)}</span
                        >
                    </div>
                    <div
                        class="flex justify-between items-center py-2 border-b border-border/50"
                    >
                        <span class="text-muted-foreground"
                            >Follow-up Status</span
                        >
                        <Badge
                            variant={person.follow_up_status === "completed"
                                ? "success"
                                : person.follow_up_status === "in_progress"
                                  ? "warning"
                                  : "secondary"}
                        >
                            {person.follow_up_status
                                ? person.follow_up_status.replace("_", " ")
                                : "Pending"}
                        </Badge>
                    </div>
                </div>
                <div>
                    <div class="flex flex-col py-2">
                        <span class="text-muted-foreground mb-1"
                            >Invited By</span
                        >
                        {#if person.invited_by_id}
                            <a
                                href="/people/{person.invited_by_id}"
                                class="text-primary hover:underline font-medium inline-flex items-center gap-1"
                            >
                                {person.invited_by || "View Inviter"}
                                <svg
                                    class="w-3 h-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    ><path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                    /></svg
                                >
                            </a>
                        {:else if person.invited_by}
                            <span class="text-foreground font-medium"
                                >{person.invited_by}</span
                            >
                        {:else}
                            <span class="text-muted-foreground/50 italic"
                                >No inviter recorded</span
                            >
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Notes Section (Full Width) -->
    <div
        class="md:col-span-2 card-interactive hover-lift transition-all duration-300 group rounded-xl border border-border p-6"
    >
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
                <div
                    class="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 group-hover:bg-orange-500/20 transition-colors"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                    </svg>
                </div>
                <h3 class="text-section-title text-xl">Notes</h3>
            </div>
            {#if !editingNotes}
                <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => (editingNotes = true)}
                >
                    Edit
                </Button>
            {/if}
        </div>

        {#if editingNotes}
            <div class="space-y-4 animate-in fade-in duration-200">
                <textarea
                    class="w-full bg-secondary/20 border border-border rounded-lg p-4 min-h-[120px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-y"
                    bind:value={notesValue}
                    placeholder="Add notes about this person..."
                ></textarea>
                <div class="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        onclick={() => {
                            editingNotes = false;
                            notesValue = person.notes || "";
                        }}
                    >
                        Cancel
                    </Button>
                    <Button onclick={saveNotes} loading={savingNotes}>
                        Save Notes
                    </Button>
                </div>
            </div>
        {:else}
            <div
                class="min-h-[60px] text-muted-foreground whitespace-pre-wrap leading-relaxed py-2"
            >
                {person.notes || "No notes added yet."}
            </div>
        {/if}
    </div>
</div>
