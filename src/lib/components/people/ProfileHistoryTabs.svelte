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
        attendanceHistory = [],
        outreachContacts = [],
        visitations = [],
        onRecordClick = null,
        storageKey = "profileHistoryTab",
    } = $props();

    const tabs = [
        {
            id: "attendance",
            label: "Attendance",
            count: attendanceHistory.length,
        },
        { id: "outreach", label: "Outreach", count: outreachContacts.length },
        { id: "visitation", label: "Visitation", count: visitations.length },
    ];

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
    <div class="flex gap-1 p-1 bg-secondary/30 rounded-lg w-fit">
        {#each tabs as tab}
            <button
                type="button"
                class="relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2
                       {activeTab === tab.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}"
                onclick={() => setActiveTab(tab.id)}
            >
                {tab.label}
                {#if tab.count > 0}
                    <span
                        class="text-xs px-1.5 py-0.5 rounded-full {activeTab ===
                        tab.id
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'}"
                    >
                        {tab.count}
                    </span>
                {/if}
            </button>
        {/each}
    </div>

    <!-- Tab Content -->
    <div class="animate-in fade-in duration-200">
        {#if activeTab === "attendance"}
            <AttendanceHistory {attendanceHistory} {onRecordClick} />
        {:else if activeTab === "outreach"}
            <OutreachHistory {outreachContacts} />
        {:else if activeTab === "visitation"}
            <VisitationHistory {visitations} />
        {/if}
    </div>
</div>
