<script>
  import { onMount } from "svelte";
  import { replaceState } from "$app/navigation";
  import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import FilterBar from "$lib/components/filters/FilterBar.svelte";
  import TaskQueue from "$lib/components/crm/TaskQueue.svelte";
  import VisitationCalendar from "$lib/components/charts/VisitationCalendar.svelte";
  import VisitationForm from "$lib/components/forms/VisitationForm.svelte";
  import CareTaskForm from "$lib/components/forms/CareTaskForm.svelte";
  import PersonForm from "$lib/components/forms/PersonForm.svelte";
  import VisitationDetailModal from "$lib/components/visitation/VisitationDetailModal.svelte";
  import { Button, DataTable, Modal, Select } from "$lib/components/ui";
  import {
    mockAttendance,
    mockPeople,
    mockServices,
    mockVisitations,
  } from "$lib/data/mockData.js";
  import { dateRange } from "$lib/stores/filterStore";
  import * as peopleService from "$lib/services/peopleService.js";
  import * as visitationsService from "$lib/services/visitationsService.js";
  import * as followUpCrmService from "$lib/services/followUpCrmService.js";
  import * as attendanceService from "$lib/services/attendanceService.js";
  import * as servicesService from "$lib/services/servicesService.js";
  import {
    buildAttendanceCareSignals,
    buildCareCandidates,
    enrichCareTasks,
    formatInteraction,
    formatOutcome,
    formatPurpose,
    fullName,
    localDate,
    recordId,
    splitCareTasks,
  } from "$lib/utils/pastoralCare.js";

  const initialDemoWorkspace = followUpCrmService.getDemoDashboard();
  const initialDemoPeople = [...new Map(
    [
      ...mockPeople,
      ...(initialDemoWorkspace.contacts || []),
      ...(initialDemoWorkspace.leaders || []),
      ...(initialDemoWorkspace.attendance_roster || []),
    ].map((person) => [String(person._id || person.id), person]),
  ).values()];

  let visitations = $state(mockVisitations);
  let people = $state(initialDemoPeople);
  let workspace = $state(initialDemoWorkspace);
  let services = $state(mockServices);
  let attendance = $state(mockAttendance);
  let loading = $state(false);
  let error = $state(null);
  let source = $state("local");
  let activeView = $state("care");
  let outcomeFilter = $state("all");
  let profileFilterId = $state("");

  let isCareFormOpen = $state(false);
  let isTaskFormOpen = $state(false);
  let isDetailModalOpen = $state(false);
  let isDeleteModalOpen = $state(false);
  let selectedVisitation = $state(null);
  let selectedTask = $state(null);
  let selectedCandidate = $state(null);
  let initialPersonId = $state("");
  let deleting = $state(false);
  let selectedPerson = $state(null);
  let isPersonFormOpen = $state(false);
  let careSuggestionsOpen = $state(true);
  let careSuggestionsExpanded = $state(false);

  const today = localDate();
  const allTasks = $derived(
    enrichCareTasks(
      [
        ...(workspace.tasks || []),
        ...(workspace.member_care_tasks || []),
        ...(workspace.visitation_tasks || []),
      ],
      people,
    ),
  );
  const pastoralMembers = $derived(
    people.filter((person) => ["member", "leader"].includes(person.member_status)),
  );
  const pastoralMemberIds = $derived(new Set(pastoralMembers.map((person) => String(recordId(person)))));
  const pastoralTasks = $derived(
    allTasks.filter((task) => pastoralMemberIds.has(String(task.person_id))),
  );
  const visitTaskGroups = $derived(
    splitCareTasks(pastoralTasks.filter((task) => task.task_type === "visitation"), today),
  );
  const visitsNeededNow = $derived([
    ...visitTaskGroups.overdue,
    ...visitTaskGroups.dueToday,
  ]);
  const careConversationTasks = $derived(pastoralTasks.filter((task) => task.task_type === "member_care"));
  const careConversationGroups = $derived(splitCareTasks(careConversationTasks, today));
  const careNowTasks = $derived([
    ...careConversationGroups.overdue,
    ...careConversationGroups.dueToday,
  ]);
  const attendanceSignals = $derived(
    buildAttendanceCareSignals({ people, services, attendance, today }),
  );
  const candidates = $derived(
    buildCareCandidates({
      people: pastoralMembers,
      visitations,
      tasks: allTasks,
      attendanceSignals,
      today,
    }),
  );
  const filteredVisitations = $derived(() => {
    const range = $dateRange;
    return visitations.filter((visit) => {
      const inRange = !range?.startDate || !range?.endDate
        || (visit.visit_date >= range.startDate && visit.visit_date <= range.endDate);
      const matchesProfile = !profileFilterId || String(visit.person_id) === String(profileFilterId);
      const isMemberCare = pastoralMemberIds.has(String(visit.person_id));
      return isMemberCare && inRange && matchesProfile && (outcomeFilter === "all" || visit.outcome === outcomeFilter);
    });
  });

  const outcomeOptions = [
    { value: "all", label: "All outcomes" },
    { value: "welcomed_encouraged", label: "Welcomed & encouraged" },
    { value: "prayer_request_received", label: "Prayer request" },
    { value: "invited_to_service", label: "Invited to service" },
    { value: "concerns_shared", label: "Concerns shared" },
    { value: "follow_up_needed", label: "Follow-up needed" },
    { value: "not_home", label: "Not home" },
  ];

  const columns = [
    { key: "visit_date", label: "Date", sortable: true, render: (value) => formatDate(value) },
    { key: "person_visited_name", label: "Person", sortable: true, render: (value) => value || "—" },
    { key: "interaction_type", label: "Method", render: (value) => formatInteraction(value) },
    { key: "purpose", label: "Purpose", render: (value) => formatPurpose(value) },
    { key: "visited_by_name", label: "Care leader", render: (value) => value || "—" },
    { key: "outcome", label: "Outcome", sortable: true, render: (value) => formatOutcome(value) },
  ];

  const views = $derived([
    { id: "care", label: "Care now", count: careNowTasks.length + candidates.length },
    { id: "visits", label: "Visits", count: visitsNeededNow.length + visitTaskGroups.upcoming.length },
    { id: "history", label: "Care history", count: filteredVisitations().length },
  ]);

  onMount(() => {
    void loadPage();
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const personId = params.get("personId") || "";
    const requestedView = params.get("view");
    if (["care", "visits", "history"].includes(requestedView)) activeView = requestedView;
    if (requestedView === "attention") activeView = "care";
    if (requestedView === "planned") activeView = "visits";
    if (personId && !action) {
      profileFilterId = personId;
      activeView = "history";
    }
    if (personId && action === "schedule") openSchedule({ person_id: personId });
    if (personId && action === "log") openLogCare(personId);
    if (action) {
      const url = new URL(window.location.href);
      url.searchParams.delete("action");
      url.searchParams.delete("personId");
      replaceState(url, {});
    }
  });

  async function loadPage() {
    loading = true;
    error = null;
    try {
      const [visitsResult, peopleResult, crmResult, servicesResult, attendanceResult] = await Promise.all([
        visitationsService.getAll(),
        peopleService.getAll(),
        followUpCrmService.getDashboard(),
        servicesService.getAll(),
        attendanceService.getAll(),
      ]);
      if (visitsResult.error) throw visitsResult.error;
      if (peopleResult.error) throw peopleResult.error;
      if (crmResult.error) throw crmResult.error;
      if (servicesResult.error) throw servicesResult.error;
      if (attendanceResult.error) throw attendanceResult.error;
      const remoteCareTasks = [
        ...(crmResult.data?.tasks || []),
        ...(crmResult.data?.member_care_tasks || []),
        ...(crmResult.data?.visitation_tasks || []),
      ].filter((task) => ["visitation", "member_care"].includes(task.task_type));
      applyPageData({
        visits: visitsResult.data || [],
        directoryPeople: peopleResult.data || [],
        careWorkspace: crmResult.data || { tasks: [], member_care_tasks: [], visitation_tasks: [] },
        serviceRecords: servicesResult.data || [],
        attendanceRecords: attendanceResult.data || [],
        dataSource: crmResult.source || crmResult.data?.source || "convex",
      });
    } catch (loadError) {
      error = loadError?.message || "Pastoral care could not be loaded.";
    } finally {
      loading = false;
    }
  }

  function applyPageData({
    visits,
    directoryPeople,
    careWorkspace,
    serviceRecords,
    attendanceRecords,
    dataSource,
  }) {
    workspace = careWorkspace;
    visitations = visits;
    services = serviceRecords;
    attendance = attendanceRecords;
    const linkedPeople = new Map();
    [
      ...directoryPeople,
      ...(workspace.contacts || []),
      ...(workspace.leaders || []),
      ...(workspace.attendance_roster || []),
    ].forEach((person) => {
      linkedPeople.set(String(recordId(person)), person);
    });
    people = [...linkedPeople.values()];
    source = dataSource;
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function openSchedule(candidate = null) {
    selectedCandidate = candidate;
    initialPersonId = candidate?.person_id || "";
    isTaskFormOpen = true;
  }

  function openLogCare(personId = "") {
    selectedVisitation = null;
    selectedTask = null;
    initialPersonId = personId;
    isCareFormOpen = true;
  }

  function openTaskCompletion(task) {
    selectedVisitation = null;
    selectedTask = task;
    initialPersonId = task.person_id;
    isCareFormOpen = true;
  }

  async function handleCareSaved(savedVisit) {
    if (selectedVisitation) {
      visitations = visitations.map((visit) =>
        recordId(visit) === recordId(savedVisit) ? savedVisit : visit,
      );
    } else {
      visitations = [savedVisit, ...visitations];
    }
    selectedVisitation = null;
    selectedTask = null;
    initialPersonId = "";
    await loadPage();
  }

  async function handleTaskSaved() {
    selectedCandidate = null;
    initialPersonId = "";
    activeView = "visits";
    await loadPage();
  }

  function openPerson(person) {
    if (!recordId(person)) return;
    selectedPerson = { ...person, id: person.id || person._id };
    isPersonFormOpen = true;
  }

  async function handlePersonSaved(savedPerson) {
    selectedPerson = savedPerson;
    await loadPage();
  }

  async function confirmDelete() {
    if (!selectedVisitation) return;
    deleting = true;
    try {
      const result = await visitationsService.remove(recordId(selectedVisitation));
      if (result.error) throw result.error;
      visitations = visitations.filter((visit) => recordId(visit) !== recordId(selectedVisitation));
      isDeleteModalOpen = false;
      selectedVisitation = null;
    } catch (deleteError) {
      error = deleteError?.message || "Unable to delete this care record";
    } finally {
      deleting = false;
    }
  }

</script>

<DashboardLayout>
  <div class="space-y-6 pb-10">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-in">
      <PageHeader
        title="Pastoral Care"
        subtitle="See who needs care now and keep physical visits in one dedicated place."
      />
      <div class="flex flex-wrap gap-2">
        <Button variant="secondary" onclick={() => openSchedule()}>Schedule visit</Button>
        <Button onclick={() => openLogCare()}>Log care</Button>
      </div>
    </div>

    {#if error}
      <div class="rounded-xl border border-destructive/30 bg-destructive/10 p-5" role="alert">
        <p class="font-medium text-destructive">Pastoral care could not be loaded</p>
        <p class="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button class="mt-4" variant="secondary" onclick={loadPage}>Try again</Button>
      </div>
    {/if}

    <section id="care-workspace" class="space-y-5">
      <div class="flex gap-1 overflow-x-auto border-b border-border">
        {#each views as view}
          <button
            type="button"
            class="flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold {activeView === view.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
            onclick={() => (activeView = view.id)}
          >
            {view.label}
            {#if view.count}<span class="rounded-full bg-secondary px-2 py-0.5 text-xs">{view.count}</span>{/if}
          </button>
        {/each}
      </div>

      {#if loading}
        <div class="grid gap-4 lg:grid-cols-2" aria-label="Loading pastoral care">
          {#each Array(4) as _}
            <div class="h-36 animate-pulse rounded-2xl border border-border bg-card/60"></div>
          {/each}
        </div>
      {:else if activeView === "care"}
        <div class="space-y-6">
          {#if careConversationTasks.length}
            <TaskQueue
              tasks={careConversationTasks}
              title="Assigned care conversations"
              description="Calls, messages and pastoral check-ins. Physical visits are kept under Visits."
              initialLimit={5}
              showFreshness={false}
              onComplete={openTaskCompletion}
              onOpen={openPerson}
            />
          {/if}

          <section class="overflow-hidden rounded-xl border border-border bg-card">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="px-5 py-4">
                <h2 class="text-lg font-semibold text-foreground">Members to check</h2>
                <p class="mt-1 text-sm text-muted-foreground">Members whose recent Sunday attendance suggests they may need support.</p>
              </div>
              {#if candidates.length}<div class="px-5 py-4"><Button size="sm" variant="ghost" onclick={() => careSuggestionsOpen = !careSuggestionsOpen}>{careSuggestionsOpen ? 'Collapse' : `Show ${candidates.length}`}</Button></div>{/if}
            </div>
            {#if candidates.length === 0}
              <p class="border-t border-border px-5 py-12 text-center text-sm text-muted-foreground">No current care suggestions need action.</p>
            {:else if careSuggestionsOpen}
              <div class="divide-y divide-border border-t border-border">
                {#each candidates.slice(0, careSuggestionsExpanded ? candidates.length : 5) as candidate}
                  <div class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0">
                      <button type="button" onclick={() => openPerson(candidate.person)} class="truncate text-left text-sm font-semibold text-foreground hover:underline">{fullName(candidate.person)}</button>
                      <p class="mt-1 text-xs text-muted-foreground">{candidate.reason}</p>
                    </div>
                    <div class="flex shrink-0 gap-2"><Button size="sm" variant="secondary" onclick={() => openLogCare(candidate.person_id)}>Log care</Button><Button size="sm" onclick={() => openSchedule(candidate)}>Plan visit</Button></div>
                  </div>
                {/each}
                {#if candidates.length > 5}<div class="flex justify-center border-t border-border px-5 py-3"><Button size="sm" variant="ghost" onclick={() => careSuggestionsExpanded = !careSuggestionsExpanded}>{careSuggestionsExpanded ? 'Show fewer' : `Show ${candidates.length - 5} more`}</Button></div>{/if}
              </div>
            {/if}
          </section>
        </div>
      {:else if activeView === "visits"}
        <div class="space-y-6">
          <TaskQueue
            tasks={visitsNeededNow}
            title="Visits needed now"
            description="Physical visits that are overdue or due today."
            initialLimit={5}
            showFreshness={false}
            onComplete={openTaskCompletion}
            onOpen={openPerson}
          />
          <TaskQueue
            tasks={visitTaskGroups.upcoming}
            title="Upcoming visits"
            description="Scheduled physical visits, ordered by date."
            initialLimit={6}
            showFreshness={false}
            onComplete={openTaskCompletion}
            onOpen={openPerson}
          />
        </div>
      {:else}
        <div id="care-history" class="space-y-6">
          <FilterBar />
          <VisitationCalendar
            data={filteredVisitations()}
            title="Pastoral care activity"
            onVisitSelect={(visit) => {
              selectedVisitation = visit;
              isDetailModalOpen = true;
            }}
          />

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-foreground">Completed care</h2>
              <p class="mt-1 text-sm text-muted-foreground">{filteredVisitations().length} interaction{filteredVisitations().length === 1 ? "" : "s"} in this view</p>
            </div>
            <div class="w-full sm:w-64">
              <Select label="Outcome" options={outcomeOptions} bind:value={outcomeFilter} />
            </div>
          </div>

          {#if profileFilterId}
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p class="text-sm text-foreground">
                Showing care for <strong>{fullName(people.find((person) => String(recordId(person)) === String(profileFilterId)))}</strong>
              </p>
              <Button size="sm" variant="ghost" onclick={() => (profileFilterId = "")}>Show everyone</Button>
            </div>
          {/if}

          <DataTable
            columns={columns}
            data={filteredVisitations()}
            {loading}
            searchable
            selectable={false}
            pageSize={15}
            searchPlaceholder="Search people, leaders, outcomes or notes…"
            emptyMessage="No pastoral care interactions match this period."
            onrowclick={(row) => {
              selectedVisitation = row;
              isDetailModalOpen = true;
            }}
          />
        </div>
      {/if}
    </section>
  </div>
</DashboardLayout>

<PersonForm bind:isOpen={isPersonFormOpen} person={selectedPerson} onsave={handlePersonSaved} />

<CareTaskForm
  bind:isOpen={isTaskFormOpen}
  people={pastoralMembers}
  initialCandidate={selectedCandidate}
  {initialPersonId}
  onsave={handleTaskSaved}
/>

<VisitationForm
  bind:isOpen={isCareFormOpen}
  visitation={selectedVisitation}
  task={selectedTask}
  people={pastoralMembers}
  {initialPersonId}
  onsave={handleCareSaved}
/>

<VisitationDetailModal
  bind:isOpen={isDetailModalOpen}
  visitation={selectedVisitation}
  onEdit={(visit) => {
    selectedVisitation = visit;
    selectedTask = null;
    isCareFormOpen = true;
  }}
  onDelete={(visit) => {
    selectedVisitation = visit;
    isDeleteModalOpen = true;
  }}
/>

<Modal bind:isOpen={isDeleteModalOpen} title="Delete Care Record" size="sm">
  <div class="text-center">
    <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive" aria-hidden="true">!</div>
    <p class="text-foreground">Delete the care record for <strong>{selectedVisitation?.person_visited_name || "this person"}</strong>?</p>
    <p class="mt-2 text-sm text-muted-foreground">The linked timeline entry will be removed and generated open work cancelled. Completed tasks stay completed. A recovery snapshot is retained for an administrator.</p>
  </div>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isDeleteModalOpen = false)} disabled={deleting}>Cancel</Button>
    <Button variant="danger" onclick={confirmDelete} disabled={deleting} loading={deleting}>
      {deleting ? "Deleting…" : "Delete record"}
    </Button>
  {/snippet}
</Modal>
