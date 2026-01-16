<script>
  import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import FilterBar from "$lib/components/filters/FilterBar.svelte";
  import KPICard from "$lib/components/dashboard/KPICard.svelte";
  import AttendanceChart from "$lib/components/dashboard/AttendanceChart.svelte";
  import RecentActivityList from "$lib/components/dashboard/RecentActivityList.svelte";

  import Motion from "$lib/components/ui/Motion.svelte";

  // Import filter store for reactive date range
  import { dateRange } from "$lib/stores/filterStore";

  // Import dashboard service for real Convex data
  import * as dashboardService from "$lib/services/dashboardService.js";

  // State for async data
  let kpiData = $state([]);
  let attendanceChartData = $state([]);
  let recentActivities = $state([]);
  let loading = $state(true);
  let error = $state(null);

  // Load dashboard data when component mounts or dateRange changes
  $effect(() => {
    loadDashboardData($dateRange);
  });

  async function loadDashboardData(range) {
    loading = true;
    error = null;

    try {
      // Fetch all data in parallel
      const [kpiResult, chartData, activities] = await Promise.all([
        dashboardService.getDashboardKPIs(range),
        dashboardService.getAttendanceChartData(range),
        dashboardService.getRecentActivities(10),
      ]);

      kpiData = kpiResult.kpis;
      attendanceChartData = chartData;
      recentActivities = activities;
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      error = err.message || "Failed to load dashboard data";
    } finally {
      loading = false;
    }
  }
</script>

<DashboardLayout>
  {#snippet filters()}
    <FilterBar />
  {/snippet}

  <!-- Page Header -->
  <Motion>
    <PageHeader title="Dashboard" />
  </Motion>

  <!-- Loading State -->
  {#if loading}
    <section class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {#each [1, 2, 3, 4] as _}
          <div
            class="card-interactive min-h-[140px] animate-pulse bg-muted/20"
          ></div>
        {/each}
      </div>
    </section>
  {:else if error}
    <!-- Error State -->
    <section class="mb-6">
      <div class="card-interactive p-6 text-center">
        <p class="text-destructive mb-2">⚠️ {error}</p>
        <button
          class="text-sm text-primary hover:underline"
          onclick={() => loadDashboardData($dateRange)}
        >
          Try again
        </button>
      </div>
    </section>
  {:else}
    <!-- KPI Cards Section -->
    <section class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {#each kpiData as kpi, i}
          <Motion delay={100 + i * 50}>
            <KPICard
              title={kpi.title}
              value={kpi.value}
              trend={kpi.trend || 0}
              format={kpi.format}
              description={kpi.description}
              href={kpi.href}
            />
          </Motion>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Charts & Activity Section -->
  <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
    <!-- Attendance Chart -->
    <Motion delay={300} class="w-full min-w-0">
      {#if loading}
        <div
          class="card-interactive min-h-[300px] animate-pulse bg-muted/20"
        ></div>
      {:else}
        <AttendanceChart data={attendanceChartData} />
      {/if}
    </Motion>

    <!-- Recent Activity -->
    <Motion delay={400} class="w-full min-w-0">
      {#if loading}
        <div
          class="card-interactive min-h-[300px] animate-pulse bg-muted/20"
        ></div>
      {:else}
        <RecentActivityList activities={recentActivities} />
      {/if}
    </Motion>
  </section>
</DashboardLayout>
