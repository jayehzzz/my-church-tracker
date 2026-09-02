<script>
  import { replaceState } from "$app/navigation";
  import { onMount } from "svelte";
  import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import FilterBar from "$lib/components/filters/FilterBar.svelte";
  import KPICard from "$lib/components/dashboard/KPICard.svelte";
  import AttendanceTrend from "$lib/components/charts/AttendanceTrend.svelte";
  import MeetingBarChart from "$lib/components/charts/MeetingBarChart.svelte";
  import MeetingPeopleComposition from "$lib/components/charts/MeetingPeopleComposition.svelte";
  import MeetingForm from "$lib/components/forms/MeetingForm.svelte";
  import MeetingProgramForm from "$lib/components/forms/MeetingProgramForm.svelte";
  import {
    Badge,
    Button,
    FullscreenWrapper,
    Input,
    Modal,
    SearchableSelect,
  } from "$lib/components/ui";
  import { dateRange } from "$lib/stores/filterStore";
  import { exportToCSV } from "$lib/utils/exportUtils";
  import {
    attendanceRecords,
    attendeeIds,
    buildMeetingAnalytics,
    filterMeetingRecords,
    meetingAttendance,
    percentageChange,
    previousDateRange,
  } from "$lib/utils/meetingAnalytics";
  import * as meetingsService from "$lib/services/meetingsService";
  import * as meetingProgramsService from "$lib/services/meetingProgramsService";
  import * as peopleService from "$lib/services/peopleService";

  let activeTab = $state("overview");
  let meetings = $state([]);
  let programs = $state([]);
  let people = $state([]);
  let loading = $state(true);
  let error = $state(null);
  const defaultAnalyticsFilters = {
    program: "all",
    category: "all",
    leader: "all",
    format: "all",
    status: "all",
    person: "all",
    personStatus: "all",
    milestone: "all",
    guestRecording: "all",
    minAttendance: "",
    maxAttendance: "",
    comparePrevious: true,
  };
  let analyticsFilters = $state({ ...defaultAnalyticsFilters });
  let isAnalyticsFiltersOpen = $state(false);
  let analyticsFilterContext = $state("Meeting analytics");
  let analyticsFiltersInitialised = $state(false);
  let peopleDrilldown = $state(null);
  let isPeopleDrilldownOpen = $state(false);

  let isMeetingFormOpen = $state(false);
  let selectedMeeting = $state(null);
  let initialProgramId = $state(null);
  let initialOneOff = $state(false);
  let isProgramFormOpen = $state(false);
  let selectedProgram = $state(null);
  let isDeleteModalOpen = $state(false);
  let deleting = $state(false);
  let hasLoaded = $state(false);

  const filteredMeetings = $derived(() => {
    const range = $dateRange;
    return filterMeetingRecords(meetings, analyticsFilters, {
      startDate: range?.startDate,
      endDate: range?.endDate,
      programs,
      people,
    });
  });

  const analytics = $derived(() =>
    buildMeetingAnalytics(filteredMeetings(), programs),
  );
  const previousRange = $derived(previousDateRange($dateRange));
  const previousMeetings = $derived(() => {
    const range = previousRange;
    if (!analyticsFilters.comparePrevious || !range) return [];
    return filterMeetingRecords(meetings, analyticsFilters, {
      startDate: range.startDate,
      endDate: range.endDate,
      programs,
      people,
    });
  });
  const previousAnalytics = $derived(() =>
    buildMeetingAnalytics(previousMeetings(), programs),
  );
  const metricTrends = $derived(() => {
    if (!analyticsFilters.comparePrevious) {
      return { held: 0, totalAttendance: 0, uniquePeople: 0, average: 0, firstTimers: 0, returnRate: 0 };
    }
    const current = analytics().metrics;
    const previous = previousAnalytics().metrics;
    return {
      held: percentageChange(current.held, previous.held),
      totalAttendance: percentageChange(
        current.totalAttendance,
        previous.totalAttendance,
      ),
      uniquePeople: percentageChange(current.uniquePeople, previous.uniquePeople),
      average: percentageChange(current.average, previous.average),
      firstTimers: percentageChange(current.firstTimers, previous.firstTimers),
      returnRate: percentageChange(current.returnRate, previous.returnRate),
    };
  });

  const programmeOptions = $derived([
    { value: "all", label: "All meetings" },
    ...programs.map((program) => ({ value: program.id, label: program.name })),
    { value: "one_off", label: "One-off events" },
  ]);

  const categoryOptions = [
    { value: "all", label: "All categories" },
    { value: "bacenta", label: "Bacenta" },
    { value: "prayer", label: "Prayer" },
    { value: "workers", label: "Workers" },
    { value: "one_off", label: "One-off events" },
    { value: "other", label: "Other" },
  ];
  const formatOptions = [
    { value: "all", label: "All formats" },
    { value: "in_person", label: "In person" },
    { value: "online", label: "Online" },
    { value: "hybrid", label: "Hybrid" },
  ];
  const statusOptions = [
    { value: "all", label: "All attendance statuses" },
    { value: "completed", label: "Complete" },
    { value: "attendance_needed", label: "Attendance needed" },
    { value: "scheduled", label: "Scheduled" },
    { value: "cancelled", label: "Cancelled" },
  ];
  const personStatusOptions = [
    { value: "all", label: "All person statuses" },
    { value: "guest", label: "Guests" },
    { value: "member", label: "Members" },
    { value: "leader", label: "Leaders" },
  ];
  const milestoneOptions = [
    { value: "all", label: "All attendance journeys" },
    { value: "first_timer", label: "Has first timers" },
    { value: "first_program", label: "Has programme firsts" },
    { value: "returning", label: "Has established attendees" },
  ];
  const guestRecordingOptions = [
    { value: "all", label: "Any guest recording" },
    { value: "named", label: "Named guests" },
    { value: "unnamed", label: "Unnamed guests" },
    { value: "both", label: "Named and unnamed" },
    { value: "none", label: "No guests recorded" },
  ];
  const personOptions = $derived([
    { value: "all", label: "All people" },
    ...people
      .filter((person) => person.member_status !== "archived")
      .sort((a, b) =>
        `${a.first_name} ${a.last_name}`.localeCompare(
          `${b.first_name} ${b.last_name}`,
        ),
      )
      .map((person) => ({
        value: person.id,
        label: `${person.first_name} ${person.last_name}`,
      })),
  ]);
  const leaderOptions = $derived(() => {
    const assignedIds = new Set(
      programs.flatMap((program) => [
        ...(program.leader_ids || []),
        ...(program.leaders || []).map((leader) => leader.id || leader._id),
      ]).map(String),
    );
    return [
      { value: "all", label: "All leaders" },
      ...people
        .filter(
          (person) =>
            assignedIds.has(String(person.id)) ||
            (assignedIds.size === 0 && person.member_status === "leader"),
        )
        .map((person) => ({
          value: person.id,
          label: `${person.first_name} ${person.last_name}`,
        })),
    ];
  });
  const activeAnalyticsFilterCount = $derived(
    Object.entries(analyticsFilters).filter(([key, value]) => {
      if (key === "comparePrevious") return false;
      return value !== defaultAnalyticsFilters[key];
    }).length,
  );

  const needsAttendance = $derived(
    filteredMeetings()
      .filter((meeting) => meeting.status === "attendance_needed")
      .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date)),
  );

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    analyticsFilters = {
      ...defaultAnalyticsFilters,
      program: params.get("programme") || "all",
      category: params.get("category") || "all",
      leader: params.get("leader") || "all",
      format: params.get("format") || "all",
      status: params.get("meetingStatus") || "all",
      person: params.get("person") || "all",
      personStatus: params.get("personStatus") || "all",
      milestone: params.get("milestone") || "all",
      guestRecording: params.get("guestRecording") || "all",
      minAttendance: params.get("minAttendance") || "",
      maxAttendance: params.get("maxAttendance") || "",
      comparePrevious: params.get("compare") !== "false",
    };
    analyticsFiltersInitialised = true;
  });

  $effect(() => {
    if (!analyticsFiltersInitialised || typeof window === "undefined") return;
    const values = { ...analyticsFilters };
    const url = new URL(window.location.href);
    const keys = {
      program: "programme",
      category: "category",
      leader: "leader",
      format: "format",
      status: "meetingStatus",
      person: "person",
      personStatus: "personStatus",
      milestone: "milestone",
      guestRecording: "guestRecording",
      minAttendance: "minAttendance",
      maxAttendance: "maxAttendance",
    };
    Object.entries(keys).forEach(([filterKey, parameter]) => {
      const value = values[filterKey];
      if (value === defaultAnalyticsFilters[filterKey]) {
        url.searchParams.delete(parameter);
      } else {
        url.searchParams.set(parameter, String(value));
      }
    });
    if (values.comparePrevious) url.searchParams.delete("compare");
    else url.searchParams.set("compare", "false");
    if (url.href !== window.location.href) replaceState(url, {});
  });

  $effect(() => {
    if (hasLoaded) return;
    hasLoaded = true;
    void loadPage();
  });

  async function loadPage() {
    loading = true;
    error = null;
    try {
      const initialization = meetingProgramsService.initialize();
      const [programResult, meetingResult, peopleResult] = await Promise.all([
        meetingProgramsService.getAll(),
        meetingsService.getAll(),
        peopleService.getAll(),
      ]);
      if (programResult.error) throw programResult.error;
      if (meetingResult.error) throw meetingResult.error;
      if (peopleResult.error) throw peopleResult.error;
      programs = programResult.data || [];
      meetings = meetingResult.data || [];
      people = peopleResult.data || [];
      loading = false;

      initialization.then(async (result) => {
        if (result.error) return;
        const [freshPrograms, freshMeetings] = await Promise.all([
          meetingProgramsService.getAll(),
          meetingsService.getAll(),
        ]);
        if (!freshPrograms.error && freshPrograms.data?.length) {
          programs = freshPrograms.data;
        }
        if (!freshMeetings.error) meetings = freshMeetings.data || [];
      });
    } catch (loadError) {
      error = loadError.message || "Could not load meetings and attendance.";
    } finally {
      loading = false;
    }
  }

  function attendanceCount(meeting) {
    return (
      meeting.display_attendance_count ??
      meeting.total_attendance ??
      meeting.attendance_count ??
      0
    );
  }

  function namedAttendanceCount(meeting) {
    return meeting.named_attendance_count ?? meeting.attendee_ids?.length ?? 0;
  }

  function programmeName(meeting) {
    if (meeting.title) return meeting.title;
    if (meeting.program?.name) return meeting.program.name;
    const map = {
      bacenta: "Bacenta",
      flow_service: "Flow Service",
      flow_prayer: "Flow Service",
      acts_prayer: "Acts Prayer",
      farley_prayer: "Acts Prayer",
      shemen_prayer: "Shemen Prayer",
      workers_meeting: "Workers Meeting",
      all_night_prayer: "All-Night Prayer",
      basonta: "Basonta",
      sat: "SAT",
      evangelistic_event: "Evangelistic event",
      special_event: "Special event",
      training: "Training / workshop",
      fellowship: "Fellowship / social",
    };
    return map[meeting.meeting_type] || "Other meeting";
  }

  function formatDate(date) {
    if (!date) return "Date not set";
    return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(meeting) {
    if (!meeting.start_time) return "Time not recorded";
    return meeting.end_time
      ? `${meeting.start_time}–${meeting.end_time}`
      : meeting.start_time;
  }

  function formatFormat(format) {
    return {
      in_person: "In person",
      online: "Online",
      hybrid: "Hybrid",
    }[format] || "In person";
  }

  function formatDay(day) {
    if (!day) return "No fixed day";
    return day.charAt(0).toUpperCase() + day.slice(1);
  }

  function statusLabel(status) {
    return {
      scheduled: "Scheduled",
      attendance_needed: "Attendance needed",
      completed: "Complete",
      cancelled: "Cancelled",
    }[status] || "Complete";
  }

  function statusVariant(status) {
    return {
      scheduled: "info",
      attendance_needed: "warning",
      completed: "success",
      cancelled: "danger",
    }[status] || "success";
  }

  function leaderNames(program) {
    const leaders = program?.leaders || [];
    if (!leaders.length) return "No leader assigned";
    return leaders
      .map((leader) => `${leader.first_name} ${leader.last_name}`.trim())
      .join(", ");
  }

  function resetAnalyticsFilters() {
    analyticsFilters = { ...defaultAnalyticsFilters };
  }

  function openAnalyticsFilters(context = "Meeting analytics") {
    analyticsFilterContext = context;
    isAnalyticsFiltersOpen = true;
  }

  function attendanceMilestoneCount(meeting, key) {
    return attendanceRecords(meeting).filter((record) => {
      if (key === "first_timer") return record.first_timer;
      if (key === "first_program") {
        return record.first_program_attendance && !record.first_timer;
      }
      return false;
    }).length;
  }

  function openPeopleDrilldown(item, title, subtitle = "") {
    const ids = new Set((item?.personIds || []).map(String));
    const records = people
      .filter((person) => ids.has(String(person.id)))
      .map((person) => {
        const attendedMeetings = filteredMeetings().filter((meeting) =>
          attendeeIds(meeting).includes(String(person.id)),
        );
        return {
          ...person,
          attendance_count: attendedMeetings.length,
          last_attended: attendedMeetings
            .map((meeting) => meeting.meeting_date)
            .sort()
            .at(-1),
        };
      })
      .sort(
        (a, b) =>
          b.attendance_count - a.attendance_count ||
          `${a.first_name} ${a.last_name}`.localeCompare(
            `${b.first_name} ${b.last_name}`,
          ),
      );
    peopleDrilldown = { title, subtitle, people: records };
    isPeopleDrilldownOpen = true;
  }

  function openTrendDrilldown(point) {
    openPeopleDrilldown(
      point,
      point.topic || "Meeting attendance",
      `${formatDate(point.date)} · ${point.total} total attendance`,
    );
  }

  function exportFilteredMeetings() {
    const rows = filteredMeetings().map((meeting) => ({
      date: meeting.meeting_date,
      meeting: programmeName(meeting),
      category: meeting.program?.category || (!meeting.program_id ? "one-off" : "other"),
      format: formatFormat(meeting.format),
      status: statusLabel(meeting.status),
      location: meeting.location || meeting.online_url || "",
      named_attendance: namedAttendanceCount(meeting),
      unnamed_guests: Number(meeting.unnamed_guests_count || 0),
      total_attendance: meetingAttendance(meeting),
      first_timers: attendanceMilestoneCount(meeting, "first_timer"),
      programme_firsts: attendanceMilestoneCount(meeting, "first_program"),
      leaders: leaderNames(meeting.program),
    }));
    exportToCSV(rows, `meeting-attendance-${new Date().toISOString().slice(0, 10)}`, [
      { key: "date", label: "Date" },
      { key: "meeting", label: "Meeting" },
      { key: "category", label: "Category" },
      { key: "format", label: "Format" },
      { key: "status", label: "Status" },
      { key: "location", label: "Location" },
      { key: "named_attendance", label: "Named Attendance" },
      { key: "unnamed_guests", label: "Unnamed Guests" },
      { key: "total_attendance", label: "Total Attendance" },
      { key: "first_timers", label: "First Timers" },
      { key: "programme_firsts", label: "Programme Firsts" },
      { key: "leaders", label: "Leaders" },
    ]);
  }

  function openNewMeeting(programId = null) {
    selectedMeeting = null;
    initialProgramId = programId;
    initialOneOff = false;
    isMeetingFormOpen = true;
  }

  function openOneOffMeeting() {
    selectedMeeting = null;
    initialProgramId = null;
    initialOneOff = true;
    isMeetingFormOpen = true;
  }

  function openMeeting(meeting) {
    selectedMeeting = meeting;
    initialProgramId = meeting.program_id || null;
    initialOneOff = !meeting.program_id;
    isMeetingFormOpen = true;
  }

  function openNewProgram(type = null) {
    selectedProgram = type
      ? {
          name: "",
          meeting_type: type,
          category: type === "bacenta" ? "bacenta" : "other",
          default_format: "in_person",
          leader_ids: [],
          member_ids: [],
          active: true,
        }
      : null;
    isProgramFormOpen = true;
  }

  function openProgram(program) {
    selectedProgram = program;
    isProgramFormOpen = true;
  }

  async function handleMeetingSaved() {
    const result = await meetingsService.getAll();
    if (!result.error) meetings = result.data || [];
  }

  async function handleProgramSaved() {
    const result = await meetingProgramsService.getAll();
    if (!result.error) programs = result.data || [];
  }

  function requestDelete(meeting) {
    selectedMeeting = meeting;
    isDeleteModalOpen = true;
  }

  async function confirmDelete() {
    if (!selectedMeeting) return;
    deleting = true;
    const result = await meetingsService.remove(selectedMeeting.id);
    if (!result.error) {
      meetings = meetings.filter(
        (meeting) => meeting.id !== selectedMeeting.id,
      );
      isDeleteModalOpen = false;
      selectedMeeting = null;
    } else {
      error = result.error.message || "Could not delete this meeting.";
    }
    deleting = false;
  }
</script>

<DashboardLayout>
  {#snippet filters()}
    <FilterBar />
  {/snippet}

  <div class="pb-12">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <PageHeader
        title="Meetings & Attendance"
        subtitle="Track attendance for recurring programmes and one-off church events"
      />
      <div class="flex flex-wrap gap-2">
        <Button variant="secondary" onclick={openOneOffMeeting}>One-off event</Button>
        <Button onclick={() => openNewMeeting()}>
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Record attendance
        </Button>
      </div>
    </div>

    <div class="mb-6 flex w-fit gap-1 rounded-xl border border-border bg-secondary/30 p-1">
      {#each [
        { id: "overview", label: "Overview" },
        { id: "attendance", label: "Attendance" },
        { id: "setup", label: "Meeting setup" },
      ] as tab}
        <button
          type="button"
          onclick={() => (activeTab = tab.id)}
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
        >
          {tab.label}
          {#if tab.id === "attendance" && needsAttendance.length > 0}
            <span class="ml-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-xs text-warning">
              {needsAttendance.length}
            </span>
          {/if}
        </button>
      {/each}
    </div>

    {#if error}
      <div class="mb-6 flex items-center justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <span>{error}</span>
        <Button variant="secondary" size="sm" onclick={loadPage}>Retry</Button>
      </div>
    {/if}

    {#if loading}
      <div class="flex h-64 items-center justify-center">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    {:else if activeTab === "overview"}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="People attending"
          value={analytics().metrics.uniquePeople}
          trend={metricTrends().uniquePeople}
          description="Unique named people"
        />
        <KPICard
          title="Average attendance"
          value={analytics().metrics.average}
          trend={metricTrends().average}
          description="Average per meeting"
        />
        <KPICard
          title="First timers"
          value={analytics().metrics.firstTimers}
          trend={metricTrends().firstTimers}
          description="First-ever church attendance"
        />
        <KPICard
          title="First-timer return rate"
          value={analytics().metrics.returnRate}
          format="percentage"
          trend={metricTrends().returnRate}
          description="Returned later in this period"
        />
      </div>

      <section class="mt-6 rounded-2xl border border-primary/20 bg-primary/[0.04] p-5" aria-labelledby="quick-record-title">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="quick-record-title" class="text-lg font-semibold text-foreground">Quick record</h2>
            <p class="mt-1 text-sm text-muted-foreground">Start with a regular programme or record a one-off gathering.</p>
          </div>
          <span class="text-xs font-medium uppercase tracking-wider text-primary">Add attendance</span>
        </div>
        <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {#each programs as program}
            <button
              type="button"
              onclick={() => openNewMeeting(program.id)}
              class="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
            >
              <span>
                <span class="block text-sm font-medium text-foreground">{program.name}</span>
                <span class="mt-0.5 block text-xs text-muted-foreground">
                  {formatFormat(program.default_format)}{program.default_day ? ` · ${formatDay(program.default_day)}` : ""}
                </span>
              </span>
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-lg leading-none text-primary">+</span>
            </button>
          {/each}
          <button
            type="button"
            onclick={openOneOffMeeting}
            class="flex items-center justify-between rounded-xl border border-dashed border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
          >
            <span>
              <span class="block text-sm font-medium text-foreground">One-off / special event</span>
              <span class="mt-0.5 block text-xs text-muted-foreground">Evangelism, training, fellowship or another rare meeting</span>
            </span>
            <span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-lg leading-none text-primary">+</span>
          </button>
        </div>
      </section>

      {#if needsAttendance.length > 0}
        <section class="mt-6 rounded-2xl border border-warning/30 bg-warning/5 p-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-foreground">Attendance still needs finishing</h2>
              <p class="mt-1 text-sm text-muted-foreground">
                Complete these records so member histories and reports stay accurate.
              </p>
            </div>
            <Button variant="secondary" size="sm" onclick={() => (activeTab = "attendance")}>
              View all
            </Button>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {#each needsAttendance.slice(0, 4) as meeting}
              <button
                type="button"
                onclick={() => openMeeting(meeting)}
                class="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40"
              >
                <span>
                  <span class="block font-medium text-foreground">{programmeName(meeting)}</span>
                  <span class="mt-1 block text-xs text-muted-foreground">{formatDate(meeting.meeting_date)}</span>
                </span>
                <span class="text-sm font-medium text-primary">Take attendance →</span>
              </button>
            {/each}
          </div>
        </section>
      {/if}

      <section class="mt-6">
        <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-foreground">Attendance analytics</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Use Filter on a graph to refine the dashboard. Click its data to see the people behind it.
            </p>
          </div>
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{filteredMeetings().length} matching meeting{filteredMeetings().length === 1 ? "" : "s"}</span>
            {#if activeAnalyticsFilterCount > 0}
              <button type="button" class="font-medium text-primary hover:underline" onclick={resetAnalyticsFilters}>
                Clear {activeAnalyticsFilterCount} filter{activeAnalyticsFilterCount === 1 ? "" : "s"}
              </button>
            {/if}
          </div>
        </div>
        <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
          <FullscreenWrapper title="Attendance over time">
            {#snippet filters()}
              <FilterBar compact />
            {/snippet}
            <AttendanceTrend
              data={analytics().trendData.slice(-18)}
              title="Attendance over time"
              itemLabel="meetings"
              secondaryLabel="Unnamed"
              onPointClick={openTrendDrilldown}
              onFilterClick={openAnalyticsFilters}
              {activeAnalyticsFilterCount}
              comparisonOptions={[
                { key: "guests", label: "Unnamed guests", color: "warning" },
                { key: "firstTimers", label: "First timers", color: "warning" },
                { key: "programmeFirsts", label: "Programme firsts", color: "success" },
              ]}
            />
          </FullscreenWrapper>
          <FullscreenWrapper title="Attendance journey">
            <MeetingPeopleComposition
              data={analytics().peopleComposition}
              onFilterClick={openAnalyticsFilters}
              {activeAnalyticsFilterCount}
              onSegmentClick={(item) =>
                openPeopleDrilldown(
                  item,
                  item.label,
                  `${item.value} unique ${item.value === 1 ? "person" : "people"}`,
                )}
            />
          </FullscreenWrapper>
          <FullscreenWrapper title="Programme comparison">
            <MeetingBarChart
              data={analytics().programmeData}
              title="Programme comparison"
              subtitle="Average attendance per meeting"
              onFilterClick={openAnalyticsFilters}
              {activeAnalyticsFilterCount}
              onBarClick={(item) =>
                openPeopleDrilldown(
                  item,
                  `${item.label} attendees`,
                  `${item.meetingCount} meeting${item.meetingCount === 1 ? "" : "s"} · ${item.uniquePeople} unique people`,
                )}
            />
          </FullscreenWrapper>
          <FullscreenWrapper title="Roster attendance">
            <MeetingBarChart
              data={analytics().rosterData}
              title="Roster attendance"
              subtitle="Present roster places across the selected meetings"
              unit="%"
              color="success"
              onFilterClick={openAnalyticsFilters}
              {activeAnalyticsFilterCount}
              onBarClick={(item) =>
                openPeopleDrilldown(
                  { ...item, personIds: item.rosterPersonIds },
                  `${item.label} roster attendance`,
                  `${item.rosterRate}% of roster opportunities attended`,
                )}
            />
          </FullscreenWrapper>
        </div>
      </section>

      <div class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section class="rounded-2xl border border-border bg-card p-5">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-foreground">Recent meetings</h2>
              <p class="mt-1 text-sm text-muted-foreground">Your latest recorded attendance</p>
            </div>
            <button type="button" class="text-sm font-medium text-primary hover:underline" onclick={() => (activeTab = "attendance")}>See all</button>
          </div>
          {#if filteredMeetings().length === 0}
            <div class="mt-4 rounded-xl bg-secondary/25 p-8 text-center">
              <p class="text-sm text-muted-foreground">No meetings have been recorded yet.</p>
              <Button size="sm" class="mt-4" onclick={() => openNewMeeting()}>Record the first meeting</Button>
            </div>
          {:else}
            <div class="mt-4 divide-y divide-border">
              {#each filteredMeetings().slice(0, 6) as meeting}
                <button
                  type="button"
                  onclick={() => openMeeting(meeting)}
                  class="flex w-full items-center justify-between gap-4 py-4 text-left hover:bg-secondary/20"
                >
                  <span class="min-w-0">
                    <span class="flex items-center gap-2">
                      <span class="truncate font-medium text-foreground">{programmeName(meeting)}</span>
                      <Badge variant={statusVariant(meeting.status)} size="sm">{statusLabel(meeting.status)}</Badge>
                    </span>
                    <span class="mt-1 block text-xs text-muted-foreground">
                      {formatDate(meeting.meeting_date)} · {formatTime(meeting)}
                    </span>
                  </span>
                  <span class="flex-shrink-0 text-right">
                    <span class="block text-lg font-semibold text-foreground">{attendanceCount(meeting)}</span>
                    <span class="text-xs text-muted-foreground">attended</span>
                  </span>
                </button>
              {/each}
            </div>
          {/if}
        </section>

      </div>
    {:else if activeTab === "attendance"}
      <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-foreground">Attendance records</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {filteredMeetings().length} meeting{filteredMeetings().length === 1 ? "" : "s"}
            {activeAnalyticsFilterCount > 0 ? ` · ${activeAnalyticsFilterCount} filter${activeAnalyticsFilterCount === 1 ? "" : "s"} active` : " in the selected period"}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          {#if activeAnalyticsFilterCount > 0}
            <Button variant="ghost" size="sm" onclick={resetAnalyticsFilters}>Clear filters</Button>
          {/if}
          <Button variant="secondary" size="sm" onclick={() => openAnalyticsFilters("Attendance records")}>Filter attendance</Button>
          <Button variant="secondary" size="sm" onclick={exportFilteredMeetings} disabled={filteredMeetings().length === 0}>Export CSV</Button>
        </div>
      </div>

      {#if filteredMeetings().length === 0}
        <div class="rounded-2xl border border-dashed border-border p-12 text-center">
          <h2 class="font-semibold text-foreground">No meetings in this period</h2>
          <p class="mt-1 text-sm text-muted-foreground">Record attendance or change the date filter.</p>
          <Button class="mt-4" onclick={() => openNewMeeting()}>Record attendance</Button>
        </div>
      {:else}
        <div class="space-y-3">
          {#each filteredMeetings() as meeting}
            <article class="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30 sm:p-5">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div class="flex min-w-0 items-start gap-4">
                  <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <h2 class="font-semibold text-foreground">{programmeName(meeting)}</h2>
                      <Badge variant={statusVariant(meeting.status)} size="sm">{statusLabel(meeting.status)}</Badge>
                      <Badge variant="default" size="sm">{formatFormat(meeting.format)}</Badge>
                    </div>
                    <p class="mt-1 text-sm text-muted-foreground">
                      {formatDate(meeting.meeting_date)} · {formatTime(meeting)}
                    </p>
                    <p class="mt-1 truncate text-xs text-muted-foreground">
                      {meeting.location || meeting.online_url || "No location recorded"}
                    </p>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-5 lg:justify-end">
                  <div>
                    <p class="text-2xl font-semibold text-foreground">{attendanceCount(meeting)}</p>
                    <p class="text-xs text-muted-foreground">
                      {namedAttendanceCount(meeting)} named{meeting.unnamed_guests_count ? ` + ${meeting.unnamed_guests_count} guests` : ""}
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <Button
                      size="sm"
                      variant={meeting.status === "attendance_needed" ? "primary" : "secondary"}
                      onclick={() => openMeeting(meeting)}
                    >
                      {meeting.status === "attendance_needed" ? "Take attendance" : "Edit attendance"}
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Delete meeting" onclick={() => requestDelete(meeting)}>
                      <svg class="h-4 w-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    {:else}
      <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-foreground">Meeting programmes</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Set the usual schedule and leaders once. A roster is the expected group for that programme; only people marked present count as attendees.
          </p>
        </div>
        <div class="flex gap-2">
          <Button variant="secondary" onclick={() => openNewProgram("bacenta")}>+ Add Bacenta</Button>
          <Button onclick={() => openNewProgram()}>+ Add programme</Button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {#each programs as program}
          <article class="flex min-h-64 flex-col rounded-2xl border border-border bg-card p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <Badge variant={program.category === "bacenta" ? "info" : program.category === "prayer" ? "success" : "default"} size="sm">
                  {program.category === "bacenta" ? "Bacenta" : program.category === "workers" ? "Workers" : program.category === "prayer" ? "Prayer" : "Other"}
                </Badge>
                <h3 class="mt-3 text-lg font-semibold text-foreground">{program.name}</h3>
              </div>
              <button type="button" class="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" onclick={() => openProgram(program)} aria-label="Edit {program.name}">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <p class="mt-2 text-sm text-muted-foreground">{program.description || "No description added"}</p>
            <dl class="mt-5 space-y-3 text-sm">
              <div class="flex justify-between gap-4">
                <dt class="text-muted-foreground">Schedule</dt>
                <dd class="text-right font-medium text-foreground">
                  {formatDay(program.default_day)}{program.default_start_time ? ` · ${program.default_start_time}` : ""}
                </dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-muted-foreground">Format</dt>
                <dd class="text-right font-medium text-foreground">{formatFormat(program.default_format)}</dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-muted-foreground">Leader</dt>
                <dd class="max-w-[65%] text-right font-medium text-foreground">{leaderNames(program)}</dd>
              </div>
              {#if program.category === "bacenta" || program.category === "workers"}
                <div class="flex justify-between gap-4">
                  <dt class="text-muted-foreground">Roster</dt>
                  <dd class="font-medium text-foreground">{program.member_ids?.length || 0} people</dd>
                </div>
              {/if}
            </dl>
            <div class="mt-auto pt-5">
              <Button fullWidth variant="secondary" onclick={() => openNewMeeting(program.id)}>
                Record {program.name} attendance
              </Button>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </div>
</DashboardLayout>

{#if isMeetingFormOpen}
  <MeetingForm
    bind:isOpen={isMeetingFormOpen}
    meeting={selectedMeeting}
    {programs}
    {people}
    {meetings}
    {initialProgramId}
    {initialOneOff}
    onsave={handleMeetingSaved}
  />
{/if}

{#if isProgramFormOpen}
  <MeetingProgramForm
    bind:isOpen={isProgramFormOpen}
    program={selectedProgram}
    {people}
    onsave={handleProgramSaved}
  />
{/if}

<Modal
  bind:isOpen={isAnalyticsFiltersOpen}
  title={`Filter ${analyticsFilterContext}`}
  size="xl"
>
  <div class="space-y-5">
    <div class="flex items-center justify-between gap-3 rounded-xl bg-secondary/30 p-3">
      <p class="text-sm text-muted-foreground">
        These choices update every graph and attendance record. The date range is controlled above the page.
      </p>
      {#if activeAnalyticsFilterCount > 0}
        <span class="flex-shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {activeAnalyticsFilterCount} active
        </span>
      {/if}
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SearchableSelect label="Programme" bind:value={analyticsFilters.program} options={programmeOptions} />
      <SearchableSelect label="Category" bind:value={analyticsFilters.category} options={categoryOptions} />
      <SearchableSelect label="Leader" bind:value={analyticsFilters.leader} options={leaderOptions()} />
      <SearchableSelect label="Person" bind:value={analyticsFilters.person} options={personOptions} />
    </div>

    <details class="rounded-xl border border-border">
      <summary class="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
        More filters
      </summary>
      <div class="grid grid-cols-1 gap-4 border-t border-border p-4 sm:grid-cols-2">
        <SearchableSelect label="Format" bind:value={analyticsFilters.format} options={formatOptions} />
        <SearchableSelect label="Attendance status" bind:value={analyticsFilters.status} options={statusOptions} />
        <SearchableSelect label="Person status" bind:value={analyticsFilters.personStatus} options={personStatusOptions} />
        <SearchableSelect label="Attendance journey" bind:value={analyticsFilters.milestone} options={milestoneOptions} />
        <SearchableSelect label="Guest recording" bind:value={analyticsFilters.guestRecording} options={guestRecordingOptions} />
        <Input label="Minimum attendance" type="number" min="0" bind:value={analyticsFilters.minAttendance} />
        <Input label="Maximum attendance" type="number" min="0" bind:value={analyticsFilters.maxAttendance} />
        <label class="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2">
          <input type="checkbox" bind:checked={analyticsFilters.comparePrevious} class="h-4 w-4 rounded border-border accent-primary" />
          <span>
            <span class="block text-sm font-medium text-foreground">Compare previous period</span>
            <span class="block text-xs text-muted-foreground">Show changes on headline numbers</span>
          </span>
        </label>
      </div>
    </details>

    <p class="text-xs text-muted-foreground">
      Filters are saved in the page URL, so the same view can be bookmarked or shared.
    </p>
  </div>
  {#snippet footer()}
    {#if activeAnalyticsFilterCount > 0}
      <Button variant="ghost" onclick={resetAnalyticsFilters}>Clear filters</Button>
    {/if}
    <Button onclick={() => (isAnalyticsFiltersOpen = false)}>View results</Button>
  {/snippet}
</Modal>

<Modal
  bind:isOpen={isPeopleDrilldownOpen}
  title={peopleDrilldown?.title || "People behind this data"}
  size="md"
>
  <div class="space-y-4">
    {#if peopleDrilldown?.subtitle}
      <p class="text-sm text-muted-foreground">{peopleDrilldown.subtitle}</p>
    {/if}
    {#if peopleDrilldown?.people?.length}
      <div class="max-h-[55vh] divide-y divide-border overflow-y-auto rounded-xl border border-border">
        {#each peopleDrilldown.people as person}
          <a
            href="/people/{person.id}"
            class="flex items-center justify-between gap-4 p-3 transition-colors hover:bg-secondary/30"
          >
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium text-foreground">
                {person.first_name} {person.last_name}
              </span>
              <span class="block text-xs capitalize text-muted-foreground">
                {person.member_status === "visitor" ? "Guest" : person.member_status || "Guest"}
                {person.last_attended ? ` · Last attended ${formatDate(person.last_attended)}` : ""}
              </span>
            </span>
            <span class="flex-shrink-0 text-right">
              <span class="block text-base font-semibold text-foreground">{person.attendance_count}</span>
              <span class="block text-[11px] text-muted-foreground">meeting{person.attendance_count === 1 ? "" : "s"}</span>
            </span>
          </a>
        {/each}
      </div>
    {:else}
      <div class="rounded-xl border border-dashed border-border p-8 text-center">
        <p class="text-sm text-muted-foreground">
          No named people are available for this data point. Its total may include unnamed guests.
        </p>
      </div>
    {/if}
  </div>
</Modal>

<Modal bind:isOpen={isDeleteModalOpen} title="Delete meeting" size="sm">
  <div class="space-y-3 text-center">
    <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
    <p class="text-foreground">
      Delete <strong>{selectedMeeting ? programmeName(selectedMeeting) : "this meeting"}</strong>
      and its attendance from {selectedMeeting ? formatDate(selectedMeeting.meeting_date) : "this date"}?
    </p>
    <p class="text-sm text-muted-foreground">This cannot be undone.</p>
  </div>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isDeleteModalOpen = false)} disabled={deleting}>Cancel</Button>
    <Button variant="danger" onclick={confirmDelete} loading={deleting}>Delete meeting</Button>
  {/snippet}
</Modal>
