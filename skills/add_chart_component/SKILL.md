---
description: Create custom SVG chart components with consistent animations, tooltips, and interactivity.
---

# Add Chart Component

This skill guides creation of custom SVG-based chart components following the project's patterns.

---

## 1. Chart Structure

All charts follow this structure:

```svelte
<!--
  [ChartName].svelte
  [Description of what the chart visualizes]
  
  Props:
    - data: [Data shape description]
    - title: Optional chart title
    - onPointClick: Optional callback for interactive points
-->

<script>
  import { onMount } from "svelte";
  
  let {
    data = [],
    title = "Chart Title",
    onPointClick = null,
  } = $props();
  
  // Animation state
  let mounted = $state(false);
  let hoveredIndex = $state(null);
  
  // Chart dimensions
  const chartWidth = 100;  // viewBox units
  const chartHeight = 60;
  const padding = { top: 8, right: 8, bottom: 15, left: 8 };
  
  onMount(() => {
    setTimeout(() => { mounted = true; }, 100);
  });
  
  // Derived calculations
  const chartData = $derived(() => {
    // Process data for rendering
    return processedData;
  });
</script>

<div class="card-base p-4 overflow-visible">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-sm font-medium text-muted-foreground">{title}</h3>
  </div>
  
  {#if data.length > 0}
    <div class="relative">
      <svg viewBox="0 0 {chartWidth} {chartHeight}" class="w-full h-44 overflow-visible">
        <!-- Chart content -->
      </svg>
    </div>
  {:else}
    <div class="h-44 flex items-center justify-center">
      <p class="text-sm text-muted-foreground italic">No data available</p>
    </div>
  {/if}
</div>
```

---

## 2. Standard Gradients

Define in `<defs>` section:

```svelte
<defs>
  <!-- Area fill gradient (vertical) -->
  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" style="stop-color: hsl(var(--primary)); stop-opacity: 0.4" />
    <stop offset="100%" style="stop-color: hsl(var(--primary)); stop-opacity: 0.05" />
  </linearGradient>
  
  <!-- Line gradient (horizontal) -->
  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" style="stop-color: hsl(var(--primary)); stop-opacity: 0.8" />
    <stop offset="100%" style="stop-color: hsl(var(--primary)); stop-opacity: 1" />
  </linearGradient>
</defs>
```

---

## 3. Grid Lines

```svelte
<!-- Subtle grid lines at 25%, 50%, 75% -->
{#each [0.25, 0.5, 0.75] as ratio}
  <line
    x1={padding.left}
    y1={padding.top + (chartHeight - padding.top - padding.bottom) * (1 - ratio)}
    x2={chartWidth - padding.right}
    y2={padding.top + (chartHeight - padding.top - padding.bottom) * (1 - ratio)}
    stroke="currentColor"
    stroke-opacity="0.1"
    stroke-dasharray="1 2"
  />
{/each}
```

---

## 4. Entrance Animation

Apply to chart elements with staggered delays:

```svelte
<!-- Area/bars -->
<path
  d={areaPath}
  fill="url(#areaGradient)"
  class="transition-all duration-700 ease-out"
  style="opacity: {mounted ? 1 : 0}; transform: translateY({mounted ? 0 : 10}px);"
/>

<!-- Points with staggered delay -->
{#each points as point, i}
  <circle
    cx={point.x}
    cy={point.y}
    r="1"
    class="fill-primary transition-all duration-200"
    style="opacity: {mounted ? 1 : 0}; transition-delay: {150 + i * 30}ms;"
  />
{/each}
```

---

## 5. Interactive Points

```svelte
{#each chartData().points as point, i}
  <!-- Invisible hitbox (larger for easier hovering) -->
  <circle
    cx={point.x}
    cy={point.y}
    r="3"
    fill="transparent"
    class={onPointClick ? "cursor-pointer" : ""}
    role={onPointClick ? "button" : "presentation"}
    tabindex={onPointClick ? 0 : -1}
    aria-label={onPointClick ? `View details for ${point.label}` : undefined}
    onmouseenter={() => hoveredIndex = i}
    onmouseleave={() => hoveredIndex = null}
    onfocus={() => hoveredIndex = i}
    onblur={() => hoveredIndex = null}
    onclick={(e) => handlePointClick(point, e)}
    onkeydown={(e) => e.key === "Enter" && handlePointClick(point, e)}
  />
  
  <!-- Visible point -->
  <circle
    cx={point.x}
    cy={point.y}
    r={hoveredIndex === i ? 1.8 : 1}
    class="fill-primary transition-all duration-200 pointer-events-none"
  />
  
  <!-- Hover glow -->
  {#if hoveredIndex === i}
    <circle
      cx={point.x}
      cy={point.y}
      r="3"
      class="fill-primary/30 animate-pulse pointer-events-none"
    />
  {/if}
{/each}
```

---

## 6. Tooltip

```svelte
{#if hoveredIndex !== null}
  {@const point = chartData().points[hoveredIndex]}
  <div
    class="absolute z-50 pointer-events-none bg-card border border-border 
           rounded-lg shadow-xl p-3 min-w-[140px] transform -translate-x-1/2 
           animate-in fade-in zoom-in-95 duration-150"
    style="left: {(point.x / chartWidth) * 100}%; 
           top: -10px; 
           transform: translateX(-50%) translateY(-100%);"
  >
    <div class="text-xs font-medium text-foreground mb-1">
      {point.label}
    </div>
    <div class="text-lg font-bold text-primary">
      {point.value}
    </div>
    
    <!-- Arrow pointing down -->
    <div class="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
      <div class="w-0 h-0 border-l-[6px] border-l-transparent 
                  border-r-[6px] border-r-transparent 
                  border-t-[6px] border-t-card"></div>
    </div>
  </div>
{/if}
```

---

## 7. X-Axis Labels

```svelte
<div class="flex justify-between mt-2 px-1">
  <span class="text-[10px] text-muted-foreground">{firstLabel}</span>
  {#if points.length > 2}
    <span class="text-[10px] text-muted-foreground">{middleLabel}</span>
  {/if}
  <span class="text-[10px] text-muted-foreground">{lastLabel}</span>
</div>
```

---

## 8. Legend / Summary Footer

```svelte
<div class="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
  <div class="text-center">
    <div class="text-lg font-bold text-foreground">{latestValue}</div>
    <div class="text-xs text-muted-foreground">Latest</div>
  </div>
  <div class="text-center">
    <div class="text-lg font-bold text-foreground">{averageValue}</div>
    <div class="text-xs text-muted-foreground">Average</div>
  </div>
  <div class="text-center">
    <div class="text-lg font-bold text-foreground">{peakValue}</div>
    <div class="text-xs text-muted-foreground">Peak</div>
  </div>
</div>
```

---

## 9. Common Chart Types

### Line Chart
- Smooth bezier curves: `C cpx prev.y, cpx curr.y, curr.x curr.y`
- Area fill below line

### Bar Chart
```svelte
{#each bars as bar, i}
  <rect
    x={bar.x}
    y={bar.y}
    width={barWidth}
    height={chartHeight - padding.bottom - bar.y}
    fill="hsl(var(--primary))"
    rx="2"
    class="transition-all duration-500"
    style="opacity: {mounted ? 1 : 0}; transition-delay: {i * 50}ms;"
  />
{/each}
```

### Donut Chart
```svelte
<circle
  cx="50"
  cy="50"
  r="35"
  fill="none"
  stroke="hsl(var(--primary))"
  stroke-width="12"
  stroke-dasharray="{percentage * circumference / 100} {circumference}"
  stroke-dashoffset="0"
  transform="rotate(-90 50 50)"
/>
```

---

## 10. Color Palette for Multi-Series

```javascript
const CHART_COLORS = [
  'hsl(var(--primary))',      // Cyan
  'hsl(var(--success))',      // Green
  'hsl(var(--warning))',      // Amber
  'hsl(var(--destructive))',  // Red
  'hsl(187 50% 60%)',         // Light cyan
  'hsl(280 60% 60%)',         // Purple
];
```

---

## 11. Checklist

When creating a new chart:

- [ ] Wrapped in `.card-base` with padding
- [ ] Has title in header
- [ ] Shows empty state when no data
- [ ] Entrance animation with `mounted` state
- [ ] Uses design system gradients
- [ ] Points have larger invisible hitbox for hover
- [ ] Tooltip positioned above point with arrow
- [ ] X-axis labels (first, middle, last)
- [ ] Summary stats in footer
- [ ] Interactive points are keyboard accessible
- [ ] `onPointClick` callback for drill-down
