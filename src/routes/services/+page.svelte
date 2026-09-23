<!--
  Sunday Services Page
  Track and manage church service attendance and schedules.
  
  Features:
  - Dual views: Service List View and Dashboard View
  - Concise summary with expandable attendance and outcomes detail
  - Custom table with photo thumbnails and individual names
  - Service Details Modal with Edit/Delete actions
  - Global filters that persist across views
  - Dashboard fullscreen mode
  - Copy functionality for charts and data
  - Column filter dropdown in table header
-->

<script>
  import { roundedAverage } from "$lib/utils/comparisonMetrics.js";
  import MetricComparison from "$lib/components/charts/MetricComparison.svelte";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import FilterBar from "$lib/components/filters/FilterBar.svelte";
  import {
    Modal,
    Button,
    CopyButton,
    CopyDropdown,
    ColumnFilterDropdown,
    FullscreenWrapper,
  } from "$lib/components/ui";
  import ServiceForm from "$lib/components/forms/ServiceForm.svelte";

  // Import filter store for reactive date range
  import { dateRange } from "$lib/stores/filterStore";

  // Import chart components
  import ChartPointDetails from "$lib/components/charts/ChartPointDetails.svelte";
  let chartDetail = $state(null);
  import AttendanceTrend from "$lib/components/charts/AttendanceTrend.svelte";
  import WeeklyAttendanceMatrix from "$lib/components/charts/WeeklyAttendanceMatrix.svelte";
  import ServiceMemories from "$lib/components/services/ServiceMemories.svelte";

  // Import centralized mock data
  import {
    mockPeople,
    mockServices as centralMockServices,
    getPersonById as getCentralPersonById,
  } from "$lib/data/mockData";
  import { isDemoMode } from "$lib/convex";
  import { isCompletedService } from "$lib/utils/reportingMetrics.js";
  import {
    serviceAttendanceMetrics,
    summarizeAverageAttendanceMix,
    summarizeServicePeriod,
  } from "$lib/utils/serviceAnalytics.js";

  const demoMode = isDemoMode();

  // Demo records are available only in explicit demo mode. Live mode starts empty.
  let services = $state(demoMode ? centralMockServices : []);
  let people = $state(demoMode ? mockPeople : []);
  let attendanceRecords = $state([]);
  let sundayCommitments = $state([]);
  let sundayCommitmentsUnavailable = $state(false);
  let loading = $state(!demoMode);
  let error = $state(null);

  // View state: 'list' or 'dashboard'
  let activeView = $state("dashboard");

  // Filter state
  let serviceTypeFilter = $state("all");
  let attendanceRingVisibility = $state({ members: true, guests: true, firstTimers: true, tithers: true });

  function toggleAttendanceRing(key) {
    attendanceRingVisibility = {
      ...attendanceRingVisibility,
      [key]: !attendanceRingVisibility[key],
    };
  }

  // Column visibility state for Service List view
  let columnVisibility = $state({
    date: true,
    type: true,
    topic: true,
    attendance: true,
    guests: true,
    decisions: true,
    individuals: true,
    photos: true,
  });

  // Modal state
  let isFormOpen = $state(false);
  let isDeleteModalOpen = $state(false);
  let isDetailsModalOpen = $state(false);
  let isIndividualsModalOpen = $state(false);
  let isOutcomeModalOpen = $state(false);
  let selectedOutcome = $state(null);
  let selectedService = $state(null);
  let deleting = $state(false);

  // Track if using mock data
  let usingMockData = $state(demoMode);
  let serviceLinkNotice = $state("");
  let handledServiceQuery = $state("");

  // Search state
  let searchQuery = $state("");

  // Sort state
  let sortKey = $state("service_date");
  let sortDirection = $state("desc");

  // Service type options for filter
  const serviceTypeOptions = [
    { value: "all", label: "All Services" },
    { value: "sunday_service", label: "Sunday Service" },
    { value: "midweek_service", label: "Midweek Service" },
    { value: "special_service", label: "Special Service" },
  ];

  // Get person by ID - use centralized function
  function recordId(record) {
    return String(record?.id ?? record?._id ?? record ?? "");
  }

  function getPersonById(id) {
    if (id && typeof id === "object") {
      const resolvedId = recordId(id);
      return { ...id, id: id.id || id._id || resolvedId };
    }
    return (
      people.find((person) => recordId(person) === recordId(id)) ||
      (demoMode ? getCentralPersonById(id) : null)
    );
  }

  function getServiceIndividuals(service) {
    if (!Array.isArray(service?.individuals)) return [];
    return service.individuals.map(getPersonById).filter(Boolean).map(person => ({
      ...person,
      first_timer: attendanceRecords.some(row => recordId(row.service_id) === recordId(service) && recordId(row.person_id) === recordId(person) && row.first_timer === true),
    }));
  }

  function serviceFirstTimerCount(service) {
    return serviceMetrics(service).firstTimers;
  }

  // Format service type for display
  function formatServiceType(type) {
    const typeMap = {
      sunday_service: "Sunday",
      midweek_service: "Midweek",
      special_service: "Special",
      easter_service: "Easter",
      christmas_service: "Christmas",
    };
    return typeMap[type] || type || "Unknown";
  }

  // Format date for display
  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // Format short date
  function formatShortDate(dateStr) {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
    });
  }

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

  // Filter services by type AND date range
  const filteredServices = $derived(() => {
    const range = $dateRange;
    let filtered = services;

    // Filter by date range first
    filtered = filtered.filter((s) => isWithinDateRange(s.service_date, range));

    // Then filter by service type
    if (serviceTypeFilter !== "all") {
      filtered = filtered.filter((s) => s.service_type === serviceTypeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.sermon_topic?.toLowerCase().includes(q) ||
          s.sermon_speaker?.toLowerCase().includes(q) ||
          s.location?.toLowerCase().includes(q),
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal = sortKey === "returning_guests" ? serviceMetrics(a).returningGuestAttendance : a[sortKey];
      let bVal = sortKey === "returning_guests" ? serviceMetrics(b).returningGuestAttendance : b[sortKey];

      if (sortKey === "service_date") {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  });

  // Actual-attendance analytics follow the same completed-service rule as the
  // main dashboard. Future/cancelled services can stay visible in the list but
  // do not become historical attendance.
  const analyticsServices = $derived(() =>
    filteredServices().filter((service) => isCompletedService(service)),
  );

  function serviceMetrics(service) {
    return serviceAttendanceMetrics(service, attendanceRecords, people);
  }

  // Calculate KPIs based on filtered data
  const kpis = $derived(() => {
    const filtered = analyticsServices();
    const period = summarizeServicePeriod(filtered, attendanceRecords, people);
    const totalAttendance = period.totalAttendance;
    const totalGuests = period.guestAttendance;
    const totalReturningGuests = period.returningGuestAttendance;
    const totalFirstTimers = period.firstTimers;
    const totalDecisions = period.decisions;
    const totalTithers = period.tithers;
    const totalIndividuals = filtered.reduce(
      (sum, s) =>
        sum + (Array.isArray(s.individuals) ? s.individuals.length : 0),
      0,
    );
    const totalPhotos = filtered.reduce(
      (sum, s) => sum + (Array.isArray(s.photos) ? s.photos.length : 0),
      0,
    );
    const avgAttendance =
      filtered.length > 0 ? roundedAverage(totalAttendance, filtered.length) : 0;

    return {
      totalAttendance,
      totalGuests,
      totalReturningGuests,
      totalFirstTimers,
      totalDecisions,
      totalTithers,
      totalIndividuals,
      totalPhotos,
      avgAttendance,
      serviceCount: filtered.length,
      decisionRate: totalAttendance > 0 ? Math.round((totalDecisions / totalAttendance) * 100) : 0,
      titherRate: period.memberAttendance > 0
        ? Math.min(100, Math.round((totalTithers / period.memberAttendance) * 100))
        : 0,
    };
  });

  const attendanceMix = $derived(() =>
    summarizeAverageAttendanceMix(analyticsServices(), attendanceRecords, people),
  );

  const wholePerson = (value) => Math.round(Number(value) || 0);

  // Attendance trend data for chart - includes id and topic for drill-down
  const trendData = $derived(() => {
    const filtered = analyticsServices();
    return filtered
      .sort((a, b) => new Date(a.service_date) - new Date(b.service_date))
      .map((s) => {
        const metrics = serviceMetrics(s);
        return {
          date: s.service_date,
          total: metrics.totalAttendance,
          guests: metrics.guestAttendance,
          returningGuests: metrics.returningGuestAttendance,
          decisions: metrics.decisions,
          firstTimers: metrics.firstTimers,
          tithers: metrics.tithers,
          members: metrics.memberAttendance,
          id: s.id,
          topic: s.sermon_topic,
        };
      });
  });

  // Handle chart point click - find service and open modal
  function handleChartPointClick(point) {
    if (!point.id) return;
    const service = filteredServices().find((s) => s.id === point.id);
    if (service) {
      handleServiceClick(service);
    }
  }

  function openOutcomeModal(key) {
    selectedOutcome = key;
    isOutcomeModalOpen = true;
  }

  const outcomeModalData = $derived(() => {
    const isTithers = selectedOutcome === "tithers";
    return {
      title: isTithers ? "Tithers by service" : "Salvation decisions by service",
      total: isTithers ? kpis().totalTithers : kpis().totalDecisions,
      rows: [...analyticsServices()]
        .sort((a, b) => String(b.service_date).localeCompare(String(a.service_date)))
        .map((service) => ({
          service,
          count: isTithers ? serviceMetrics(service).tithers : serviceMetrics(service).decisions,
        })),
    };
  });

  // Dashboard insights - sorted services by attendance
  const sortedByAttendance = $derived(() => {
    return [...analyticsServices()].sort(
      (a, b) => serviceMetrics(b).totalAttendance - serviceMetrics(a).totalAttendance,
    );
  });

  const highestService = $derived(() => sortedByAttendance()[0]);
  const recentServices = $derived(() =>
    [...analyticsServices()]
      .sort((a, b) => new Date(b.service_date) - new Date(a.service_date))
      .slice(0, 5),
  );

  const latestService = $derived(() => recentServices()[0]);

  // Donut chart data
  const donutData = $derived(() => {
    const mix = attendanceMix();
    return {
      members: mix.averageMembers,
      returningGuests: mix.averageReturningGuests,
      firstTimers: mix.averageFirstTimers,
      tithers: mix.averageTithers,
      total: mix.averageAttendance,
      memberPct: mix.memberPct,
      returningGuestPct: mix.returningGuestPct,
      firstTimerPct: mix.firstTimerPct,
      titherRate: mix.titherRate,
    };
  });

  // Service type distribution
  const typeDistribution = $derived(() => {
    // Deliberately exclude the type filter. Selecting a bar must not make the
    // selector itself disappear (and leave someone stuck on "Special").
    const range = $dateRange;
    const query = searchQuery.trim().toLowerCase();
    const servicesInScope = services.filter((service) => {
      if (!isWithinDateRange(service.service_date, range)) return false;
      return !query || service.sermon_topic?.toLowerCase().includes(query) ||
        service.sermon_speaker?.toLowerCase().includes(query) ||
        service.location?.toLowerCase().includes(query);
    });
    const typeCounts = servicesInScope.reduce((acc, s) => {
      const type = s.service_type || "unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    const maxCount = Math.max(...Object.values(typeCounts), 1);
    return { typeCounts, typeEntries, maxCount, total: servicesInScope.length };
  });

  // Top attendees leaderboard
  const topAttendees = $derived(() => {
    const attendeeCounts = {};
    filteredServices().forEach((service) => {
      if (Array.isArray(service.individuals)) {
        service.individuals.forEach((attendee) => {
          const personId = recordId(attendee);
          if (!personId) return;
          attendeeCounts[personId] = (attendeeCounts[personId] || 0) + 1;
        });
      }
    });
    return Object.entries(attendeeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ person: getPersonById(id), count }));
  });

  // Photo gallery data
  const allPhotos = $derived(() => {
    return filteredServices()
      .flatMap((s) => (s.photos || []).map((photo) => ({ photo, service: s })))
      .slice(0, 12);
  });

  // Load services on mount
  onMount(async () => {
    await loadServices();
  });

  $effect(() => {
    const requestedServiceId = page.url.searchParams.get("service") || "";
    if (!requestedServiceId) {
      handledServiceQuery = "";
      serviceLinkNotice = "";
      return;
    }
    if (loading || error || handledServiceQuery === requestedServiceId) return;

    handledServiceQuery = requestedServiceId;
    const requestedService = services.find(
      (service) => recordId(service) === requestedServiceId,
    );
    if (requestedService) {
      serviceLinkNotice = "";
      handleServiceClick(requestedService);
    } else {
      serviceLinkNotice = "The requested service could not be found.";
    }
  });

  // Fetch all services from service
  async function loadServices() {
    if (!browser) return;

    loading = !demoMode;
    error = null;
    serviceLinkNotice = "";

    try {
      const [servicesService, peopleService, attendanceService, followUpCrmService] = await Promise.all([
        import("$lib/services/servicesService"),
        import("$lib/services/peopleService"),
        import("$lib/services/attendanceService"),
        import("$lib/services/followUpCrmService.js"),
      ]);
      const [result, peopleResult, attendanceResult, commitmentResult] = await Promise.all([
        servicesService.getAll(),
        peopleService.getAll(),
        attendanceService.getAll(),
        followUpCrmService.getSundayCommitments(),
      ]);

      if (result.error) throw result.error;
      if (peopleResult.error) throw peopleResult.error;
      if (attendanceResult.error) throw attendanceResult.error;

      services = Array.isArray(result.data) ? result.data : [];
      people = Array.isArray(peopleResult.data) ? peopleResult.data : [];
      attendanceRecords = Array.isArray(attendanceResult.data) ? attendanceResult.data : [];
      sundayCommitments = commitmentResult.error || !Array.isArray(commitmentResult.data) ? [] : commitmentResult.data;
      sundayCommitmentsUnavailable = Boolean(commitmentResult.error);
      usingMockData = demoMode;
    } catch (e) {
      console.warn("Failed to load services:", e);
      if (!demoMode) {
        services = [];
        people = [];
        attendanceRecords = [];
        sundayCommitments = [];
        sundayCommitmentsUnavailable = true;
      }
      usingMockData = demoMode;
      error = e?.message || "The services workspace could not be loaded.";
    } finally {
      loading = false;
    }
  }

  // Sort handler
  function handleSort(key) {
    if (sortKey === key) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDirection = "desc";
    }
  }

  // Open add service modal
  function handleAddService() {
    selectedService = null;
    isFormOpen = true;
  }

  // Open service details modal
  function handleServiceClick(service) {
    selectedService = service;
    isDetailsModalOpen = true;
  }

  // Open individuals modal
  function handleIndividualsClick(service, e) {
    e.stopPropagation();
    selectedService = service;
    isIndividualsModalOpen = true;
  }

  // Open edit service modal from details
  function handleEditFromDetails() {
    isDetailsModalOpen = false;
    isFormOpen = true;
  }

  // Open edit from individuals modal
  function handleEditFromIndividuals() {
    isIndividualsModalOpen = false;
    isFormOpen = true;
  }

  // Open delete confirmation from details
  function handleDeleteFromDetails() {
    isDetailsModalOpen = false;
    isDeleteModalOpen = true;
  }

  // Open edit service modal directly
  function handleEditService(service) {
    selectedService = service;
    isFormOpen = true;
  }

  // Open delete confirmation modal
  function handleDeleteClick(service) {
    selectedService = service;
    isDeleteModalOpen = true;
  }

  // Confirm delete service
  async function handleConfirmDelete() {
    if (!selectedService) return;

    deleting = true;

    try {
      const servicesService = await import("$lib/services/servicesService");
      const result = await servicesService.remove(selectedService.id);

      if (result.error) {
        throw result.error;
      }

      services = services.filter((s) => s.id !== selectedService.id);
      isDeleteModalOpen = false;
      selectedService = null;
    } catch (e) {
      console.error("Error deleting service:", e);
      if (usingMockData) {
        services = services.filter((s) => s.id !== selectedService.id);
        isDeleteModalOpen = false;
        selectedService = null;
      }
    } finally {
      deleting = false;
    }
  }

  // Handle save from form
  function handleSave(savedService) {
    if (selectedService) {
      services = services.map((s) =>
        s.id === savedService.id ? savedService : s,
      );
    } else {
      services = [...services, savedService];
    }
    selectedService = null;
  }

  // Format service data for copying
  function getServiceCopyData(service) {
    return {
      date: formatDate(service.service_date),
      type: formatServiceType(service.service_type),
      topic: service.sermon_topic || "—",
      speaker: service.sermon_speaker || "—",
      attendance: serviceMetrics(service).totalAttendance,
      returningGuests: serviceMetrics(service).returningGuestAttendance,
      firstTimers: serviceMetrics(service).firstTimers,
      decisions: serviceMetrics(service).decisions,
      individuals: Array.isArray(service.individuals)
        ? service.individuals.length
        : 0,
      photos: Array.isArray(service.photos) ? service.photos.length : 0,
    };
  }

  // Get all filtered services for copying
  function getAllServicesCopyData() {
    return filteredServices().map(getServiceCopyData);
  }

</script>

<DashboardLayout>
  {#snippet filters()}
    <FilterBar />
  {/snippet}

  <div class="mb-5 flex flex-col gap-4 pt-1 sm:flex-row sm:items-end sm:justify-between animate-in">
    <div>
      <p class="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Gatherings</p>
      <PageHeader
        title="Sunday Services"
        subtitle="See the health of each service, then record attendance and ministry outcomes."
      />
    </div>

    <Button onclick={handleAddService}>
      <svg
        class="mr-2 h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4v16m8-8H4"
        />
      </svg>
      Record service
    </Button>
  </div>

  <!-- Mock Data Banner -->
  {#if usingMockData}
    <div
      class="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning text-sm flex items-center gap-2 animate-in delay-1"
    >
      <svg
        class="w-5 h-5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span
        >Using demo data. Configure Convex environment variables to connect to
        your database.</span
      >
    </div>
  {/if}

  {#if serviceLinkNotice}
    <div class="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning" role="status">
      {serviceLinkNotice}
    </div>
  {/if}

  <div class="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-2 sm:flex-row sm:items-center animate-in delay-2">
    <div class="grid grid-cols-3 gap-1 rounded-lg bg-secondary/35 p-1" role="tablist" aria-label="Sunday Services views">
      <button
        type="button"
        role="tab"
        aria-selected={activeView === "dashboard"}
        class="rounded-md px-4 py-2 text-sm font-medium transition-colors {activeView === 'dashboard' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => (activeView = "dashboard")}
      >
        Overview
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeView === "memories"}
        class="rounded-md px-4 py-2 text-sm font-medium transition-colors {activeView === 'memories' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => (activeView = "memories")}
      >
        Memories
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeView === "list"}
        class="rounded-md px-4 py-2 text-sm font-medium transition-colors {activeView === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => (activeView = "list")}
      >
        All services
      </button>
    </div>

    <div class="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
      <label for="shared-type-filter" class="sr-only">Filter by service type</label>
      <select
        id="shared-type-filter"
        bind:value={serviceTypeFilter}
        class="min-w-40 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {#each serviceTypeOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      <CopyDropdown data={getAllServicesCopyData()} label="Export" />
      <span class="px-2 text-sm text-muted-foreground">
        {filteredServices().length} {filteredServices().length === 1 ? "service" : "services"}
      </span>
    </div>
  </div>

  <!-- Error State -->
  {#if error}
    <div
      class="p-6 bg-destructive/10 border border-destructive/30 rounded-lg text-center"
    >
      <svg
        class="w-12 h-12 mx-auto mb-4 text-destructive"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <h3 class="text-lg font-semibold text-foreground mb-2">
        Error Loading Services
      </h3>
      <p class="text-muted-foreground mb-4">{error}</p>
      <Button onclick={loadServices}>Retry</Button>
    </div>
  {:else if loading}
    <div class="card-base mb-6 p-8 text-center text-muted-foreground" aria-live="polite">
      <svg class="mx-auto mb-3 h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Loading services...
    </div>
  {:else}
    <!-- SERVICE LIST VIEW -->
    {#if activeView === "list"}
      <!-- Custom Service Table -->
      <div class="card-base overflow-hidden mb-6">
        <!-- Search Bar -->
        <div class="p-3 border-b border-border">
          <div class="relative">
            <svg
              class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Search by topic, speaker, or location..."
              class="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border bg-secondary/30">
                {#if columnVisibility.date}
                  <th class="px-4 py-3 text-left">
                    <button
                      type="button"
                      class="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      aria-label="Sort services by date"
                      onclick={() => handleSort("service_date")}
                    >
                      Date
                      {#if sortKey === "service_date"}
                        <svg
                          class="w-3 h-3 {sortDirection === 'desc'
                            ? ''
                            : 'rotate-180'}"
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
                      {/if}
                    </button>
                  </th>
                {/if}
                {#if columnVisibility.type}
                  <th class="px-4 py-3 text-left">
                    <button
                      type="button"
                      class="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      aria-label="Sort services by type"
                      onclick={() => handleSort("service_type")}
                    >
                      Type
                    </button>
                  </th>
                {/if}
                {#if columnVisibility.topic}
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-muted-foreground"
                    >Topic</th
                  >
                {/if}
                {#if columnVisibility.attendance}
                  <th class="px-4 py-3 text-left">
                    <button
                      type="button"
                      class="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      aria-label="Sort services by attendance"
                      onclick={() => handleSort("total_attendance")}
                    >
                      Attendance
                    </button>
                  </th>
                {/if}
                {#if columnVisibility.guests}
                  <th class="px-4 py-3 text-left">
                    <button
                      type="button"
                      class="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      aria-label="Sort services by returning guest count"
                      onclick={() => handleSort("returning_guests")}
                    >
                      Returning Guests
                    </button>
                  </th>
                {/if}
                {#if columnVisibility.decisions}
                  <th class="px-4 py-3 text-left">
                    <button
                      type="button"
                      class="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      aria-label="Sort services by salvation decisions"
                      onclick={() => handleSort("salvation_decisions")}
                    >
                      Decisions
                    </button>
                  </th>
                {/if}
                {#if columnVisibility.individuals}
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-muted-foreground"
                    >Individuals</th
                  >
                {/if}
                {#if columnVisibility.photos}
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-muted-foreground"
                    >Photos</th
                  >
                {/if}
                <th class="px-2 py-3 text-right">
                  <ColumnFilterDropdown bind:columns={columnVisibility} />
                </th>
              </tr>
            </thead>
            <tbody>
              {#if filteredServices().length === 0}
                <tr>
                  <td
                    colspan="10"
                    class="px-4 py-8 text-center text-muted-foreground"
                  >
                    {services.length === 0
                      ? "No services have been recorded yet. Record your first service to get started."
                      : "No services match the current filters."}
                  </td>
                </tr>
              {:else}
                {#each filteredServices() as service}
                  <tr
                    class="border-b border-border/50 hover:bg-secondary/20 cursor-pointer transition-colors"
                    onclick={() => handleServiceClick(service)}
                  >
                    {#if columnVisibility.date}
                      <td class="px-4 py-3 text-sm text-foreground"
                        >{formatShortDate(service.service_date)}</td
                      >
                    {/if}
                    {#if columnVisibility.type}
                      <td class="px-4 py-3">
                        <button
                          type="button"
                          class="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer"
                          onclick={(e) => {
                            e.stopPropagation();
                            serviceTypeFilter = service.service_type;
                          }}
                        >
                          {formatServiceType(service.service_type)}
                        </button>
                      </td>
                    {/if}
                    {#if columnVisibility.topic}
                      <td class="px-4 py-3 text-sm text-foreground"
                        >{service.sermon_topic || "—"}</td
                      >
                    {/if}
                    {#if columnVisibility.attendance}
                      <td class="px-4 py-3 text-sm text-foreground font-medium"
                        >{serviceMetrics(service).totalAttendance || "—"}</td
                      >
                    {/if}
                    {#if columnVisibility.guests}
                      <td class="px-4 py-3 text-sm text-info"
                        >{serviceMetrics(service).returningGuestAttendance || "—"}</td
                      >
                    {/if}
                    {#if columnVisibility.decisions}
                      <td class="px-4 py-3 text-sm text-success"
                        >{serviceMetrics(service).decisions || "—"}</td
                      >
                    {/if}
                    {#if columnVisibility.individuals}
                      <td class="px-4 py-3">
                        {#if Array.isArray(service.individuals) && service.individuals.length > 0}
                          <button
                            type="button"
                            class="flex items-center gap-1 text-sm text-primary hover:underline"
                            aria-label="View {service.individuals.length} individual attendees for {formatShortDate(service.service_date)}"
                            onclick={(e) => handleIndividualsClick(service, e)}
                          >
                            <div class="flex -space-x-1">
                              {#each service.individuals.slice(0, 3) as attendee}
                                {@const person = getPersonById(attendee)}
                                {#if person}
                                  <div
                                    class="w-6 h-6 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-[10px] font-medium text-primary"
                                  >
                                    {person.first_name?.[0] || ""}{person.last_name?.[0] || ""}
                                  </div>
                                {/if}
                              {/each}
                              {#if service.individuals.length > 3}
                                <div
                                  class="w-6 h-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] font-medium text-muted-foreground"
                                >
                                  +{service.individuals.length - 3}
                                </div>
                              {/if}
                            </div>
                            <span class="ml-1"
                              >{service.individuals.length}</span
                            >
                          </button>
                        {:else}
                          <span class="text-sm text-muted-foreground">—</span>
                        {/if}
                      </td>
                    {/if}
                    {#if columnVisibility.photos}
                      <td class="px-4 py-3">
                        {#if Array.isArray(service.photos) && service.photos.length > 0}
                          <div class="flex -space-x-2">
                            {#each service.photos.slice(0, 3) as photo, i}
                              <img
                                src={photo}
                                alt="Service photo {i + 1}"
                                class="w-8 h-8 rounded-md object-cover border-2 border-card"
                              />
                            {/each}
                            {#if service.photos.length > 3}
                              <div
                                class="w-8 h-8 rounded-md bg-secondary border-2 border-card flex items-center justify-center text-xs font-medium text-muted-foreground"
                              >
                                +{service.photos.length - 3}
                              </div>
                            {/if}
                          </div>
                        {:else}
                          <span class="text-sm text-muted-foreground">—</span>
                        {/if}
                      </td>
                    {/if}
                    <td class="px-2 py-3">
                      <div class="flex items-center justify-end gap-1">
                        <CopyButton
                          data={getServiceCopyData(service)}
                          format="json"
                          label="Copy"
                        />
                      </div>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>

      <!-- MEMORIES VIEW -->
    {:else if activeView === "memories"}
      <ServiceMemories
        services={filteredServices()}
        onOpen={handleServiceClick}
        onEdit={handleEditService}
      />

      <!-- DASHBOARD VIEW -->
    {:else if activeView === "dashboard"}
      <div class="space-y-6">
        {#if filteredServices().length === 0}
          <section class="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 class="mt-4 text-lg font-semibold text-foreground">{services.length === 0 ? "No services recorded yet" : "No services in this period"}</h2>
            <p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{services.length === 0 ? "Record the first service when attendance is ready." : "Change the date or service-type filter to see other recorded services."}</p>
            {#if services.length === 0}
              <div class="mt-5"><Button onclick={handleAddService}>Record service</Button></div>
            {/if}
          </section>
        {:else}
          <section class="overflow-hidden rounded-2xl border border-border bg-card" aria-labelledby="period-overview-title">
            <div class="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 id="period-overview-title" class="text-sm font-semibold text-foreground">This period</h2>
                <p class="mt-1 text-xs text-muted-foreground">Across {kpis().serviceCount} recorded {kpis().serviceCount === 1 ? "service" : "services"}.</p>
              </div>
              {#if latestService()}
                <button type="button" class="text-xs font-semibold text-primary hover:underline" onclick={() => handleServiceClick(latestService())}>
                  Latest: {formatShortDate(latestService().service_date)}
                </button>
              {/if}
            </div>
            <div class="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div class="px-5 py-5">
                <p class="text-xs font-medium text-muted-foreground">Latest attendance</p>
                <p class="mt-3 text-3xl font-semibold tracking-tight text-foreground">{serviceMetrics(latestService()).totalAttendance}</p>
                <p class="mt-1 text-xs text-muted-foreground">{formatShortDate(latestService().service_date)}</p>
              </div>
              <div class="px-5 py-5">
                <p class="text-xs font-medium text-muted-foreground">First-timer visits</p>
                <p class="mt-3 text-3xl font-semibold tracking-tight text-foreground">{kpis().totalFirstTimers}</p>
                <p class="mt-1 text-xs text-muted-foreground">Period total</p>
              </div>
              <div class="px-5 py-5">
                <p class="text-xs font-medium text-muted-foreground">Salvation decisions</p>
                <p class="mt-3 text-3xl font-semibold tracking-tight text-foreground">{kpis().totalDecisions}</p>
                <p class="mt-1 text-xs text-muted-foreground">Period total</p>
              </div>
            </div>
          </section>

          <section class="min-w-0" aria-label="Attendance trend">
            <div class="relative min-w-0">
              <FullscreenWrapper title="Attendance trend">
                {#snippet filters()}
                  <FilterBar compact />
                {/snippet}
                <AttendanceTrend
                  data={trendData()}
                  title="Attendance trend"
                  itemLabel="services"
                  periodLabel={$dateRange.label}
                  wholeNumberValues={true}
                  showSummaryFooter={false}
                  onPointClick={handleChartPointClick}
                  comparisonOptions={[
                    { key: "returningGuests", label: "Returning guests", color: "warning" },
                    { key: "decisions", label: "Salvation decisions", color: "success" },
                    { key: "firstTimers", label: "First-timer visits", color: "warning" },
                    { key: "tithers", label: "Tithers", color: "warning" },
                  ]}
                />
              </FullscreenWrapper>
            </div>
          </section>

          <section class="overflow-hidden rounded-2xl border border-border bg-card" aria-labelledby="recent-services-title">
            <div class="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 id="recent-services-title" class="text-sm font-semibold text-foreground">Recent services</h2>
                <p class="mt-1 text-xs text-muted-foreground">Open a service to review attendance, people and photos.</p>
              </div>
              <button type="button" class="text-xs font-semibold text-primary hover:underline" onclick={() => (activeView = "list")}>View all services</button>
            </div>

            <div class="divide-y divide-border">
              {#each recentServices() as service}
                <button type="button" class="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/25 sm:grid-cols-[150px_minmax(0,1fr)_auto]" onclick={() => handleServiceClick(service)}>
                  <div>
                    <p class="text-sm font-medium text-foreground">{formatShortDate(service.service_date)}</p>
                    <p class="mt-1 text-xs text-muted-foreground">{formatServiceType(service.service_type)}</p>
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">{service.sermon_topic || "Untitled service"}</p>
                    <p class="mt-1 truncate text-xs text-muted-foreground">{service.sermon_speaker || "Speaker not recorded"}{service.location ? " · " + service.location : ""}</p>
                  </div>
                  <div class="col-span-2 flex items-center justify-end text-muted-foreground sm:col-span-1">
                    <span class="sr-only">Open service details</span>
                    <svg class="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>
              {/each}
            </div>
          </section>

          <details class="group overflow-hidden rounded-2xl border border-border bg-card">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 outline-none transition-colors hover:bg-secondary/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
              <span>
                <span class="block text-sm font-semibold text-foreground">Detailed attendance &amp; outcomes</span>
                <span class="mt-1 block text-xs text-muted-foreground">Compare services, explore attendance mix and review outcomes.</span>
              </span>
              <span class="flex shrink-0 items-center gap-2 text-xs font-semibold text-primary">
                <span class="group-open:hidden">Show details</span>
                <span class="hidden group-open:inline">Hide details</span>
                <svg class="h-4 w-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m6 9 6 6 6-6" /></svg>
              </span>
            </summary>
            <div class="space-y-6 border-t border-border p-4 sm:p-5">
              {#if highestService()}
                <button type="button" class="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-secondary/35" onclick={() => handleServiceClick(highestService())}>
                  <span>
                    <span class="block text-xs text-muted-foreground">Highest attended service</span>
                    <span class="mt-1 block text-sm font-medium text-foreground">{formatShortDate(highestService().service_date)} · {highestService().sermon_topic || "Service"}</span>
                  </span>
                  <span class="shrink-0 text-sm font-semibold text-primary">Open service →</span>
                </button>
              {/if}
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <FullscreenWrapper title="Attendance & outcomes" class={typeDistribution().typeEntries.length <= 1 ? 'lg:col-span-2' : ''}>
            <section class="card-base p-5" aria-labelledby="attendance-mix-title">
              <div>
                <h2 id="attendance-mix-title" class="pr-12 text-base font-semibold text-foreground">Attendance &amp; outcomes</h2>
                <p class="mt-1 text-xs text-muted-foreground">Average attendance per gathering. Members, returning guests and first timers are shown as separate groups.</p>
              </div>


              <div class="mt-4"><MetricComparison wholeNumberAverages={true} metrics={[
                {key:'attendance',label:'Attendance',total:kpis().totalAttendance},
                {key:'returning',label:'Returning guest visits',total:kpis().totalReturningGuests},
                {key:'first',label:'First timers',total:kpis().totalFirstTimers},
                {key:'decisions',label:'Salvation decisions',total:kpis().totalDecisions},
                {key:'tithers',label:'Tither attendances',total:kpis().totalTithers},
              ].map(metric=>({...metric,denominator:kpis().serviceCount,averageLabel:'Average per service'}))} periodLabel={$dateRange.label} /></div>
              <div class="mt-5 flex flex-col items-center gap-6 sm:flex-row">
                <button type="button" onclick={() => chartDetail = {title: 'Attendance mix', subtitle: $dateRange.label, metrics: [{label:'Average members per gathering',value:wholePerson(donutData().members)},{label:'Average returning guests per gathering',value:wholePerson(donutData().returningGuests)},{label:'Average first timers per gathering',value:wholePerson(donutData().firstTimers)},{label:'Average tithers per gathering (subset of members)',value:wholePerson(donutData().tithers)}]}} class="relative h-36 w-36 shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label="View average attendance mix details: {donutData().memberPct}% members, {donutData().returningGuestPct}% returning guests, {donutData().firstTimerPct}% first timers, and {donutData().titherRate}% tither attendances among members">
                  <svg viewBox="0 0 36 36" class="h-full w-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" stroke-width="3" class="text-secondary" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" stroke-width="3" class="text-primary" style="opacity: {attendanceRingVisibility.members ? 1 : 0}; stroke-dasharray: {attendanceRingVisibility.members ? `${donutData().memberPct} ${100 - donutData().memberPct}` : '0 100'}; transition: stroke-dasharray 420ms ease, opacity 260ms ease;" stroke-linecap="round" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" stroke-width="3" class="text-info" style="opacity: {attendanceRingVisibility.guests ? 1 : 0}; stroke-dasharray: {attendanceRingVisibility.guests ? `${donutData().returningGuestPct} ${100 - donutData().returningGuestPct}` : '0 100'}; transition: stroke-dasharray 420ms ease, opacity 260ms ease;" stroke-dashoffset="-{donutData().memberPct}" stroke-linecap="round" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" stroke-width="3" class="text-success" style="opacity: {attendanceRingVisibility.firstTimers ? 1 : 0}; stroke-dasharray: {attendanceRingVisibility.firstTimers ? `${donutData().firstTimerPct} ${100 - donutData().firstTimerPct}` : '0 100'}; transition: stroke-dasharray 420ms ease, opacity 260ms ease;" stroke-dashoffset="-{donutData().memberPct + donutData().returningGuestPct}" stroke-linecap="round" />
                    <circle cx="18" cy="18" r="11.5" fill="none" stroke="currentColor" stroke-width="2.5" class="text-secondary" pathLength="100" />
                    <circle cx="18" cy="18" r="11.5" fill="none" stroke="currentColor" stroke-width="2.5" class="text-warning" pathLength="100" style="opacity: {attendanceRingVisibility.tithers ? 1 : 0}; stroke-dasharray: {attendanceRingVisibility.tithers ? `${donutData().titherRate} ${100 - donutData().titherRate}` : '0 100'}; transition: stroke-dasharray 420ms ease, opacity 260ms ease;" stroke-linecap="round" />
                  </svg>
                  <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span class="text-xl font-semibold text-foreground">{wholePerson(donutData().total)}</span>
                    <span class="text-center text-[9px] uppercase leading-tight tracking-wide text-muted-foreground">avg / gathering</span>
                  </div>
                </button>
                <div class="w-full space-y-2">
                  <button type="button" aria-pressed={attendanceRingVisibility.members} class="flex w-full items-center justify-between gap-4 rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary/35 {attendanceRingVisibility.members ? '' : 'opacity-45'}" onclick={() => toggleAttendanceRing('members')}>
                    <span class="flex items-center gap-2 text-sm text-foreground"><span class="h-2.5 w-2.5 rounded-full bg-primary"></span>Avg members / gathering</span>
                    <span class="text-sm font-semibold text-foreground">{wholePerson(donutData().members)} <span class="font-normal text-muted-foreground">({donutData().memberPct}%)</span></span>
                  </button>
                  <button type="button" aria-pressed={attendanceRingVisibility.guests} class="flex w-full items-center justify-between gap-4 rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary/35 {attendanceRingVisibility.guests ? '' : 'opacity-45'}" onclick={() => toggleAttendanceRing('guests')}>
                    <span class="flex items-center gap-2 text-sm text-foreground"><span class="h-2.5 w-2.5 rounded-full bg-info"></span>Avg returning guests / gathering</span>
                    <span class="text-sm font-semibold text-foreground">{wholePerson(donutData().returningGuests)} <span class="font-normal text-muted-foreground">({donutData().returningGuestPct}%)</span></span>
                  </button>
                  <button type="button" aria-pressed={attendanceRingVisibility.firstTimers} class="flex w-full items-center justify-between gap-4 rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary/35 {attendanceRingVisibility.firstTimers ? '' : 'opacity-45'}" onclick={() => toggleAttendanceRing('firstTimers')}>
                    <span class="flex items-center gap-2 text-sm text-foreground"><span class="h-2.5 w-2.5 rounded-full bg-success"></span>Avg first timers / gathering</span>
                    <span class="text-sm font-semibold text-foreground">{wholePerson(donutData().firstTimers)} <span class="font-normal text-muted-foreground">({donutData().firstTimerPct}%)</span></span>
                  </button>
                  <button type="button" aria-pressed={attendanceRingVisibility.tithers} class="flex w-full items-center justify-between gap-4 rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary/35 {attendanceRingVisibility.tithers ? '' : 'opacity-45'}" onclick={() => toggleAttendanceRing('tithers')}>
                    <span class="flex items-center gap-2 text-sm text-foreground"><span class="h-2.5 w-2.5 rounded-full bg-warning"></span>Avg tithers / gathering <span class="text-[10px] text-muted-foreground">inner ring</span></span>
                    <span class="text-sm font-semibold text-foreground">{wholePerson(donutData().tithers)} <span class="font-normal text-muted-foreground">({donutData().titherRate}% of member attendance)</span></span>
                  </button>
                  <p class="px-2 text-[11px] text-muted-foreground">Attendance averages are rounded to the nearest whole person for display; recorded totals remain exact. Tithers remain a subset of member attendance.</p>
                </div>
              </div>

              <div class="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4">
                <button type="button" class="rounded-xl bg-secondary/25 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary" onclick={() => openOutcomeModal('decisions')}>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs text-muted-foreground">Salvation decisions</span>
                    <span class="h-2 w-2 rounded-full bg-success"></span>
                  </div>
                  <p class="mt-2 text-2xl font-semibold text-foreground">{kpis().totalDecisions}</p>
                  <p class="mt-1 text-[11px] text-muted-foreground">{kpis().decisionRate}% of attendances</p>
                  <span class="mt-2 block text-[10px] font-semibold text-primary">View service breakdown →</span>
                </button>
                <button type="button" class="rounded-xl bg-secondary/25 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary" onclick={() => openOutcomeModal('tithers')}>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs text-muted-foreground">Tither attendances · period total</span>
                    <span class="h-2 w-2 rounded-full bg-warning"></span>
                  </div>
                  <p class="mt-2 text-2xl font-semibold text-foreground">{kpis().totalTithers}</p>
                  <p class="mt-1 text-[11px] text-muted-foreground">{kpis().titherRate}% of member attendance</p>
                  <span class="mt-2 block text-[10px] font-semibold text-primary">View service breakdown →</span>
                </button>
              </div>
            </section></FullscreenWrapper>

            {#if typeDistribution().typeEntries.length > 1}
            <FullscreenWrapper title="Service mix">
            <section class="rounded-2xl border border-border bg-card p-5" aria-labelledby="service-mix-title">
              <div>
                <h2 id="service-mix-title" class="pr-12 text-base font-semibold text-foreground">Service mix</h2>
                <p class="mt-1 text-xs text-muted-foreground">How the selected period is distributed by gathering type.</p>
              </div>
              <div class="mt-5 space-y-4">
                {#each typeDistribution().typeEntries as [type, count]}
                  {@const pct = Math.round((count / Math.max(typeDistribution().total, 1)) * 100)}
                  <button type="button" class="w-full rounded-lg text-left outline-none transition-colors hover:bg-secondary/30 focus-visible:ring-2 focus-visible:ring-primary" onclick={() => chartDetail = {title: formatServiceType(type), subtitle: $dateRange.label, metrics: [{label:"Gatherings",value:count},{label:"Share of selected period",value:`${pct}%`}]}}>
                    <span class="mb-2 flex items-center justify-between text-sm">
                      <span class="font-medium text-foreground">{formatServiceType(type)}</span>
                      <span class="text-muted-foreground">{count} · {pct}%</span>
                    </span>
                    <span class="block h-2 overflow-hidden rounded-full bg-secondary">
                      <span class="block h-full rounded-full {type === 'sunday_service' ? 'bg-primary' : type === 'midweek_service' ? 'bg-info' : 'bg-warning'}" style="width: {pct}%"></span>
                    </span>
                  </button>
                {/each}
              </div>
            </section></FullscreenWrapper>
            {/if}
          </div>
            </div>
          </details>

          <details class="overflow-hidden rounded-2xl border border-border bg-card">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 outline-none transition-colors hover:bg-secondary/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
              <span>
                <span class="block text-sm font-semibold text-foreground">Individual attendance detail</span>
                <span class="mt-1 block text-xs text-muted-foreground">Open the attendance matrix when you need person-by-person history.</span>
              </span>
              <span class="text-xs font-semibold text-primary">Show matrix</span>
            </summary>
            <div class="border-t border-border p-4">
              <FullscreenWrapper title="Weekly attendance by person">
                <WeeklyAttendanceMatrix services={services} {people} commitments={sundayCommitments} commitmentsUnavailable={sundayCommitmentsUnavailable} maxServices={24} initialServiceCount={16} onServiceClick={handleServiceClick} />
              </FullscreenWrapper>
            </div>
          </details>
        {/if}
      </div>
    {/if}
  {/if}
</DashboardLayout>

<Modal bind:isOpen={isOutcomeModalOpen} title={outcomeModalData().title} size="md">
  <div class="space-y-4">
    <div class="rounded-xl border border-primary/20 bg-primary/10 p-4">
      <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected period total</p>
      <p class="mt-1 text-3xl font-semibold text-foreground">{outcomeModalData().total}</p>
    </div>
    <div>
      <h3 class="mb-2 text-sm font-semibold text-foreground">Service breakdown</h3>
      {#if outcomeModalData().rows.length}
        <div class="max-h-[360px] divide-y divide-border overflow-y-auto rounded-xl border border-border">
          {#each outcomeModalData().rows as row (row.service.id)}
            <button
              type="button"
              class="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary/35"
              onclick={() => {
                isOutcomeModalOpen = false;
                handleServiceClick(row.service);
              }}
            >
              <span class="min-w-0">
                <span class="block text-sm font-medium text-foreground">{formatShortDate(row.service.service_date)}</span>
                <span class="mt-0.5 block truncate text-xs text-muted-foreground">{row.service.sermon_topic || formatServiceType(row.service.service_type)}</span>
              </span>
              <span class="flex items-center gap-2 text-lg font-semibold {selectedOutcome === 'tithers' ? 'text-warning' : 'text-success'}">
                {row.count}
                <svg class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 5 7 7-7 7" /></svg>
              </span>
            </button>
          {/each}
        </div>
      {:else}
        <p class="rounded-xl border border-border p-5 text-sm text-muted-foreground">No services match the selected period.</p>
      {/if}
    </div>
  </div>
</Modal>

<!-- Service Details Modal -->
<Modal bind:isOpen={isDetailsModalOpen} title="Service Details" size="lg">
  {#if selectedService}
    <div class="space-y-4">
      <!-- Date and Type -->
      <div class="flex items-center gap-4">
        <div
          class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div>
          <div class="text-lg font-semibold text-foreground">
            {formatDate(selectedService.service_date)}
          </div>
          <div class="text-sm text-muted-foreground">
            {formatServiceType(selectedService.service_type)}
            {#if selectedService.service_time}
              • {selectedService.service_time}{/if}
          </div>
        </div>
      </div>

      <!-- Sermon Info -->
      {#if selectedService.sermon_topic || selectedService.sermon_speaker}
        <div class="p-4 bg-secondary/30 rounded-lg">
          <h4 class="text-sm font-medium text-muted-foreground mb-2">Sermon</h4>
          {#if selectedService.sermon_topic}
            <div class="text-foreground font-medium">
              {selectedService.sermon_topic}
            </div>
          {/if}
          {#if selectedService.sermon_speaker}
            <div class="text-sm text-muted-foreground">
              by {selectedService.sermon_speaker}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div class="p-3 bg-secondary/20 rounded-lg text-center">
          <div class="text-2xl font-bold text-foreground">
            {serviceMetrics(selectedService).totalAttendance}
          </div>
          <div class="text-xs text-muted-foreground">Attendance</div>
        </div>
        <div class="p-3 bg-secondary/20 rounded-lg text-center">
          <div class="text-2xl font-bold text-info">
            {serviceMetrics(selectedService).returningGuestAttendance}
          </div>
          <div class="text-xs text-muted-foreground">Returning guests</div>
        </div>
        <div class="p-3 bg-secondary/20 rounded-lg text-center">
          <div class="text-2xl font-bold text-info">
            {serviceFirstTimerCount(selectedService)}
          </div>
          <div class="text-xs text-muted-foreground">First-timer visits</div>
        </div>
        <div class="p-3 bg-secondary/20 rounded-lg text-center">
          <div class="text-2xl font-bold text-success">
            {serviceMetrics(selectedService).decisions}
          </div>
          <div class="text-xs text-muted-foreground">Decisions</div>
        </div>
        <div class="p-3 bg-secondary/20 rounded-lg text-center">
          <div class="text-2xl font-bold text-primary">
            {Array.isArray(selectedService.individuals)
              ? selectedService.individuals.length
              : 0}
          </div>
          <div class="text-xs text-muted-foreground">Individuals</div>
        </div>
      </div>

      <!-- Individuals List -->
      {#if Array.isArray(selectedService.individuals) && selectedService.individuals.length > 0}
        <div>
          <h4 class="text-sm font-medium text-muted-foreground mb-3">
            Individual Attendance ({selectedService.individuals.length})
          </h4>
          <div class="flex flex-wrap gap-2">
            {#each getServiceIndividuals(selectedService) as person}
              <a
                href="/people/{person.id}"
                class="flex items-center gap-2 px-3 py-1.5 {person.first_timer ? 'bg-success/10 border border-success/40' : 'bg-secondary/30'} rounded-full hover:bg-secondary/50 transition-colors group"
                onclick={(e) => e.stopPropagation()}
              >
                <div
                  class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary"
                >
                  {person.first_name?.[0] || ""}{person.last_name?.[0] || ""}
                </div>
                <span
                  class="text-sm text-foreground group-hover:text-primary group-hover:underline"
                  >{person.first_name} {person.last_name}</span
                >
                {#if person.first_timer}<span class="text-xs font-medium text-success">First-timer visit</span>{/if}
              </a>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Photo Gallery -->
      {#if Array.isArray(selectedService.photos) && selectedService.photos.length > 0}
        <div>
          <h4 class="text-sm font-medium text-muted-foreground mb-3">
            Photos ({selectedService.photos.length})
          </h4>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {#each selectedService.photos as photo, i}
              <div class="aspect-video rounded-lg overflow-hidden bg-secondary">
                <img
                  src={photo.replace("w=100&h=100", "w=400&h=300")}
                  alt="Service photo {i + 1}"
                  class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Copy Data -->
      <div class="flex justify-end">
        <CopyButton
          data={getServiceCopyData(selectedService)}
          format="json"
          label="Copy service data"
          showLabel
        />
      </div>
    </div>
  {/if}

  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isDetailsModalOpen = false)}
      >Close</Button
    >
    <Button variant="secondary" onclick={handleEditFromDetails}>
      <svg
        class="w-4 h-4 mr-1.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
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
    <Button variant="danger" onclick={handleDeleteFromDetails}>
      <svg
        class="w-4 h-4 mr-1.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
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
  {/snippet}
</Modal>

<!-- Individuals Modal (Edit Attendance) -->
<Modal
  bind:isOpen={isIndividualsModalOpen}
  title="Individual Attendance"
  size="md"
>
  {#if selectedService}
    <div class="space-y-4">
      <div class="p-3 bg-secondary/20 rounded-lg">
        <div class="text-sm text-muted-foreground">Service</div>
        <div class="font-medium text-foreground">
          {formatDate(selectedService.service_date)} - {formatServiceType(
            selectedService.service_type,
          )}
        </div>
      </div>

      <div>
        <h4 class="text-sm font-medium text-muted-foreground mb-3">
          Attendees ({Array.isArray(selectedService.individuals)
            ? selectedService.individuals.length
            : 0})
        </h4>

        {#if Array.isArray(selectedService.individuals) && selectedService.individuals.length > 0}
          <div class="space-y-2 max-h-[300px] overflow-y-auto">
            {#each getServiceIndividuals(selectedService) as person}
              <a
                href="/people/{person.id}"
                class="flex items-center justify-between p-3 {person.first_timer ? 'bg-success/10 border border-success/40' : 'bg-secondary/20'} rounded-lg hover:bg-secondary/40 transition-colors group"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary"
                  >
                    {person.first_name?.[0] || ""}{person.last_name?.[0] || ""}
                  </div>
                  <div>
                    <div
                      class="font-medium text-foreground group-hover:text-primary group-hover:underline"
                    >
                      {person.first_name}
                      {person.last_name}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {person.member_status}
                    </div>
                    {#if person.first_timer}<span class="text-xs font-medium text-success">First-timer visit</span>{/if}
                  </div>
                </div>
              </a>
            {/each}
          </div>
        {:else}
          <div class="p-6 text-center text-muted-foreground">
            No individual attendance recorded for this service.
          </div>
        {/if}
      </div>

      <p class="text-sm text-muted-foreground">
        To edit individual attendance, use the Edit button below to open the
        full service form.
      </p>
    </div>
  {/if}

  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isIndividualsModalOpen = false)}
      >Close</Button
    >
    <Button onclick={handleEditFromIndividuals}>
      <svg
        class="w-4 h-4 mr-1.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
      Edit Attendance
    </Button>
  {/snippet}
</Modal>

<!-- Service Form Modal -->
<ServiceForm
  bind:isOpen={isFormOpen}
  service={selectedService}
  onsave={handleSave}
/>

<!-- Delete Confirmation Modal -->
<Modal bind:isOpen={isDeleteModalOpen} title="Delete Service" size="sm">
  <div class="text-center">
    <div
      class="w-12 h-12 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center"
    >
      <svg
        class="w-6 h-6 text-destructive"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>
    <p class="text-foreground mb-2">
      Are you sure you want to delete the service from <strong
        >{selectedService
          ? formatDate(selectedService.service_date)
          : ""}</strong
      >?
    </p>
    <p class="text-sm text-muted-foreground">Named check-ins and linked plans will be removed; matching commitments and open gathering tasks will be cancelled. A recovery snapshot is retained for an administrator.</p>
  </div>

  {#snippet footer()}
    <Button
      variant="secondary"
      onclick={() => (isDeleteModalOpen = false)}
      disabled={deleting}>Cancel</Button
    >
    <Button variant="danger" onclick={handleConfirmDelete} disabled={deleting}>
      {#if deleting}Deleting...{:else}Delete{/if}
    </Button>
  {/snippet}
</Modal>

<ChartPointDetails bind:detail={chartDetail} />
