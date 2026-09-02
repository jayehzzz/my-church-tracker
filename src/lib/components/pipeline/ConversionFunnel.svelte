<!--
  ConversionFunnel.svelte
  
  A horizontal visual funnel chart component showing the conversion pipeline stages:
  New Contacts -> Contacted -> Promised -> Visited -> Converted.
  
  Features:
  - 5 gradient-colored horizontal bars proportionally sized to form a funnel
  - Stage labels, count metrics, and conversion rate badges
  - Transitional connector indicators between stages (↓ rate%)
  - Fully accessible and responsive with Svelte 5 runes syntax
  
  @component
-->

<script>
  /**
   * @typedef {Object} FunnelRates
   * @property {number} [contact_rate] - Rate from total to contacted (0-100 or 0-1)
   * @property {number} [promise_rate] - Rate from contacted to promised (0-100 or 0-1)
   * @property {number} [visit_rate] - Rate from promised to visited (0-100 or 0-1)
   * @property {number} [conversion_rate] - Rate from visited to converted (0-100 or 0-1)
   */

  /**
   * @typedef {Object} FunnelData
   * @property {number} [total_contacts] - Total contacts in pipeline
   * @property {number} [contacted] - Contacts reached out to
   * @property {number} [promised] - Contacts who promised to visit
   * @property {number} [visited] - Contacts who attended service
   * @property {number} [converted] - Contacts who gave their life / converted
   * @property {FunnelRates} [rates] - Conversion rate percentages
   */

  /**
   * Component Props
   * @type {{
   *   funnel?: FunnelData
   * }}
   */
  let { funnel = {} } = $props();

  /**
   * Normalize and format rate value into whole percentage
   * @param {number|null|undefined} rate
   * @returns {number}
   */
  function formatRate(rate) {
    if (rate === null || rate === undefined || isNaN(rate)) return 0;
    const val = rate > 0 && rate <= 1 ? rate * 100 : rate;
    return Math.round(val);
  }

  /**
   * Calculate bar width relative to total contacts with a minimum floor
   * @param {number} count
   * @param {number} total
   * @returns {number}
   */
  function getWidthPercentage(count, total) {
    if (!total || total <= 0) return 30;
    const ratio = (count / total) * 100;
    return Math.min(100, Math.max(30, Math.round(ratio)));
  }

  // Derived stage metrics and configuration
  const stages = $derived.by(() => {
    const data = funnel || {};
    const total = data.total_contacts ?? 0;
    const contacted = data.contacted ?? 0;
    const promised = data.promised ?? 0;
    const visited = data.visited ?? 0;
    const converted = data.converted ?? 0;

    const contactRate =
      data.rates?.contact_rate !== undefined
        ? formatRate(data.rates.contact_rate)
        : total > 0
          ? Math.round((contacted / total) * 100)
          : 0;

    const promiseRate =
      data.rates?.promise_rate !== undefined
        ? formatRate(data.rates.promise_rate)
        : contacted > 0
          ? Math.round((promised / contacted) * 100)
          : 0;

    const visitRate =
      data.rates?.visit_rate !== undefined
        ? formatRate(data.rates.visit_rate)
        : promised > 0
          ? Math.round((visited / promised) * 100)
          : 0;

    const conversionRate =
      data.rates?.conversion_rate !== undefined
        ? formatRate(data.rates.conversion_rate)
        : visited > 0
          ? Math.round((converted / visited) * 100)
          : 0;

    return [
      {
        id: "new_contacts",
        label: "New Contacts",
        count: total,
        width: 100,
        rateBadge: "100%",
        gradient: "from-primary/30 to-primary/10",
        borderColor: "border-primary/30",
        textColor: "text-primary",
        connectorRate: contactRate,
      },
      {
        id: "contacted",
        label: "Contacted",
        count: contacted,
        width: getWidthPercentage(contacted, total),
        rateBadge: `${contactRate}% →`,
        gradient: "from-blue-500/30 to-blue-500/10",
        borderColor: "border-blue-500/30",
        textColor: "text-blue-400",
        connectorRate: promiseRate,
      },
      {
        id: "promised",
        label: "Promised",
        count: promised,
        width: getWidthPercentage(promised, total),
        rateBadge: `${promiseRate}% →`,
        gradient: "from-amber-500/30 to-amber-500/10",
        borderColor: "border-amber-500/30",
        textColor: "text-amber-400",
        connectorRate: visitRate,
      },
      {
        id: "visited",
        label: "Visited",
        count: visited,
        width: getWidthPercentage(visited, total),
        rateBadge: `${visitRate}% →`,
        gradient: "from-emerald-500/30 to-emerald-500/10",
        borderColor: "border-emerald-500/30",
        textColor: "text-emerald-400",
        connectorRate: conversionRate,
      },
      {
        id: "converted",
        label: "Converted",
        count: converted,
        width: getWidthPercentage(converted, total),
        rateBadge: `${conversionRate}% →`,
        gradient: "from-success/30 to-success/10",
        borderColor: "border-success/30",
        textColor: "text-success",
        connectorRate: null,
      },
    ];
  });
</script>

<div
  class="w-full flex flex-col items-center space-y-1"
  role="region"
  aria-label="Follow-Up Conversion Funnel"
>
  {#each stages as stage, i (stage.id)}
    <!-- Funnel Stage Bar -->
    <div
      class="w-full flex justify-center"
      role="group"
      aria-label="{stage.label}: {stage.count} ({stage.rateBadge})"
    >
      <div
        class="rounded-lg py-3 px-4 flex items-center justify-between border bg-gradient-to-r {stage.gradient} {stage.borderColor} transition-all duration-300 shadow-sm min-w-[60px]"
        style="width: {stage.width}%;"
      >
        <!-- Left Side: Stage Label and Large Count -->
        <div class="flex items-center gap-3 min-w-0 pr-2">
          <span class="text-sm font-medium text-foreground truncate">
            {stage.label}
          </span>
          <span class="text-xl font-bold {stage.textColor}">
            {stage.count}
          </span>
        </div>

        <!-- Right Side: Rate Badge -->
        <div class="flex-shrink-0">
          <span
            class="text-xs font-semibold px-2 py-0.5 rounded-full bg-background/70 border border-border text-foreground/90 inline-flex items-center"
          >
            {stage.rateBadge}
          </span>
        </div>
      </div>
    </div>

    <!-- Connecting Arrow between stages -->
    {#if stage.connectorRate !== null && i < stages.length - 1}
      <div
        class="text-muted-foreground text-center py-1 text-xs font-medium flex items-center justify-center gap-1 select-none"
        aria-hidden="true"
      >
        <span class="text-sm">↓</span>
        <span>{stage.connectorRate}%</span>
      </div>
    {/if}
  {/each}
</div>
