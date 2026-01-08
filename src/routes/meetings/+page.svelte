<!--
  Meetings & Prayer Page
  Schedule and track prayer meetings and church gatherings.
  
  Features:
  - KPI Cards (Total Prayer Hours, Latest Attendance, Leader Participation Rate)
  - Meeting type tabs/dropdown
  - DataTable with meeting records
  - Add/Edit meeting modal
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
  import MeetingForm from "$lib/components/forms/MeetingForm.svelte";

  // Import filter store for reactive date range
  import { dateRange } from "$lib/stores/filterStore";

  // Import chart components
  import PrayerHoursChart from "$lib/components/charts/PrayerHoursChart.svelte";
  import LeaderHeatmap from "$lib/components/charts/LeaderHeatmap.svelte";

  // State
  let meetings = $state([]);
  let loading = $state(true);
  let error = $state(null);

  // Filter state
  let meetingTypeFilter = $state("all");

  // Modal state
  let isFormOpen = $state(false);
  let isDeleteModalOpen = $state(false);
  let selectedMeeting = $state(null);
  let deleting = $state(false);

  // Track if using mock data
  let usingMockData = $state(false);

  // Meeting type options for filter (from spec)
  const meetingTypeOptions = [
    { value: "all", label: "All Meetings" },
    { value: "bacenta", label: "Bacenta" },
    { value: "flow_prayer", label: "Flow Prayer" },
    { value: "farley_prayer", label: "Farley Prayer" },
    { value: "all_night_prayer", label: "All Night Prayer" },
    { value: "basonta", label: "Basonta" },
    { value: "sat", label: "SAT" },
  ];

  // Mock data for development when Convex is not configured
  const mockMeetings = [
    {
      id: "1",
      meeting_date: "2025-12-14",
      meeting_type: "bacenta",
      start_time: "18:00",
      end_time: "20:00",
      duration_minutes: 120,
      location: "Zone 1 - Fellowship Hall",
      attendance_count: 35,
      leaders_count: 5,
    },
    {
      id: "2",
      meeting_date: "2025-12-13",
      meeting_type: "flow_prayer",
      start_time: "06:00",
      end_time: "07:00",
      duration_minutes: 60,
      location: "Online - YouTube",
      attendance_count: 85,
      leaders_count: 12,
    },
    {
      id: "3",
      meeting_date: "2025-12-12",
      meeting_type: "farley_prayer",
      start_time: "19:00",
      end_time: "21:00",
      duration_minutes: 120,
      location: "Prayer Room",
      attendance_count: 28,
      leaders_count: 8,
    },
    {
      id: "4",
      meeting_date: "2025-12-07",
      meeting_type: "all_night_prayer",
      start_time: "22:00",
      end_time: "05:00",
      duration_minutes: 420,
      location: "Main Sanctuary",
      attendance_count: 65,
      leaders_count: 15,
    },
    {
      id: "5",
      meeting_date: "2025-12-08",
      meeting_type: "basonta",
      start_time: "14:00",
      end_time: "16:00",
      duration_minutes: 120,
      location: "Conference Room",
      attendance_count: 22,
      leaders_count: 22,
    },
    {
      id: "6",
      meeting_date: "2025-12-01",
      meeting_type: "sat",
      start_time: "10:00",
      end_time: "13:00",
      duration_minutes: 180,
      location: "Training Center",
      attendance_count: 18,
      leaders_count: 18,
    },
  ];

  // Table columns configuration
  const columns = [
    {
      key: "meeting_date",
      label: "Date",
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: "meeting_type",
      label: "Type",
      sortable: true,
      render: (value) => formatMeetingType(value),
    },
    {
      key: "duration_minutes",
      label: "Duration",
      sortable: true,
      render: (value) => formatDuration(value),
    },
    {
      key: "attendance_count",
      label: "Attendance",
      sortable: true,
      render: (value) => value ?? "—",
    },
    {
      key: "leaders_count",
      label: "Leaders",
      sortable: true,
      render: (value) => value ?? "—",
    },
    {
      key: "location",
      label: "Location",
      render: (value) => value || "—",
    },
  ];

  // Format meeting type for display
  function formatMeetingType(type) {
    const typeMap = {
      bacenta: "Bacenta",
      flow_prayer: "Flow Prayer",
      farley_prayer: "Farley Prayer",
      all_night_prayer: "All Night",
      basonta: "Basonta",
      sat: "SAT",
    };
    return typeMap[type] || type || "Unknown";
  }

  // Get meeting type badge class
  function getMeetingTypeClass(type) {
    const classMap = {
      bacenta: "bg-primary/10 text-primary",
      flow_prayer: "bg-success/10 text-success",
      farley_prayer: "bg-info/10 text-info",
      all_night_prayer: "bg-warning/10 text-warning",
      basonta: "bg-secondary text-muted-foreground",
      sat: "bg-secondary text-muted-foreground",
    };
    return classMap[type] || "bg-secondary text-muted-foreground";
  }

  // Format date for display
  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  // Format duration for display
  function formatDuration(minutes) {
    if (!minutes) return "—";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
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

  // Filter meetings by type AND date range
  const filteredMeetings = $derived(() => {
    const range = $dateRange;
    let filtered = meetings;

    // Filter by date range first
    filtered = filtered.filter((m) => isWithinDateRange(m.meeting_date, range));

    // Then filter by meeting type
    if (meetingTypeFilter !== "all") {
      filtered = filtered.filter((m) => m.meeting_type === meetingTypeFilter);
    }

    return filtered;
  });

  // Calculate KPIs based on filtered data
  const kpis = $derived(() => {
    const filtered = filteredMeetings();
    const totalMinutes = filtered.reduce(
      (sum, m) => sum + (m.duration_minutes || 0),
      0,
    );
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    const totalAttendance = filtered.reduce(
      (sum, m) => sum + (m.attendance_count || 0),
      0,
    );
    const totalLeaders = filtered.reduce(
      (sum, m) => sum + (m.leaders_count || 0),
      0,
    );

    const leaderRate =
      totalAttendance > 0
        ? Math.round((totalLeaders / totalAttendance) * 100)
        : 0;

    // Latest meeting attendance from filtered data
    const latestMeeting = filtered.length > 0 ? filtered[0] : null;
    const latestAttendance = latestMeeting?.attendance_count || 0;

    return {
      totalHours,
      latestAttendance,
      leaderRate,
      meetingCount: filtered.length,
    };
  });

  // Prayer hours data by meeting type for chart
  const prayerHoursData = $derived(() => {
    const filtered = filteredMeetings();
    const typeHours = filtered.reduce((acc, m) => {
      const type = m.meeting_type || "other";
      acc[type] = (acc[type] || 0) + (m.duration_minutes || 0) / 60;
      return acc;
    }, {});

    return Object.entries(typeHours).map(([type, hours]) => ({
      type,
      hours,
    }));
  });

  // Mock leader data for heatmap demonstration
  const mockLeaders = [
    { id: "l1", name: "John Smith" },
    { id: "l2", name: "Mary Johnson" },
    { id: "l3", name: "Peter Williams" },
    { id: "l4", name: "Sarah Brown" },
    { id: "l5", name: "David Taylor" },
  ];

  // Leader participation data for heatmap
  const leaderHeatmapData = $derived(() => {
    const meetingTypes = [
      "bacenta",
      "flow_prayer",
      "farley_prayer",
      "all_night_prayer",
      "basonta",
      "sat",
    ];

    // In a real implementation, this would come from meeting_attendance junction table
    // For now, generate mock data based on meetings
    return mockLeaders.map((leader) => {
      const meetings = {};
      meetingTypes.forEach((type) => {
        // Simulate varying attendance based on random but consistent data
        const seed = leader.id.charCodeAt(1) + type.charCodeAt(0);
        meetings[type] = Math.floor(seed % 8);
      });
      return {
        leaderId: leader.id,
        leaderName: leader.name,
        meetings,
      };
    });
  });

  // Load meetings on mount
  onMount(async () => {
    await loadMeetings();
  });

  // Fetch all meetings from service
  async function loadMeetings() {
    if (!browser) return;

    loading = true;
    error = null;

    try {
      const meetingsService = await import("$lib/services/meetingsService");
      const result = await meetingsService.getAll();

      if (result.error) {
        throw result.error;
      }
      meetings = result.data || [];
      usingMockData = false;
    } catch (e) {
      console.warn("Failed to load from Convex, using mock data:", e.message);
      meetings = mockMeetings;
      usingMockData = true;
      error = null;
    } finally {
      loading = false;
    }
  }

  // Open add meeting modal
  function handleAddMeeting() {
    selectedMeeting = null;
    isFormOpen = true;
  }

  // Open edit meeting modal
  function handleEditMeeting(meeting) {
    selectedMeeting = meeting;
    isFormOpen = true;
  }

  // Open delete confirmation modal
  function handleDeleteClick(meeting) {
    selectedMeeting = meeting;
    isDeleteModalOpen = true;
  }

  // Confirm delete meeting
  async function handleConfirmDelete() {
    if (!selectedMeeting) return;

    deleting = true;

    try {
      const meetingsService = await import("$lib/services/meetingsService");
      const result = await meetingsService.remove(selectedMeeting.id);

      if (result.error) {
        throw result.error;
      }

      meetings = meetings.filter((m) => m.id !== selectedMeeting.id);
      isDeleteModalOpen = false;
      selectedMeeting = null;
    } catch (e) {
      console.error("Error deleting meeting:", e);
      // For mock data, just remove locally
      if (usingMockData) {
        meetings = meetings.filter((m) => m.id !== selectedMeeting.id);
        isDeleteModalOpen = false;
        selectedMeeting = null;
      }
    } finally {
      deleting = false;
    }
  }

  // Handle save from form
  function handleSave(savedMeeting) {
    if (selectedMeeting) {
      meetings = meetings.map((m) =>
        m.id === savedMeeting.id ? savedMeeting : m,
      );
    } else {
      meetings = [savedMeeting, ...meetings];
    }
    selectedMeeting = null;
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
      title="Meetings & Prayer"
      subtitle="Schedule and track prayer meetings and church gatherings"
    />

    <Button onclick={handleAddMeeting}>
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
      Add Meeting
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
      title="Total Prayer Hours"
      value={kpis().totalHours}
      icon="clock"
      trend={null}
      suffix="hrs"
    />
    <KPICard
      title="Latest Attendance"
      value={kpis().latestAttendance}
      icon="users"
      variant="info"
      trend={null}
    />
    <KPICard
      title="Leader Participation"
      value={kpis().leaderRate}
      icon="star"
      variant="success"
      trend={null}
      suffix="%"
    />
    <KPICard
      title="Total Meetings"
      value={kpis().meetingCount}
      icon="calendar"
      trend={null}
    />
  </div>

  <!-- Prayer Hours Chart -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    <PrayerHoursChart
      data={prayerHoursData()}
      title="Prayer Hours by Meeting Type"
    />
    <LeaderHeatmap
      data={leaderHeatmapData()}
      title="Leader Participation Grid"
    />
  </div>

  <!-- Meeting Type Filter Tabs -->
  <div class="mb-6">
    <div class="flex flex-wrap gap-2">
      {#each meetingTypeOptions as option}
        <button
          type="button"
          onclick={() => (meetingTypeFilter = option.value)}
          class="px-4 py-2 text-sm rounded-lg transition-premium {meetingTypeFilter ===
          option.value
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'}"
        >
          {option.label}
        </button>
      {/each}
    </div>
    <p class="mt-2 text-sm text-muted-foreground">
      {filteredMeetings().length}
      {filteredMeetings().length === 1 ? "meeting" : "meetings"}
    </p>
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
        Error Loading Meetings
      </h3>
      <p class="text-muted-foreground mb-4">{error}</p>
      <Button onclick={loadMeetings}>
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
        data={filteredMeetings()}
        {loading}
        searchable
        selectable={false}
        pageSize={15}
        searchPlaceholder="Search by location or notes..."
        emptyMessage="No meetings found. Add your first meeting to get started."
      />

      <!-- Quick Actions List -->
      {#if !loading && filteredMeetings().length > 0}
        <div class="mt-4 card-base">
          <h4 class="text-sm font-medium text-muted-foreground mb-3">
            Quick Actions
          </h4>
          <div class="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
            {#each filteredMeetings().slice(0, 15) as meeting}
              <div
                class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/30 transition-premium"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-foreground">
                        {formatDate(meeting.meeting_date)}
                      </span>
                      <span
                        class="text-xs px-2 py-0.5 rounded-full {getMeetingTypeClass(
                          meeting.meeting_type,
                        )}"
                      >
                        {formatMeetingType(meeting.meeting_type)}
                      </span>
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {formatDuration(meeting.duration_minutes)} •
                      {meeting.attendance_count || 0} attended
                      {#if meeting.leaders_count}
                        • {meeting.leaders_count} leaders
                      {/if}
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    onclick={() => handleEditMeeting(meeting)}
                    class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-premium"
                    aria-label="Edit meeting"
                  >
                    <svg
                      class="w-4 h-4"
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
                  </button>
                  <button
                    type="button"
                    onclick={() => handleDeleteClick(meeting)}
                    class="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-premium"
                    aria-label="Delete meeting"
                  >
                    <svg
                      class="w-4 h-4"
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
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</DashboardLayout>

<!-- Meeting Form Modal -->
<MeetingForm
  bind:isOpen={isFormOpen}
  meeting={selectedMeeting}
  onsave={handleSave}
/>

<!-- Delete Confirmation Modal -->
<Modal bind:isOpen={isDeleteModalOpen} title="Delete Meeting" size="sm">
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
      Are you sure you want to delete the <strong
        >{selectedMeeting
          ? formatMeetingType(selectedMeeting.meeting_type)
          : ""}</strong
      >
      meeting from
      <strong
        >{selectedMeeting
          ? formatDate(selectedMeeting.meeting_date)
          : ""}</strong
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
