<!--
  KPICard.svelte
  A premium KPI metric card component for the church tracker dashboard.
  
  Features:
  - Displays a metric title, value, and optional trend indicator
  - Supports number, percentage, and currency formatting
  - Accessible with proper ARIA labels
  - Premium styling with gradient background and hover effects
  - Uses Svelte 5 runes syntax
-->

<script>
  /**
   * Component Props using Svelte 5 $props() rune
   * @param {string} title - The title/label for the metric
   * @param {number} value - The metric value to display
   * @param {number} [trend=0] - Trend percentage (positive = up, negative = down)
   * @param {string} [format='number'] - Format type ('number', 'percentage', 'currency')
   */
  let { title = '', value = 0, trend = 0, format = 'number' } = $props();
  
  /**
   * Format the value based on type
   * @param {number} val - The value to format
   * @param {string} fmt - The format type
   * @returns {string} Formatted value string
   */
  function formatValue(val, fmt) {
    if (fmt === 'percentage') {
      return `${val}%`;
    } else if (fmt === 'currency') {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(val);
    }
    return new Intl.NumberFormat('en-GB').format(val);
  }
  
  // Determine trend direction and styling using $derived rune
  const trendDirection = $derived(trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral');
  const trendColor = $derived(
    trendDirection === 'up' ? 'text-success' :
    trendDirection === 'down' ? 'text-destructive' :
    'text-muted-foreground'
  );
  const trendBgColor = $derived(
    trendDirection === 'up' ? 'bg-success/10' :
    trendDirection === 'down' ? 'bg-destructive/10' :
    'bg-muted/10'
  );
  
  // Generate ARIA label for accessibility using $derived rune
  const ariaLabel = $derived((() => {
    let label = `${title}: ${formatValue(value, format)}`;
    if (trend !== 0) {
      const direction = trend > 0 ? 'increased' : 'decreased';
      label += `, ${direction} by ${Math.abs(trend)} percent`;
    }
    return label;
  })());
</script>

<!--
  Main card container
  Uses card-interactive class for base styling and hover effects from app.css
  Custom kpi-card class adds gradient background
-->
<div 
  class="kpi-card card-interactive relative flex flex-col justify-between min-h-[140px]"
  role="article"
  aria-label={ariaLabel}
>
  <!-- Label at top -->
  <span class="text-label">
    {title}
  </span>
  
  <!-- Large value in the middle/center area -->
  <span class="text-metric text-foreground">
    {formatValue(value, format)}
  </span>
  
  <!-- Trend badge positioned at bottom-right -->
  {#if trend !== 0}
    <div class="absolute bottom-5 right-5">
      <span 
        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium {trendColor} {trendBgColor}"
        aria-hidden="true"
      >
        {#if trendDirection === 'up'}
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        {:else if trendDirection === 'down'}
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        {/if}
        {Math.abs(trend)}%
      </span>
    </div>
  {/if}
</div>

<style>
  .kpi-card {
    /* Subtle gradient background from top-left to bottom-right */
    background: linear-gradient(135deg, hsl(0 0% 9%) 0%, hsl(0 0% 10%) 100%);
  }
  
  .text-metric {
    font-size: 2.625rem; /* 42px */
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }
</style>
