<script>
  import { onMount } from "svelte";
  import { goto, replaceState } from "$app/navigation";
  import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import FilterBar from "$lib/components/filters/FilterBar.svelte";
  import KPICard from "$lib/components/dashboard/KPICard.svelte";
  import TaskQueue from "$lib/components/crm/TaskQueue.svelte";
  import VisitationCalendar from "$lib/components/charts/VisitationCalendar.svelte";
  import VisitationForm from "$lib/components/forms/VisitationForm.svelte";
  import CareTaskForm from "$lib/components/forms/CareTaskForm.svelte";
  import VisitationDetailModal from "$lib/components/visitation/VisitationDetailModal.svelte";
  import { Badge, Button, DataTable, Modal, Select } from "$lib/components/ui";
  import { dateRange } from "$lib/stores/filterStore";
  import * as peopleService from "$lib/services/peopleService.js";
  import * as visitationsService from "$lib/services/visitationsService.js";
  import * as followUpCrmService from "$lib/services/followUpCrmService.js";
  import * as attendanceService from "$lib/services/attendanceService.js";
  import * as servicesService from "$lib/services/servicesService.js";
  import {
    mockAttendance,
    mockPeople,
    mockServices,
    mockVisitations,
  } from "$lib/data/mockData.js";
  import {
    CARE_SIGNAL_DEFINITIONS,
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
  let activeView = $state("attention");
  let outcomeFilter = $state("all");
  let signalFilter = $state("all");
  let showAllSignals = $state(false);
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

  const today = localDate();
  const allTasks = $derived(
    enrichCareTasks(
      [...(workspace.tasks || []), ...(workspace.member_care_tasks || [])],
      people,
    ),
  );
  const taskGroups = $derived(splitCareTasks(allTasks, today));
  const attentionTasks = $derived([...taskGroups.overdue, ...taskGroups.dueToday]);
  const visitTaskGroups = $derived(
    splitCareTasks(allTasks.filter((task) => task.task_type === "visitation"), today),
  );
  const visitsNeededNow = $derived([
    ...visitTaskGroups.overdue,
    ...visitTaskGroups.dueToday,
  ]);
  const attendanceSignals = $derived(
    buildAttendanceCareSignals({ people, services, attendance, today }),
  );
  const candidates = $derived(
    buildCareCandidates({
      people,
      visitations,
      tasks: allTasks,
      attendanceSignals,
      today,
    }),
  );
  const signalOptions = $derived([
    { id: "all", label: "All signals", count: candidates.length },
    ...CARE_SIGNAL_DEFINITIONS.map((signal) => ({
      ...signal,
      count: candidates.filter((candidate) => candidate.signal_type === signal.id).length,
    })),
  ]);
  const filteredCandidates = $derived(
    signalFilter === "all"
      ? candidates
      : candidates.filter((candidate) => candidate.signal_type === signalFilter),
  );
  const visibleCandidates = $derived(
    showAllSignals ? filteredCandidates : filteredCandidates.slice(0, 4),
  );

  const filteredVisitations = $derived(() => {
    const range = $dateRange;
    return visitations.filter((visit) => {
      const inRange = !range?.startDate || !range?.endDate
        || (visit.visit_date >= range.startDate && visit.visit_date <= range.endDate);
      const matchesProfile = !profileFilterId || String(visit.person_id) === String(profileFilterId);
      return inRange && matchesProfile && (outcomeFilter === "all" || visit.outcome === outcomeFilter);
    });
  });

  const visitsThisPeriod = $derived(filteredVisitations().length);
  const overdueCount = $derived(taskGroups.overdue.length);
  const plannedCount = $derived(taskGroups.upcoming.length + taskGroups.dueToday.length);
  const needsAttentionCount = $derived(attentionTasks.length + candidates.length);

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
    { id: "attention", label: "Needs attention", count: needsAttentionCount },
    { id: "planned", label: "Planned care", count: allTasks.length },
    { id: "history", label: "Care history", count: filteredVisitations().length },
  ]);

  onMount(() => {
    void loadPage();
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const personId = params.get("personId") || "";
    const requestedView = params.get("view");
    if (["attention", "planned", "history"].includes(requestedView)) activeView = requestedView;
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
    const demoWorkspace = followUpCrmService.getDemoDashboard();
    applyPageData({
      visits: mockVisitations,
      directoryPeople: mockPeople,
      careWorkspace: demoWorkspace,
      serviceRecords: mockServices,
      attendanceRecords: mockAttendance,
      dataSource: "local",
    });
    loading = false;
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
      ].filter((task) => ["visitation", "member_care"].includes(task.task_type));
      const hasPastoralCareData = remoteCareTasks.length > 0 || (visitsResult.data || []).length > 0;
      if (hasPastoralCareData) {
        applyPageData({
          visits: visitsResult.data || [],
          directoryPeople: peopleResult.data || [],
          careWorkspace: crmResult.data || { tasks: [], member_care_tasks: [] },
          serviceRecords: servicesResult.data || [],
          attendanceRecords: attendanceResult.data || [],
          dataSource: crmResult.source || crmResult.data?.source || "convex",
        });
      }
    } catch (loadError) {
      console.warn("Using the on-device pastoral care workspace:", loadError);
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
    activeView = "planned";
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

  function candidateAge(candidate) {
    if (candidate.days_since_care === null || candidate.days_since_care === undefined) return "No recent care recorded";
    if (candidate.days_since_care === 0) return "Care recorded today";
    return `${candidate.days_since_care} day${candidate.days_since_care === 1 ? "" : "s"} since last care point`;
  }

  function selectSignalFilter(signalId) {
    signalFilter = signalId;
    showAllSignals = false;
  }

  function signalLabel(signalId) {
    return CARE_SIGNAL_DEFINITIONS.find((signal) => signal.id === signalId)?.label || "Care signal";
  }

  function taskDueLabel(task) {
    if (!task?.due_date) return "No date";
    if (task.due_date < today) {
      const days = Math.max(1, Math.round(
        (new Date(`${today}T00:00:00`) - new Date(`${task.due_date}T00:00:00`)) / 86400000,
      ));
      return `${days}d overdue`;
    }
    if (task.due_date === today) return "Today";
    return new Date(`${task.due_date}T00:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  }
</script>

<DashboardLayout>
  {#snippet filters()}
    <FilterBar />
  {/snippet}

  <div class="space-y-6 pb-10">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-in">
      <PageHeader
        title="Pastoral Care"
        subtitle="Turn attendance, outreach and profile signals into assigned, accountable care"
      />
      <div class="flex flex-wrap gap-2">
        <Button variant="secondary" onclick={() => openSchedule()}>Schedule care</Button>
        <Button onclick={() => openLogCare()}>Log care</Button>
      </div>
    </div>

    {#if source === "local" && !loading}
      <div class="flex items-start gap-3 rounded-xl border border-info/30 bg-info/10 p-4 text-sm text-info animate-in delay-1">
        <span aria-hidden="true">ℹ️</span>
        <div>
          <p class="font-medium">On-device care workspace</p>
          <p class="mt-0.5 text-xs text-info/80">The complete linked workflow is available with demo data and will use Convex automatically when connected.</p>
        </div>
      </div>
    {/if}

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-in delay-2">
      <KPICard title="Needs attention" value={needsAttentionCount} description="Open work and care signals" href="/visitation?view=attention" />
      <KPICard title="Overdue" value={overdueCount} description="Assigned tasks past due" href="/visitation?view=attention" />
      <KPICard title="Planned care" value={plannedCount} description="Today and upcoming" href="/visitation?view=planned" />
      <KPICard title="Care completed" value={visitsThisPeriod} description="Within the selected period" href="/visitation?view=history" />
    </div>

    {#if error}
      <div class="rounded-xl border border-destructive/30 bg-destructive/10 p-5" role="alert">
        <p class="font-medium text-destructive">Pastoral care could not be loaded</p>
        <p class="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button class="mt-4" variant="secondary" onclick={loadPage}>Try again</Button>
      </div>
    {/if}

    <section id="care-workspace" class="space-y-5">
      <div class="flex gap-2 overflow-x-auto rounded-xl border border-border bg-secondary/30 p-1.5">
        {#each views as view}
          <button
            type="button"
            class="flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-premium {activeView === view.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}"
            onclick={() => (activeView = view.id)}
          >
            {view.label}
            <span class="rounded-full px-1.5 py-0.5 text-xs {activeView === view.id ? 'bg-primary-foreground/20' : 'bg-background/70'}">{view.count}</span>
          </button>
        {/each}
      </div>

      {#if loading}
        <div class="grid gap-4 lg:grid-cols-2" aria-label="Loading pastoral care">
          {#each Array(4) as _}
            <div class="h-36 animate-pulse rounded-2xl border border-border bg-card/60"></div>
          {/each}
        </div>
      {:else if activeView === "attention"}
        <div class="space-y-6">
          <section class="rounded-2xl border border-border bg-card/40 p-4 sm:p-5" aria-labelledby="visit-schedule-title">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="visit-schedule-title" class="text-lg font-semibold text-foreground">Visit schedule</h2>
                <p class="mt-1 text-sm text-muted-foreground">A quick view of assigned physical visits. Calls and other care work remain in the focus list below.</p>
              </div>
              <Button size="sm" variant="ghost" onclick={() => (activeView = "planned")}>Open full plan</Button>
            </div>

            <div class="mt-4 grid gap-4 lg:grid-cols-2">
              <div class="rounded-xl border border-border/70 bg-background/60 p-3">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-sm font-semibold text-foreground">Needs a visit now</h3>
                  <Badge variant={visitsNeededNow.length ? "danger" : "success"}>{visitsNeededNow.length}</Badge>
                </div>
                {#if visitsNeededNow.length === 0}
                  <p class="mt-3 text-xs text-muted-foreground">No physical visits are overdue or due today.</p>
                {:else}
                  <div class="mt-2 divide-y divide-border/70">
                    {#each visitsNeededNow.slice(0, 3) as task}
                      <div class="flex items-center justify-between gap-3 py-2.5">
                        <div class="min-w-0">
                          <button type="button" class="truncate text-left text-sm font-medium text-foreground hover:text-primary hover:underline" onclick={() => goto(`/people/${task.person_id}`)}>{fullName(task.person)}</button>
                          <p class="truncate text-xs text-muted-foreground">{task.assigned_leader ? `With ${fullName(task.assigned_leader)}` : "Leader not assigned"}</p>
                        </div>
                        <Badge size="sm" variant={task.due_date < today ? "danger" : "default"}>{taskDueLabel(task)}</Badge>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>

              <div class="rounded-xl border border-border/70 bg-background/60 p-3">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-sm font-semibold text-foreground">Upcoming visits</h3>
                  <Badge variant="default">{visitTaskGroups.upcoming.length}</Badge>
                </div>
                {#if visitTaskGroups.upcoming.length === 0}
                  <p class="mt-3 text-xs text-muted-foreground">No future physical visits are scheduled.</p>
                {:else}
                  <div class="mt-2 divide-y divide-border/70">
                    {#each visitTaskGroups.upcoming.slice(0, 3) as task}
                      <div class="flex items-center justify-between gap-3 py-2.5">
                        <div class="min-w-0">
                          <button type="button" class="truncate text-left text-sm font-medium text-foreground hover:text-primary hover:underline" onclick={() => goto(`/people/${task.person_id}`)}>{fullName(task.person)}</button>
                          <p class="truncate text-xs text-muted-foreground">{task.assigned_leader ? `With ${fullName(task.assigned_leader)}` : "Leader not assigned"}</p>
                        </div>
                        <Badge size="sm" variant="default">{taskDueLabel(task)}</Badge>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          </section>

          <TaskQueue
            tasks={attentionTasks}
            title="Your focus now"
            description="Only overdue and due-today work appears here, ordered by due date and priority."
            initialLimit={3}
            showFreshness={false}
            onComplete={openTaskCompletion}
            onOpen={(person) => person && goto(`/people/${recordId(person)}`)}
          />

          <section class="rounded-2xl border border-border bg-card/40 p-4 sm:p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-foreground">Care signals from attendance and profiles</h2>
                <p class="mt-1 text-sm text-muted-foreground">Filter by why someone was suggested, then assign or record the next care action.</p>
              </div>
              <Badge variant={filteredCandidates.length ? "warning" : "success"}>
                {signalFilter === "all" ? `${candidates.length} suggested` : `${filteredCandidates.length} of ${candidates.length}`}
              </Badge>
            </div>

            <div class="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter care signals">
              {#each signalOptions as signal}
                <button
                  type="button"
                  class="inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors {signalFilter === signal.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'}"
                  aria-pressed={signalFilter === signal.id}
                  onclick={() => selectSignalFilter(signal.id)}
                >
                  {signal.label}
                  <span class="rounded-full px-1.5 py-0.5 {signalFilter === signal.id ? 'bg-primary-foreground/20' : 'bg-secondary text-foreground'}">{signal.count}</span>
                </button>
              {/each}
            </div>

            <details class="mt-3 rounded-xl border border-border/70 bg-secondary/20 px-4 py-3">
              <summary class="cursor-pointer text-sm font-medium text-foreground">How are care signals triggered?</summary>
              <div class="mt-3 grid gap-3 border-t border-border/70 pt-3 sm:grid-cols-2">
                {#each CARE_SIGNAL_DEFINITIONS as signal}
                  <div>
                    <p class="text-xs font-semibold text-foreground">{signal.label}</p>
                    <p class="mt-0.5 text-xs leading-5 text-muted-foreground">{signal.trigger}</p>
                  </div>
                {/each}
              </div>
              <p class="mt-3 text-xs leading-5 text-muted-foreground">Attendance signals use the six latest recorded Sunday services. A person is removed from suggestions when they already have an open care task or care was logged within the last seven days. When several rules match, the strongest attendance signal is shown.</p>
            </details>

            {#if filteredCandidates.length === 0}
              <div class="mt-4 rounded-xl border border-dashed border-border px-5 py-10 text-center">
                <p class="text-sm font-medium text-foreground">No {signalFilter === "all" ? "current" : signalLabel(signalFilter).toLowerCase()} signals need action.</p>
                <p class="mt-1 text-xs text-muted-foreground">Try another filter or wait for new attendance and profile changes.</p>
              </div>
            {:else}
              <div class="mt-4 grid gap-3 lg:grid-cols-2">
                {#each visibleCandidates as candidate}
                  <article class="rounded-xl border border-border bg-card p-4 transition-premium hover:border-primary/30">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <button
                          type="button"
                          onclick={() => goto(`/people/${candidate.person_id}`)}
                          class="truncate text-left font-semibold text-foreground hover:text-primary hover:underline"
                        >
                          {fullName(candidate.person)}
                        </button>
                        <p class="mt-1 text-xs text-muted-foreground">{candidateAge(candidate)}</p>
                      </div>
                      <div class="flex flex-wrap justify-end gap-1.5">
                        <Badge size="sm" variant="default">{signalLabel(candidate.signal_type)}</Badge>
                        <Badge size="sm" variant={candidate.priority === "urgent" ? "danger" : "warning"}>{candidate.priority}</Badge>
                      </div>
                    </div>
                    <p class="mt-3 text-sm text-foreground/90">{candidate.reason}</p>
                    <div class="mt-4 flex flex-wrap gap-2">
                      {#if candidate.person.phone}
                        <a class="inline-flex h-9 items-center rounded-lg border border-border bg-secondary px-3 text-xs font-medium hover:bg-secondary/80" href={`tel:${candidate.person.phone}`}>Call</a>
                      {/if}
                      <Button size="sm" variant="secondary" onclick={() => openLogCare(candidate.person_id)}>Log now</Button>
                      <Button size="sm" onclick={() => openSchedule(candidate)}>Assign care</Button>
                    </div>
                  </article>
                {/each}
              </div>
              {#if filteredCandidates.length > 4}
                <div class="mt-4 flex justify-center border-t border-border/70 pt-3">
                  <Button size="sm" variant="ghost" onclick={() => (showAllSignals = !showAllSignals)}>
                    {showAllSignals ? "Show fewer signals" : `Show ${filteredCandidates.length - 4} more signals`}
                  </Button>
                </div>
              {/if}
            {/if}
          </section>
        </div>
      {:else if activeView === "planned"}
        <div class="space-y-6">
          <TaskQueue
            tasks={taskGroups.dueToday}
            title="Due today"
            description="Care conversations and visits scheduled for today."
            initialLimit={3}
            showFreshness={false}
            onComplete={openTaskCompletion}
            onOpen={(person) => person && goto(`/people/${recordId(person)}`)}
          />
          <TaskQueue
            tasks={taskGroups.upcoming}
            title="Upcoming care"
            description="Future care remains visible without crowding today’s work."
            initialLimit={4}
            showFreshness={false}
            onComplete={openTaskCompletion}
            onOpen={(person) => person && goto(`/people/${recordId(person)}`)}
          />
        </div>
      {:else}
        <div id="care-history" class="space-y-6">
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

<CareTaskForm
  bind:isOpen={isTaskFormOpen}
  {people}
  initialCandidate={selectedCandidate}
  {initialPersonId}
  onsave={handleTaskSaved}
/>

<VisitationForm
  bind:isOpen={isCareFormOpen}
  visitation={selectedVisitation}
  task={selectedTask}
  {people}
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
    <p class="mt-2 text-sm text-muted-foreground">Linked completed tasks and follow-up history are retained for accountability.</p>
  </div>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isDeleteModalOpen = false)} disabled={deleting}>Cancel</Button>
    <Button variant="danger" onclick={confirmDelete} disabled={deleting} loading={deleting}>
      {deleting ? "Deleting…" : "Delete record"}
    </Button>
  {/snippet}
</Modal>
