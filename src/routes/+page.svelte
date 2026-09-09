<script>
  import { goto } from "$app/navigation";
  import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
  import FilterBar from "$lib/components/filters/FilterBar.svelte";
  import KPICard from "$lib/components/dashboard/KPICard.svelte";
  import AttendanceTrend from "$lib/components/charts/AttendanceTrend.svelte";
  import RecentActivityList from "$lib/components/dashboard/RecentActivityList.svelte";
  import Motion from "$lib/components/ui/Motion.svelte";
  import FullscreenWrapper from "$lib/components/ui/FullscreenWrapper.svelte";
  import { dateRange } from "$lib/stores/filterStore";
  import * as dashboardService from "$lib/services/dashboardService.js";
  import { getDashboard as getCrmDashboard, getDemoDashboard } from "$lib/services/followUpCrmService.js";

  let kpiData = $state([]);
  let attendanceChart = $state({ data: [], contextLabel: "Selected period" });
  let recentActivities = $state([]);
  let workspace = $state(getDemoDashboard());
  let loading = $state(true);
  let error = $state("");

  const attendanceTrendData = $derived(
    attendanceChart.data.map((point) => ({
      date: point.date || point.key,
      total: Number(point.attendance) || 0,
      guests: Number(point.guests) || 0,
      id: point.id || point.service_id || "",
    })),
  );

  const today = dateOnly(new Date());
  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const allOpenTasks = $derived([
    ...(workspace?.tasks || []),
    ...(workspace?.member_care_tasks || []),
  ]);
  const dueTasks = $derived(allOpenTasks.filter((task) => !task.due_date || task.due_date <= today));
  const overdueTasks = $derived(dueTasks.filter((task) => task.due_date && task.due_date < today));
  const freshUnassigned = $derived((workspace?.unassigned_contacts || []).filter(isFreshContact));
  const visitationCount = $derived(workspace?.visitation_follow_ups?.length || 0);
  const expectedCount = $derived(Number(workspace?.attendance_forecast?.expected_total) || 0);
  const confirmedCount = $derived(Number(workspace?.attendance_forecast?.confirmed_total) || 0);

  const compactKpis = $derived.by(() => {
    const byId = Object.fromEntries(kpiData.map((kpi) => [kpi.id, kpi]));
    return [
      byId.family && {
        ...byId.family,
        title: "Total members",
      },
      byId.attendance && {
        ...byId.attendance,
        title: "Avg attendance",
      },
      byId.guests && {
        ...byId.guests,
        title: "Guest attendances",
      },
      {
        id: "followups",
        title: "Follow-ups needed",
        value: dueTasks.length,
        trend: null,
        format: "number",
        description: overdueTasks.length
          ? `${overdueTasks.length} overdue`
          : "Nothing overdue",
        href: "/pipeline",
        icon: "clock",
        variant: overdueTasks.length ? "danger" : "success",
      },
    ].filter(Boolean);
  });

  $effect(() => {
    void loadDashboardData($dateRange);
  });

  function dateOnly(value) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addDays(value, amount) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + amount);
    return dateOnly(date);
  }

  function isFreshContact(contact) {
    const date = contact?.contact_date || contact?.created_at?.slice?.(0, 10);
    return Boolean(date && date >= addDays(today, -14) && date <= today);
  }

  async function loadDashboardData(range) {
    loading = true;
    error = "";
    try {
      const [kpiResult, chartResult, activities, crmResult] = await Promise.all([
        dashboardService.getDashboardKPIs(range),
        dashboardService.getAttendanceChartData(range),
        dashboardService.getRecentActivities(50),
        getCrmDashboard(),
      ]);

      kpiData = kpiResult.kpis || [];
      attendanceChart = chartResult || { data: [], contextLabel: range?.label || "Selected period" };
      recentActivities = activities || [];
      if (crmResult?.data) workspace = crmResult.data;
      if (crmResult?.error) error = crmResult.error.message || "The live follow-up workspace could not be loaded.";
    } catch (loadError) {
      console.error("Failed to load dashboard:", loadError);
      error = loadError?.message || "The dashboard could not be refreshed.";
    } finally {
      loading = false;
    }
  }
</script>

<DashboardLayout>
  <div class="pb-8">
    <Motion>
      <header class="flex flex-col gap-5 pb-5 pt-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{todayLabel}</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-[-0.035em] text-foreground">Dashboard</h1>
          <p class="mt-2 text-sm text-muted-foreground">A quick view of church health and the people who need attention.</p>
        </div>
        <div class="w-full rounded-xl border border-border bg-card px-4 py-3 lg:max-w-[620px]">
          <FilterBar compact />
        </div>
      </header>
    </Motion>

    {#if error}
      <div class="mb-4 flex items-center justify-between gap-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning" role="alert">
        <span>{error}</span>
        <button type="button" class="shrink-0 font-semibold hover:underline" onclick={() => loadDashboardData($dateRange)}>Try again</button>
      </div>
    {/if}

    {#if loading && !kpiData.length}
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" role="status" aria-label="Loading dashboard metrics">
        {#each [1, 2, 3, 4] as _}<div class="min-h-[154px] animate-pulse rounded-2xl border border-border bg-card"></div>{/each}
      </div>
    {:else}
      <section class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Dashboard metrics">
        {#each compactKpis as kpi, index (kpi.id)}
          <Motion delay={70 + index * 35}>
            <KPICard {...kpi} />
          </Motion>
        {/each}
      </section>
    {/if}

    <Motion delay={190}>
      <section class="mt-4 overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="attention-summary-title">
        <div class="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 id="attention-summary-title" class="text-sm font-semibold text-foreground">Needs attention</h2>
          <a href="/pipeline" class="text-xs font-semibold text-primary hover:underline">Open workspace</a>
        </div>
        <div class="grid grid-cols-3 divide-x divide-border">
          <a href="/pipeline" class="group px-3 py-3 no-underline transition-colors hover:bg-secondary/25 sm:px-4">
            <p class="truncate text-xs text-muted-foreground">Fresh handoffs</p>
            <p class="mt-1 text-lg font-semibold {freshUnassigned.length ? 'text-warning' : 'text-success'}">{freshUnassigned.length}</p>
          </a>
          <a href="/visitation?view=attention" class="group px-3 py-3 no-underline transition-colors hover:bg-secondary/25 sm:px-4">
            <p class="truncate text-xs text-muted-foreground">Pastoral care</p>
            <p class="mt-1 text-lg font-semibold text-foreground">{visitationCount}</p>
          </a>
          <a href="/pipeline" class="group px-3 py-3 no-underline transition-colors hover:bg-secondary/25 sm:px-4">
            <p class="truncate text-xs text-muted-foreground">Sunday ready</p>
            <p class="mt-1 text-lg font-semibold text-foreground">{confirmedCount}<span class="text-xs font-normal text-muted-foreground">/{expectedCount}</span></p>
          </a>
        </div>
      </section>
    </Motion>

    <section class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Motion delay={240} class="min-w-0">
        {#if loading && !attendanceChart.data.length}
          <div class="min-h-[430px] animate-pulse rounded-2xl border border-border bg-card"></div>
        {:else}
          <FullscreenWrapper title="Attendance & guests">
            {#snippet filters()}
              <FilterBar compact />
            {/snippet}
            <AttendanceTrend
              data={attendanceTrendData}
              title="Attendance & guests"
              itemLabel={attendanceChart.isFallback ? "recent Sundays" : "periods"}
              periodLabel={attendanceChart.contextLabel}
              comparisonOptions={[{ key: "guests", label: "Guests", color: "warning" }]}
              onPointClick={(point) => goto(`/services?service=${encodeURIComponent(point.id)}`)}
            />
          </FullscreenWrapper>
        {/if}
      </Motion>

      <Motion delay={290} class="min-w-0">
        {#if loading && !recentActivities.length}
          <div class="min-h-[430px] animate-pulse rounded-2xl border border-border bg-card"></div>
        {:else}
          <RecentActivityList activities={recentActivities} maxItems={5} showFilters />
        {/if}
      </Motion>
    </section>
  </div>
</DashboardLayout>
