---
description: Create interactive KPI cards with click navigation, trends, and loading states.
---

# KPI Card Patterns

This skill guides creation of Key Performance Indicator cards following the "Click = Action" philosophy.

---

## 1. Core Structure

```svelte
<script>
  let {
    label = "",
    value = 0,
    trend = null,        // { value: number, direction: 'up' | 'down' }
    href = null,         // Navigation target
    icon = null,         // Optional icon snippet
    loading = false,
    color = "primary",   // primary | success | warning | destructive
  } = $props();
  
  const isClickable = $derived(!!href);
</script>

{#if isClickable}
  <a 
    {href} 
    class="card-interactive block hover:border-primary/50"
  >
    <KPIContent />
  </a>
{:else}
  <div class="card-base">
    <KPIContent />
  </div>
{/if}
```

---

## 2. Full Component

```svelte
<script>
  let {
    label = "",
    value = 0,
    trend = null,
    href = null,
    icon = null,
    loading = false,
    subtitle = "",
  } = $props();
</script>

<svelte:element
  this={href ? "a" : "div"}
  href={href || undefined}
  class="card-base p-4 {href ? 'cursor-pointer hover:bg-muted/30 hover:border-primary/30 transition-all' : ''}"
>
  {#if loading}
    <!-- Loading skeleton -->
    <div class="space-y-2 animate-pulse">
      <div class="h-3 bg-muted/50 rounded w-1/2"></div>
      <div class="h-8 bg-muted/50 rounded w-3/4"></div>
    </div>
  {:else}
    <!-- Label row -->
    <div class="flex items-center justify-between mb-1">
      <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      {#if icon}
        <span class="text-muted-foreground">
          {@render icon()}
        </span>
      {/if}
    </div>
    
    <!-- Value row -->
    <div class="flex items-end gap-2">
      <span class="text-2xl font-bold text-foreground">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      
      {#if trend}
        <span class="text-xs font-medium flex items-center gap-0.5 mb-1
          {trend.direction === 'up' ? 'text-success' : 'text-destructive'}">
          {#if trend.direction === 'up'}
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          {:else}
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          {/if}
          {Math.abs(trend.value)}%
        </span>
      {/if}
    </div>
    
    <!-- Optional subtitle -->
    {#if subtitle}
      <p class="text-xs text-muted-foreground mt-1">{subtitle}</p>
    {/if}
    
    <!-- Clickable hint -->
    {#if href}
      <div class="mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        View details →
      </div>
    {/if}
  {/if}
</svelte:element>
```

---

## 3. Usage Examples

### Basic (non-clickable)
```svelte
<KPICard 
  label="Total Members" 
  value={152} 
/>
```

### With trend indicator
```svelte
<KPICard 
  label="Weekly Attendance" 
  value={87} 
  trend={{ value: 12, direction: 'up' }}
/>
```

### Clickable (navigates on click)
```svelte
<KPICard 
  label="Follow-ups Needed" 
  value={5} 
  href="/people?filter=needs_followup"
/>
```

### With icon
```svelte
<KPICard label="New Visitors" value={12}>
  {#snippet icon()}
    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  {/snippet}
</KPICard>
```

---

## 4. Grid Layout

```svelte
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <KPICard label="Total Members" value={stats.totalMembers} href="/people?status=member" />
  <KPICard label="Avg Attendance" value={stats.avgAttendance} trend={stats.attendanceTrend} />
  <KPICard label="New Visitors" value={stats.newVisitors} href="/people?status=guest&period=month" />
  <KPICard label="Follow-ups" value={stats.followups} href="/visitation?filter=pending" />
</div>
```

---

## 5. Color Variants

```svelte
<!-- Success (green glow for positive metrics) -->
<div class="card-base border-success/30 hover:border-success/50">

<!-- Warning (amber for attention needed) -->  
<div class="card-base border-warning/30 hover:border-warning/50">

<!-- Destructive (red for critical issues) -->
<div class="card-base border-destructive/30 hover:border-destructive/50">
```

---

## 6. Trend Calculation

```javascript
function calculateTrend(current, previous) {
  if (!previous || previous === 0) return null;
  
  const percentChange = ((current - previous) / previous) * 100;
  
  return {
    value: Math.round(Math.abs(percentChange)),
    direction: percentChange >= 0 ? 'up' : 'down'
  };
}
```

---

## 7. With Sparkline

For compact trend visualization:

```svelte
<div class="card-base p-4">
  <div class="flex items-start justify-between">
    <div>
      <span class="text-xs text-muted-foreground uppercase">{label}</span>
      <div class="text-2xl font-bold">{value}</div>
    </div>
    <div class="w-20 h-8">
      <Sparkline data={trendData} />
    </div>
  </div>
</div>
```

---

## 8. Loading State

```svelte
<div class="card-base p-4">
  <div class="animate-pulse space-y-2">
    <div class="h-3 bg-muted/40 rounded w-24"></div>
    <div class="h-7 bg-muted/40 rounded w-16"></div>
  </div>
</div>
```

---

## 9. Accessibility

- Clickable cards use `<a>` with valid `href`
- Non-clickable use `<div>`
- `aria-label` on complex icons
- Focus visible ring for keyboard navigation

---

## 10. Checklist

When creating KPI cards:

- [ ] Uses `card-base` or `card-interactive` class
- [ ] Label is uppercase, muted color
- [ ] Value is large, bold
- [ ] Trend arrow + percentage when applicable
- [ ] `href` makes it clickable (uses `<a>` element)
- [ ] Hover state shows "View details →" hint
- [ ] Loading skeleton matches layout
- [ ] Part of responsive grid layout
