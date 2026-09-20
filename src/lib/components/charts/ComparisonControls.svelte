<script>
  let {
    options = [],
    primaryKey = $bindable(''), comparisonKey = $bindable(''),
    primaryMode = $bindable('total'), comparisonMode = $bindable('average'),
    averageLabel = 'Average per gathering',
    primaryLabel = 'Primary metric', comparisonLabel = 'Comparison metric',
  } = $props();
  const primaryOption = $derived(options.find(option => option.key === primaryKey));
  const comparisonOption = $derived(options.find(option => option.key === comparisonKey));
  $effect(() => {
    if (primaryOption?.averageAvailable === false) primaryMode = 'total';
    if (comparisonOption?.averageAvailable === false) comparisonMode = 'total';
  });
</script>
<div class="comparison-controls" aria-label="Chart comparisons">
  {#each ['A', 'B'] as series}
    <fieldset class:secondary={series === 'B'} aria-label={`Series ${series} controls`}>
      <legend>Series {series}{series === 'B' ? ' · optional comparison' : ''}</legend>
      <div class="selectors">
        {#if series === 'A'}
          <select aria-label={primaryLabel} bind:value={primaryKey}>
            {#each options as option}<option value={option.key}>{option.label}</option>{/each}
          </select>
          <select aria-label="Primary calculation" bind:value={primaryMode}><option value="total">Actual total count</option><option value="average" disabled={primaryOption?.averageAvailable === false}>{primaryOption?.averageLabel || averageLabel}</option></select>
        {:else}
          <select aria-label={comparisonLabel} bind:value={comparisonKey}>
            <option value="">None</option>
            {#each options as option}<option value={option.key}>{option.label}</option>{/each}
          </select>
          {#if comparisonKey}<select aria-label="Comparison calculation" bind:value={comparisonMode}><option value="total">Actual total count</option><option value="average" disabled={comparisonOption?.averageAvailable === false}>{comparisonOption?.averageLabel || averageLabel}</option></select>{/if}
        {/if}
      </div>
    </fieldset>
  {/each}
</div>
<style>
  .comparison-controls{display:flex;flex-wrap:wrap;gap:.5rem;min-width:0;width:100%}
  fieldset{flex:1 1 240px;min-width:0;border:1px solid hsl(var(--primary)/.3);border-radius:.75rem;background:hsl(var(--primary)/.05);padding:.5rem}
  fieldset.secondary{border-color:hsl(var(--warning)/.35);background:hsl(var(--warning)/.05)}
  legend{font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:hsl(var(--primary));padding:0 .25rem}
  .secondary legend{color:hsl(var(--warning))}.selectors{display:flex;flex-wrap:wrap;gap:.375rem}
  select{flex:1 1 140px;min-width:0;max-width:100%;height:36px;border:1px solid hsl(var(--border));border-radius:.5rem;background:hsl(var(--input));padding:0 .5rem;color:hsl(var(--foreground));font-size:12px;font-weight:600}
  select:focus-visible{outline:2px solid hsl(var(--ring));outline-offset:2px}
</style>
