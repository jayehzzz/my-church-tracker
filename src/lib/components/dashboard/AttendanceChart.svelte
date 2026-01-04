<!--
  AttendanceChart.svelte
  A premium CSS-based bar chart component showing attendance trends over the last 12 months.
  
  Features:
  - Responsive bar chart visualization using CSS flexbox
  - Hover tooltips showing exact attendance values
  - Calculates and displays average, highest, and lowest attendance
  - Accessible with proper ARIA labels and screen reader support
  - Uses Svelte 5 runes syntax
  - No external chart library dependencies
  - Premium dark mode styling with subtle animations
-->

<script>
  // Import the dateRange store for filter awareness
  import { dateRange } from '$lib/stores/filterStore';
  
  /**
   * Default mock data for demonstration purposes (used when no data prop provided)
   */
  const defaultData = [
    { month: 'Jan', attendance: 120 },
    { month: 'Feb', attendance: 135 },
    { month: 'Mar', attendance: 142 },
    { month: 'Apr', attendance: 128 },
    { month: 'May', attendance: 155 },
    { month: 'Jun', attendance: 148 },
    { month: 'Jul', attendance: 132 },
    { month: 'Aug', attendance: 145 },
    { month: 'Sep', attendance: 168 },
    { month: 'Oct', attendance: 175 },
    { month: 'Nov', attendance: 182 },
    { month: 'Dec', attendance: 190 }
  ];

  /**
   * Component Props using Svelte 5 $props() rune
   * @param {Array} [data] - Array of monthly attendance data
   * @param {string} [title='Attendance Trend'] - Chart title
   */
  let { data = defaultData, title = 'Attendance Trend' } = $props();

  // Track which bar is currently hovered for tooltip display
  let hoveredIndex = $state(null);
  
  // Get the current filter label for display using $derived
  const filterLabel = $derived($dateRange?.label || 'All Time');
  
  // Check if we have valid data to display
  const hasData = $derived(data && data.length > 0);
  
  // Use provided data or fall back to default
  const chartData = $derived(hasData ? data : defaultData);

  /**
   * Calculate the maximum attendance value for scaling bar heights
   */
  const maxAttendance = $derived(hasData ? Math.max(...chartData.map(d => d.attendance)) * 1.1 : 200);

  /**
   * Calculate the minimum attendance value for statistics display
   */
  const minAttendance = $derived(hasData ? Math.min(...chartData.map(d => d.attendance)) : 0);

  /**
   * Calculate the average attendance across all months
   */
  const averageAttendance = $derived(hasData
    ? Math.round(chartData.reduce((sum, d) => sum + d.attendance, 0) / chartData.length)
    : 0);

  /**
   * Find the month with highest attendance
   */
  const highestMonth = $derived(hasData
    ? chartData.reduce((max, d) => d.attendance > max.attendance ? d : max, chartData[0])
    : { month: '-', attendance: 0 });

  /**
   * Find the month with lowest attendance
   */
  const lowestMonth = $derived(hasData
    ? chartData.reduce((min, d) => d.attendance < min.attendance ? d : min, chartData[0])
    : { month: '-', attendance: 0 });

  /**
   * Calculate the percentage height for a bar based on attendance value
   */
  function calculateHeight(attendance) {
    if (!maxAttendance || maxAttendance === 0) return 0;
    return (attendance / maxAttendance) * 100;
  }

  /**
   * Generate Y-axis gridline values for the chart
   */
  const yAxisValues = $derived((() => {
    const max = Math.ceil(maxAttendance / 50) * 50;
    const step = max / 4;
    return [0, step, step * 2, step * 3, max].map(v => Math.round(v));
  })());

  /**
   * Generate accessible description of the attendance trend
   */
  const trendDescription = $derived((() => {
    if (!hasData) {
      return 'No attendance data available for the selected time period.';
    }
    const trend = chartData[chartData.length - 1].attendance > chartData[0].attendance ? 'increasing' : 'decreasing';
    return `Attendance chart showing ${trend} trend. ` +
           `Average attendance is ${averageAttendance}. ` +
           `Highest was ${highestMonth.attendance} in ${highestMonth.month}. ` +
           `Lowest was ${lowestMonth.attendance} in ${lowestMonth.month}.`;
  })());
</script>

<!--
  Main card container using semantic article element
  Uses elevated background for premium styling
-->
<article
  class="chart-card"
  role="img"
  aria-label={trendDescription}
>
  <!-- Chart header with title and subtitle -->
  <header class="chart-header">
    <div>
      <h3 class="text-section-title">{title}</h3>
      <p class="chart-subtitle">{filterLabel}</p>
    </div>
  </header>

  {#if !hasData}
    <!-- Empty state when no data in range -->
    <div class="empty-state">
      <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
      <p class="empty-text">No attendance data for this period</p>
      <p class="empty-subtext">Try selecting a different date range</p>
    </div>
  {:else}
    <!-- Chart container with Y-axis and bars -->
    <div class="chart-wrapper">
      <!-- Y-axis labels (hidden on very small screens) -->
      <div class="y-axis" aria-hidden="true">
        {#each [...yAxisValues].reverse() as value}
          <span class="y-label">{value}</span>
        {/each}
      </div>

      <!-- Main chart area with gridlines and bars -->
      <div class="chart-area">
        <!-- Horizontal gridlines -->
        <div class="gridlines" aria-hidden="true">
          {#each yAxisValues as _}
            <div class="grid-line"></div>
          {/each}
        </div>

        <!-- Bar chart container -->
        <div class="bars-container">
          {#each chartData as item, index}
            <div
              class="bar-wrapper"
              onmouseenter={() => hoveredIndex = index}
              onmouseleave={() => hoveredIndex = null}
              onfocus={() => hoveredIndex = index}
              onblur={() => hoveredIndex = null}
              role="button"
              tabindex="0"
              aria-label="{item.month}: {item.attendance} attendees"
            >
              <!-- The actual bar with dynamic height -->
              <div
                class="bar"
                class:bar-hovered={hoveredIndex === index}
                style="height: {calculateHeight(item.attendance)}%"
              >
                <!-- Tooltip showing exact value on hover -->
                {#if hoveredIndex === index}
                  <div class="tooltip" role="tooltip">
                    <span class="tooltip-value">{item.attendance}</span>
                    <span class="tooltip-label">attendees</span>
                  </div>
                {/if}
              </div>
              
              <!-- Month label below bar -->
              <span class="month-label" aria-hidden="true">
                {item.month}
              </span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Stats footer with 3 columns -->
  <footer class="stats-footer">
    <div class="stat-column">
      <span class="stat-label">AVERAGE</span>
      <span class="stat-value">{averageAttendance}</span>
    </div>
    <div class="stat-column stat-column-middle">
      <span class="stat-label">HIGHEST</span>
      <span class="stat-value">{highestMonth.attendance}</span>
    </div>
    <div class="stat-column">
      <span class="stat-label">LOWEST</span>
      <span class="stat-value">{lowestMonth.attendance}</span>
    </div>
  </footer>

  <!-- Screen reader only description -->
  <div class="sr-only">
    {trendDescription}
  </div>
</article>

<style>
  /*
   * Chart Card Container
   * Elevated background with premium styling
   */
  .chart-card {
    background: hsl(0 0% 10%); /* #1a1a1a - elevated background */
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    padding: 1.5rem; /* 24px */
  }

  /*
   * Chart Header
   * Title and subtitle section
   */
  .chart-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 1.5rem; /* 24px */
  }

  .chart-subtitle {
    font-size: 0.875rem; /* 14px */
    color: #999999;
    margin-top: 0.25rem;
  }

  /*
   * Empty State
   * Displayed when no data is available for the selected range
   */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 220px;
    padding: 2rem;
    text-align: center;
  }

  .empty-icon {
    width: 3rem;
    height: 3rem;
    color: #666666;
    margin-bottom: 1rem;
  }

  .empty-text {
    font-size: 1rem;
    font-weight: 500;
    color: #999999;
    margin-bottom: 0.25rem;
  }

  .empty-subtext {
    font-size: 0.875rem;
    color: #666666;
  }

  /*
   * Chart Wrapper
   * Contains Y-axis and main chart area side by side
   */
  .chart-wrapper {
    display: flex;
    gap: 0.75rem;
    height: 220px;
    margin-bottom: 1rem;
  }

  /*
   * Y-Axis Labels
   * Vertical axis showing attendance values
   */
  .y-axis {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 0.5rem 0;
    min-width: 2.5rem;
  }

  .y-label {
    font-size: 0.75rem; /* 12px */
    color: #888888; /* --muted color */
    text-align: right;
    line-height: 1;
  }

  /* Hide Y-axis on very small screens */
  @media (max-width: 400px) {
    .y-axis {
      display: none;
    }
  }

  /*
   * Chart Area
   * Main area containing gridlines and bars
   */
  .chart-area {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  /*
   * Gridlines
   * Horizontal reference lines - very subtle
   */
  .gridlines {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 0.5rem 0;
    pointer-events: none;
  }

  .grid-line {
    height: 1px;
    background-color: #252525; /* Very subtle grid lines */
  }

  /*
   * Bars Container
   * Flexbox container for all bar elements
   */
  .bars-container {
    flex: 1;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.75rem; /* 12px between bars */
    padding-top: 0.5rem;
  }

  /*
   * Bar Wrapper
   * Contains individual bar and its label
   */
  .bar-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    cursor: pointer;
    position: relative;
  }

  .bar-wrapper:focus {
    outline: none;
  }

  .bar-wrapper:focus-visible .bar {
    box-shadow: 0 0 0 2px hsl(var(--ring));
  }

  /*
   * Individual Bar
   * The actual bar element with cyan accent color
   */
  .bar {
    width: 100%;
    max-width: 2.5rem;
    min-width: 0.75rem;
    background: #06b6d4; /* Cyan accent */
    border-radius: 8px 8px 0 0; /* Top corners rounded */
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    margin-top: auto;
  }

  /* Hover state - subtle brightness increase */
  .bar-hovered {
    filter: brightness(1.1);
  }

  /*
   * Tooltip
   * Clean and minimal tooltip design
   */
  .tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: hsl(0 0% 12%);
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    padding: 0.5rem 0.75rem; /* 8px 12px */
    white-space: nowrap;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: hsl(var(--border));
  }

  .tooltip-value {
    font-size: 0.875rem; /* 14px */
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  .tooltip-label {
    font-size: 0.75rem; /* 12px */
    color: hsl(var(--muted-foreground));
  }

  /*
   * Month Labels
   * X-axis labels below each bar
   */
  .month-label {
    font-size: 0.75rem; /* 12px */
    color: #888888; /* --muted color */
    margin-top: 0.5rem;
  }

  /* Show abbreviated labels on small screens */
  @media (max-width: 500px) {
    .month-label {
      font-size: 0.625rem;
    }
  }

  /*
   * Stats Footer
   * 3 equal columns with dividers
   */
  .stats-footer {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-top: 1.5rem; /* 24px */
    padding-top: 1.5rem; /* 24px */
    border-top: 1px solid #252525;
  }

  .stat-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .stat-column-middle {
    border-left: 1px solid #252525;
    border-right: 1px solid #252525;
  }

  .stat-label {
    font-size: 0.75rem; /* 12px */
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #999999;
    margin-bottom: 0.25rem;
  }

  .stat-value {
    font-size: 1.5rem; /* 24px */
    font-weight: 600;
    color: #f5f5f5;
  }

  /*
   * Screen Reader Only
   * Visually hidden but accessible to screen readers
   */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>