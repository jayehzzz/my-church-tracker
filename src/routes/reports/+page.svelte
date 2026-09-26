<!--
  Reports Page
  ============
  Period summary and CSV exports, with detailed report metrics on demand.
  
  Features:
  - Concise period summary and expandable report metrics
  - Date range filter integration
  - Links to section dashboards and detailed operational summaries
  - CSV export for each module
-->

<script>
    import MetricComparison from "$lib/components/charts/MetricComparison.svelte";
    import { reportMetricGroups } from "$lib/utils/reportDrilldown.js";
    import ReportDrilldown from "$lib/components/drilldown/ReportDrilldown.svelte";
    import { openDrilldown } from "$lib/components/drilldown/selection.js";
    import { saveDomainReturn, takeDomainReturn } from "$lib/components/drilldown/domainReturnState.js";
    import { session } from "$lib/auth/session.js";
    import FullscreenWrapper from "$lib/components/ui/FullscreenWrapper.svelte";
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
    import PageHeader from "$lib/components/shared/PageHeader.svelte";
    import FilterBar from "$lib/components/filters/FilterBar.svelte";
    import { Button } from "$lib/components/ui";
    import KPICard from "$lib/components/dashboard/KPICard.svelte";
    import { dateRange } from "$lib/stores/filterStore";
    import { exportToCSV } from "$lib/utils/exportUtils";
    import { reportExportTypes, reportExportRows, reportExportOptions } from "$lib/utils/reportExports";
    import { formatJourneyStatus } from "$lib/services/peopleService.js";
    import {
        buildPeopleJourneySummary,
        completedCareCount,
        hasJoinedChurch,
        hasOpenCareFollowUp,
        hasOutreachSalvation,
        isCompletedService,
        isHeldMeeting,
        isWithinReportingRange,
        meetingAttendance,
        prayerHours,
        todayDate,
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
    let exportType = $state('people');
    let exportDateMode = $state('period');
    let peopleDateField = $state('');
    let exportPersonId = $state('');
    let exportPersonRelation = $state('self');
    let exportValues = $state(Object.fromEntries(reportExportTypes.people.filters.map((filter) => [filter.key, ''])));
    let chosenColumns = $state({});
    let exporting = $state(false);
    const exportConfig = $derived(reportExportTypes[exportType]);
    const exportSources = $derived({ people, contacts, services, meetings, care: visitations });
    const exportRows = $derived(reportExportRows(exportType, exportSources, {
        dateMode: exportDateMode, peopleDateField, personId: exportPersonId,
        personRelation: exportPersonRelation, values: exportValues,
    }, $dateRange));
    const selectedColumns = $derived(exportConfig.columns.filter((column) => chosenColumns[column.key] !== false));
    const sortedPeople = $derived([...people].sort((a, b) =>
        `${a.last_name || ''} ${a.first_name || ''}`.localeCompare(`${b.last_name || ''} ${b.first_name || ''}`)));

    // Active report tab
    let activeTab = $state("overview");

    // Filtered data based on date range
    const filteredContacts = $derived(() => {
        const range = $dateRange;
        return contacts.filter((c) => isWithinReportingRange(c.contact_date, range) && c.contact_date <= todayDate());
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
            isWithinReportingRange(v.visit_date, range) && v.visit_date <= todayDate(),
        );
    });

    const metricGroups = $derived(reportMetricGroups({ people, contacts, services, meetings, visitations }, $dateRange));
    const metric = (key) => Object.values(metricGroups).flat().find(row => row.key === key);
    const summaryKPIs = $derived(() => ({
        totalPeople: metric('totalPeople')?.total ?? 0,
        newContacts: metric('newContacts')?.total ?? 0,
        totalAttendance: metric('attendance')?.total ?? 0,
        prayerHours: Math.round((metric('prayerHours')?.total ?? 0) * 10) / 10,
        visitsCompleted: metric('careCompleted')?.total ?? 0,
        joinedChurch: metric('joinedChurch')?.total ?? 0,
        outreachSalvationDecisions: metric('outreachDecisions')?.total ?? 0,
        salvationDecisions: metric('decisions')?.total ?? 0,
        followUpsNeeded: metric('followUps')?.total ?? 0,
    }));
    const peopleJourney = $derived(buildPeopleJourneySummary(people));
    const comparisonMetrics = $derived(activeTab === 'overview'
        ? Object.values(metricGroups).flat().filter(row => !['totalPeople','prayerHours','responsive','has_church','non_responsive'].includes(row.key))
        : (metricGroups[activeTab] || []).filter(row => !['totalPeople','prayerHours','responsive','has_church','non_responsive'].includes(row.key)));
    let drilldown = $state(null);
    function inspect(key, mode = 'total') {
        if (loading || error || !metric(key)) return;
        drilldown = openDrilldown({ kind: 'list', key, mode, title: metric(key).label, periodLabel: $dateRange.label }, { tab: activeTab, range: { ...$dateRange } });
    }
    function inspectComparison(selection) {
        const choice = selection.choices[0];
        inspect(choice.metricKey, choice.mode);
    }
    const identity = () => String($session.user?._id || $session.user?.id || ($session.status === 'demo' ? 'demo' : ''));
    export const snapshot = {
        capture: () => {
            const token = `reports-${crypto.randomUUID()}`;
            saveDomainReturn(token, {
                identity: identity(), role: $session.user?.role, confidential: $session.user?.canViewConfidential, giving: $session.user?.canViewGiving,
                range: { ...$dateRange }, activeTab, drilldown: $state.snapshot(drilldown),
                exportType, exportDateMode, peopleDateField, exportPersonId, exportPersonRelation,
                exportValues: { ...exportValues }, chosenColumns: { ...chosenColumns }, scrollY: window.scrollY,
            });
            return { token };
        },
        restore: value => {
            const frame = value?.token ? takeDomainReturn(value.token) : null;
            if (!frame || frame.identity !== identity() || frame.role !== $session.user?.role || frame.confidential !== $session.user?.canViewConfidential || frame.giving !== $session.user?.canViewGiving || frame.range.startDate !== $dateRange.startDate || frame.range.endDate !== $dateRange.endDate) return;
            activeTab = frame.activeTab;
            drilldown = frame.drilldown;
            exportType = frame.exportType; exportDateMode = frame.exportDateMode; peopleDateField = frame.peopleDateField;
            exportPersonId = frame.exportPersonId; exportPersonRelation = frame.exportPersonRelation;
            exportValues = frame.exportValues; chosenColumns = frame.chosenColumns;
            requestAnimationFrame(() => window.scrollTo(0, frame.scrollY || 0));
        },
    };

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
            people = []; contacts = []; services = []; meetings = []; visitations = [];
        } finally {
            loading = false;
        }
    }

    // Load all report sources together so the totals describe one consistent snapshot.
    onMount(() => {
        void loadReports();
    });

    function chooseExportType(type) {
        exportType = type;
        exportDateMode = 'period';
        peopleDateField = '';
        exportPersonId = '';
        exportPersonRelation = reportExportTypes[type].personRelations[0].key;
        exportValues = Object.fromEntries(reportExportTypes[type].filters.map((filter) => [filter.key, '']));
        chosenColumns = {};
    }

    function openExport(type) {
        chooseExportType(type);
        document.getElementById('report-exports-heading')?.scrollIntoView({ behavior: 'smooth' });
    }

    async function downloadSelected() {
        if (exporting || loading || error || selectedColumns.length === 0) return;
        exporting = true;
        try {
            await exportToCSV(exportRows, `${exportType}-report-${new Date().toISOString().slice(0, 10)}`, selectedColumns);
        } finally {
            exporting = false;
        }
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

        <Button onclick={() => document.getElementById('report-exports-heading')?.scrollIntoView({ behavior: 'smooth' })} disabled={loading || Boolean(error)}>
            Set up a CSV download
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

        {#if !error}
        <section aria-labelledby="period-summary-heading" class="mb-8">
            <div class="mb-4">
                <h2 id="period-summary-heading" class="text-lg font-semibold text-foreground">Period summary</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                    Activity totals use <span class="font-medium text-foreground">{$dateRange.label}</span>. Directory counts are current snapshots.
                </p>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KPICard title="New Contacts" onclick={() => inspect('newContacts')} value={summaryKPIs().newContacts} icon="user-plus" variant="info" description={$dateRange.label} trend={null} />
                <KPICard title="Sunday Attendance" onclick={() => inspect('attendance')} value={summaryKPIs().totalAttendance} icon="users" description={$dateRange.label} trend={null} />
                <KPICard title="Prayer Hours" onclick={() => inspect('prayerHours')} value={summaryKPIs().prayerHours} format="decimal" icon="clock" suffix="hrs" description={$dateRange.label} trend={null} />
                <KPICard title="Visits Completed" onclick={() => inspect('careCompleted')} value={summaryKPIs().visitsCompleted} icon="home" variant="success" description={$dateRange.label} trend={null} />
            </div>
        </section>

        <section aria-labelledby="report-exports-heading" class="mb-8">
            <div class="mb-4">
                <h2 id="report-exports-heading" class="text-lg font-semibold text-foreground">Download records as CSV</h2>
                <p class="mt-1 text-sm text-muted-foreground">Choose the records, people and fields you need. Each download has one row per record; a person filter on gatherings selects whole gatherings and keeps their whole attendance totals.</p>
            </div>
            <div class="card-base space-y-6">
                <div>
                    <label for="csv-type" class="mb-2 block text-sm font-medium">Records to download</label>
                    <select id="csv-type" class="w-full max-w-md rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" value={exportType} onchange={(event) => chooseExportType(event.currentTarget.value)}>
                        {#each Object.entries(reportExportTypes) as [type, config]}
                            <option value={type}>{config.label}</option>
                        {/each}
                    </select>
                    <p class="mt-2 text-sm text-muted-foreground">{exportConfig.description}</p>
                </div>

                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {#if exportType === 'people'}
                        <div>
                            <label for="csv-people-date" class="mb-2 block text-sm font-medium">Directory date filter</label>
                            <select id="csv-people-date" class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" bind:value={peopleDateField}>
                                <option value="">No date filter (current directory)</option>
                                {#each exportConfig.dateFields as field}
                                    <option value={field.key}>{field.label} in {$dateRange.label}</option>
                                {/each}
                            </select>
                        </div>
                    {:else}
                        <div>
                            <label for="csv-date-mode" class="mb-2 block text-sm font-medium">{exportConfig.dateLabel}</label>
                            <select id="csv-date-mode" class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" bind:value={exportDateMode}>
                                <option value="period">{$dateRange.label}{exportConfig.actualOnly ? ' · completed / held only' : ''}</option>
                                <option value="all">All dates and records</option>
                            </select>
                        </div>
                    {/if}
                    {#each exportConfig.filters as filter}
                        <div>
                            <label for={`csv-filter-${filter.key}`} class="mb-2 block text-sm font-medium">{filter.label}</label>
                            <select id={`csv-filter-${filter.key}`} class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" bind:value={exportValues[filter.key]}>
                                <option value="">{filter.allLabel || 'All'}</option>
                                {#each filter.options || reportExportOptions(exportSources[exportType], filter.key) as option}
                                    <option value={option.value}>{option.label}</option>
                                {/each}
                            </select>
                        </div>
                    {/each}
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label for="csv-person" class="mb-2 block text-sm font-medium">Person</label>
                        <select id="csv-person" class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" bind:value={exportPersonId}>
                            <option value="">All people</option>
                            {#each sortedPeople as person}
                                <option value={person.id || person._id}>{person.first_name} {person.last_name} ({formatJourneyStatus(person.member_status)})</option>
                            {/each}
                        </select>
                    </div>
                    {#if exportPersonId && exportConfig.personRelations.length > 1}
                        <div>
                            <label for="csv-person-relation" class="mb-2 block text-sm font-medium">Person's connection to record</label>
                            <select id="csv-person-relation" class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" bind:value={exportPersonRelation}>
                                {#each exportConfig.personRelations as relation}
                                    <option value={relation.key}>{relation.label}</option>
                                {/each}
                            </select>
                        </div>
                    {/if}
                </div>

                <fieldset>
                    <legend class="text-sm font-medium">Data fields to include</legend>
                    <p class="mt-1 text-xs text-muted-foreground">Only checked fields appear as columns. Some records have no value for a chosen field.</p>
                    <div class="mt-3 grid max-h-60 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2 lg:grid-cols-3">
                        {#each exportConfig.columns as column}
                            <label class="flex items-start gap-2 text-sm">
                                <input type="checkbox" class="mt-0.5" checked={chosenColumns[column.key] !== false} onchange={(event) => chosenColumns[column.key] = event.currentTarget.checked} />
                                <span>{column.label}</span>
                            </label>
                        {/each}
                    </div>
                    <div class="mt-2 flex gap-4 text-xs">
                        <button type="button" class="text-primary underline" onclick={() => chosenColumns = {}}>Select all fields</button>
                        <button type="button" class="text-primary underline" onclick={() => chosenColumns = Object.fromEntries(exportConfig.columns.map((column) => [column.key, false]))}>Clear fields</button>
                    </div>
                </fieldset>

                <div class="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                    <Button onclick={downloadSelected} disabled={loading || Boolean(error) || exporting || selectedColumns.length === 0 || exportRows.length === 0}>Download {exportRows.length} {exportRows.length === 1 ? 'record' : 'records'} · {selectedColumns.length} {selectedColumns.length === 1 ? 'field' : 'fields'}</Button>
                    {#if exportRows.length === 0}<span class="text-sm text-muted-foreground">No records match these filters.</span>{/if}
                    {#if selectedColumns.length === 0}<span class="text-sm text-muted-foreground">Choose at least one field.</span>{/if}
                </div>
            </div>
        </section>

        <details class="mb-6 overflow-hidden rounded-xl border border-border bg-card">
            <summary class="cursor-pointer px-5 py-4 text-sm font-semibold text-foreground hover:bg-secondary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                Detailed report metrics and comparisons
            </summary>
            <div class="border-t border-border px-5 py-5">
                <p class="mb-5 text-sm text-muted-foreground">Explore the full breakdowns for {$dateRange.label}. People are a current directory snapshot; follow-ups come from care records in the selected period.</p>
                <nav class="mb-6 flex gap-6 overflow-x-auto border-b border-border" aria-label="Detailed report sections">
                    {#each tabs as tab}
                        <button
                            type="button"
                            onclick={() => (activeTab = tab.id)}
                            aria-current={activeTab === tab.id ? "page" : undefined}
                            class="relative shrink-0 px-1 pb-3 text-sm font-medium transition-colors {activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}"
                        >
                            {tab.label}
                            {#if activeTab === tab.id}
                                <span class="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary"></span>
                            {/if}
                        </button>
                    {/each}
                </nav>
                <FullscreenWrapper title="Report comparison">
                    {#snippet filters()}<FilterBar compact />{/snippet}
                    <section class="card-base p-5">
                        <h2 class="mb-4 pr-12 text-base font-semibold">Report comparison</h2>
                        <MetricComparison metrics={comparisonMetrics} onDrilldown={inspectComparison} periodLabel={activeTab === 'people' ? 'Current people snapshot' : $dateRange.label} />
                        <p class="mt-3 text-xs text-muted-foreground">Monthly averages include empty and partial calendar months in the selected period. People are a current snapshot. Outstanding follow-ups are counted from care records in the selected period; an average does not apply.</p>
                    </section>
                </FullscreenWrapper>
                {#if activeTab === "overview"}
                    <div class="mt-6">
                        <h3 class="mb-4 text-sm font-semibold text-foreground">Other summary totals</h3>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <KPICard title="Total People" onclick={() => inspect('totalPeople')} value={summaryKPIs().totalPeople} icon="users" description="All-time directory" trend={null} />
                            <KPICard title="Joined Church" onclick={() => inspect('joinedChurch')} value={summaryKPIs().joinedChurch} icon="check-circle" variant="success" description={$dateRange.label} trend={null} />
                            <KPICard title="Saved on Outreach" onclick={() => inspect('outreachDecisions')} value={summaryKPIs().outreachSalvationDecisions} icon="heart" variant="success" description={$dateRange.label} trend={null} />
                            <KPICard title="Service Salvation Decisions" onclick={() => inspect('decisions')} value={summaryKPIs().salvationDecisions} icon="heart" variant="success" description={$dateRange.label} trend={null} />
                            <KPICard title="Follow-ups Needed" onclick={() => inspect('followUps')} value={summaryKPIs().followUpsNeeded} icon="clock" variant={summaryKPIs().followUpsNeeded > 0 ? "warning" : "default"} description={$dateRange.label} trend={null} />
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
                    <Button size="sm" onclick={() => openExport('people')} disabled={Boolean(error)}>
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
                        Set up CSV
                    </Button>
                </div>
                <p class="text-sm text-muted-foreground mb-4">
                    {summaryKPIs().totalPeople} active people in directory (current snapshot, not filtered by reporting period)
                </p>
                <p class="mb-3 text-xs text-muted-foreground">
                    Journey status and church roles are shown separately. Leadership and Basonta involvement can overlap with membership.
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('outreachContacts', 'total')} aria-label="Inspect Outreach Contacts">
                        <p class="text-xs text-muted-foreground">Outreach Contacts</p>
                        <p class="text-xl font-semibold text-foreground">
                            {peopleJourney.outreachContacts}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('guests', 'total')} aria-label="Inspect Current Non-members">
                        <p class="text-xs text-muted-foreground">Current Non-members</p>
                        <p class="text-xl font-semibold text-foreground">
                            {peopleJourney.guests}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('members', 'total')} aria-label="Inspect Members">
                        <p class="text-xs text-muted-foreground">Members</p>
                        <p class="text-xl font-semibold text-foreground">
                            {peopleJourney.members}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('bacentaLeaders', 'total')} aria-label="Inspect Bacenta Leaders">
                        <p class="text-xs text-muted-foreground">Bacenta Leaders</p>
                        <p class="text-xl font-semibold text-foreground">
                            {peopleJourney.bacentaLeaders}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('basontaLeaders', 'total')} aria-label="Inspect Basonta Leaders">
                        <p class="text-xs text-muted-foreground">Basonta Leaders</p>
                        <p class="text-xl font-semibold text-foreground">
                            {peopleJourney.basontaLeaders}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('basontaMembers', 'total')} aria-label="Inspect In a Basonta">
                        <p class="text-xs text-muted-foreground">In a Basonta</p>
                        <p class="text-xl font-semibold text-foreground">
                            {peopleJourney.basontaMembers}
                        </p>
                    </button>
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
                    <Button size="sm" onclick={() => openExport('contacts')} disabled={Boolean(error)}>
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
                        Set up CSV
                    </Button>
                </div>
                <p class="text-sm text-muted-foreground mb-4">
                    {filteredContacts().length} contacts in selected period
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('responsive', 'total')} aria-label="Inspect Responsive">
                        <p class="text-xs text-muted-foreground">Responsive</p>
                        <p class="text-xl font-semibold text-success">
                            {filteredContacts().filter(
                                (c) => c.response === "responsive",
                            ).length}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('outreachDecisions', 'total')} aria-label="Inspect Saved on Outreach">
                        <p class="text-xs text-muted-foreground">Saved on Outreach</p>
                        <p class="text-xl font-semibold text-success">
                            {filteredContacts().filter(hasOutreachSalvation)
                                .length}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('joinedChurch', 'total')} aria-label="Inspect Joined Church">
                        <p class="text-xs text-muted-foreground">Joined Church</p>
                        <p class="text-xl font-semibold text-success">
                            {filteredContacts().filter(hasJoinedChurch)
                                .length}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('has_church', 'total')} aria-label="Inspect Has Church">
                        <p class="text-xs text-muted-foreground">Has Church</p>
                        <p class="text-xl font-semibold text-foreground">
                            {filteredContacts().filter(
                                (c) => c.response === "has_church",
                            ).length}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('non_responsive', 'total')} aria-label="Inspect Non-Responsive">
                        <p class="text-xs text-muted-foreground">
                            Non-Responsive
                        </p>
                        <p class="text-xl font-semibold text-destructive">
                            {filteredContacts().filter(
                                (c) => c.response === "non_responsive",
                            ).length}
                        </p>
                    </button>
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
                    <Button size="sm" onclick={() => openExport('services')} disabled={Boolean(error)}>
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
                        Set up CSV
                    </Button>
                </div>
                <p class="text-sm text-muted-foreground mb-4">
                    {filteredServices().length} completed services in selected period
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('attendance', 'total')} aria-label="Inspect Total Attendance">
                        <p class="text-xs text-muted-foreground">
                            Total Attendance
                        </p>
                        <p class="text-xl font-semibold text-foreground">
                            {filteredServices().reduce(
                                (sum, s) => sum + (s.total_attendance || 0),
                                0,
                            )}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('nonMemberAttendance', 'total')} aria-label="Inspect Non-member Attendance">
                        <p class="text-xs text-muted-foreground">
                            Non-member Attendance
                        </p>
                        <p class="text-xl font-semibold text-info">
                            {filteredServices().reduce(
                                (sum, s) => sum + (s.guests_count || 0),
                                0,
                            )}
                        </p>
                        <p class="mt-1 text-[11px] text-muted-foreground">
                            Includes first-timer and returning-guest visits; already part of total attendance.
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('decisions', 'total')} aria-label="Inspect Salvation Decisions">
                        <p class="text-xs text-muted-foreground">
                            Salvation Decisions
                        </p>
                        <p class="text-xl font-semibold text-success">
                            {filteredServices().reduce(
                                (sum, s) => sum + (s.salvation_decisions || 0),
                                0,
                            )}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('attendance', 'average')} aria-label="Inspect Avg Attendance">
                        <p class="text-xs text-muted-foreground">
                            Avg Attendance
                        </p>
                        <p class="text-xl font-semibold text-foreground">
                            {metric('attendance')?.average == null ? 'Unavailable' : Math.round(metric('attendance').total / metric('attendance').denominator)}
                        </p>
                    </button>
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
                    <Button size="sm" onclick={() => openExport('meetings')} disabled={Boolean(error)}>
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
                        Set up CSV
                    </Button>
                </div>
                <p class="text-sm text-muted-foreground mb-4">
                    {filteredMeetings().length} held meetings in selected period
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('prayerHours', 'total')} aria-label="Inspect Prayer Hours">
                        <p class="text-xs text-muted-foreground">
                            Prayer Hours
                        </p>
                        <p class="text-xl font-semibold text-foreground">
                            {prayerHours(filteredMeetings())}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('attendance', 'total')} aria-label="Inspect Total Attendance">
                        <p class="text-xs text-muted-foreground">
                            Total Attendance
                        </p>
                        <p class="text-xl font-semibold text-foreground">
                            {filteredMeetings().reduce(
                                (sum, m) => sum + meetingAttendance(m),
                                0,
                            )}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('leadersAttended', 'total')} aria-label="Inspect Leaders Attended">
                        <p class="text-xs text-muted-foreground">
                            Leaders Attended
                        </p>
                        <p class="text-xl font-semibold text-success">
                            {filteredMeetings().reduce(
                                (sum, m) => sum + (m.leaders_count || 0),
                                0,
                            )}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('meetingAttendance', 'average')} aria-label="Inspect Avg per Meeting">
                        <p class="text-xs text-muted-foreground">
                            Avg per Meeting
                        </p>
                        <p class="text-xl font-semibold text-foreground">
                            {metric('meetingAttendance')?.average == null ? 'Unavailable' : Math.round(metric('meetingAttendance').total / metric('meetingAttendance').denominator)}
                        </p>
                    </button>
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
                    <Button size="sm" onclick={() => openExport('care')} disabled={Boolean(error)}>
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
                        Set up CSV
                    </Button>
                </div>
                <p class="text-sm text-muted-foreground mb-4">
                    {filteredVisitations().length} care records in selected period
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('careCompleted', 'total')} aria-label="Inspect Visits Completed">
                        <p class="text-xs text-muted-foreground">
                            Visits Completed
                        </p>
                        <p class="text-xl font-semibold text-success">
                            {completedCareCount(filteredVisitations())}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('followUps', 'total')} aria-label="Inspect Follow-ups Needed">
                        <p class="text-xs text-muted-foreground">
                            Follow-ups Needed
                        </p>
                        <p class="text-xl font-semibold text-warning">
                            {filteredVisitations().filter(
                                hasOpenCareFollowUp,
                            ).length}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('welcomed', 'total')} aria-label="Inspect Welcomed">
                        <p class="text-xs text-muted-foreground">Welcomed</p>
                        <p class="text-xl font-semibold text-foreground">
                            {filteredVisitations().filter(
                                (v) => v.outcome === "welcomed_encouraged",
                            ).length}
                        </p>
                    </button>
                    <button type="button" class="w-full p-3 bg-secondary/30 rounded-lg text-left" onclick={() => inspect('prayerRequests', 'total')} aria-label="Inspect Prayer Requests">
                        <p class="text-xs text-muted-foreground">
                            Prayer Requests
                        </p>
                        <p class="text-xl font-semibold text-info">
                            {filteredVisitations().filter(
                                (v) => v.outcome === "prayer_request_received",
                            ).length}
                        </p>
                    </button>
                </div>
            </div></FullscreenWrapper>
        {/if}
            </div>
        </details>
        {/if}
    {/if}
</DashboardLayout>

<ReportDrilldown bind:state={drilldown} groups={metricGroups} status={loading ? 'loading' : error ? 'unavailable' : 'ready'} error={error || ''} onretry={loadReports} />
