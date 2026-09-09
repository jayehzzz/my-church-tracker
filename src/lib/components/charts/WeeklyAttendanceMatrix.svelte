<!--
  WeeklyAttendanceMatrix.svelte
  Person-by-person Sunday attendance across the most recent recorded weeks.
-->

<script>
  let {
    services = [],
    people = [],
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
  let visibleServiceCount = $state(0);

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

  function isExpectedPerson(person) {
    return (
      ["member", "leader"].includes(person?.member_status) &&
      person?.activity_status !== "dormant"
    );
  }

  function wasExpected(person, serviceDate) {
    const startValue =
      person?.membership_date || person?.first_visit_date || person?.created_at;
    const startDate = parseDate(startValue);
    const date = parseDate(serviceDate);
    if (!startDate || !date) return true;
    return startDate <= date;
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

  const recentServices = $derived(() =>
    allRecentServices().slice(-Math.max(1, visibleServiceCount)),
  );

  const sundayOptions = $derived(() => [...recentServices()].reverse());

  const selectedServices = $derived(() => {
    if (selectedSunday === "all") return recentServices();
    return recentServices().filter(
      (service) => recordId(service) === selectedSunday,
    );
  });

  const attendanceRows = $derived(() => {
    const serviceList = selectedServices();
    return (people || [])
      .filter(isExpectedPerson)
      .map((person) => {
        const personId = recordId(person);
        const statuses = serviceList.map((service) => {
          if (!wasExpected(person, service.service_date)) {
            return { state: "not-expected", service };
          }
          const attendeeIds = new Set(
            (service.individuals || []).map((attendee) => recordId(attendee)),
          );
          return {
            state: attendeeIds.has(personId) ? "present" : "missed",
            service,
          };
        });
        const missedCount = statuses.filter(
          (status) => status.state === "missed",
        ).length;
        const expectedCount = statuses.filter(
          (status) => status.state !== "not-expected",
        ).length;
        return { person, statuses, missedCount, expectedCount };
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
    return `${count} recorded Sunday${count === 1 ? "" : "s"}`;
  });
  // Keep the matrix readable as columns are added while still allowing a compact
  // view for a short run of Sundays.
  const serviceColumnWidth = $derived(Math.max(46, Math.min(72, Math.floor(680 / Math.max(1, selectedServices().length)))));

  const hasActiveControls = $derived(
    searchQuery.trim() !== "" ||
      attendanceFilter !== "all" ||
      sortOption !== "missed_desc" ||
      selectedSunday !== "all" ||
      visibleServiceCount !== initialServiceCount,
  );

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
    visibleServiceCount = initialServiceCount;
    showAllPeople = false;
  }

  function statusLabel(status, person) {
    const name = fullName(person);
    const date = formatFullDate(status.service.service_date);
    if (status.state === "present") return `${name} was here on ${date}`;
    if (status.state === "missed") return `${name} missed ${date}`;
    return `${name} was not yet expected on ${date}`;
  }

  function setVisibleServiceCount(event) {
    const value = Number(event.currentTarget.value);
    if (!Number.isFinite(value)) return;
    visibleServiceCount = Math.min(allRecentServices().length, Math.max(1, Math.round(value)));
    selectedSunday = "all";
  }
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
        <span>{recordedServiceLabel()}</span>
        <span class="inline-flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 rounded-sm bg-success" aria-hidden="true"></span>
          Here
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 rounded-sm bg-destructive" aria-hidden="true"></span>
          Missed
        </span>
        <div class="ml-1 flex items-center rounded-lg border border-border bg-secondary/20 p-0.5" aria-label="Sundays shown">
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-md text-base text-muted-foreground transition-colors hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
            onclick={() => {
              visibleServiceCount = Math.max(1, visibleServiceCount - 1);
              selectedSunday = "all";
            }}
            disabled={visibleServiceCount <= 1}
            aria-label="Show one fewer Sunday"
            title="Remove a Sunday column"
          >−</button>
          <label class="sr-only" for="sundays-shown">Sundays shown</label>
          <input id="sundays-shown" type="number" min="1" max={allRecentServices().length || 1} value={recentServices().length} oninput={setVisibleServiceCount} class="h-7 w-16 bg-transparent px-1 text-center text-[11px] font-medium text-foreground outline-none focus:ring-1 focus:ring-primary" aria-label="Sundays shown" />
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-md text-base text-muted-foreground transition-colors hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
            onclick={() => {
              visibleServiceCount = Math.min(allRecentServices().length, visibleServiceCount + 1);
              selectedSunday = "all";
            }}
            disabled={visibleServiceCount >= allRecentServices().length}
            aria-label="Show one more Sunday"
            title="Add a Sunday column"
          >+</button>
        </div>
      </div>
    </div>

    {#if recentServices().length > 0 && attendanceRows().length > 0}
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
            <option value="all">All recent Sundays</option>
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
      <div class="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain px-3 pb-3 sm:px-5 sm:pb-5">
        <table class="border-separate border-spacing-y-1.5" style="min-width: {240 + selectedServices().length * serviceColumnWidth}px;" aria-label="Weekly attendance by person">
          <thead>
            <tr>
              <th scope="col" style="left: -16px; width: 256px; min-width: 256px;" class="sticky z-30 bg-card px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground shadow-[10px_0_14px_-12px_hsl(var(--foreground)/.9)]">
                Person
              </th>
              {#each selectedServices() as service (service.id)}
                {@const columnDate = formatColumnDate(service.service_date)}
                <th scope="col" style="width: {serviceColumnWidth}px; min-width: {serviceColumnWidth}px;" class="px-1 py-3 text-center text-[11px] font-medium text-muted-foreground">
                  <span class="block text-foreground">{columnDate.day}</span>
                  <span class="block">{columnDate.month}</span>
                </th>
              {/each}
              <th scope="col" class="w-16 px-2 py-3 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Missed
              </th>
            </tr>
          </thead>
          <tbody>
            {#each visibleRows() as row (row.person.id)}
              <tr class="group">
                <th scope="row" style="left: -16px; width: 256px; min-width: 256px;" class="sticky z-20 rounded-l-lg bg-card px-6 py-1.5 text-left shadow-[10px_0_14px_-12px_hsl(var(--foreground)/.9)] group-hover:bg-card-elevated">
                  <a
                    href="/people/{recordId(row.person)}"
                    class="flex min-h-11 items-center gap-3 rounded-md px-1.5 py-1 transition-colors hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Open ${fullName(row.person)}'s profile`}
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
                  </a>
                </th>
                {#each row.statuses as status (status.service.id)}
                  <td style="width: {serviceColumnWidth}px;" class="bg-card px-1 py-1.5 text-center group-hover:bg-card-elevated">
                    <button
                      type="button"
                      onclick={() => onServiceClick?.(status.service)}
                      class="mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-all {onServiceClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'} {status.state === 'present' ? 'bg-success/10 text-success hover:bg-success/20' : status.state === 'missed' ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-secondary/40 text-muted-foreground'}"
                      aria-label={statusLabel(status, row.person)}
                    >
                      {status.state === "present" ? "✓" : status.state === "missed" ? "×" : "–"}
                    </button>
                  </td>
                {/each}
                <td class="rounded-r-lg bg-card px-2 py-1.5 text-center group-hover:bg-card-elevated">
                  <span class="text-sm font-semibold {row.missedCount > 0 ? 'text-destructive' : 'text-success'}">
                    {row.missedCount}
                  </span>
                  <span class="sr-only"> of {row.expectedCount} Sundays missed</span>
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
