<!--
  WeeklyAttendanceMatrix.svelte
  Person-by-person Sunday attendance across the most recent recorded weeks.
-->

<script>
  import { goto } from "$app/navigation";
  import { Modal } from "$lib/components/ui";
  import SundayReliabilitySummary from "$lib/components/shared/SundayReliabilitySummary.svelte";
  import { summarizeSundayCommitments } from "$lib/utils/sundayReliability.js";

  let {
    services = [],
    people = [],
    commitments = [],
    commitmentsUnavailable = false,
    title = "Weekly attendance patterns",
    maxServices = 8,
    initialServiceCount = maxServices,
    initialPeopleLimit = 12,
    onServiceClick = null,
  } = $props();

  let showAllPeople = $state(false);
  let searchQuery = $state("");
  let attendanceFilter = $state("all");
  let sortOption = $state("missed_desc");
  let selectedSunday = $state("all");
  let historyWindow = $state("all");
  let visibleServiceCount = $state(0);
  let matrixScroller = $state();
  let matrixViewportWidth = $state(960);
  let positionedAtLatest = false;
  let selectedAttendanceRow = $state(null);
  let showAttendanceSummary = $state(false);
  let modalHistoryWindow = $state("all");
  let modalAttendanceFilter = $state("all");

  $effect(() => {
    if (!visibleServiceCount) visibleServiceCount = initialServiceCount;
  });

  function recordId(record) {
    return String(record?.id ?? record?._id ?? record ?? "");
  }

  function parseDate(value) {
    if (!value) return null;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function isSundayService(service) {
    const date = parseDate(service?.service_date);
    return date?.getDay() === 0;
  }

  function formatColumnDate(value) {
    const date = parseDate(value);
    if (!date) return { day: "—", month: "" };
    return {
      day: date.toLocaleDateString("en-GB", { day: "numeric" }),
      month: date.toLocaleDateString("en-GB", { month: "short" }),
    };
  }

  function formatFullDate(value) {
    const date = parseDate(value);
    if (!date) return "Unknown date";
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatCompactDate(value) {
    const date = parseDate(value);
    if (!date) return "Not recorded";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  function fullName(person) {
    return `${person?.first_name || ""} ${person?.last_name || ""}`.trim() ||
      "Unnamed person";
  }

  function initials(person) {
    return [person?.first_name, person?.last_name]
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2) || "?";
  }

  function commitmentsForPerson(person) {
    const personId = recordId(person);
    return (commitments || []).filter(
      (commitment) => recordId(commitment?.person_id) === personId,
    );
  }

  function isExpectedPerson(person) {
    return (
      ["member", "leader"].includes(person?.member_status) &&
      person?.activity_status !== "dormant"
    );
  }

  function firstRecordedSunday(person) {
    const personId = recordId(person);
    const dates = (services || [])
      .filter((service) =>
        isSundayService(service) &&
        (service.individuals || []).some((attendee) => recordId(attendee) === personId),
      )
      .map((service) => service.service_date)
      .filter(Boolean)
      .sort();
    return dates[0] || null;
  }

  function attendanceStartInfo(person) {
    const candidates = [
      { value: person?.membership_date, source: "membership date" },
      { value: person?.first_visit_date, source: "first visit" },
      { value: firstRecordedSunday(person), source: "first recorded Sunday" },
    ]
      .map((candidate) => ({ ...candidate, date: parseDate(candidate.value) }))
      .filter((candidate) => candidate.date)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return candidates[0] || null;
  }

  function wasExpected(person, serviceDate) {
    const start = attendanceStartInfo(person);
    const startDate = start?.date;
    const date = parseDate(serviceDate);
    // Imported/current member status alone does not prove somebody was expected
    // at historical Sundays. Only assess absence after a dated church record.
    if (!startDate || !date) return false;
    return startDate <= date;
  }

  function statusForPerson(person, service) {
    if (!wasExpected(person, service.service_date)) {
      return { state: "not-expected", service };
    }
    const personId = recordId(person);
    const attendeeIds = new Set(
      (service.individuals || []).map((attendee) => recordId(attendee)),
    );
    return {
      state: attendeeIds.has(personId) ? "present" : "missed",
      service,
    };
  }

  const allRecentServices = $derived(() =>
    (services || [])
      .filter(
        (service) =>
          isSundayService(service) &&
          Array.isArray(service?.individuals) &&
          service.individuals.length > 0,
      )
      .sort(
        (a, b) =>
          (parseDate(b.service_date)?.getTime() || 0) -
          (parseDate(a.service_date)?.getTime() || 0),
      )
      .slice(0, maxServices)
      .reverse(),
  );

  const historyOptions = $derived(() =>
    [4, 8, 12, 16, 24].filter((count) => count < allRecentServices().length),
  );

  const periodServices = $derived(() => {
    const history = allRecentServices();
    if (historyWindow === "all") return history;
    const count = Number(historyWindow);
    return Number.isFinite(count) ? history.slice(-count) : history;
  });

  const sundayOptions = $derived(() => [...periodServices()].reverse());

  const selectedServices = $derived(() => {
    if (selectedSunday === "all") return periodServices();
    return periodServices().filter(
      (service) => recordId(service) === selectedSunday,
    );
  });

  function personHistorySummary(person) {
    const personId = recordId(person);
    const fullHistory = allRecentServices();
    const attended = fullHistory.filter((service) =>
      (service.individuals || []).some((attendee) => recordId(attendee) === personId),
    );
    const recentStatuses = fullHistory.slice(-4).map((service) => {
      if (!wasExpected(person, service.service_date)) return "not-expected";
      return (service.individuals || []).some((attendee) => recordId(attendee) === personId)
        ? "present"
        : "missed";
    });
    return {
      lastAttendedService: attended[attended.length - 1] || null,
      recentPresentCount: recentStatuses.filter((state) => state === "present").length,
      recentExpectedCount: recentStatuses.filter((state) => state !== "not-expected").length,
      sundayReliability: summarizeSundayCommitments(commitmentsForPerson(person)),
    };
  }

  const attendanceRows = $derived(() => {
    const serviceList = selectedServices();
    return (people || [])
      .filter(isExpectedPerson)
      .map((person) => {
        const statuses = serviceList.map((service) => statusForPerson(person, service));
        const missedCount = statuses.filter(
          (status) => status.state === "missed",
        ).length;
        const expectedCount = statuses.filter(
          (status) => status.state !== "not-expected",
        ).length;
        return { person, statuses, missedCount, expectedCount, ...personHistorySummary(person) };
      })
      .filter((row) => row.expectedCount > 0);
  });

  const filteredRows = $derived(() => {
    const query = searchQuery.trim().toLowerCase();
    const rows = attendanceRows().filter((row) => {
      if (query && !fullName(row.person).toLowerCase().includes(query)) {
        return false;
      }
      if (attendanceFilter === "missing") return row.missedCount > 0;
      if (attendanceFilter === "repeated") return row.missedCount > 1;
      if (attendanceFilter === "present") return row.missedCount === 0;
      return true;
    });

    return [...rows].sort((a, b) => {
      const nameComparison = fullName(a.person).localeCompare(fullName(b.person));
      if (sortOption === "name_asc") return nameComparison;
      if (sortOption === "name_desc") return -nameComparison;
      if (sortOption === "attendance_desc") {
        const aRate = (a.expectedCount - a.missedCount) / a.expectedCount;
        const bRate = (b.expectedCount - b.missedCount) / b.expectedCount;
        return bRate - aRate || nameComparison;
      }
      if (sortOption === "recent_desc") {
        const aRate = a.recentExpectedCount ? a.recentPresentCount / a.recentExpectedCount : 0;
        const bRate = b.recentExpectedCount ? b.recentPresentCount / b.recentExpectedCount : 0;
        return bRate - aRate || nameComparison;
      }
      if (sortOption === "last_attended_asc") {
        const aTime = parseDate(a.lastAttendedService?.service_date)?.getTime() ?? -Infinity;
        const bTime = parseDate(b.lastAttendedService?.service_date)?.getTime() ?? -Infinity;
        return aTime - bTime || nameComparison;
      }
      return b.missedCount - a.missedCount || nameComparison;
    });
  });

  const visibleRows = $derived(() =>
    showAllPeople
      ? filteredRows()
      : filteredRows().slice(0, initialPeopleLimit),
  );

  const recordedServiceLabel = $derived(() => {
    const count = selectedServices().length;
    if (selectedSunday !== "all") return "1 recorded Sunday";
    const periodLabel = historyWindow === "all" ? "recorded" : "in period";
    return `${count} Sunday${count === 1 ? "" : "s"} ${periodLabel} · ${Math.min(count, visibleServiceCount)} fit at once`;
  });
  // The count control determines how many Sunday columns fit in the viewport.
  // Older Sundays remain loaded to the left so the matrix can always scroll
  // through the available history.
  const serviceColumnWidth = $derived(
    Math.max(
      48,
      Math.floor(
        (Math.max(520, matrixViewportWidth) - 430) /
          Math.max(1, selectedSunday === "all" ? visibleServiceCount : 1),
      ),
    ),
  );

  const hasActiveControls = $derived(
    searchQuery.trim() !== "" ||
      attendanceFilter !== "all" ||
      sortOption !== "missed_desc" ||
      selectedSunday !== "all" ||
      historyWindow !== "all" ||
      visibleServiceCount !== initialServiceCount,
  );

  function handleHistoryWindowChange(event) {
    historyWindow = event.currentTarget.value;
    selectedSunday = "all";
    showAllPeople = false;
    const count = periodServices().length;
    if (visibleServiceCount > count) visibleServiceCount = Math.max(1, count);
    scrollToLatest();
  }

  function handleSundayChange(event) {
    selectedSunday = event.currentTarget.value;
    if (selectedSunday !== "all" && attendanceFilter === "repeated") {
      attendanceFilter = "missing";
    }
    showAllPeople = false;
  }

  function resetControls() {
    searchQuery = "";
    attendanceFilter = "all";
    sortOption = "missed_desc";
    selectedSunday = "all";
    historyWindow = "all";
    visibleServiceCount = initialServiceCount;
    showAllPeople = false;
    scrollToLatest();
  }

  function statusLabel(status, person) {
    const name = fullName(person);
    const date = formatFullDate(status.service.service_date);
    if (status.state === "present") return `${name} was here on ${date}`;
    if (status.state === "missed") return `${name} missed ${date}`;
    return `${date} was before ${name}'s tracked attendance period`;
  }

  function openAttendanceSummary(row) {
    selectedAttendanceRow = row;
    modalHistoryWindow = historyWindow;
    modalAttendanceFilter = "all";
    showAttendanceSummary = true;
  }

  const modalStatuses = $derived(() => {
    if (!selectedAttendanceRow) return [];
    let statuses = allRecentServices().map((service) =>
      statusForPerson(selectedAttendanceRow.person, service),
    );
    if (modalHistoryWindow !== "all") {
      const count = Number(modalHistoryWindow);
      if (Number.isFinite(count)) statuses = statuses.slice(-count);
    }
    if (modalAttendanceFilter !== "all") {
      statuses = statuses.filter((status) => status.state === modalAttendanceFilter);
    }
    return statuses;
  });

  const modalSummary = $derived(() => {
    const statuses = modalStatuses();
    const expectedStatuses = statuses.filter((status) => status.state !== "not-expected");
    const attended = expectedStatuses.filter((status) => status.state === "present").length;
    const missed = expectedStatuses.filter((status) => status.state === "missed").length;
    const lastAttended = [...statuses].reverse().find((status) => status.state === "present")?.service || null;
    return {
      attended,
      missed,
      expected: expectedStatuses.length,
      rate: expectedStatuses.length ? Math.round((attended / expectedStatuses.length) * 100) : 0,
      lastAttended,
    };
  });

  const modalCommitments = $derived(() => {
    if (!selectedAttendanceRow) return [];
    const personCommitments = commitmentsForPerson(selectedAttendanceRow.person);
    if (modalHistoryWindow === "all") return personCommitments;
    const count = Number(modalHistoryWindow);
    if (!Number.isFinite(count)) return personCommitments;
    const dates = new Set(
      allRecentServices()
        .slice(-count)
        .map((service) => service.service_date),
    );
    return personCommitments.filter((commitment) => dates.has(commitment.gathering_date));
  });

  function attendanceScopeNote(person) {
    const start = attendanceStartInfo(person);
    if (!start) return "No dated membership, first-visit or attendance record is available, so historical absences are not inferred.";
    return `Calculated from ${start.source} (${formatCompactDate(start.value)}). This is derived from recorded history, not a manually entered expected-Sundays value.`;
  }

  function openProfile(person, event) {
    event?.preventDefault();
    event?.stopPropagation();
    const id = recordId(person);
    if (!id) return;
    showAttendanceSummary = false;
    void goto(`/people/${encodeURIComponent(id)}`);
  }

  function handleRowKeydown(event, row) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openAttendanceSummary(row);
    }
  }

  function setVisibleServiceCount(event) {
    const value = Number(event.currentTarget.value);
    if (!Number.isFinite(value)) return;
    const requested = Math.min(allRecentServices().length, Math.max(1, Math.round(value)));
    if (historyWindow !== "all" && requested > periodServices().length) {
      historyWindow = "all";
    }
    visibleServiceCount = requested;
    selectedSunday = "all";
    scrollToLatest();
  }

  function changeVisibleServiceCount(amount) {
    const requested = Math.min(
      allRecentServices().length,
      Math.max(1, visibleServiceCount + amount),
    );
    if (historyWindow !== "all" && requested > periodServices().length) {
      historyWindow = "all";
    }
    visibleServiceCount = requested;
    selectedSunday = "all";
    scrollToLatest();
  }

  function scrollToLatest() {
    if (typeof requestAnimationFrame !== "function") return;
    requestAnimationFrame(() => {
      if (matrixScroller) matrixScroller.scrollLeft = matrixScroller.scrollWidth;
    });
  }

  function scrollHistory(direction) {
    if (!matrixScroller) return;
    const distance = Math.max(260, Math.round(matrixScroller.clientWidth * 0.72));
    if (typeof matrixScroller.scrollBy === "function") {
      matrixScroller.scrollBy({ left: direction * distance, behavior: "smooth" });
    } else {
      matrixScroller.scrollLeft += direction * distance;
    }
  }

  function observeMatrixViewport(node) {
    const update = () => {
      matrixViewportWidth = node.clientWidth || matrixViewportWidth;
    };
    update();
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(update)
      : null;
    observer?.observe(node);
    return { destroy: () => observer?.disconnect() };
  }

  $effect(() => {
    const count = periodServices().length;
    const scroller = matrixScroller;
    if (!count) return;
    if (visibleServiceCount > count) {
      visibleServiceCount = Math.min(initialServiceCount, count);
      return;
    }
    if (!scroller || positionedAtLatest) return;
    positionedAtLatest = true;
    scrollToLatest();
  });
</script>

<section class="card-base animate-in w-full min-w-0 max-w-full overflow-hidden p-0" aria-labelledby="weekly-attendance-title">
    <div class="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div>
        <h3 id="weekly-attendance-title" class="text-sm font-semibold text-foreground">
          {title}
        </h3>
        <p class="mt-1 text-xs text-muted-foreground">
          People down the side, recent Sundays across the top
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <label class="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 px-2 py-1">
          <span class="text-[10px] font-semibold uppercase tracking-wide">History</span>
          <select bind:value={historyWindow} onchange={handleHistoryWindowChange} class="h-7 rounded-md border border-border bg-input px-2 text-[11px] font-semibold text-foreground focus:border-primary focus:outline-none" aria-label="Attendance history period">
            {#each historyOptions() as count}
              <option value={String(count)}>Past {count} Sundays</option>
            {/each}
            <option value="all">All available ({allRecentServices().length})</option>
          </select>
        </label>
        <span>{recordedServiceLabel()}</span>
        <span class="inline-flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 rounded-sm bg-success" aria-hidden="true"></span>
          Here
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 rounded-sm bg-destructive" aria-hidden="true"></span>
          Missed
        </span>
        {#if selectedSunday === "all" && periodServices().length > visibleServiceCount}
          <div class="flex items-center overflow-hidden rounded-lg border border-border bg-secondary/20">
            <button
              type="button"
              class="h-8 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              onclick={() => scrollHistory(-1)}
              aria-label="Scroll to older Sundays"
              title="Scroll left to older Sundays"
            >← Older</button>
            <button
              type="button"
              class="h-8 border-l border-border px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              onclick={() => scrollHistory(1)}
              aria-label="Scroll to newer Sundays"
              title="Scroll right to newer Sundays"
            >Newer →</button>
          </div>
        {/if}
        <div class="ml-1 flex items-center rounded-lg border border-border bg-secondary/20 p-0.5" aria-label="Sundays shown">
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-md text-base text-muted-foreground transition-colors hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
            onclick={() => changeVisibleServiceCount(-1)}
            disabled={visibleServiceCount <= 1}
            aria-label="Show one fewer Sunday"
            title="Fit one fewer Sunday in the current view"
          >−</button>
          <label class="sr-only" for="sundays-shown">Sundays fitting in view</label>
          <input id="sundays-shown" type="number" min="1" max={allRecentServices().length || 1} value={visibleServiceCount} oninput={setVisibleServiceCount} class="h-7 w-16 bg-transparent px-1 text-center text-[11px] font-medium text-foreground outline-none focus:ring-1 focus:ring-primary" aria-label="Sundays fitting in view" />
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-md text-base text-muted-foreground transition-colors hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
            onclick={() => changeVisibleServiceCount(1)}
            disabled={visibleServiceCount >= allRecentServices().length}
            aria-label="Show one more Sunday"
            title="Fit one more Sunday in the current view"
          >+</button>
        </div>
      </div>
    </div>

    {#if allRecentServices().length > 0 && attendanceRows().length > 0}
      <div class="grid grid-cols-1 gap-3 border-b border-border px-5 py-4 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(190px,1.2fr)_auto] xl:items-end">
        <label class="block min-w-0" for="attendance-person-search">
          <span class="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Search people</span>
          <span class="relative block">
            <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
            </svg>
            <input
              id="attendance-person-search"
              type="search"
              bind:value={searchQuery}
              placeholder="Search by name..."
              class="h-10 w-full rounded-lg border border-border bg-input pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </span>
        </label>

        <label class="block min-w-0" for="attendance-status-filter">
          <span class="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Attendance</span>
          <select
            id="attendance-status-filter"
            bind:value={attendanceFilter}
            class="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All people</option>
            <option value="missing">{selectedSunday === "all" ? "Missed at least once" : "Missing"}</option>
            {#if selectedSunday === "all"}
              <option value="repeated">Repeated misses</option>
            {/if}
            <option value="present">{selectedSunday === "all" ? "Perfect attendance" : "Here"}</option>
          </select>
        </label>

        <label class="block min-w-0" for="attendance-sort">
          <span class="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Sort</span>
          <select
            id="attendance-sort"
            bind:value={sortOption}
            class="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="missed_desc">Most missed first</option>
            <option value="attendance_desc">Best attendance first</option>
            <option value="recent_desc">Best recent consistency</option>
            <option value="last_attended_asc">Longest since attended</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
          </select>
        </label>

        <label class="block min-w-0" for="attendance-sunday-filter">
          <span class="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Sunday</span>
          <select
            id="attendance-sunday-filter"
            value={selectedSunday}
            onchange={handleSundayChange}
            class="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Sundays in period</option>
            {#each sundayOptions() as service (service.id)}
              <option value={recordId(service)}>{formatFullDate(service.service_date)}</option>
            {/each}
          </select>
        </label>

        {#if hasActiveControls}
          <button
            type="button"
            class="h-10 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary/40 hover:text-foreground"
            onclick={resetControls}
          >
            Reset
          </button>
        {/if}
      </div>

      {#if filteredRows().length > 0}
      <div bind:this={matrixScroller} use:observeMatrixViewport class="matrix-scroller w-full min-w-0 max-w-full overflow-auto overscroll-contain px-3 pb-3 sm:px-5 sm:pb-5" aria-label="Scrollable weekly attendance history">
        <table class="border-separate border-spacing-y-1.5" style="min-width: {430 + selectedServices().length * serviceColumnWidth}px;" aria-label="Weekly attendance by person">
          <thead>
            <tr>
              <th scope="col" style="left: -16px; width: 256px; min-width: 256px;" class="sticky top-0 z-50 bg-card px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground shadow-[10px_0_14px_-12px_hsl(var(--foreground)/.9)]">
                Person
              </th>
              {#each selectedServices() as service (service.id)}
                {@const columnDate = formatColumnDate(service.service_date)}
                <th scope="col" style="width: {serviceColumnWidth}px; min-width: {serviceColumnWidth}px;" class="sticky top-0 z-40 bg-card px-1 py-3 text-center text-[11px] font-medium text-muted-foreground">
                  <span class="block text-foreground">{columnDate.day}</span>
                  <span class="block">{columnDate.month}</span>
                </th>
              {/each}
              <th scope="col" style="width: 150px; min-width: 150px;" class="sticky top-0 z-40 bg-card px-3 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Last here / expected misses
              </th>
            </tr>
          </thead>
          <tbody>
            {#each visibleRows() as row (row.person.id)}
              <tr
                class="group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                tabindex="0"
                aria-label={`View attendance summary for ${fullName(row.person)}`}
                onclick={() => openAttendanceSummary(row)}
                onkeydown={(event) => handleRowKeydown(event, row)}
              >
                <th scope="row" style="left: -16px; width: 256px; min-width: 256px;" class="sticky z-20 rounded-l-lg bg-card px-6 py-1.5 text-left shadow-[10px_0_14px_-12px_hsl(var(--foreground)/.9)] group-hover:bg-card-elevated">
                  <button
                    type="button"
                    onclick={(event) => {
                      event.stopPropagation();
                      openAttendanceSummary(row);
                    }}
                    class="flex min-h-11 items-center gap-3 rounded-md px-1.5 py-1 transition-colors hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Open ${fullName(row.person)} attendance summary`}
                  >
                    {#if row.person.avatar_url}
                      <img
                        src={row.person.avatar_url}
                        alt=""
                        class="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-border"
                      />
                    {:else}
                      <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary ring-1 ring-primary/20" aria-hidden="true">
                        {initials(row.person)}
                      </span>
                    {/if}
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-medium text-foreground">
                        {fullName(row.person)}
                      </span>
                      <span class="block text-[11px] capitalize text-muted-foreground">
                        {row.person.member_status}
                      </span>
                    </span>
                  </button>
                </th>
                {#each row.statuses as status (status.service.id)}
                  <td style="width: {serviceColumnWidth}px;" class="bg-card px-1 py-1.5 text-center group-hover:bg-card-elevated">
                    <button
                      type="button"
                      onclick={(event) => {
                        event.stopPropagation();
                        onServiceClick?.(status.service);
                      }}
                      class="mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-all {onServiceClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'} {status.state === 'present' ? 'bg-success/10 text-success hover:bg-success/20' : status.state === 'missed' ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-secondary/40 text-muted-foreground'}"
                      aria-label={statusLabel(status, row.person)}
                    >
                      {status.state === "present" ? "✓" : status.state === "missed" ? "×" : "–"}
                    </button>
                  </td>
                {/each}
                <td style="width: 150px; min-width: 150px;" class="rounded-r-lg bg-card px-3 py-1.5 text-left group-hover:bg-card-elevated">
                  <span class="block text-sm font-semibold text-foreground">{row.lastAttendedService ? formatCompactDate(row.lastAttendedService.service_date) : "Not recorded"}</span>
                  <span class="mt-0.5 block text-[11px] font-medium {row.sundayReliability.missed > 0 ? 'text-destructive' : row.sundayReliability.decided > 0 ? 'text-success' : 'text-muted-foreground'}">
                    {row.sundayReliability.decided ? `${row.sundayReliability.missed}/${row.sundayReliability.decided} missed when expected` : "No resolved yeses"}
                  </span>
                  <span class="sr-only">{row.recentExpectedCount ? `${row.recentPresentCount} of ${row.recentExpectedCount} attended in the last 4 assessed Sundays. ` : ""}{row.missedCount} of {row.expectedCount} Sundays missed in the selected period.</span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if filteredRows().length > initialPeopleLimit}
        <div class="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <span class="text-xs text-muted-foreground">
            Showing {visibleRows().length} of {filteredRows().length} matching people
          </span>
          <button
            type="button"
            class="rounded-lg px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10 hover:underline"
            onclick={() => (showAllPeople = !showAllPeople)}
          >
            {showAllPeople ? "Show fewer" : "Show everyone"}
          </button>
        </div>
      {/if}
      {:else}
        <div class="flex min-h-44 flex-col items-center justify-center px-6 py-10 text-center">
          <svg class="mb-3 h-8 w-8 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
          </svg>
          <p class="text-sm font-medium text-foreground">No people match these controls</p>
          <button type="button" class="mt-2 rounded-lg px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 hover:underline" onclick={resetControls}>
            Reset search and filters
          </button>
        </div>
      {/if}
    {:else}
      <div class="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
        <svg class="mb-3 h-9 w-9 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3M5 11h14M6 21h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
        </svg>
        <p class="text-sm font-medium text-foreground">No weekly people pattern yet</p>
        <p class="mt-1 max-w-md text-xs text-muted-foreground">
          Add named attendees to Sunday services to see who was here and who was missing each week.
        </p>
      </div>
    {/if}
</section>

<Modal bind:isOpen={showAttendanceSummary} title={selectedAttendanceRow ? `${fullName(selectedAttendanceRow.person)} · Sunday attendance` : "Sunday attendance"} size="lg">
  {#if selectedAttendanceRow}
    <div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary ring-1 ring-primary/20" aria-hidden="true">{initials(selectedAttendanceRow.person)}</span>
          <div>
            <p class="font-semibold text-foreground">{fullName(selectedAttendanceRow.person)}</p>
            <p class="text-xs capitalize text-muted-foreground">{selectedAttendanceRow.person.member_status}</p>
          </div>
        </div>
        <a href="/people/{recordId(selectedAttendanceRow.person)}" onclick={(event) => openProfile(selectedAttendanceRow.person, event)} class="text-sm font-semibold text-primary hover:underline">View profile →</a>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/15 p-3">
        <p class="text-xs font-medium text-muted-foreground">Change the period or attendance status to update the figures and history below.</p>
        <div class="flex flex-wrap items-center gap-2">
          <label class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Period</span>
            <select bind:value={modalHistoryWindow} aria-label="Modal attendance history period" class="h-8 rounded-md border border-border bg-input px-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none">
              {#each historyOptions() as count}
                <option value={String(count)}>Past {count}</option>
              {/each}
              <option value="all">All available</option>
            </select>
          </label>
          <div class="flex overflow-hidden rounded-md border border-border bg-card" aria-label="Modal attendance status filter">
            {#each [["all", "All"], ["present", "Here"], ["missed", "Missed"]] as option}
              <button
                type="button"
                aria-pressed={modalAttendanceFilter === option[0]}
                class="h-8 px-2.5 text-[11px] font-medium transition-colors {modalAttendanceFilter === option[0] ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}"
                onclick={() => (modalAttendanceFilter = option[0])}
              >{option[1]}</button>
            {/each}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-border bg-secondary/15 p-3"><p class="text-xl font-bold text-success">{modalSummary().attended}</p><p class="text-xs text-muted-foreground">Sundays here</p></div>
        <div class="rounded-xl border border-border bg-secondary/15 p-3"><p class="text-xl font-bold text-destructive">{modalSummary().missed}</p><p class="text-xs text-muted-foreground">Sundays missed</p></div>
        <div class="rounded-xl border border-border bg-secondary/15 p-3"><p class="text-xl font-bold text-primary">{modalSummary().rate}%</p><p class="text-xs text-muted-foreground">Attendance rate</p></div>
        <div class="rounded-xl border border-border bg-secondary/15 p-3"><p class="text-xl font-bold text-foreground">{modalSummary().expected}</p><p class="text-xs text-muted-foreground">Sundays assessed</p></div>
        <div class="rounded-xl border border-border bg-secondary/15 p-3"><p class="text-xl font-bold text-foreground">{modalSummary().lastAttended ? formatCompactDate(modalSummary().lastAttended.service_date) : "—"}</p><p class="text-xs text-muted-foreground">Last Sunday attended</p></div>
        <div class="rounded-xl border border-border bg-secondary/15 p-3"><p class="text-xl font-bold text-success">{selectedAttendanceRow.recentPresentCount}/{selectedAttendanceRow.recentExpectedCount}</p><p class="text-xs text-muted-foreground">Recent 4 Sundays</p></div>
      </div>

      {#if commitmentsUnavailable}
        <p class="rounded-xl border border-border bg-secondary/10 px-4 py-3 text-sm text-muted-foreground">
          Sunday commitment history is unavailable right now, so explicit expected-Sunday follow-through cannot be shown.
        </p>
      {:else}
        <SundayReliabilitySummary commitments={modalCommitments()} />
      {/if}

      <p class="rounded-lg border border-border/70 bg-secondary/10 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        {attendanceScopeNote(selectedAttendanceRow.person)}
      </p>

      <div>
        <h4 class="mb-2 text-sm font-semibold text-foreground">Sunday-by-Sunday history</h4>
        <div class="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border">
          {#each [...modalStatuses()].reverse() as status (status.service.id)}
            <button
              type="button"
              class="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary/30"
              onclick={() => {
                showAttendanceSummary = false;
                onServiceClick?.(status.service);
              }}
            >
              <span class="text-sm text-foreground">{formatFullDate(status.service.service_date)}</span>
              <span class="rounded-full px-2 py-1 text-xs font-semibold {status.state === 'present' ? 'bg-success/10 text-success' : status.state === 'missed' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}">
                {status.state === "present" ? "Here" : status.state === "missed" ? "Missed" : "Before tracked period"}
              </span>
            </button>
          {:else}
            <div class="px-4 py-6 text-center text-xs text-muted-foreground">No Sundays match this history filter.</div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</Modal>

<style>
  :global(.fullscreen-active) .matrix-scroller {
    max-height: calc(100vh - 285px);
  }
</style>
