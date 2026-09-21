<script>
  import MetricComparison from "$lib/components/charts/MetricComparison.svelte";
  import { reportingMonths } from "$lib/utils/comparisonMetrics.js";
  import Modal from "$lib/components/ui/Modal.svelte";
  import { hasFirstAttended, hasJoinedChurch, isOutreachSalvation } from "$lib/utils/evangelismView.js";

  let {
    metrics = { reached: 0, saved: 0, visited: 0, joined: 0 },
    periodLabel = "Selected period",
    rows = [],
    periodRange = {},
  } = $props();

  let selectedOutcome = $state(null);

  const outcomes = $derived([
    { key: "saved", label: "Saved on outreach", value: metrics.saved, note: "Salvation decisions made during outreach", card: "hover:border-warning/40", icon: "bg-warning/10 text-warning", text: "text-warning", bar: "bg-warning", iconType: "heart" },
    { key: "attended", label: "First Timers", value: metrics.visited, note: "First recorded church attendance from outreach", card: "hover:border-info/40", icon: "bg-info/10 text-info", text: "text-info", bar: "bg-info", iconType: "calendar" },
    { key: "joined", label: "Joined church", value: metrics.joined, note: "People added to membership", card: "hover:border-success/40", icon: "bg-success/10 text-success", text: "text-success", bar: "bg-success", iconType: "check" },
  ]);

  const selectedRows = $derived(() => {
    if (!selectedOutcome) return [];
    return (rows || []).filter((row) => {
      if (selectedOutcome.key === "saved") return isOutreachSalvation(row);
      if (selectedOutcome.key === "attended") return hasFirstAttended(row);
      if (selectedOutcome.key === "joined") return hasJoinedChurch(row);
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
  <header class="mb-5 pr-12">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 id="outreach-outcomes-title" class="text-base font-semibold text-foreground">What happened after outreach?</h3>
        <p class="mt-1 text-xs text-muted-foreground">Outcome signals for the people reached in the selected period.</p>
      </div>
      <span class="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">{periodLabel}</span>
    </div>
  </header>

  <MetricComparison metrics={outcomes.map(outcome=>({key:outcome.key,label:outcome.label,total:outcome.value,denominator:reportingMonths(periodRange,rows.map(row=>row.contact_date)),averageLabel:'Average per calendar month',outcome}))} {periodLabel} onSelect={metric=>selectedOutcome=metric.outcome} />

  <footer class="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
    Monthly averages divide outcomes for this contact cohort by calendar months in the selected period, including empty and partial months. Outcomes may happen later than first contact.
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
