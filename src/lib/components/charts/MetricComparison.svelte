<script>
  import { createChoice, createSelection } from '$lib/components/drilldown/selection.js';
  import ComparisonControls from './ComparisonControls.svelte';
  import ChartPointDetails from './ChartPointDetails.svelte';
  import { roundedAverage, wholeCountAverage } from '$lib/utils/comparisonMetrics.js';
  let {metrics=[],periodLabel='Selected period',onSelect=null,onDrilldown=null,domain=null,filters={},wholeNumberAverages=true}=$props();
  let primaryKey=$state(''),comparisonKey=$state('');
  let primaryMode=$state('total'),comparisonMode=$state('average');
  let detail=$state(null);
  const options=$derived(metrics.map(metric=>({...metric,averageAvailable:metric.denominator!=null,averageLabel:metric.averageLabel || 'Average not applicable'})));
  $effect(()=>{
    if(!options.some(option=>option.key===primaryKey))primaryKey=options[0]?.key || '';
    if(comparisonKey&&!options.some(option=>option.key===comparisonKey))comparisonKey='';
  });
  const averageValue=(metric)=>{
    return wholeNumberAverages ? wholeCountAverage(metric?.total,metric?.denominator) : roundedAverage(metric?.total,metric?.denominator);
  };
  const selections=$derived([{key:primaryKey,mode:primaryMode,role:'A'},...(comparisonKey?[{key:comparisonKey,mode:comparisonMode,role:'B'}]:[])].map(selection=>{
    const metric=metrics.find(metric=>metric.key===selection.key);
    return {...selection,metric,value:selection.mode==='total'?metric?.total:averageValue(metric)};
  }));
  function inspect(selection){
    const choice = createChoice({ domain: domain || selection.metric.domain || null, metricKey: selection.key, mode: selection.mode,
      role: selection.role, value: selection.value, filters, point: { date: selection.metric.startDate || null,
        bucketStart: selection.metric.startDate || null, bucketEnd: selection.metric.endDate || null,
        sourcePoints: selection.metric.sourcePoints || [], sourceIds: selection.metric.sourceIds || [] } });
    choice.sourceIds = selection.metric.sourceIds || choice.sourceIds;
    if(onDrilldown)onDrilldown(createSelection([choice], selection.role));
    else if(onSelect)onSelect(selection.metric, createSelection([choice], selection.role));
    else detail={title:selection.metric.label,subtitle:selection.metric.periodLabel || periodLabel,metrics:[{label:'Actual total count',value:selection.metric.total ?? 'Unavailable'},...(selection.metric.denominator!=null?[{label:selection.metric.averageLabel,value:averageValue(selection.metric)},{label:'Denominator',value:selection.metric.denominator}]:[])]};
  }
</script>
<div class="space-y-3" aria-label="Metric comparison">
  {#if options.length}
  <ComparisonControls {options} bind:primaryKey bind:comparisonKey bind:primaryMode bind:comparisonMode />
  <div class="grid gap-3 {comparisonKey ? 'sm:grid-cols-2' : ''}">
    {#each selections as selection}
      {#if selection.metric}
        <button type="button" class="rounded-xl border border-border p-4 text-left hover:bg-secondary/25" onclick={()=>inspect(selection)}>
          <span class="block text-xs text-muted-foreground">Series {selection.role} · {selection.metric.label}</span>
          <strong class="mt-1 block text-2xl" class:text-primary={selection.role==='A'} class:text-warning={selection.role==='B'}>{selection.value ?? 'Unavailable'}</strong>
          <span class="mt-1 block text-xs text-muted-foreground">{selection.mode==='total'?'Actual total count':`${selection.metric.averageLabel} · rounded to a whole count · divisor ${selection.metric.denominator}`}</span>
          <span class="mt-1 block text-xs text-muted-foreground">{selection.metric.periodLabel || periodLabel}</span>
        </button>
      {/if}
    {/each}
  </div>
  {:else}<p class="text-sm text-muted-foreground">No comparison data available.</p>{/if}
</div>
<ChartPointDetails bind:detail />
