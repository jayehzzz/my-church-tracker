<script>
  let {
    metrics = { reached: 0, saved: 0, visited: 0, engaged: 0, joined: 0 },
    periodLabel = "Selected period",
  } = $props();

  const outcomes = $derived([
    { label: "Salvation decisions", value: metrics.saved, note: "Faith decisions recorded", card: "hover:border-warning/40", icon: "bg-warning/10 text-warning", text: "text-warning", bar: "bg-warning", iconType: "heart" },
    { label: "First visits", value: metrics.visited, note: "People who came to a gathering", card: "hover:border-info/40", icon: "bg-info/10 text-info", text: "text-info", bar: "bg-info", iconType: "calendar" },
    { label: "Saved and visited", value: metrics.engaged, note: "People who took both steps", card: "hover:border-primary/40", icon: "bg-primary/10 text-primary", text: "text-primary", bar: "bg-primary", iconType: "spark" },
    { label: "Joined church", value: metrics.joined, note: "People added to membership", card: "hover:border-success/40", icon: "bg-success/10 text-success", text: "text-success", bar: "bg-success", iconType: "check" },
  ]);

  function percentage(value) {
    return metrics.reached ? Math.round((Number(value) / metrics.reached) * 100) : 0;
  }
</script>

<section class="card-base p-5" aria-labelledby="outreach-outcomes-title">
  <header class="mb-5">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 id="outreach-outcomes-title" class="text-base font-semibold text-foreground">What happened after outreach?</h3>
        <p class="mt-1 text-xs text-muted-foreground">Outcome signals for the people reached in the selected period.</p>
      </div>
      <span class="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">{periodLabel}</span>
    </div>
  </header>

  <div class="grid gap-3 sm:grid-cols-2">
    {#each outcomes as outcome (outcome.label)}
      <article class="rounded-xl border border-border bg-secondary/10 p-4 transition-all duration-200 hover:-translate-y-0.5 {outcome.card} hover:bg-secondary/20 hover:shadow-lg hover:shadow-black/10" aria-label={`${outcome.label}: ${outcome.value}`}>
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg {outcome.icon}" aria-hidden="true">
              {#if outcome.iconType === "heart"}<span class="text-base">♥</span>
              {:else if outcome.iconType === "calendar"}<span class="text-sm">◷</span>
              {:else if outcome.iconType === "spark"}<span class="text-sm">✦</span>
              {:else}<span class="text-sm">✓</span>{/if}
            </span>
            <div>
              <h4 class="text-sm font-semibold text-foreground">{outcome.label}</h4>
              <p class="mt-0.5 text-[11px] text-muted-foreground">{outcome.note}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-2xl font-semibold {outcome.text}">{outcome.value}</p>
            <p class="text-[11px] text-muted-foreground">{percentage(outcome.value)}% of reached</p>
          </div>
        </div>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-background/70" aria-hidden="true">
          <div class="h-full rounded-full {outcome.bar} transition-all duration-500" style={`width: ${Math.min(100, percentage(outcome.value))}%`}></div>
        </div>
      </article>
    {/each}
  </div>

  <footer class="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
    Rates use people reached as the denominator; outcomes are not required to happen in a fixed order.
  </footer>
</section>
