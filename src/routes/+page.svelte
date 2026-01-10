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

  // Import data service functions
  import {
    getFilteredKPIs,
    getAttendanceChartData,
    getFilteredActivities,
  } from "$lib/utils/dataService";

  // Svelte 5: Reactive KPI data using $derived - updates when dateRange changes
  const kpiData = $derived(getFilteredKPIs($dateRange));

  // Svelte 5: Reactive attendance chart data using $derived - updates when dateRange changes
  const attendanceChartData = $derived(getAttendanceChartData($dateRange));

  // Svelte 5: Reactive activities data using $derived - updates when dateRange changes
  // Limit to most recent 10 for the dashboard view
  const recentActivities = $derived(
    getFilteredActivities($dateRange).slice(0, 10),
  );
</script>

<DashboardLayout>
  {#snippet filters()}
    <FilterBar />
  {/snippet}

  <!-- Page Header -->
  <Motion>
    <PageHeader title="Dashboard" />
  </Motion>

  <!-- KPI Cards Section -->
  <section class="mb-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {#each kpiData as kpi, i}
        <Motion delay={100 + i * 50}>
          <KPICard
            title={kpi.title}
            value={kpi.value}
            trend={kpi.trend}
            format={kpi.format}
          />
        </Motion>
      {/each}
    </div>
  </section>

  <!-- Charts & Activity Section -->
  <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
    <!-- Attendance Chart -->
    <Motion delay={300} class="w-full min-w-0">
      <AttendanceChart data={attendanceChartData} />
    </Motion>

    <!-- Recent Activity -->
    <Motion delay={400} class="w-full min-w-0">
      <RecentActivityList activities={recentActivities} />
    </Motion>
  </section>
</DashboardLayout>
