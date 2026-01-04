<!--
  Reports Page
  ============
  Comprehensive reports dashboard with KPI summaries and CSV export functionality.
  
  Features:
  - Summary KPIs across all modules
  - Date range filter integration
  - Module-specific data tables
  - CSV export for each module
-->

<script>
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
    import PageHeader from "$lib/components/shared/PageHeader.svelte";
    import FilterBar from "$lib/components/filters/FilterBar.svelte";
    import { Button } from "$lib/components/ui";
    import KPICard from "$lib/components/dashboard/KPICard.svelte";
    import { dateRange } from "$lib/stores/filterStore";
    import { exportToCSV, exportColumns } from "$lib/utils/exportUtils";

    // Data state
    let people = $state([]);
    let contacts = $state([]);
    let services = $state([]);
    let meetings = $state([]);
    let visitations = $state([]);
    let loading = $state(true);

    // Active report tab
    let activeTab = $state("overview");

    // Helper function to check if a date is within the filter range
    function isWithinDateRange(dateStr, range) {
        if (!dateStr || !range?.startDate || !range?.endDate) return true;
        const date = new Date(dateStr);
        const start = new Date(range.startDate);
        const end = new Date(range.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return date >= start && date <= end;
    }

    // Filtered data based on date range
    const filteredContacts = $derived(() => {
        const range = $dateRange;
        return contacts.filter((c) => isWithinDateRange(c.contact_date, range));
    });

    const filteredServices = $derived(() => {
        const range = $dateRange;
        return services.filter((s) => isWithinDateRange(s.service_date, range));
    });

    const filteredMeetings = $derived(() => {
        const range = $dateRange;
        return meetings.filter((m) => isWithinDateRange(m.meeting_date, range));
    });

    const filteredVisitations = $derived(() => {
        const range = $dateRange;
        return visitations.filter((v) =>
            isWithinDateRange(v.visit_date, range),
        );
    });

    // Calculate summary KPIs
    const summaryKPIs = $derived(() => {
        const fContacts = filteredContacts();
        const fServices = filteredServices();
        const fMeetings = filteredMeetings();
        const fVisitations = filteredVisitations();

        return {
            totalPeople: people.length,
            newContacts: fContacts.length,
            conversions: fContacts.filter((c) => c.converted).length,
            totalAttendance: fServices.reduce(
                (sum, s) => sum + (s.total_attendance || 0),
                0,
            ),
            salvationDecisions: fServices.reduce(
                (sum, s) => sum + (s.salvation_decisions || 0),
                0,
            ),
            prayerHours:
                Math.round(
                    (fMeetings.reduce(
                        (sum, m) => sum + (m.duration_minutes || 0),
                        0,
                    ) /
                        60) *
                        10,
                ) / 10,
            visitsCompleted: fVisitations.length,
            followUpsNeeded: fVisitations.filter((v) => v.follow_up_required)
                .length,
        };
    });

    // Load all data on mount
    onMount(async () => {
        if (!browser) return;

        loading = true;

        try {
            // Load all services in parallel
            const [
                peopleModule,
                evangelismModule,
                servicesModule,
                meetingsModule,
                visitationsModule,
            ] = await Promise.all([
                import("$lib/services/peopleService"),
                import("$lib/services/evangelismService"),
                import("$lib/services/servicesService"),
                import("$lib/services/meetingsService"),
                import("$lib/services/visitationsService"),
            ]);

            const [
                peopleResult,
                contactsResult,
                servicesResult,
                meetingsResult,
                visitationsResult,
            ] = await Promise.all([
                peopleModule.getAll(),
                evangelismModule.getAll(),
                servicesModule.getAll(),
                meetingsModule.getAll(),
                visitationsModule.getAll(),
            ]);

            people = peopleResult.data || [];
            contacts = contactsResult.data || [];
            services = servicesResult.data || [];
            meetings = meetingsResult.data || [];
            visitations = visitationsResult.data || [];
        } catch (e) {
            console.warn("Using mock data for reports:", e.message);
            // Mock data fallback
            people = [];
            contacts = [];
            services = [];
            meetings = [];
            visitations = [];
        } finally {
            loading = false;
        }
    });

    // Export handlers
    function handleExportPeople() {
        exportToCSV(
            people,
            `people-report-${new Date().toISOString().split("T")[0]}`,
            exportColumns.people,
        );
    }

    function handleExportContacts() {
        exportToCSV(
            filteredContacts(),
            `evangelism-report-${new Date().toISOString().split("T")[0]}`,
            exportColumns.evangelismContacts,
        );
    }

    function handleExportServices() {
        exportToCSV(
            filteredServices(),
            `services-report-${new Date().toISOString().split("T")[0]}`,
            exportColumns.services,
        );
    }

    function handleExportMeetings() {
        exportToCSV(
            filteredMeetings(),
            `meetings-report-${new Date().toISOString().split("T")[0]}`,
            exportColumns.meetings,
        );
    }

    function handleExportVisitations() {
        exportToCSV(
            filteredVisitations(),
            `visitations-report-${new Date().toISOString().split("T")[0]}`,
            exportColumns.visitations,
        );
    }

    function handleExportAll() {
        handleExportPeople();
        setTimeout(() => handleExportContacts(), 100);
        setTimeout(() => handleExportServices(), 200);
        setTimeout(() => handleExportMeetings(), 300);
        setTimeout(() => handleExportVisitations(), 400);
    }

    // Tab configuration
    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "people", label: "People" },
        { id: "evangelism", label: "Evangelism" },
        { id: "services", label: "Services" },
        { id: "meetings", label: "Meetings" },
        { id: "visitation", label: "Visitation" },
    ];
</script>

<DashboardLayout>
    {#snippet filters()}
        <FilterBar />
    {/snippet}

    <!-- Page Header -->
    <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
    >
        <PageHeader
            title="Reports"
            subtitle="View summaries and export data across all modules"
        />

        <Button onclick={handleExportAll}>
            <svg
                class="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
            </svg>
            Export All (CSV)
        </Button>
    </div>

    <!-- Loading State -->
    {#if loading}
        <div class="flex items-center justify-center py-12">
            <svg
                class="animate-spin h-8 w-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
            </svg>
            <span class="ml-3 text-muted-foreground">Loading reports...</span>
        </div>
    {:else}
        <!-- Tab Navigation -->
        <div class="mb-6">
            <div class="flex flex-wrap gap-2 border-b border-border pb-2">
                {#each tabs as tab}
                    <button
                        type="button"
                        onclick={() => (activeTab = tab.id)}
                        class="px-4 py-2 text-sm rounded-t-lg transition-premium {activeTab ===
                        tab.id
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}"
                    >
                        {tab.label}
                    </button>
                {/each}
            </div>
        </div>

        <!-- Overview Tab -->
        {#if activeTab === "overview"}
            <div
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
            >
                <KPICard
                    title="Total People"
                    value={summaryKPIs().totalPeople}
                    icon="users"
                    trend={null}
                />
                <KPICard
                    title="New Contacts"
                    value={summaryKPIs().newContacts}
                    icon="user-plus"
                    variant="info"
                    trend={null}
                />
                <KPICard
                    title="Conversions"
                    value={summaryKPIs().conversions}
                    icon="check-circle"
                    variant="success"
                    trend={null}
                />
                <KPICard
                    title="Salvation Decisions"
                    value={summaryKPIs().salvationDecisions}
                    icon="heart"
                    variant="success"
                    trend={null}
                />
            </div>

            <div
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
            >
                <KPICard
                    title="Total Attendance"
                    value={summaryKPIs().totalAttendance}
                    icon="users"
                    trend={null}
                />
                <KPICard
                    title="Prayer Hours"
                    value={summaryKPIs().prayerHours}
                    icon="clock"
                    suffix="hrs"
                    trend={null}
                />
                <KPICard
                    title="Visits Completed"
                    value={summaryKPIs().visitsCompleted}
                    icon="home"
                    variant="success"
                    trend={null}
                />
                <KPICard
                    title="Follow-ups Needed"
                    value={summaryKPIs().followUpsNeeded}
                    icon="clock"
                    variant={summaryKPIs().followUpsNeeded > 0
                        ? "warning"
                        : "default"}
                    trend={null}
                />
            </div>

            <!-- Quick Export Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="card-base flex items-center justify-between">
                    <div>
                        <h4 class="text-sm font-medium text-foreground">
                            People Directory
                        </h4>
                        <p class="text-xs text-muted-foreground">
                            {people.length} records
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="secondary"
                        onclick={handleExportPeople}
                    >
                        Export CSV
                    </Button>
                </div>

                <div class="card-base flex items-center justify-between">
                    <div>
                        <h4 class="text-sm font-medium text-foreground">
                            Evangelism Contacts
                        </h4>
                        <p class="text-xs text-muted-foreground">
                            {filteredContacts().length} records
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="secondary"
                        onclick={handleExportContacts}
                    >
                        Export CSV
                    </Button>
                </div>

                <div class="card-base flex items-center justify-between">
                    <div>
                        <h4 class="text-sm font-medium text-foreground">
                            Services
                        </h4>
                        <p class="text-xs text-muted-foreground">
                            {filteredServices().length} records
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="secondary"
                        onclick={handleExportServices}
                    >
                        Export CSV
                    </Button>
                </div>

                <div class="card-base flex items-center justify-between">
                    <div>
                        <h4 class="text-sm font-medium text-foreground">
                            Meetings
                        </h4>
                        <p class="text-xs text-muted-foreground">
                            {filteredMeetings().length} records
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="secondary"
                        onclick={handleExportMeetings}
                    >
                        Export CSV
                    </Button>
                </div>

                <div class="card-base flex items-center justify-between">
                    <div>
                        <h4 class="text-sm font-medium text-foreground">
                            Visitations
                        </h4>
                        <p class="text-xs text-muted-foreground">
                            {filteredVisitations().length} records
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="secondary"
                        onclick={handleExportVisitations}
                    >
                        Export CSV
                    </Button>
                </div>
            </div>
        {/if}

        <!-- People Tab -->
        {#if activeTab === "people"}
            <div class="card-base">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-foreground">
                        People Directory
                    </h3>
                    <Button size="sm" onclick={handleExportPeople}>
                        <svg
                            class="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                        </svg>
                        Export CSV
                    </Button>
                </div>
                <p class="text-sm text-muted-foreground mb-4">
                    {people.length} total people in directory
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">Visitors</p>
                        <p class="text-xl font-semibold text-foreground">
                            {people.filter((p) => p.member_status === "visitor")
                                .length}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">Members</p>
                        <p class="text-xl font-semibold text-foreground">
                            {people.filter((p) => p.member_status === "member")
                                .length}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">Leaders</p>
                        <p class="text-xl font-semibold text-foreground">
                            {people.filter((p) => p.member_status === "leader")
                                .length}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">Archived</p>
                        <p class="text-xl font-semibold text-foreground">
                            {people.filter(
                                (p) => p.member_status === "archived",
                            ).length}
                        </p>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Evangelism Tab -->
        {#if activeTab === "evangelism"}
            <div class="card-base">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-foreground">
                        Evangelism Contacts
                    </h3>
                    <Button size="sm" onclick={handleExportContacts}>
                        <svg
                            class="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                        </svg>
                        Export CSV
                    </Button>
                </div>
                <p class="text-sm text-muted-foreground mb-4">
                    {filteredContacts().length} contacts in selected period
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">Responsive</p>
                        <p class="text-xl font-semibold text-success">
                            {filteredContacts().filter(
                                (c) => c.response === "responsive",
                            ).length}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">Converted</p>
                        <p class="text-xl font-semibold text-success">
                            {filteredContacts().filter((c) => c.converted)
                                .length}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">Has Church</p>
                        <p class="text-xl font-semibold text-foreground">
                            {filteredContacts().filter(
                                (c) => c.response === "has_church",
                            ).length}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">
                            Non-Responsive
                        </p>
                        <p class="text-xl font-semibold text-destructive">
                            {filteredContacts().filter(
                                (c) => c.response === "non_responsive",
                            ).length}
                        </p>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Services Tab -->
        {#if activeTab === "services"}
            <div class="card-base">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-foreground">
                        Services
                    </h3>
                    <Button size="sm" onclick={handleExportServices}>
                        <svg
                            class="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                        </svg>
                        Export CSV
                    </Button>
                </div>
                <p class="text-sm text-muted-foreground mb-4">
                    {filteredServices().length} services in selected period
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">
                            Total Attendance
                        </p>
                        <p class="text-xl font-semibold text-foreground">
                            {filteredServices().reduce(
                                (sum, s) => sum + (s.total_attendance || 0),
                                0,
                            )}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">
                            Total Guests
                        </p>
                        <p class="text-xl font-semibold text-info">
                            {filteredServices().reduce(
                                (sum, s) => sum + (s.guests_count || 0),
                                0,
                            )}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">
                            Salvation Decisions
                        </p>
                        <p class="text-xl font-semibold text-success">
                            {filteredServices().reduce(
                                (sum, s) => sum + (s.salvation_decisions || 0),
                                0,
                            )}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">
                            Avg Attendance
                        </p>
                        <p class="text-xl font-semibold text-foreground">
                            {filteredServices().length > 0
                                ? Math.round(
                                      filteredServices().reduce(
                                          (sum, s) =>
                                              sum + (s.total_attendance || 0),
                                          0,
                                      ) / filteredServices().length,
                                  )
                                : 0}
                        </p>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Meetings Tab -->
        {#if activeTab === "meetings"}
            <div class="card-base">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-foreground">
                        Meetings & Prayer
                    </h3>
                    <Button size="sm" onclick={handleExportMeetings}>
                        <svg
                            class="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                        </svg>
                        Export CSV
                    </Button>
                </div>
                <p class="text-sm text-muted-foreground mb-4">
                    {filteredMeetings().length} meetings in selected period
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">
                            Prayer Hours
                        </p>
                        <p class="text-xl font-semibold text-foreground">
                            {Math.round(
                                (filteredMeetings().reduce(
                                    (sum, m) => sum + (m.duration_minutes || 0),
                                    0,
                                ) /
                                    60) *
                                    10,
                            ) / 10}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">
                            Total Attendance
                        </p>
                        <p class="text-xl font-semibold text-foreground">
                            {filteredMeetings().reduce(
                                (sum, m) => sum + (m.attendance_count || 0),
                                0,
                            )}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">
                            Leaders Attended
                        </p>
                        <p class="text-xl font-semibold text-success">
                            {filteredMeetings().reduce(
                                (sum, m) => sum + (m.leaders_count || 0),
                                0,
                            )}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">
                            Avg per Meeting
                        </p>
                        <p class="text-xl font-semibold text-foreground">
                            {filteredMeetings().length > 0
                                ? Math.round(
                                      filteredMeetings().reduce(
                                          (sum, m) =>
                                              sum + (m.attendance_count || 0),
                                          0,
                                      ) / filteredMeetings().length,
                                  )
                                : 0}
                        </p>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Visitation Tab -->
        {#if activeTab === "visitation"}
            <div class="card-base">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-foreground">
                        Visitation
                    </h3>
                    <Button size="sm" onclick={handleExportVisitations}>
                        <svg
                            class="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                        </svg>
                        Export CSV
                    </Button>
                </div>
                <p class="text-sm text-muted-foreground mb-4">
                    {filteredVisitations().length} visits in selected period
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">
                            Visits Completed
                        </p>
                        <p class="text-xl font-semibold text-success">
                            {filteredVisitations().length}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">
                            Follow-ups Needed
                        </p>
                        <p class="text-xl font-semibold text-warning">
                            {filteredVisitations().filter(
                                (v) => v.follow_up_required,
                            ).length}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">Welcomed</p>
                        <p class="text-xl font-semibold text-foreground">
                            {filteredVisitations().filter(
                                (v) => v.outcome === "welcomed_encouraged",
                            ).length}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">
                            Prayer Requests
                        </p>
                        <p class="text-xl font-semibold text-info">
                            {filteredVisitations().filter(
                                (v) => v.outcome === "prayer_request_received",
                            ).length}
                        </p>
                    </div>
                </div>
            </div>
        {/if}
    {/if}
</DashboardLayout>
