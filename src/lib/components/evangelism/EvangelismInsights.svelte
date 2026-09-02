<script>
  import MonthlyContactsBar from "$lib/components/charts/MonthlyContactsBar.svelte";
  import ConversionFunnel from "$lib/components/charts/ConversionFunnel.svelte";

  let {
    metrics = { reached: 0, saved: 0, visited: 0, joined: 0 },
    monthlyData = [],
    topInviters = [],
    periodLabel = "Selected period",
    onInviterClick = null,
  } = $props();

  const stats = $derived([
    { label: "People reached", value: metrics.reached, note: "New outreach contacts", tone: "text-primary", icon: "users" },
    { label: "Salvation decisions", value: metrics.saved, note: "Faith decisions recorded", tone: "text-warning", icon: "heart" },
    { label: "First visits", value: metrics.visited, note: "Attended a gathering", tone: "text-info", icon: "calendar" },
    { label: "Joined church", value: metrics.joined, note: metrics.reached ? `${Math.round((metrics.joined / metrics.reached) * 100)}% of people reached` : "No join rate yet", tone: "text-success", icon: "check" },
  ]);
</script>

<div class="space-y-6">
  <section aria-labelledby="insights-summary-title">
    <div class="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 id="insights-summary-title" class="text-lg font-semibold text-foreground">Outreach impact</h2>
        <p class="mt-1 text-sm text-muted-foreground">A focused view of what happened after people were reached.</p>
      </div>
      <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{periodLabel}</p>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {#each stats as stat (stat.label)}
        <article class="card-base flex min-h-32 items-start gap-4 p-4" aria-label={`${stat.label}: ${stat.value}`}>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/60 {stat.tone}">
            {#if stat.icon === "users"}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m7-10a4 4 0 100-8 4 4 0 000 8zm13 10v-2a4 4 0 00-3-3.87m-2-8a4 4 0 010 7.75" /></svg>
            {:else if stat.icon === "heart"}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" /></svg>
            {:else if stat.icon === "calendar"}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14H3V6a2 2 0 012-2z" /></svg>
            {:else}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 6L9 17l-5-5" /></svg>
            {/if}
          </div>
          <div class="min-w-0">
            <p class="text-3xl font-semibold tracking-tight text-foreground">{stat.value}</p>
            <h3 class="mt-1 text-sm font-medium text-foreground">{stat.label}</h3>
            <p class="mt-1 text-xs text-muted-foreground">{stat.note}</p>
          </div>
        </article>
      {/each}
    </div>
  </section>

  {#if metrics.reached === 0}
    <section class="card-base border-dashed px-6 py-12 text-center">
      <div class="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4m0 4h.01M10.3 3.8L2.6 17.1A2 2 0 004.3 20h15.4a2 2 0 001.7-2.9L13.7 3.8a2 2 0 00-3.4 0z" /></svg>
      </div>
      <h2 class="mt-4 text-base font-semibold text-foreground">No outreach recorded for this period</h2>
      <p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Your full contact directory is still available in Contacts. Change the period above to review earlier outreach.</p>
    </section>
  {:else}
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <MonthlyContactsBar data={monthlyData} title="Contacts by month" />
      <ConversionFunnel data={{ contacts: metrics.reached, attended: metrics.visited, saved: metrics.saved, joined: metrics.joined }} title="Outreach journey" />
    </div>

    <section class="card-base overflow-hidden" aria-labelledby="top-inviters-title">
      <div class="border-b border-border px-5 py-4">
        <h2 id="top-inviters-title" class="text-base font-semibold text-foreground">People creating connections</h2>
        <p class="mt-1 text-xs text-muted-foreground">Inviters ranked by contacts reached in this period.</p>
      </div>
      {#if topInviters.length}
        <div class="divide-y divide-border">
          {#each topInviters as inviter, index (inviter.id)}
            <button type="button" class="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-secondary/25" onclick={() => onInviterClick?.(inviter)}>
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">{index + 1}</span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-foreground">{inviter.name}</span>
                <span class="mt-0.5 block text-xs text-muted-foreground">{inviter.joined} joined church</span>
              </span>
              <span class="text-right"><span class="block text-lg font-semibold text-foreground">{inviter.count}</span><span class="text-[11px] text-muted-foreground">contacts</span></span>
              <svg class="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 18l6-6-6-6" /></svg>
            </button>
          {/each}
        </div>
      {:else}
        <p class="px-5 py-8 text-center text-sm text-muted-foreground">No inviter information was recorded for this period.</p>
      {/if}
    </section>
  {/if}
</div>
