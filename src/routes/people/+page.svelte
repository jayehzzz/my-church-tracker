<!--
  People Directory Page
  Comprehensive directory of church members and contacts.
  
  Features:
  - DataTable with all person columns
  - Search functionality
  - Status filter dropdown
  - Add/Edit person modal
  - Delete confirmation
  - Loading/error states
-->

<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";

  import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import FilterBar from "$lib/components/filters/FilterBar.svelte";
  import { DataTable, Modal, Button, Badge } from "$lib/components/ui";
  import PersonForm from "$lib/components/forms/PersonForm.svelte";
  import KPICard from "$lib/components/dashboard/KPICard.svelte";

  // Import chart components
  import GrowthTimeline from "$lib/components/charts/GrowthTimeline.svelte";
  import RoleDistribution from "$lib/components/charts/RoleDistribution.svelte";
  import ProfileQuickViewCard from "$lib/components/people/ProfileQuickViewCard.svelte";
  import PeopleDashboard from "./PeopleDashboard.svelte";
  import { mockPeopleWithLocation } from "$lib/data/mockPeopleWithLocation";

  // State
  let people = $state([]);
  let loading = $state(true);
  let error = $state(null);

  // Filter state
  let statusFilter = $state("all");
  let roleFilter = $state("all");
  let activityFilter = $state("all");

  // Modal state
  let isFormOpen = $state(false);
  let isDeleteModalOpen = $state(false);
  let selectedPerson = $state(null);
  let deleting = $state(false);

  // Track if using mock data
  let usingMockData = $state(false);

  // View Mode: 'list' or 'map'
  let activeView = $state("list");

  // Status options for filter
  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "visitor", label: "Visitors" },
    { value: "member", label: "Members" },
    { value: "leader", label: "Leaders" },
    { value: "archived", label: "Archived" },
  ];

  // Role options for filter
  const roleOptions = [
    { value: "all", label: "All Roles" },
    { value: "basonta_worker", label: "Basonta Workers" },
    { value: "bacenta_leader", label: "Bacenta Leaders" },
    { value: "no_role", label: "No Role" },
  ];

  // Activity level options for filter
  const activityOptions = [
    { value: "all", label: "All Activity" },
    { value: "regular", label: "Regular" },
    { value: "irregular", label: "Irregular" },
    { value: "dormant", label: "Dormant" },
  ];

  // Mock data for development when Supabase is not configured
  const mockPeople = [
    {
      id: "1",
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
      phone: "555-1234",
      member_status: "member",
    },
    {
      id: "2",
      first_name: "Jane",
      last_name: "Smith",
      email: "jane@example.com",
      phone: "555-5678",
      member_status: "leader",
    },
    {
      id: "3",
      first_name: "Bob",
      last_name: "Johnson",
      email: "bob@example.com",
      phone: "555-9012",
      member_status: "visitor",
    },
    {
      id: "4",
      first_name: "Alice",
      last_name: "Williams",
      email: "alice@example.com",
      phone: "555-3456",
      member_status: "member",
    },
    {
      id: "5",
      first_name: "Charlie",
      last_name: "Brown",
      email: "charlie@example.com",
      phone: "555-7890",
      member_status: "archived",
    },
  ];

  // Table columns configuration
  const columns = [
    {
      key: "first_name",
      label: "First Name",
      sortable: true,
      width: "120px",
    },
    {
      key: "last_name",
      label: "Last Name",
      sortable: true,
      width: "120px",
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      render: (value) => value || "—",
    },
    {
      key: "phone",
      label: "Phone",
      render: (value) => value || "—",
    },
    {
      key: "member_status",
      label: "Status",
      sortable: true,
      width: "100px",
      render: (value) => formatStatus(value),
    },
    {
      key: "actions",
      label: "Actions",
      width: "120px",
      render: (_, row) => "", // Handled in template
    },
  ];

  // Format status for display
  function formatStatus(status) {
    const statusMap = {
      visitor: "Visitor",
      member: "Member",
      leader: "Leader",
      archived: "Archived",
    };
    return statusMap[status] || status || "Unknown";
  }

  // Get status badge variant
  function getStatusVariant(status) {
    const variantMap = {
      visitor: "secondary",
      member: "default",
      leader: "success",
      archived: "destructive",
    };
    return variantMap[status] || "secondary";
  }

  // Filter people by status, role, and activity
  const filteredPeople = $derived(() => {
    let filtered = people;

    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.member_status === statusFilter);
    }
    if (roleFilter !== "all") {
      filtered = filtered.filter((p) => p.role === roleFilter);
    }
    if (activityFilter !== "all") {
      filtered = filtered.filter((p) => p.activity_status === activityFilter);
    }

    return filtered;
  });

  // Calculate KPIs for People Directory
  const kpis = $derived(() => {
    const total = people.length;
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Count new members (joined in last 30 days - using created_at or membership_date)
    const newMembers = people.filter((p) => {
      if (!p.membership_date && !p.created_at) return false;
      const joinDate = new Date(p.membership_date || p.created_at);
      return (
        joinDate >= thirtyDaysAgo &&
        (p.member_status === "member" || p.member_status === "leader")
      );
    }).length;

    // Active leaders
    const leaders = people.filter((p) => p.member_status === "leader").length;

    // Inactive/dormant - archived or no recent activity
    const inactive = people.filter(
      (p) => p.member_status === "archived",
    ).length;

    return { total, newMembers, leaders, inactive };
  });

  // Growth timeline data - people added per month (last 12 months)
  const growthData = $derived(() => {
    const months = [];
    const today = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const addedThisMonth = people.filter((p) => {
        const joinDate = new Date(p.membership_date || p.created_at);
        return joinDate >= monthStart && joinDate <= monthEnd;
      });

      const guests = addedThisMonth.filter(
        (p) => p.member_status === "visitor" || p.member_status === "guest",
      ).length;
      const members = addedThisMonth.filter(
        (p) => p.member_status === "member" || p.member_status === "leader",
      ).length;

      months.push({ month: monthKey, guests, members });
    }

    return months;
  });

  // Role distribution data
  const roleData = $derived(() => {
    const roleCounts = {};

    people.forEach((p) => {
      const role = p.role || "no_role";
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    return Object.entries(roleCounts)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);
  });

  // Load people on mount
  onMount(async () => {
    await loadPeople();
  });

  // Fetch all people from service
  async function loadPeople() {
    if (!browser) return;

    loading = true;
    error = null;

    try {
      // Dynamically import to avoid SSR issues
      const peopleService = await import("$lib/services/peopleService");
      const result = await peopleService.getAll();

      if (result.error) {
        throw result.error;
      }
      people = result.data || [];
      usingMockData = false;
    } catch (e) {
      console.warn("Failed to load from Supabase, using mock data:", e.message);
      // Fall back to mock data
      // Fall back to mock data
      // Fall back to mock data
      // MERGE basic mockPeople with Location data for the map view
      const enhancedMockData = mockPeople.map((p) => {
        const loc = mockPeopleWithLocation.find((m) => m.id === p.id);
        return loc ? { ...p, ...loc } : p;
      });
      // Also add remaining mock location people that weren't in the original list
      const existingIds = new Set(enhancedMockData.map((p) => p.id));
      const extraLocationPeople = mockPeopleWithLocation.filter(
        (p) => !existingIds.has(p.id),
      );

      people = [...enhancedMockData, ...extraLocationPeople];
      usingMockData = true;
      error = null; // Clear error since we have mock data
    } finally {
      loading = false;
    }
  }

  // Open add person modal
  function handleAddPerson() {
    selectedPerson = null;
    isFormOpen = true;
  }

  // Open edit person modal
  function handleEditPerson(person) {
    selectedPerson = person;
    isFormOpen = true;
  }

  // Open delete confirmation modal
  function handleDeleteClick(person) {
    selectedPerson = person;
    isDeleteModalOpen = true;
  }

  // Confirm delete person
  async function handleConfirmDelete() {
    if (!selectedPerson) return;

    deleting = true;

    try {
      const result = await peopleService.remove(selectedPerson.id);
      if (result.error) {
        throw result.error;
      }

      // Remove from local state
      people = people.filter((p) => p.id !== selectedPerson.id);
      isDeleteModalOpen = false;
      selectedPerson = null;
    } catch (e) {
      console.error("Error deleting person:", e);
      // Could show error toast here
    } finally {
      deleting = false;
    }
  }

  // Handle save from form
  function handleSave(savedPerson) {
    if (selectedPerson) {
      // Update existing person in list
      people = people.map((p) => (p.id === savedPerson.id ? savedPerson : p));
    } else {
      // Add new person to list
      people = [...people, savedPerson];
    }
    selectedPerson = null;
  }

  // Handle status filter change
  function handleStatusChange(e) {
    statusFilter = e.target.value;
  }

  // Handle row click
  function handleRowClick(person) {
    goto(`/people/${person.id}`);
  }
</script>

<DashboardLayout>
  <!-- Filters in the named snippet slot -->
  {#snippet filters()}
    <FilterBar />
  {/snippet}

  <div
    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
  >
    <PageHeader
      title="People Directory"
      subtitle="Manage church members, visitors, and contacts"
    />

    <Button onclick={handleAddPerson}>
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
      Add Person
    </Button>
  </div>

  <!-- Mock Data Banner -->
  {#if usingMockData}
    <div
      class="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning text-sm flex items-center gap-2"
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
        >Using demo data. Configure Supabase environment variables to connect to
        your database.</span
      >
    </div>
  {/if}

  <!-- View Toggle Tabs -->
  <div
    class="mb-6 flex items-center gap-1 p-1 bg-secondary/30 rounded-lg w-fit"
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
      List View
    </button>
    <button
      type="button"
      class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 {activeView ===
      'map'
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}"
      onclick={() => (activeView = "map")}
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
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
      Map Dashboard
    </button>
  </div>

  <!-- KPI Cards Section -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <KPICard
      title="Total People"
      value={kpis().total}
      icon="users"
      trend={null}
    />
    <KPICard
      title="New (Last 30 Days)"
      value={kpis().newMembers}
      icon="user-plus"
      variant="success"
      trend={null}
    />
    <KPICard
      title="Active Leaders"
      value={kpis().leaders}
      icon="star"
      variant="info"
      trend={null}
    />
    <KPICard
      title="Inactive/Archived"
      value={kpis().inactive}
      icon="user-x"
      variant={kpis().inactive > 0 ? "warning" : "default"}
      trend={null}
    />
  </div>

  <!-- Charts Section -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    <GrowthTimeline
      data={growthData()}
      title="People Growth (Last 12 Months)"
    />
    <RoleDistribution data={roleData()} title="People by Role" />
  </div>

  <!-- Filters Row -->
  <div class="mb-6 flex flex-wrap items-center gap-4">
    <div class="flex items-center gap-2">
      <label for="status-filter" class="text-sm text-muted-foreground"
        >Status:</label
      >
      <select
        id="status-filter"
        bind:value={statusFilter}
        class="px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm
               focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {#each statusOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <div class="flex items-center gap-2">
      <label for="role-filter" class="text-sm text-muted-foreground"
        >Role:</label
      >
      <select
        id="role-filter"
        bind:value={roleFilter}
        class="px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm
               focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {#each roleOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <div class="flex items-center gap-2">
      <label for="activity-filter" class="text-sm text-muted-foreground"
        >Activity:</label
      >
      <select
        id="activity-filter"
        bind:value={activityFilter}
        class="px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm
               focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {#each activityOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <span class="text-sm text-muted-foreground ml-auto">
      {filteredPeople().length}
      {filteredPeople().length === 1 ? "person" : "people"}
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
        Error Loading People
      </h3>
      <p class="text-muted-foreground mb-4">{error}</p>
      <Button onclick={loadPeople}>
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
    <!-- DATA TABLE VIEW -->
    {#if activeView === "list"}
      <!-- Data Table -->
      <div class="pb-10">
        <DataTable
          columns={columns.filter((c) => c.key !== "actions")}
          data={filteredPeople()}
          {loading}
          searchable
          selectable={false}
          pageSize={15}
          searchPlaceholder="Search by name, email, or phone..."
          onrowclick={handleRowClick}
        />

        <!-- Profile Quick View Cards -->
        {#if !loading && filteredPeople().length > 0}
          <div class="mt-6">
            <h4
              class="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"
            >
              <svg
                class="w-4 h-4"
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
              Quick View
            </h4>
            <div
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
            >
              {#each filteredPeople().slice(0, 8) as person}
                <ProfileQuickViewCard
                  {person}
                  onclick={() => handleRowClick(person)}
                />
              {/each}
            </div>
            {#if filteredPeople().length > 8}
              <p class="text-xs text-muted-foreground text-center py-3">
                Showing 8 of {filteredPeople().length} people. Use the table above
                for full list.
              </p>
            {/if}
          </div>
        {/if}
      </div>
    {:else}
      <!-- MAP VIEW -->
      <PeopleDashboard people={activeView === "map" ? filteredPeople() : []} />
    {/if}
  {/if}
</DashboardLayout>

<!-- Person Form Modal -->
<PersonForm
  bind:isOpen={isFormOpen}
  person={selectedPerson}
  onsave={handleSave}
/>

<!-- Delete Confirmation Modal -->
<Modal bind:isOpen={isDeleteModalOpen} title="Delete Person" size="sm">
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
      Are you sure you want to delete <strong
        >{selectedPerson?.first_name} {selectedPerson?.last_name}</strong
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
