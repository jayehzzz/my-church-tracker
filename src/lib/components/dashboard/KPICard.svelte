<script>
  let {
    title = "",
    value = 0,
    trend = null,
    format = "number",
    description = "",
    href = "",
    icon = "chart",
    variant = "default",
    suffix = "",
    trendLabel = "vs previous period",
  } = $props();

  const variantClasses = {
    default: { icon: "bg-primary/10 text-primary", edge: "from-primary/35" },
    info: { icon: "bg-blue-500/10 text-blue-400", edge: "from-blue-500/35" },
    success: { icon: "bg-success/10 text-success", edge: "from-success/35" },
    warning: { icon: "bg-warning/10 text-warning", edge: "from-warning/35" },
    danger: { icon: "bg-destructive/10 text-destructive", edge: "from-destructive/35" },
  };

  const palette = $derived(variantClasses[variant] || variantClasses.default);
  const hasTrend = $derived(trend !== null && trend !== undefined && Number.isFinite(Number(trend)));
  const trendDirection = $derived(Number(trend) > 0 ? "up" : Number(trend) < 0 ? "down" : "steady");

  function formatValue(val, fmt) {
    const numericValue = Number(val) || 0;
    if (fmt === "percentage") return `${numericValue}%`;
    if (fmt === "currency") {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numericValue);
    }
    return new Intl.NumberFormat("en-GB").format(numericValue);
  }

  const displayedValue = $derived(`${formatValue(value, format)}${suffix ? ` ${suffix}` : ""}`);
  const ariaLabel = $derived(
    `${title}: ${displayedValue}${hasTrend ? `, ${Math.abs(Number(trend))}% ${trendDirection === "up" ? "increase" : trendDirection === "down" ? "decrease" : "change"} ${trendLabel}` : ""}`,
  );
</script>

<article
  class="kpi-card group relative min-h-[154px] overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-200 {href ? 'has-link' : ''} hover:-translate-y-0.5 hover:border-border-hover hover:shadow-[0_18px_45px_rgb(0_0_0_/_0.18)]"
  aria-label={ariaLabel}
  title={description || ariaLabel}
>
  <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r {palette.edge} via-transparent to-transparent"></div>

  {#if href}
    <a class="absolute inset-0 z-10 rounded-2xl" {href} aria-label={`Open ${title}`}>
      <span class="sr-only">Open {title}</span>
    </a>
  {/if}

  <div class="relative flex h-full flex-col justify-between gap-5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-medium text-muted-foreground">{title}</p>
        {#if description}<p class="mt-1 truncate text-xs text-subtle">{description}</p>{/if}
      </div>

      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl {palette.icon} transition-transform duration-200 group-hover:scale-105" aria-hidden="true">
        {#if icon === "users" || icon === "user-plus"}
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            {#if icon === "user-plus"}<path stroke-linecap="round" d="M19 8v6m3-3h-6" />{/if}
          </svg>
        {:else if icon === "heart"}
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
        {:else if icon === "clock"}
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path stroke-linecap="round" d="M12 7v5l3 2" /></svg>
        {:else if icon === "home"}
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9Z" /></svg>
        {:else if icon === "check-circle"}
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path stroke-linecap="round" stroke-linejoin="round" d="m8 12 2.5 2.5L16 9" /></svg>
        {:else}
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 19V9m5 10V5m5 14v-7m5 7V3" /></svg>
        {/if}
      </span>
    </div>

    <div class="flex items-end justify-between gap-3">
      <p class="text-[2.25rem] font-semibold leading-none tracking-[-0.035em] text-foreground">{displayedValue}</p>

      {#if hasTrend}
        <span
          class="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold {trendDirection === 'up'
            ? 'bg-success/10 text-success'
            : trendDirection === 'down'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-secondary text-muted-foreground'}"
          title={trendLabel}
        >
          {#if trendDirection === "up"}↑{:else if trendDirection === "down"}↓{:else}—{/if}
          {Math.abs(Number(trend))}%
        </span>
      {/if}
    </div>
  </div>
</article>

<style>
  .kpi-card.has-link:has(a:focus-visible) {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 3px;
  }
</style>
