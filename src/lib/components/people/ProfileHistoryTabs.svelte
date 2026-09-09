<script>
    import { browser } from "$app/environment";
    import {
        getStorageValue,
        setStorageValue,
    } from "$lib/stores/useLocalStorage.js";
    import AttendanceHistory from "./AttendanceHistory.svelte";
    import OutreachHistory from "./OutreachHistory.svelte";
    import VisitationHistory from "./VisitationHistory.svelte";

    let {
        errors = {},
        attendanceHistory = [],
        outreachContacts = [],
        visitations = [],
        onRecordClick = null,
        storageKey = "profileHistoryTab",
    } = $props();

    let tabs = $derived([
        {
            id: "attendance",
            label: "Attendance",
            count: attendanceHistory?.length || 0,
        },
        { id: "outreach", label: "Outreach", count: outreachContacts?.length || 0 },
        { id: "visitation", label: "Pastoral Care", count: visitations?.length || 0 },
    ]);

    // Load active tab from localStorage or default to attendance
    let activeTab = $state("attendance");

    $effect(() => {
        if (browser && storageKey) {
            const saved = getStorageValue(storageKey, "attendance");
            if (tabs.some((t) => t.id === saved)) {
                activeTab = saved;
            }
        }
    });

    function setActiveTab(tabId) {
        activeTab = tabId;
        if (browser && storageKey) {
            setStorageValue(storageKey, tabId);
        }
    }
</script>

<div class="space-y-4">
    <!-- Tab Navigation -->
    <div class="flex flex-wrap gap-2 p-1.5 bg-secondary/50 border border-border/70 rounded-lg w-fit">
        {#each tabs as tab}
            <button
                type="button"
                aria-pressed={activeTab === tab.id}
                class="relative px-4 py-2 text-sm font-semibold rounded-md border transition-all duration-200 flex items-center gap-2
                       {activeTab === tab.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-background/60 text-foreground/85 border-border/80 hover:text-foreground hover:bg-secondary hover:border-muted-foreground/60'}"
                onclick={() => setActiveTab(tab.id)}
            >
                {tab.label}
                {#if tab.count > 0 && !errors[tab.id === "visitation" ? "care" : tab.id]}
                    <span
                        class="text-xs px-1.5 py-0.5 rounded-full {activeTab ===
                        tab.id
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-muted/90 text-foreground/80'}"
                    >
                        {tab.count}
                    </span>
                {/if}
            </button>
        {/each}
    </div>

    <!-- Tab Content -->
    <div class="animate-in fade-in duration-200">
        {#if errors[activeTab === "visitation" ? "care" : activeTab]}
            <p class="rounded-xl border border-border p-6 text-sm text-muted-foreground">This history is unavailable. Use Retry history above to try again.</p>
        {:else if activeTab === "attendance"}
            <AttendanceHistory {attendanceHistory} {onRecordClick} />
        {:else if activeTab === "outreach"}
            <OutreachHistory {outreachContacts} />
        {:else if activeTab === "visitation"}
            <VisitationHistory {visitations} />
        {/if}
    </div>
</div>
