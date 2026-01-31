<!--
  Visitation Tracking Page
  Track home visits and pastoral care activities.
  
  Features:
  - KPI Cards (Guests Needing Visit, Visits Completed, Visitation Rate, Pending Follow-ups)
  - Priority Queue (guests by days since attended)
  - DataTable with visitation records
  - Add/Edit visitation modal
  - Delete confirmation
  - Loading/error states
-->

<script>
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import FilterBar from "$lib/components/filters/FilterBar.svelte";
  import { DataTable, Modal, Button } from "$lib/components/ui";
  import KPICard from "$lib/components/dashboard/KPICard.svelte";
  import VisitationForm from "$lib/components/forms/VisitationForm.svelte";
  import VisitationDetailModal from "$lib/components/visitation/VisitationDetailModal.svelte";

  // Import filter store for reactive date range
  import { dateRange } from "$lib/stores/filterStore";

  // Import chart components
  import VisitationCalendar from "$lib/components/charts/VisitationCalendar.svelte";

  // State
  let visitations = $state([]);
  let loading = $state(true);
  let error = $state(null);

  // Filter state
  let outcomeFilter = $state("all");

  // Modal state
  let isFormOpen = $state(false);
  let isDeleteModalOpen = $state(false);
  let isDetailModalOpen = $state(false);
  let selectedVisitation = $state(null);
  let deleting = $state(false);

  // Track if using mock data
  let usingMockData = $state(false);

  // Outcome options for filter
  const outcomeOptions = [
    { value: "all", label: "All Outcomes" },
    { value: "welcomed_encouraged", label: "Welcomed & Encouraged" },
    { value: "prayer_request_received", label: "Prayer Request" },
    { value: "invited_to_service", label: "Invited to Service" },
    { value: "concerns_shared", label: "Concerns Shared" },
    { value: "follow_up_needed", label: "Follow-up Needed" },
    { value: "not_home", label: "Not Home" },
  ];

  // Mock data for development when Convex is not configured
  const mockVisitations = [
    {
      id: "1",
      person_visited_name: "Sarah Johnson",
      visited_by_name: "Pastor John",
      visit_date: "2025-12-14",
      outcome: "welcomed_encouraged",
      follow_up_required: false,
      notes:
        "Great visit, family is doing well. Excited about Christmas service.",
    },
    {
      id: "2",
      person_visited_name: "Michael Brown",
      visited_by_name: "Elder Mary",
      visit_date: "2025-12-13",
      outcome: "prayer_request_received",
      follow_up_required: true,
      follow_up_date: "2025-12-20",
      notes: "Going through job transition. Prayed for guidance and provision.",
    },
    {
      id: "3",
      person_visited_name: "Emma Wilson",
      visited_by_name: "Deacon James",
      visit_date: "2025-12-10",
      outcome: "invited_to_service",
      follow_up_required: true,
      follow_up_date: "2025-12-15",
      notes:
        "First-time guest from last Sunday. Very interested in joining a small group.",
    },
    {
      id: "4",
      person_visited_name: "David Lee",
      visited_by_name: "Pastor John",
      visit_date: "2025-12-08",
      outcome: "concerns_shared",
      follow_up_required: true,
      follow_up_date: "2025-12-18",
      notes:
        "Struggling with work-life balance. Scheduled follow-up counseling session.",
    },
    {
      id: "5",
      person_visited_name: "Grace Thompson",
      visited_by_name: "Elder Mary",
      visit_date: "2025-12-05",
      outcome: "not_home",
      follow_up_required: true,
      follow_up_date: "2025-12-16",
      notes: "No one home. Left a card. Will try again next week.",
    },
  ];

  // Priority queue mock data (guests needing visits)
  const mockPriorityQueue = [
    {
      name: "New Guest 1",
      phone: "555-1001",
      lastAttended: "2025-12-08",
      daysSince: 7,
    },
    {
      name: "New Guest 2",
      phone: "555-1002",
      lastAttended: "2025-12-01",
      daysSince: 14,
    },
    {
      name: "New Guest 3",
      phone: "555-1003",
      lastAttended: "2025-11-24",
      daysSince: 21,
    },
  ];

  // Table columns configuration
  const columns = [
    {
      key: "visit_date",
      label: "Date",
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: "person_visited_name",
      label: "Person Visited",
      sortable: true,
      render: (value) => value || "—",
    },
    {
      key: "visited_by_name",
      label: "Visitor",
      render: (value) => value || "—",
    },
    {
      key: "outcome",
      label: "Outcome",
      sortable: true,
      render: (value) => formatOutcome(value),
    },
    {
      key: "follow_up_required",
      label: "Follow-up",
      render: (value) => (value ? "Yes" : "No"),
    },
  ];

  // Format outcome for display
  function formatOutcome(outcome) {
    const outcomeMap = {
      welcomed_encouraged: "Welcomed",
      prayer_request_received: "Prayer Request",
      invited_to_service: "Invited",
      concerns_shared: "Concerns",
      follow_up_needed: "Follow-up",
      not_home: "Not Home",
      declined: "Declined",
    };
    return outcomeMap[outcome] || outcome || "Unknown";
  }

  // Get outcome badge class
  function getOutcomeClass(outcome) {
    const classMap = {
      welcomed_encouraged: "bg-success/10 text-success",
      prayer_request_received: "bg-info/10 text-info",
      invited_to_service: "bg-primary/10 text-primary",
      concerns_shared: "bg-warning/10 text-warning",
      follow_up_needed: "bg-warning/10 text-warning",
      not_home: "bg-secondary text-muted-foreground",
      declined: "bg-destructive/10 text-destructive",
    };
    return classMap[outcome] || "bg-secondary text-muted-foreground";
  }

  // Format date for display
  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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

  // Filter visitations by outcome AND date range
  const filteredVisitations = $derived(() => {
    const range = $dateRange;
    let filtered = visitations;

    // Filter by date range first
    filtered = filtered.filter((v) => isWithinDateRange(v.visit_date, range));

    // Then filter by outcome
    if (outcomeFilter !== "all") {
      filtered = filtered.filter((v) => v.outcome === outcomeFilter);
    }

    return filtered;
  });

  // Calculate KPIs based on filtered data
  const kpis = $derived(() => {
    const filtered = filteredVisitations();
    const total = filtered.length;
    const followUpNeeded = filtered.filter((v) => v.follow_up_required).length;

    // Mock "guests needing visit" count
    const guestsNeedingVisit = mockPriorityQueue.length;
    const visitationRate =
      guestsNeedingVisit > 0
        ? Math.round((total / (total + guestsNeedingVisit)) * 100)
        : 100;

    return {
      guestsNeedingVisit,
      visitsInPeriod: total,
      visitationRate,
      pendingFollowUps: followUpNeeded,
    };
  });

  // Load visitations on mount
  onMount(async () => {
    await loadVisitations();
  });

  // Fetch all visitations from service
  async function loadVisitations() {
    if (!browser) return;

    loading = true;
    error = null;

    try {
      const visitationsService =
        await import("$lib/services/visitationsService");
      const result = await visitationsService.getAll();

      if (result.error) {
        throw result.error;
      }
      visitations = result.data || [];
      usingMockData = false;
    } catch (e) {
      console.warn("Failed to load from Convex, using mock data:", e.message);
      visitations = mockVisitations;
      usingMockData = true;
      error = null;
    } finally {
      loading = false;
    }
  }

  // Open add visitation modal
  function handleAddVisitation() {
    selectedVisitation = null;
    isFormOpen = true;
  }

  // Open edit visitation modal
  function handleEditVisitation(visitation) {
    selectedVisitation = visitation;
    isFormOpen = true;
  }

  // Open delete confirmation modal
  function handleDeleteClick(visitation) {
    selectedVisitation = visitation;
    isDeleteModalOpen = true;
  }

  // Confirm delete visitation
  async function handleConfirmDelete() {
    if (!selectedVisitation) return;

    deleting = true;

    try {
      const visitationsService =
        await import("$lib/services/visitationsService");
      const result = await visitationsService.remove(selectedVisitation.id);

      if (result.error) {
        throw result.error;
      }

      visitations = visitations.filter((v) => v.id !== selectedVisitation.id);
      isDeleteModalOpen = false;
      selectedVisitation = null;
    } catch (e) {
      console.error("Error deleting visitation:", e);
      // For mock data, just remove locally
      if (usingMockData) {
        visitations = visitations.filter((v) => v.id !== selectedVisitation.id);
        isDeleteModalOpen = false;
        selectedVisitation = null;
      }
    } finally {
      deleting = false;
    }
  }

  // Handle save from form
  function handleSave(savedVisitation) {
    if (selectedVisitation) {
      visitations = visitations.map((v) =>
        v.id === savedVisitation.id ? savedVisitation : v,
      );
    } else {
      visitations = [savedVisitation, ...visitations];
    }
    selectedVisitation = null;
  }
</script>

<DashboardLayout>
  <!-- Filters in the named snippet slot -->
  {#snippet filters()}
    <FilterBar />
  {/snippet}

  <!-- Page Header with Add Button -->
  <div
    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-in"
  >
    <PageHeader
      title="Visitation"
      subtitle="Track home visits and pastoral care activities"
    />

    <Button onclick={handleAddVisitation}>
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
      Log Visit
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

  <!-- KPI Cards Section -->
  <div
    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-in delay-2"
  >
    <KPICard
      title="Guests Needing Visit"
      value={kpis().guestsNeedingVisit}
      icon="user-plus"
      variant={kpis().guestsNeedingVisit > 0 ? "warning" : "default"}
      trend={null}
    />
    <KPICard
      title="Pending Follow-ups"
      value={kpis().pendingFollowUps}
      icon="clock"
      variant={kpis().pendingFollowUps > 0 ? "info" : "default"}
      trend={null}
    />
  </div>

  <!-- Visitation Calendar -->
  <div class="mb-6">
    <VisitationCalendar
      data={visitations.map((v) => ({
        visit_date: v.visit_date,
        person_visited_name: v.person_visited_name,
        outcome: v.outcome,
      }))}
      title="Visitation Activity"
    />
  </div>

  <!-- Priority Queue Section -->
  {#if mockPriorityQueue.length > 0}
    <div class="mb-6 card-base">
      <h3
        class="text-sm font-medium text-foreground mb-3 flex items-center gap-2"
      >
        <svg
          class="w-4 h-4 text-warning"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Priority Queue - Guests Needing Visits
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        {#each mockPriorityQueue as guest}
          <div
            class="p-3 bg-secondary/30 rounded-lg border border-border/50 hover:border-primary/30 transition-premium"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-foreground"
                >{guest.name}</span
              >
              <span
                class="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning"
              >
                {guest.daysSince}d ago
              </span>
            </div>
            <div class="text-xs text-muted-foreground mb-2">
              {guest.phone} • Last: {formatDate(guest.lastAttended)}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onclick={() => {
                selectedVisitation = null;
                isFormOpen = true;
              }}
            >
              Log Visit
            </Button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Outcome Filter -->
  <div class="mb-6 flex items-center gap-4">
    <label for="outcome-filter" class="text-sm text-muted-foreground"
      >Filter by Outcome:</label
    >
    <select
      id="outcome-filter"
      bind:value={outcomeFilter}
      class="px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm
             focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
    >
      {#each outcomeOptions as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>

    <span class="text-sm text-muted-foreground">
      {filteredVisitations().length}
      {filteredVisitations().length === 1 ? "visit" : "visits"}
    </span>
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
        Error Loading Visitations
      </h3>
      <p class="text-muted-foreground mb-4">{error}</p>
      <Button onclick={loadVisitations}>
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
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Retry
      </Button>
    </div>
  {:else}
    <!-- Data Table -->
    <div class="pb-10">
      <DataTable
        {columns}
        data={filteredVisitations()}
        {loading}
        searchable
        selectable={false}
        pageSize={15}
        searchPlaceholder="Search by name or notes..."
        emptyMessage="No visitations found. Log your first visit to get started."
        onrowclick={(row) => {
          selectedVisitation = row;
          isDetailModalOpen = true;
        }}
      />
    </div>
  {/if}
</DashboardLayout>

<!-- Visitation Detail Modal -->
<VisitationDetailModal
  bind:isOpen={isDetailModalOpen}
  visitation={selectedVisitation}
  onEdit={(v) => {
    selectedVisitation = v;
    isFormOpen = true;
  }}
  onDelete={(v) => {
    selectedVisitation = v;
    isDeleteModalOpen = true;
  }}
/>

<!-- Visitation Form Modal -->
<VisitationForm
  bind:isOpen={isFormOpen}
  visitation={selectedVisitation}
  onsave={handleSave}
/>

<!-- Delete Confirmation Modal -->
<Modal bind:isOpen={isDeleteModalOpen} title="Delete Visitation" size="sm">
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
      Are you sure you want to delete the visit to <strong
        >{selectedVisitation?.person_visited_name || "this person"}</strong
      >?
    </p>
    <p class="text-sm text-muted-foreground">This action cannot be undone.</p>
  </div>

  {#snippet footer()}
    <Button
      variant="secondary"
      onclick={() => (isDeleteModalOpen = false)}
      disabled={deleting}
    >
      Cancel
    </Button>
    <Button variant="danger" onclick={handleConfirmDelete} disabled={deleting}>
      {#if deleting}
        <svg
          class="animate-spin -ml-1 mr-2 h-4 w-4"
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
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Deleting...
      {:else}
        Delete
      {/if}
    </Button>
  {/snippet}
</Modal>
