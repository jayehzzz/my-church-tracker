<script>
  import Modal from "$lib/components/ui/Modal.svelte";

  let {
    metrics = { reached: 0, saved: 0, visited: 0, engaged: 0, joined: 0 },
    periodLabel = "Selected period",
    rows = [],
  } = $props();

  let selectedOutcome = $state(null);

  const outcomes = $derived([
    { key: "saved", label: "Salvation decisions", value: metrics.saved, note: "Faith decisions recorded", card: "hover:border-warning/40", icon: "bg-warning/10 text-warning", text: "text-warning", bar: "bg-warning", iconType: "heart" },
    { key: "attended", label: "First-time attendees", value: metrics.visited, note: "Reached people who attended a gathering", card: "hover:border-info/40", icon: "bg-info/10 text-info", text: "text-info", bar: "bg-info", iconType: "calendar" },
    { key: "saved_attended", label: "Saved and attended", value: metrics.engaged, note: "People with both outcomes recorded", card: "hover:border-primary/40", icon: "bg-primary/10 text-primary", text: "text-primary", bar: "bg-primary", iconType: "spark" },
    { key: "joined", label: "Joined church", value: metrics.joined, note: "People added to membership", card: "hover:border-success/40", icon: "bg-success/10 text-success", text: "text-success", bar: "bg-success", iconType: "check" },
  ]);

  const selectedRows = $derived(() => {
    if (!selectedOutcome) return [];
    return (rows || []).filter((row) => {
      const attended = Boolean(row.attended_church || row.first_visit_date || row.converted);
      const joined = Boolean(row.converted || ["member", "leader"].includes(row.member_status || row.status));
      if (selectedOutcome.key === "saved") return Boolean(row.salvation_decision);
      if (selectedOutcome.key === "attended") return attended;
      if (selectedOutcome.key === "saved_attended") return Boolean(row.salvation_decision) && attended;
      if (selectedOutcome.key === "joined") return joined;
      return false;
    });
  });

  function personName(row) {
    return [row?.first_name, row?.last_name].filter(Boolean).join(" ") || "Unnamed person";
  }

  function formatDate(value) {
    if (!value) return "Date not recorded";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
    return Number.isNaN(date.getTime()) ? "Date not recorded" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

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
      <button type="button" class="rounded-xl border border-border bg-secondary/10 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 {outcome.card} hover:bg-secondary/20 hover:shadow-lg hover:shadow-black/10" aria-label={`${outcome.label}: ${outcome.value}. View people.`} onclick={() => selectedOutcome = outcome}>
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
        <span class="mt-3 block text-[11px] font-medium text-primary">View people →</span>
      </button>
    {/each}
  </div>

  <footer class="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
    Rates use people reached as the denominator; outcomes are not required to happen in a fixed order.
  </footer>
</section>

<Modal bind:isOpen={selectedOutcome} title={selectedOutcome?.label || "Outcome details"} size="lg">
  {#if selectedOutcome}
    <div class="space-y-4">
      <div class="rounded-xl border border-border bg-secondary/20 p-4">
        <p class="text-3xl font-semibold {selectedOutcome.text}">{selectedOutcome.value}</p>
        <p class="mt-1 text-sm text-muted-foreground">{percentage(selectedOutcome.value)}% of the {metrics.reached} people reached in {periodLabel.toLowerCase()}.</p>
      </div>
      {#if selectedRows().length}
        <div class="max-h-80 divide-y divide-border overflow-y-auto rounded-xl border border-border">
          {#each selectedRows() as row (row.id || row._id)}
            <a href="/people/{row.id || row._id}" class="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-secondary/30">
              <span class="font-medium text-foreground">{personName(row)}</span>
              <span class="text-xs text-muted-foreground">Reached {formatDate(row.contact_date)}</span>
            </a>
          {/each}
        </div>
      {:else}
        <p class="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No named people are available for this outcome in the selected period.</p>
      {/if}
    </div>
  {/if}
</Modal>
