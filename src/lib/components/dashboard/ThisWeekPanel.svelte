<script>
  let {
    forecast = {},
    commitments = [],
    visitationCount = 0,
    serviceDate = "",
  } = $props();

  const expected = $derived(Number(forecast?.expected_total) || 0);
  const confirmed = $derived(Number(forecast?.confirmed_total) || 0);
  const away = $derived(Number(forecast?.known_away) || 0);
  const readiness = $derived(expected > 0 ? Math.min(100, Math.round((confirmed / expected) * 100)) : 0);
  const upcoming = $derived((commitments || []).slice(0, 3));

  function parseDate(value) {
    if (!value) return null;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value, includeWeekday = true) {
    const date = parseDate(value);
    if (!date) return "Date not set";
    return date.toLocaleDateString("en-GB", {
      ...(includeWeekday ? { weekday: "short" } : {}),
      day: "numeric",
      month: "short",
    });
  }

  function personName(person) {
    return [person?.preferred_name || person?.first_name, person?.last_name].filter(Boolean).join(" ") || "Unnamed person";
  }

  function gatheringLabel(type) {
    return {
      sunday_service: "Sunday service",
      bacenta: "Bacenta",
      special_event: "Special event",
    }[type] || String(type || "Gathering").replace(/[_-]+/g, " ");
  }
</script>

<section class="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card" aria-labelledby="week-title">
  <header class="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Forward view</p>
      <h2 id="week-title" class="mt-1.5 text-lg font-semibold text-foreground">Coming this week</h2>
    </div>
    <a href="/pipeline" class="text-xs font-semibold text-primary hover:underline">Open CRM</a>
  </header>

  <div class="border-b border-border p-5">
    <div class="flex items-end justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-foreground">Sunday readiness</p>
        <p class="mt-1 text-xs text-muted-foreground">{formatDate(serviceDate)}</p>
      </div>
      <p class="text-right text-2xl font-semibold tracking-[-0.03em] text-foreground">{confirmed}<span class="text-sm font-normal text-muted-foreground"> / {expected}</span></p>
    </div>

    <div class="mt-4 h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Sunday confirmations" aria-valuemin="0" aria-valuemax="100" aria-valuenow={readiness}>
      <div class="h-full rounded-full bg-primary transition-all duration-500" style={`width: ${readiness}%`}></div>
    </div>
    <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
      <span>{readiness}% confirmed</span>
      <span>{away} known away</span>
    </div>
  </div>

  <div class="flex-1 p-5">
    <div class="flex items-center justify-between gap-3">
      <p class="text-sm font-medium text-foreground">Confirmed plans</p>
      <span class="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{commitments.length}</span>
    </div>

    {#if upcoming.length}
      <ul class="mt-3 divide-y divide-border" aria-label="Upcoming confirmed plans">
        {#each upcoming as commitment}
          <li class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary" aria-hidden="true">
              {personName(commitment.person).slice(0, 1)}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-foreground">{personName(commitment.person)}</p>
              <p class="truncate text-xs text-muted-foreground">{gatheringLabel(commitment.gathering_type)} · {formatDate(commitment.gathering_date)}</p>
            </div>
          </li>
        {/each}
      </ul>
    {:else}
      <div class="mt-3 rounded-xl border border-dashed border-border px-4 py-5 text-center">
        <p class="text-sm text-muted-foreground">No confirmed plans yet.</p>
      </div>
    {/if}
  </div>

  <footer class="flex items-center justify-between gap-4 border-t border-border bg-secondary/15 px-5 py-4 text-xs text-muted-foreground">
    <span>{visitationCount} pastoral follow-up{visitationCount === 1 ? "" : "s"} due</span>
    <a href="/visitation" class="font-semibold text-foreground hover:text-primary">Review care →</a>
  </footer>
</section>
