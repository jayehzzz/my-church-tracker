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
  import { goto } from "$app/navigation";

  import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
  import { page } from "$app/state";
  import { DataTable, Modal, Button, Badge } from "$lib/components/ui";
  import PersonForm from "$lib/components/forms/PersonForm.svelte";


  import PeopleDashboard from "./PeopleDashboard.svelte";
  import * as peopleService from "$lib/services/peopleService";
  import { getConfigurationError, getDataSource, isDemoMode } from "$lib/convex.js";

  // Live databases start empty until their first response. Demo data is loaded
  // only after the explicitly selected demo service responds.
  let people = $state([]);
  let loading = $state(false);
  let error = $state(getDataSource() === "unavailable" ? getConfigurationError() : null);

  // Filter state
  let statusFilter = $state("all");
  let roleFilter = $state("all");
  let activityFilter = $state("all");

  // Modal state
  let isFormOpen = $state(false);
  let isDeleteModalOpen = $state(false);
  let selectedPerson = $state(null);
  let deleting = $state(false);

  let usingDemoData = $state(isDemoMode());
  let hasLoaded = $state(false);

  // View Mode: 'list' or 'map'
  let activeView = $derived(page.url.searchParams.get("view") === "map" ? "map" : "list");

  function setView(view) {
    const url = new URL(page.url);
    url.searchParams.set("view", view);
    goto(url, { noScroll: true, keepFocus: true });
  }

  // Status options for filter
  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "guest", label: "Guests" },
    { value: "member", label: "Members" },
    { value: "leader", label: "Leaders" },
    { value: "archived", label: "Archived" },
  ];

  // Role options for filter
  const roleOptions = [
    { value: "all", label: "All Roles" },
    { value: "basonta_leader", label: "Basonta Leaders" },
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
      visitor: "Guest",
      guest: "Guest",
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
      guest: "secondary",
      member: "default",
      leader: "success",
      archived: "destructive",
    };
    return variantMap[status] || "secondary";
  }

  // Filter people by status, role, and activity
  const filteredPeople = $derived.by(() => {
    let filtered = people || [];

    if (statusFilter !== "all") {
      filtered = filtered.filter((p) =>
        statusFilter === "guest"
          ? p.member_status === "guest" || p.member_status === "visitor"
          : p.member_status === statusFilter,
      );
    }
    if (roleFilter !== "all") {
      filtered = filtered.filter((p) => roleFilter === "no_role" ? !p.role || p.role === "no_role" : p.role === roleFilter);
    }
    if (activityFilter !== "all") {
      filtered = filtered.filter((p) => p.activity_status === activityFilter);
    }

    return filtered;
  });

  // Start on the client only; data is never substituted while it loads.
  $effect(() => {
    if (!hasLoaded) {
      hasLoaded = true;
      void loadPeople();
    }
  });

  // Fetch all people from service
  async function loadPeople() {
    loading = true;
    error = null;

    try {
      const result = await peopleService.getAll();

      if (result?.error) {
        throw result.error;
      }

      people = result?.data || [];
      usingDemoData = getDataSource() === "demo";
      error = null;
    } catch (e) {
      error = e?.message || "People could not be loaded.";
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

  // Open archive confirmation modal
  function handleDeleteClick(person) {
    selectedPerson = person;
    isDeleteModalOpen = true;
  }

  // Archive rather than deleting a record with church history.
  async function handleConfirmDelete() {
    if (!selectedPerson) return;

    deleting = true;

    try {
      const result = await peopleService.archive(selectedPerson.id);
      if (result.error) {
        throw result.error;
      }

      people = people.map((p) =>
        p.id === selectedPerson.id ? { ...p, ...result.data } : p,
      );
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
      selectedPerson = null;
    } else {
      // Add new person to list and redirect
      people = [...people, savedPerson];
      goto(`/people/${savedPerson.id}`);
    }
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
  <div
    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-in"
  >
    <header>
      <h1 class="text-3xl font-semibold tracking-tight text-foreground">People</h1>
      <p class="mt-2 text-sm text-muted-foreground">Your church directory, contact details and recorded locations.</p>
    </header>

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

  <!-- Explicit Demo Banner -->
  {#if usingDemoData}
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
        >Demo mode: sample people. Changes here do not update church records.</span
      >
    </div>
  {/if}

  <!-- View Toggle Tabs -->
  <div
    class="mb-6 relative grid grid-cols-2 gap-1 p-1 bg-secondary/30 rounded-lg w-fit animate-in delay-2 isolate"
  >
    <!-- Sliding Pill Background -->
    <div
      class="absolute top-1 bottom-1 rounded-md bg-primary shadow-sm transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
      style="
            width: calc((100% - 0.75rem) / 2);
            left: calc(0.25rem + {activeView === 'map'
        ? 1
        : 0} * ((100% - 0.75rem) / 2 + 0.25rem));
        "
    ></div>

    <button
      type="button"
      class="relative z-10 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 {activeView ===
      'list'
        ? 'text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground'}"
      aria-pressed={activeView === "list"}
      onclick={() => setView("list")}
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
      Directory
    </button>
    <button
      type="button"
      class="relative z-10 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 {activeView ===
      'map'
        ? 'text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground'}"
      aria-pressed={activeView === "map"}
      onclick={() => setView("map")}
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
      People map
    </button>
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
      {filteredPeople.length}
      {filteredPeople.length === 1 ? "person" : "people"}
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
          data={filteredPeople}
          {loading}
          searchable
          selectable={false}
          pageSize={15}
          searchPlaceholder="Search by name, email, or phone..."
          onrowclick={handleRowClick}
        />

        {#if !loading && !filteredPeople.length}
          <p class="py-10 text-center text-sm text-muted-foreground">
            {people.length ? "No people match these filters. Try a different status, role, or activity." : "No people recorded yet. Add a person to start your directory."}
          </p>
        {/if}

      </div>
    {:else}
      <!-- MAP VIEW -->
      <PeopleDashboard people={filteredPeople} {loading} />
    {/if}
  {/if}
</DashboardLayout>

<!-- Person Form Modal -->
<PersonForm
  bind:isOpen={isFormOpen}
  person={selectedPerson}
  onsave={handleSave}
/>

<!-- Archive Confirmation Modal -->
<Modal bind:isOpen={isDeleteModalOpen} title="Archive Person" size="sm">
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
      Archive <strong
        >{selectedPerson?.first_name} {selectedPerson?.last_name}</strong
      >?
    </p>
    <p class="text-sm text-muted-foreground">Their attendance, care, and follow-up history will be kept. You can restore them by changing their status later.</p>
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
        Archiving...
      {:else}
        Archive person
      {/if}
    </Button>
  {/snippet}
</Modal>
