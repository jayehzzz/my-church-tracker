<!--
  Sunday Services Page
  Track and manage church service attendance and schedules.
  
  Features:
  - Dual views: Service List View and Dashboard View
  - KPI Cards (Total Attended, Guests, Salvation Decisions, Attendance Rate)
  - Custom table with photo thumbnails and individual names
  - Service Details Modal with Edit/Delete actions
  - Global filters that persist across views
  - Dashboard fullscreen mode
  - Copy functionality for charts and data
  - Column filter dropdown in table header
-->

<script>
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
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
  import KPICard from "$lib/components/dashboard/KPICard.svelte";
  import ServiceForm from "$lib/components/forms/ServiceForm.svelte";

  // Import filter store for reactive date range
  import { dateRange } from "$lib/stores/filterStore";

  // Import chart components
  import AttendanceTrend from "$lib/components/charts/AttendanceTrend.svelte";

  // Import centralized mock data
  import {
    mockPeople,
    mockServices as centralMockServices,
    getPersonById as getCentralPersonById,
    getServiceIndividuals,
  } from "$lib/data/mockData";

  // State
  let services = $state([]);
  let loading = $state(true);
  let error = $state(null);

  // View state: 'list' or 'dashboard'
  let activeView = $state("list");

  // Filter state
  let serviceTypeFilter = $state("all");

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
  let selectedService = $state(null);
  let deleting = $state(false);

  // Track if using mock data
  let usingMockData = $state(false);

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

  // People data now imported from centralized mockData

  // Mock data for development when Convex is not configured
  const mockServices = [
    {
      id: "1",
      service_date: "2025-12-15",
      service_type: "sunday_service",
      service_time: "09:00",
      location: "Main Sanctuary",
      sermon_topic: "Walking in Faith",
      sermon_speaker: "Pastor John",
      total_attendance: 145,
      guests_count: 12,
      salvation_decisions: 3,
      tithers_count: 45,
      individuals: ["p1", "p2", "p3", "p4", "p5", "p6", "p7"],
      photos: [
        "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=100&h=100&fit=crop",
        "https://images.unsplash.com/photo-1519491050282-cf00c82424cb?w=100&h=100&fit=crop",
        "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=100&h=100&fit=crop",
      ],
    },
    {
      id: "2",
      service_date: "2025-12-08",
      service_type: "sunday_service",
      service_time: "09:00",
      location: "Main Sanctuary",
      sermon_topic: "The Power of Prayer",
      sermon_speaker: "Pastor John",
      total_attendance: 138,
      guests_count: 8,
      salvation_decisions: 2,
      tithers_count: 42,
      individuals: ["p1", "p2", "p4", "p6", "p9", "p10"],
      photos: [
        "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=100&h=100&fit=crop",
      ],
    },
    {
      id: "3",
      service_date: "2025-12-11",
      service_type: "midweek_service",
      service_time: "19:00",
      location: "Fellowship Hall",
      sermon_topic: "Midweek Renewal",
      sermon_speaker: "Associate Pastor",
      total_attendance: 65,
      guests_count: 3,
      salvation_decisions: 1,
      tithers_count: 20,
      individuals: ["p1", "p3", "p7"],
      photos: [],
    },
    {
      id: "4",
      service_date: "2025-12-01",
      service_type: "sunday_service",
      service_time: "09:00",
      location: "Main Sanctuary",
      sermon_topic: "Preparing for Advent",
      sermon_speaker: "Pastor John",
      total_attendance: 152,
      guests_count: 15,
      salvation_decisions: 4,
      tithers_count: 48,
      individuals: ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"],
      photos: [
        "https://images.unsplash.com/photo-1545987796-200677ee1011?w=100&h=100&fit=crop",
        "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=100&h=100&fit=crop",
      ],
    },
    {
      id: "5",
      service_date: "2025-11-24",
      service_type: "sunday_service",
      service_time: "09:00",
      location: "Main Sanctuary",
      sermon_topic: "Thanksgiving Praise",
      sermon_speaker: "Pastor John",
      total_attendance: 168,
      guests_count: 22,
      salvation_decisions: 5,
      tithers_count: 52,
      individuals: [
        "p1",
        "p2",
        "p3",
        "p4",
        "p5",
        "p6",
        "p7",
        "p8",
        "p9",
        "p10",
      ],
      photos: [
        "https://images.unsplash.com/photo-1510590337019-5ef8d3d32116?w=100&h=100&fit=crop",
        "https://images.unsplash.com/photo-1478147427282-58a87a120781?w=100&h=100&fit=crop",
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=100&h=100&fit=crop",
        "https://images.unsplash.com/photo-1571566882372-1598d88abd90?w=100&h=100&fit=crop",
      ],
    },
  ];

  // Get person by ID - use centralized function
  function getPersonById(id) {
    return getCentralPersonById(id);
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
    return date.toLocaleDateString("en-US", {
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
    return date.toLocaleDateString("en-US", {
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
      let aVal = a[sortKey];
      let bVal = b[sortKey];

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

  // Calculate KPIs based on filtered data
  const kpis = $derived(() => {
    const filtered = filteredServices();
    const totalAttendance = filtered.reduce(
      (sum, s) => sum + (s.total_attendance || 0),
      0,
    );
    const totalGuests = filtered.reduce(
      (sum, s) => sum + (s.guests_count || 0),
      0,
    );
    const totalDecisions = filtered.reduce(
      (sum, s) => sum + (s.salvation_decisions || 0),
      0,
    );
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
      filtered.length > 0 ? Math.round(totalAttendance / filtered.length) : 0;

    return {
      totalAttendance,
      totalGuests,
      totalDecisions,
      totalIndividuals,
      totalPhotos,
      avgAttendance,
      serviceCount: filtered.length,
    };
  });

  // Attendance trend data for chart
  const trendData = $derived(() => {
    const filtered = filteredServices();
    return filtered
      .sort((a, b) => new Date(a.service_date) - new Date(b.service_date))
      .slice(-12)
      .map((s) => ({
        date: s.service_date,
        total: s.total_attendance || 0,
        guests: s.guests_count || 0,
        members: (s.total_attendance || 0) - (s.guests_count || 0),
      }));
  });

  // Dashboard insights - sorted services by attendance
  const sortedByAttendance = $derived(() => {
    return [...filteredServices()].sort(
      (a, b) => (b.total_attendance || 0) - (a.total_attendance || 0),
    );
  });

  const highestService = $derived(() => sortedByAttendance()[0]);
  const lowestService = $derived(
    () => sortedByAttendance()[sortedByAttendance().length - 1],
  );

  const recentDecisions = $derived(() => {
    return filteredServices()
      .slice(0, 3)
      .reduce((sum, s) => sum + (s.salvation_decisions || 0), 0);
  });

  // Donut chart data
  const donutData = $derived(() => {
    const members = kpis().totalAttendance - kpis().totalGuests;
    const guests = kpis().totalGuests;
    const total = members + guests || 1;
    const memberPct = Math.round((members / total) * 100);
    const guestPct = 100 - memberPct;
    return { members, guests, total, memberPct, guestPct };
  });

  // Service type distribution
  const typeDistribution = $derived(() => {
    const typeCounts = filteredServices().reduce((acc, s) => {
      const type = s.service_type || "unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    const maxCount = Math.max(...Object.values(typeCounts), 1);
    return { typeCounts, typeEntries, maxCount };
  });

  // Top attendees leaderboard
  const topAttendees = $derived(() => {
    const attendeeCounts = {};
    filteredServices().forEach((service) => {
      if (Array.isArray(service.individuals)) {
        service.individuals.forEach((personId) => {
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

  // Fetch all services from service
  async function loadServices() {
    if (!browser) return;

    loading = true;
    error = null;

    try {
      const servicesService = await import("$lib/services/servicesService");
      const result = await servicesService.getAll();

      if (result.error) {
        throw result.error;
      }
      services = result.data || [];
      usingMockData = false;
    } catch (e) {
      console.warn("Failed to load from Convex, using mock data:", e.message);
      services = centralMockServices;
      usingMockData = true;
      error = null;
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
      attendance: service.total_attendance || 0,
      guests: service.guests_count || 0,
      decisions: service.salvation_decisions || 0,
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

  // Get chart data for copying
  function getChartCopyData() {
    return trendData();
  }
</script>

<DashboardLayout>
  {#snippet filters()}
    <FilterBar />
  {/snippet}

  <!-- Page Header with Add Button -->
  <div
    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-in"
  >
    <PageHeader
      title="Sunday Services"
      subtitle="Track and manage church service attendance and schedules"
    />

    <Button onclick={handleAddService}>
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
          d="M12 4v16m8-8H4"
        />
      </svg>
      Add Service
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

  <!-- View Toggle Tabs -->
  <div
    class="mb-6 flex items-center gap-1 p-1 bg-secondary/30 rounded-lg w-fit animate-in delay-2"
  >
    <button
      type="button"
      class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 {activeView ===
      'list'
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}"
      onclick={() => (activeView = "list")}
    >
      <svg
        class="w-4 h-4 inline-block mr-1.5 -mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 10h16M4 14h16M4 18h16"
        />
      </svg>
      Service List
    </button>
    <button
      type="button"
      class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 {activeView ===
      'dashboard'
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}"
      onclick={() => (activeView = "dashboard")}
    >
      <svg
        class="w-4 h-4 inline-block mr-1.5 -mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      Dashboard
    </button>
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
  {:else}
    <!-- SERVICE LIST VIEW -->
    {#if activeView === "list"}
      <!-- Filters Row -->
      <div class="mb-4 flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <label for="type-filter" class="text-sm text-muted-foreground"
            >Type:</label
          >
          <select
            id="type-filter"
            bind:value={serviceTypeFilter}
            class="px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {#each serviceTypeOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <div class="h-6 w-px bg-border hidden sm:block"></div>

        <CopyDropdown data={getAllServicesCopyData()} label="Copy as..." />

        <span class="text-sm text-muted-foreground ml-auto">
          {filteredServices().length}
          {filteredServices().length === 1 ? "service" : "services"}
        </span>
      </div>

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
                      onclick={() => handleSort("guests_count")}
                    >
                      Guests
                    </button>
                  </th>
                {/if}
                {#if columnVisibility.decisions}
                  <th class="px-4 py-3 text-left">
                    <button
                      type="button"
                      class="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
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
              {#if loading}
                <tr>
                  <td
                    colspan="10"
                    class="px-4 py-8 text-center text-muted-foreground"
                  >
                    <svg
                      class="animate-spin h-6 w-6 mx-auto mb-2"
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
                    Loading services...
                  </td>
                </tr>
              {:else if filteredServices().length === 0}
                <tr>
                  <td
                    colspan="10"
                    class="px-4 py-8 text-center text-muted-foreground"
                  >
                    No services found. Add your first service record to get
                    started.
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
                        <span
                          class="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground"
                        >
                          {formatServiceType(service.service_type)}
                        </span>
                      </td>
                    {/if}
                    {#if columnVisibility.topic}
                      <td class="px-4 py-3 text-sm text-foreground"
                        >{service.sermon_topic || "—"}</td
                      >
                    {/if}
                    {#if columnVisibility.attendance}
                      <td class="px-4 py-3 text-sm text-foreground font-medium"
                        >{service.total_attendance || "—"}</td
                      >
                    {/if}
                    {#if columnVisibility.guests}
                      <td class="px-4 py-3 text-sm text-info"
                        >{service.guests_count || "—"}</td
                      >
                    {/if}
                    {#if columnVisibility.decisions}
                      <td class="px-4 py-3 text-sm text-success"
                        >{service.salvation_decisions || "—"}</td
                      >
                    {/if}
                    {#if columnVisibility.individuals}
                      <td class="px-4 py-3">
                        {#if Array.isArray(service.individuals) && service.individuals.length > 0}
                          <button
                            type="button"
                            class="flex items-center gap-1 text-sm text-primary hover:underline"
                            onclick={(e) => handleIndividualsClick(service, e)}
                          >
                            <div class="flex -space-x-1">
                              {#each service.individuals.slice(0, 3) as personId}
                                {@const person = getPersonById(personId)}
                                {#if person}
                                  <div
                                    class="w-6 h-6 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-[10px] font-medium text-primary"
                                  >
                                    {person.first_name[0]}{person.last_name[0]}
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

      <!-- DASHBOARD VIEW -->
    {:else if activeView === "dashboard"}
      <FullscreenWrapper title="Services Dashboard">
        {#snippet filters()}
          <FilterBar />
        {/snippet}

        <!-- Quick Actions Panel -->
        <div class="mb-6 flex flex-wrap items-center gap-3">
          <Button onclick={handleAddService}>
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Service
          </Button>
          <Button variant="secondary" onclick={() => (activeView = "list")}>
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
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            View List
          </Button>
          <CopyDropdown data={getAllServicesCopyData()} label="Export Data" />
          <span class="ml-auto text-sm text-muted-foreground">
            {filteredServices().length} services in period
          </span>
        </div>

        <!-- KPI Cards Section -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Total Attendance"
            value={kpis().totalAttendance}
            icon="users"
            trend={null}
          />
          <KPICard
            title="Total Guests"
            value={kpis().totalGuests}
            icon="user-plus"
            variant="info"
            trend={null}
          />
          <KPICard
            title="Salvation Decisions"
            value={kpis().totalDecisions}
            icon="heart"
            variant="success"
            trend={null}
          />
          <KPICard
            title="Avg. Attendance"
            value={kpis().avgAttendance}
            icon="chart"
            trend={null}
          />
        </div>

        <!-- Insights / Highlights Cards -->
        <div class="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {#if highestService()}
            <div class="card-interactive p-4 border-l-4 border-l-success">
              <div class="flex items-center gap-2 mb-2">
                <svg
                  class="w-5 h-5 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
                <span class="text-sm font-medium text-success"
                  >Highest Attendance</span
                >
              </div>
              <div class="text-2xl font-bold text-foreground">
                {highestService().total_attendance}
              </div>
              <div class="text-xs text-muted-foreground">
                {formatShortDate(highestService().service_date)} - {highestService()
                  .sermon_topic || "Service"}
              </div>
            </div>
          {/if}

          {#if lowestService() && sortedByAttendance().length > 1}
            <div class="card-interactive p-4 border-l-4 border-l-warning">
              <div class="flex items-center gap-2 mb-2">
                <svg
                  class="w-5 h-5 text-warning"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
                <span class="text-sm font-medium text-warning"
                  >Lowest Attendance</span
                >
              </div>
              <div class="text-2xl font-bold text-foreground">
                {lowestService().total_attendance}
              </div>
              <div class="text-xs text-muted-foreground">
                {formatShortDate(lowestService().service_date)} - {lowestService()
                  .sermon_topic || "Service"}
              </div>
            </div>
          {/if}

          <div class="card-interactive p-4 border-l-4 border-l-primary">
            <div class="flex items-center gap-2 mb-2">
              <svg
                class="w-5 h-5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span class="text-sm font-medium text-primary"
                >Recent Decisions</span
              >
            </div>
            <div class="text-2xl font-bold text-foreground">
              {recentDecisions()}
            </div>
            <div class="text-xs text-muted-foreground">In last 3 services</div>
          </div>

          <div class="card-interactive p-4 border-l-4 border-l-info">
            <div class="flex items-center gap-2 mb-2">
              <svg
                class="w-5 h-5 text-info"
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
              <span class="text-sm font-medium text-info">Guest Rate</span>
            </div>
            <div class="text-2xl font-bold text-foreground">
              {kpis().totalAttendance > 0
                ? Math.round(
                    (kpis().totalGuests / kpis().totalAttendance) * 100,
                  )
                : 0}%
            </div>
            <div class="text-xs text-muted-foreground">
              {kpis().totalGuests} guests of {kpis().totalAttendance} total
            </div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <!-- Attendance Trend Chart (larger) -->
          <div class="lg:col-span-2 relative">
            <div class="absolute top-3 right-3 z-10">
              <CopyButton
                data={getChartCopyData()}
                format="json"
                label="Copy"
              />
            </div>
            <AttendanceTrend data={trendData()} title="Attendance Trend" />
          </div>

          <!-- Guest vs Member Donut Chart -->
          <div class="card-base p-4">
            <h3 class="text-sm font-medium text-muted-foreground mb-4">
              Guest vs Member Split
            </h3>

            <div class="relative w-40 h-40 mx-auto mb-4">
              <svg viewBox="0 0 36 36" class="w-full h-full rotate-[-90deg]">
                <!-- Background circle -->
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  class="text-secondary"
                />
                <!-- Member segment -->
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  class="text-primary"
                  stroke-dasharray="{donutData().memberPct} {100 -
                    donutData().memberPct}"
                  stroke-linecap="round"
                />
                <!-- Guest segment (starts after member) -->
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  class="text-info"
                  stroke-dasharray="{donutData().guestPct} {100 -
                    donutData().guestPct}"
                  stroke-dashoffset="-{donutData().memberPct}"
                  stroke-linecap="round"
                />
              </svg>
              <div
                class="absolute inset-0 flex flex-col items-center justify-center"
              >
                <span class="text-2xl font-bold text-foreground"
                  >{donutData().total}</span
                >
                <span class="text-xs text-muted-foreground">Total</span>
              </div>
            </div>

            <div class="flex justify-center gap-6">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-primary"></div>
                <span class="text-sm text-foreground"
                  >Members ({donutData().memberPct}%)</span
                >
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-info"></div>
                <span class="text-sm text-foreground"
                  >Guests ({donutData().guestPct}%)</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Service Type Distribution & Top Attendees Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- Service Type Distribution -->
          <div class="card-base p-4">
            <h3 class="text-sm font-medium text-muted-foreground mb-4">
              Service Type Distribution
            </h3>

            <div class="space-y-3">
              {#each typeDistribution().typeEntries as [type, count]}
                {@const pct = Math.round(
                  (count / filteredServices().length) * 100,
                )}
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-foreground"
                      >{formatServiceType(type)}</span
                    >
                    <span class="text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div class="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500 {type ===
                      'sunday_service'
                        ? 'bg-primary'
                        : type === 'midweek_service'
                          ? 'bg-info'
                          : 'bg-warning'}"
                      style="width: {(count / typeDistribution().maxCount) *
                        100}%"
                    ></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Top Attendees Leaderboard -->
          <div class="card-base p-4">
            <h3 class="text-sm font-medium text-muted-foreground mb-4">
              Top Attendees
            </h3>

            <div class="space-y-3">
              {#each topAttendees() as { person, count }, i}
                {#if person}
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                      {i === 0
                        ? 'bg-yellow-500/20 text-yellow-500'
                        : i === 1
                          ? 'bg-gray-400/20 text-gray-400'
                          : i === 2
                            ? 'bg-amber-600/20 text-amber-600'
                            : 'bg-secondary text-muted-foreground'}"
                    >
                      {i + 1}
                    </div>
                    <div
                      class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary"
                    >
                      {person.first_name[0]}{person.last_name[0]}
                    </div>
                    <div class="flex-1">
                      <div class="text-sm font-medium text-foreground">
                        {person.first_name}
                        {person.last_name}
                      </div>
                      <div class="text-xs text-muted-foreground">
                        {person.member_status}
                      </div>
                    </div>
                    <div class="text-sm font-bold text-primary">
                      {count} services
                    </div>
                  </div>
                {/if}
              {/each}
              {#if topAttendees().length === 0}
                <div class="text-center py-6 text-muted-foreground text-sm">
                  No individual attendance data available
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Photo Gallery Carousel -->
        {#if allPhotos().length > 0}
          <div class="card-base p-4 mb-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-muted-foreground">
                Recent Service Photos
              </h3>
              <span class="text-xs text-muted-foreground"
                >{allPhotos().length} photos</span
              >
            </div>
            <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {#each allPhotos() as { photo, service }}
                <button
                  type="button"
                  class="flex-shrink-0 group relative"
                  onclick={() => handleServiceClick(service)}
                >
                  <img
                    src={photo.replace("w=100&h=100", "w=200&h=150")}
                    alt="Service on {formatShortDate(service.service_date)}"
                    class="w-48 h-32 object-cover rounded-lg border-2 border-transparent group-hover:border-primary transition-all duration-200"
                  />
                  <div
                    class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div class="absolute bottom-2 left-2 right-2">
                      <div class="text-white text-xs font-medium truncate">
                        {formatShortDate(service.service_date)}
                      </div>
                      <div class="text-white/70 text-xs truncate">
                        {service.sermon_topic ||
                          formatServiceType(service.service_type)}
                      </div>
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Recent Services Cards -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-muted-foreground">
              Recent Services
            </h3>
            <button
              type="button"
              class="text-xs text-primary hover:underline"
              onclick={() => (activeView = "list")}
            >
              View all →
            </button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each filteredServices().slice(0, 6) as service}
              <button
                type="button"
                class="card-interactive p-4 text-left group"
                onclick={() => handleServiceClick(service)}
              >
                <!-- Header with photo thumbnail -->
                <div class="flex items-start gap-3 mb-3">
                  {#if Array.isArray(service.photos) && service.photos.length > 0}
                    <img
                      src={service.photos[0]}
                      alt="Service thumbnail"
                      class="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  {:else}
                    <div
                      class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"
                    >
                      <svg
                        class="w-6 h-6 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  {/if}
                  <div class="flex-1 min-w-0">
                    <div
                      class="text-sm font-medium text-foreground group-hover:text-primary transition-colors"
                    >
                      {formatShortDate(service.service_date)}
                    </div>
                    <span
                      class="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
                    >
                      {formatServiceType(service.service_type)}
                    </span>
                  </div>
                </div>

                <!-- Topic -->
                <div class="text-sm text-foreground mb-2 line-clamp-1">
                  {service.sermon_topic || "No topic recorded"}
                </div>

                <!-- Stats Row -->
                <div
                  class="flex items-center gap-4 text-xs text-muted-foreground"
                >
                  <span class="flex items-center gap-1">
                    <svg
                      class="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {service.total_attendance || 0}
                  </span>
                  <span class="flex items-center gap-1 text-info">
                    <svg
                      class="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                    {service.guests_count || 0}
                  </span>
                  {#if service.salvation_decisions > 0}
                    <span class="flex items-center gap-1 text-success">
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                      {service.salvation_decisions}
                    </span>
                  {/if}
                  {#if Array.isArray(service.photos) && service.photos.length > 0}
                    <span class="flex items-center gap-1 ml-auto">
                      📷 {service.photos.length}
                    </span>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </div>

        <!-- Service Type Filter -->
        <div class="mb-4 flex items-center gap-4">
          <label
            for="dashboard-type-filter"
            class="text-sm text-muted-foreground">Filter by Type:</label
          >
          <select
            id="dashboard-type-filter"
            bind:value={serviceTypeFilter}
            class="px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {#each serviceTypeOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>
      </FullscreenWrapper>
    {/if}
  {/if}
</DashboardLayout>

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
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3 bg-secondary/20 rounded-lg text-center">
          <div class="text-2xl font-bold text-foreground">
            {selectedService.total_attendance || 0}
          </div>
          <div class="text-xs text-muted-foreground">Attendance</div>
        </div>
        <div class="p-3 bg-secondary/20 rounded-lg text-center">
          <div class="text-2xl font-bold text-info">
            {selectedService.guests_count || 0}
          </div>
          <div class="text-xs text-muted-foreground">Guests</div>
        </div>
        <div class="p-3 bg-secondary/20 rounded-lg text-center">
          <div class="text-2xl font-bold text-success">
            {selectedService.salvation_decisions || 0}
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
              <div
                class="flex items-center gap-2 px-3 py-1.5 bg-secondary/30 rounded-full"
              >
                <div
                  class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary"
                >
                  {person.first_name[0]}{person.last_name[0]}
                </div>
                <span class="text-sm text-foreground"
                  >{person.first_name} {person.last_name}</span
                >
              </div>
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
              <div
                class="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary"
                  >
                    {person.first_name[0]}{person.last_name[0]}
                  </div>
                  <div>
                    <div class="font-medium text-foreground">
                      {person.first_name}
                      {person.last_name}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {person.member_status}
                    </div>
                  </div>
                </div>
              </div>
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
    <p class="text-sm text-muted-foreground">This action cannot be undone.</p>
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
