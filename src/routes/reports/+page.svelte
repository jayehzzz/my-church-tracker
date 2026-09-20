<!--
  Reports Page
  ============
  Comprehensive reports dashboard with KPI summaries and CSV export functionality.
  
  Features:
  - Summary KPIs across all modules
  - Date range filter integration
  - Module-specific operational summaries
  - CSV export for each module
-->

<script>
    import MetricComparison from "$lib/components/charts/MetricComparison.svelte";
    import { reportingMonths, roundedAverage } from "$lib/utils/comparisonMetrics.js";
    import FullscreenWrapper from "$lib/components/ui/FullscreenWrapper.svelte";
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
    import PageHeader from "$lib/components/shared/PageHeader.svelte";
    import FilterBar from "$lib/components/filters/FilterBar.svelte";
    import { Button } from "$lib/components/ui";
    import KPICard from "$lib/components/dashboard/KPICard.svelte";
    import { dateRange } from "$lib/stores/filterStore";
    import { exportToCSV, exportColumns } from "$lib/utils/exportUtils";
    import {
        buildPeopleJourneySummary,
        buildReportSummary,
        completedCareCount,
        hasJoinedChurch,
        hasOpenCareFollowUp,
        hasOutreachSalvation,
        isCompletedService,
        isHeldMeeting,
        isWithinReportingRange,
        meetingAttendance,
        prayerHours,
    } from "$lib/utils/reportingMetrics";
    import { isDemoMode } from "$lib/convex";
    import {
        mockPeople,
        mockEvangelismContacts,
        mockServices,
        mockMeetings,
        mockVisitations
    } from "$lib/data/mockData";

    const demoMode = isDemoMode();
    let people = $state(demoMode ? mockPeople : []);
    let contacts = $state(demoMode ? mockEvangelismContacts : []);
    let services = $state(demoMode ? mockServices : []);
    let meetings = $state(demoMode ? mockMeetings : []);
    let visitations = $state(demoMode ? mockVisitations : []);
    let loading = $state(!demoMode);
    let error = $state(null);

    // Active report tab
    let activeTab = $state("overview");

    // Filtered data based on date range
    const filteredContacts = $derived(() => {
        const range = $dateRange;
        return contacts.filter((c) => isWithinReportingRange(c.contact_date, range));
    });

    const filteredServices = $derived(() => {
        const range = $dateRange;
        return services.filter((s) => isWithinReportingRange(s.service_date, range) && isCompletedService(s));
    });

    const filteredMeetings = $derived(() => {
        const range = $dateRange;
        return meetings.filter((m) => isWithinReportingRange(m.meeting_date, range) && isHeldMeeting(m));
    });

    const filteredVisitations = $derived(() => {
        const range = $dateRange;
        return visitations.filter((v) =>
            isWithinReportingRange(v.visit_date, range),
        );
    });

    // Calculate summary KPIs
    const summaryKPIs = $derived(() => {
        const fContacts = filteredContacts();
        const fServices = filteredServices();
        const fMeetings = filteredMeetings();
        const fVisitations = filteredVisitations();

        return buildReportSummary({
            people,
            contacts: fContacts,
            services: fServices,
            meetings: fMeetings,
            visitations: fVisitations,
        });
    });
    const peopleJourney = $derived(buildPeopleJourneySummary(people));
    const comparisonMetrics = $derived.by(() => {
        const summary = summaryKPIs();
        const contacts = filteredContacts(), services = filteredServices(), meetings = filteredMeetings(), care = filteredVisitations();
        const monthly = (dates) => ({ denominator: reportingMonths($dateRange, dates), averageLabel: 'Average per calendar month' });
        const groups = {
            people: Object.entries(peopleJourney).map(([key,total]) => ({key,label:({outreachContacts:'Outreach contacts',guests:'Guests',members:'Members',bacentaLeaders:'Bacenta leaders',basontaLeaders:'Basonta leaders',basontaMembers:'Basonta members'})[key],total,periodLabel:'Current people snapshot'})),
            evangelism: [
                {key:'newContacts',label:'People reached',total:summary.newContacts},
                {key:'joinedChurch',label:'Reached people who joined',total:summary.joinedChurch},
                {key:'outreachDecisions',label:'Outreach salvation decisions',total:summary.outreachSalvationDecisions},
            ].map(item => ({...item,...monthly(contacts.map(row=>row.contact_date))})),
            services: [
                {key:'attendance',label:'Sunday attendance',total:summary.totalAttendance},
                {key:'decisions',label:'Sunday salvation decisions',total:summary.salvationDecisions},
            ].map(item=>({...item,denominator:services.length,averageLabel:'Average per service'})),
            meetings: [{key:'meetingAttendance',label:'Meeting attendance',total:meetings.reduce((total,row)=>total+meetingAttendance(row),0),denominator:meetings.length,averageLabel:'Average per held meeting'}],
            visitation: [
                {key:'careCompleted',label:'Completed care',total:summary.visitsCompleted,...monthly(care.map(row=>row.visit_date))},
                {key:'followUps',label:'Outstanding follow-ups',total:summary.followUpsNeeded},
            ],
        };
        return activeTab==='overview' ? Object.values(groups).flat() : groups[activeTab] || [];
    });


    async function loadReports() {
        if (!browser) return;
        loading = true;
        error = null;

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

            const failedResult = [
                peopleResult,
                contactsResult,
                servicesResult,
                meetingsResult,
                visitationsResult,
            ].find((result) => result.error);
            if (failedResult) throw failedResult.error;

            people = peopleResult.data || [];
            contacts = contactsResult.data || [];
            services = servicesResult.data || [];
            meetings = meetingsResult.data || [];
            visitations = visitationsResult.data || [];
        } catch (loadError) {
            error = loadError?.message || "Could not load reports.";
        } finally {
            loading = false;
        }
    }

    // Load all report sources together so the totals describe one consistent snapshot.
    onMount(() => {
        void loadReports();
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
        { id: "visitation", label: "Pastoral Care" },
    ];
</script>

<DashboardLayout>
    {#snippet filters()}
        <FilterBar />
    {/snippet}

    <!-- Page Header -->
    <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-in"
    >
        <PageHeader
            title="Reports"
            subtitle="Review ministry activity and export the records behind each summary."
        />

        <Button onclick={handleExportAll} disabled={loading || Boolean(error)}>
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
        {#if error}
            <div class="mb-6 flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between" role="alert">
                <div>
                    <p class="font-medium text-warning">Reports could not be refreshed</p>
                    <p class="mt-1 text-muted-foreground">{error}</p>
                </div>
                <Button size="sm" variant="secondary" onclick={loadReports}>Try again</Button>
            </div>
        {/if}

        <!-- Tab Navigation -->
        <nav class="mb-6 flex gap-6 overflow-x-auto border-b border-border" aria-label="Report sections">
                {#each tabs as tab}
                    <button
                        type="button"
                        onclick={() => (activeTab = tab.id)}
                        aria-current={activeTab === tab.id ? "page" : undefined}
                        class="relative shrink-0 px-1 pb-3 text-sm font-medium transition-colors {activeTab ===
                        tab.id
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground'}"
                    >
                        {tab.label}
                        {#if activeTab === tab.id}
                            <span class="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary"></span>
                        {/if}
                    </button>
                {/each}
        </nav>

        <!-- Overview Tab -->
        <FullscreenWrapper title="Report comparison">
            {#snippet filters()}<FilterBar compact />{/snippet}
            <section class="card-base p-5">
                <h2 class="mb-4 pr-12 text-base font-semibold">Report comparison</h2>
                <MetricComparison metrics={comparisonMetrics} periodLabel={activeTab==='people'?'Current people snapshot':$dateRange.label} />
                <p class="mt-3 text-xs text-muted-foreground">Monthly averages include empty and partial calendar months in the selected period. People and outstanding follow-ups are current counts; an average does not apply.</p>
            </section>
        </FullscreenWrapper>
        {#if activeTab === "overview"}
            <p class="mb-4 text-sm text-muted-foreground">
                Activity totals use <span class="font-medium text-foreground">{$dateRange.label}</span>. The people-directory total is all time.
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KPICard
                    title="Total People"
                    value={summaryKPIs().totalPeople}
                    icon="users"
                    description="All-time directory"
                    trend={null}
                />
                <KPICard
                    title="New Contacts"
                    value={summaryKPIs().newContacts}
                    icon="user-plus"
                    variant="info"
                    description={$dateRange.label}
                    trend={null}
                />
                <KPICard
                    title="Joined Church"
                    value={summaryKPIs().joinedChurch}
                    icon="check-circle"
                    variant="success"
                    description={$dateRange.label}
                    trend={null}
                />
                <KPICard
                    title="Saved on Outreach"
                    value={summaryKPIs().outreachSalvationDecisions}
                    icon="heart"
                    variant="success"
                    description={$dateRange.label}
                    trend={null}
                />
                <KPICard
                    title="Service Salvation Decisions"
                    value={summaryKPIs().salvationDecisions}
                    icon="heart"
                    variant="success"
                    description={$dateRange.label}
                    trend={null}
                />
                <KPICard
                    title="Total Attendance"
                    value={summaryKPIs().totalAttendance}
                    icon="users"
                    description={$dateRange.label}
                    trend={null}
                />
                <KPICard
                    title="Prayer Hours"
                    value={summaryKPIs().prayerHours}
                    icon="clock"
                    suffix="hrs"
                    description={$dateRange.label}
                    trend={null}
                />
                <KPICard
                    title="Visits Completed"
                    value={summaryKPIs().visitsCompleted}
                    icon="home"
                    variant="success"
                    description={$dateRange.label}
                    trend={null}
                />
                <KPICard
                    title="Follow-ups Needed"
                    value={summaryKPIs().followUpsNeeded}
                    icon="clock"
                    variant={summaryKPIs().followUpsNeeded > 0
                        ? "warning"
                        : "default"}
                    description={$dateRange.label}
                    trend={null}
                />
            </div>

            <!-- Quick Export Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="card-base flex items-center justify-between">
                    <div>
                        <h4 class="text-sm font-medium text-foreground">
                            People
                        </h4>
                        <p class="text-xs text-muted-foreground">
                            {people.length} records
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="secondary"
                        onclick={handleExportPeople}
                        disabled={Boolean(error)}
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
                        disabled={Boolean(error)}
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
                        disabled={Boolean(error)}
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
                        disabled={Boolean(error)}
                    >
                        Export CSV
                    </Button>
                </div>

                <div class="card-base flex items-center justify-between">
                    <div>
                        <h4 class="text-sm font-medium text-foreground">
                            Pastoral Care
                        </h4>
                        <p class="text-xs text-muted-foreground">
                            {filteredVisitations().length} records
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="secondary"
                        onclick={handleExportVisitations}
                        disabled={Boolean(error)}
                    >
                        Export CSV
                    </Button>
                </div>
            </div>
        {/if}

        <!-- People Tab -->
        {#if activeTab === "people"}
            <FullscreenWrapper title="People report">{#snippet filters()}<FilterBar compact />{/snippet}<div class="card-base">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4 pr-12">
                    <h3 class="text-lg font-semibold text-foreground">
                        People
                    </h3>
                    <Button size="sm" onclick={handleExportPeople} disabled={Boolean(error)}>
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
                    {people.length} total people in directory (not filtered by reporting period)
                </p>
                <p class="mb-3 text-xs text-muted-foreground">
                    Journey status and church roles are shown separately. Leadership and Basonta involvement can overlap with membership.
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">Outreach Contacts</p>
                        <p class="text-xl font-semibold text-foreground">
                            {peopleJourney.outreachContacts}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">Current Guests</p>
                        <p class="text-xl font-semibold text-foreground">
                            {peopleJourney.guests}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">Members</p>
                        <p class="text-xl font-semibold text-foreground">
                            {peopleJourney.members}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">Bacenta Leaders</p>
                        <p class="text-xl font-semibold text-foreground">
                            {peopleJourney.bacentaLeaders}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">Basonta Leaders</p>
                        <p class="text-xl font-semibold text-foreground">
                            {peopleJourney.basontaLeaders}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">In a Basonta</p>
                        <p class="text-xl font-semibold text-foreground">
                            {peopleJourney.basontaMembers}
                        </p>
                    </div>
                </div>
            </div></FullscreenWrapper>
        {/if}

        <!-- Evangelism Tab -->
        {#if activeTab === "evangelism"}
            <FullscreenWrapper title="Evangelism report">{#snippet filters()}<FilterBar compact />{/snippet}<div class="card-base">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4 pr-12">
                    <h3 class="text-lg font-semibold text-foreground">
                        Evangelism Contacts
                    </h3>
                    <Button size="sm" onclick={handleExportContacts} disabled={Boolean(error)}>
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
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">Responsive</p>
                        <p class="text-xl font-semibold text-success">
                            {filteredContacts().filter(
                                (c) => c.response === "responsive",
                            ).length}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">Saved on Outreach</p>
                        <p class="text-xl font-semibold text-success">
                            {filteredContacts().filter(hasOutreachSalvation)
                                .length}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">Joined Church</p>
                        <p class="text-xl font-semibold text-success">
                            {filteredContacts().filter(hasJoinedChurch)
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
            </div></FullscreenWrapper>
        {/if}

        <!-- Services Tab -->
        {#if activeTab === "services"}
            <FullscreenWrapper title="Services report">{#snippet filters()}<FilterBar compact />{/snippet}<div class="card-base">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4 pr-12">
                    <h3 class="text-lg font-semibold text-foreground">
                        Services
                    </h3>
                    <Button size="sm" onclick={handleExportServices} disabled={Boolean(error)}>
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
                    {filteredServices().length} completed services in selected period
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
                            Guest Attendance
                        </p>
                        <p class="text-xl font-semibold text-info">
                            {filteredServices().reduce(
                                (sum, s) => sum + (s.guests_count || 0),
                                0,
                            )}
                        </p>
                        <p class="mt-1 text-[11px] text-muted-foreground">
                            Includes first timers; they are already part of total attendance.
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
                                ? roundedAverage(
                                      filteredServices().reduce(
                                          (sum, s) =>
                                              sum + (s.total_attendance || 0),
                                          0,
                                      ), filteredServices().length,
                                  )
                                : 0}
                        </p>
                    </div>
                </div>
            </div></FullscreenWrapper>
        {/if}

        <!-- Meetings Tab -->
        {#if activeTab === "meetings"}
            <FullscreenWrapper title="Meetings report">{#snippet filters()}<FilterBar compact />{/snippet}<div class="card-base">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4 pr-12">
                    <h3 class="text-lg font-semibold text-foreground">
                        Meetings
                    </h3>
                    <Button size="sm" onclick={handleExportMeetings} disabled={Boolean(error)}>
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
                    {filteredMeetings().length} held meetings in selected period
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">
                            Prayer Hours
                        </p>
                        <p class="text-xl font-semibold text-foreground">
                            {prayerHours(filteredMeetings())}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">
                            Total Attendance
                        </p>
                        <p class="text-xl font-semibold text-foreground">
                            {filteredMeetings().reduce(
                                (sum, m) => sum + meetingAttendance(m),
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
                                ? roundedAverage(
                                      filteredMeetings().reduce(
                                          (sum, m) =>
                                              sum + meetingAttendance(m),
                                          0,
                                      ), filteredMeetings().length,
                                  )
                                : 0}
                        </p>
                    </div>
                </div>
            </div></FullscreenWrapper>
        {/if}

        <!-- Visitation Tab -->
        {#if activeTab === "visitation"}
            <FullscreenWrapper title="Pastoral care report">{#snippet filters()}<FilterBar compact />{/snippet}<div class="card-base">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4 pr-12">
                    <h3 class="text-lg font-semibold text-foreground">
                        Pastoral Care
                    </h3>
                    <Button size="sm" onclick={handleExportVisitations} disabled={Boolean(error)}>
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
                    {filteredVisitations().length} care records in selected period
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">
                            Visits Completed
                        </p>
                        <p class="text-xl font-semibold text-success">
                            {completedCareCount(filteredVisitations())}
                        </p>
                    </div>
                    <div class="p-3 bg-secondary/30 rounded-lg">
                        <p class="text-xs text-muted-foreground">
                            Follow-ups Needed
                        </p>
                        <p class="text-xl font-semibold text-warning">
                            {filteredVisitations().filter(
                                hasOpenCareFollowUp,
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
            </div></FullscreenWrapper>
        {/if}
    {/if}
</DashboardLayout>
