<script>
  import MetricComparison from '$lib/components/charts/MetricComparison.svelte';
  import { reportingMonths } from '$lib/utils/comparisonMetrics.js';

  let {
    metrics = { reached: 0, saved: 0, visited: 0, joined: 0 },
    periodLabel = 'Selected period',
    rows = [],
    periodRange = {},
    onDrilldown = null,
  } = $props();

  const outcomes = $derived([
    { key: 'saved', label: 'Saved on outreach', value: metrics.saved },
    { key: 'visited', label: 'First timers', value: metrics.visited },
    { key: 'joined', label: 'Joined church', value: metrics.joined },
  ]);

  function inspect(selection) {
    onDrilldown?.({
      ...selection,
      choices: selection.choices.map(choice => ({
        ...choice,
        domain: 'contact',
        aggregateScope: 'period',
        pointBounds: { startDate: periodRange.startDate || null, endDate: periodRange.endDate || null },
        scopeBounds: { startDate: periodRange.startDate || null, endDate: periodRange.endDate || null },
      })),
    });
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

  <MetricComparison metrics={outcomes.map(outcome => ({
    key: outcome.key, label: outcome.label, total: outcome.value,
    denominator: reportingMonths(periodRange, rows.map(row => row.contact_date)),
    averageLabel: 'Average per calendar month',
    startDate: periodRange.startDate, endDate: periodRange.endDate,
    sourceIds: rows.filter(row => outcome.key === 'saved' ? Boolean(row.outreach_salvation_decision ?? row.salvation_decision) : outcome.key === 'visited' ? Boolean(row.first_visit_date || row.attended_church) : ['member', 'leader'].includes(row.member_status)).map(row => row.id || row._id).filter(Boolean),
  }))} {periodLabel} domain="contact" onDrilldown={onDrilldown ? inspect : null} />

  <footer class="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
    Monthly averages divide outcomes for this contact cohort by calendar months in the selected period, including empty and partial months. Outcomes may happen later than first contact.
  </footer>
</section>
