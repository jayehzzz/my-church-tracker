<script>
  import ComparisonControls from './ComparisonControls.svelte';
  import ChartPointDetails from './ChartPointDetails.svelte';
  import { roundedAverage } from '$lib/utils/comparisonMetrics.js';
  let {data=[],title='Programme comparison',subtitle='',unit='',onBarClick=null,onFilterClick=null,activeFilterCount=0,metricOptions=[],periodLabel='Selected period'}=$props();
  let primaryKey=$state('attendance'),comparisonKey=$state('');
  let primaryMode=$state('average'),comparisonMode=$state('total');
  let showAll=$state(false),detail=$state(null);
  const options=$derived([
    {key:'attendance',label:'Attendance',averageLabel:'Average per meeting'},
    ...metricOptions.filter(option=>!['value','total'].includes(option.key)).map(option=>({...option,averageAvailable:false,averageLabel:'Average not applicable'}))
  ]);
  const selections=$derived([{key:primaryKey,mode:primaryMode,role:'A'},...(comparisonKey?[{key:comparisonKey,mode:comparisonMode,role:'B'}]:[])]);
  function measure(item,selection){
    if(selection.key==='attendance')return selection.mode==='total'?item.total:roundedAverage(item.total,item.meetingCount);
    return item[selection.key];
  }
  function caption(selection){return `${options.find(option=>option.key===selection.key)?.label || ''} · ${selection.mode==='average'?'average per meeting':'actual count'}`;}
  const visibleData=$derived(showAll?data:data.slice(0,8));
  const maximum=$derived(Math.max(1,...visibleData.flatMap(item=>selections.map(selection=>measure(item,selection) || 0))));
  function inspect(item){
    if(onBarClick)onBarClick({...item,value:measure(item,selections[0])});
    else detail={title:item.label,subtitle:periodLabel,metrics:selections.map(selection=>({label:caption(selection),value:measure(item,selection)}))};
  }
</script>
<section class="card-base p-5">
  <header class="mb-4 flex flex-wrap items-start justify-between gap-3 pr-12">
    <div><h3 class="text-base font-semibold text-foreground">{title}</h3><p class="mt-1 text-xs text-muted-foreground">{subtitle}</p><p class="mt-1 text-xs text-muted-foreground">{periodLabel}</p></div>
    {#if onFilterClick}<button type="button" aria-label={`Filter ${title}`} class="rounded-lg border border-border px-3 py-2 text-xs" onclick={()=>onFilterClick(title)}>Filter{activeFilterCount?` (${activeFilterCount})`:''}</button>{/if}
  </header>
  <ComparisonControls {options} bind:primaryKey bind:comparisonKey bind:primaryMode bind:comparisonMode averageLabel="Average per meeting" />
  <div class="my-3 flex flex-wrap gap-3 text-xs text-muted-foreground">{#each selections as selection}<span class:text-primary={selection.role==='A'} class:text-warning={selection.role==='B'}>Series {selection.role}: {caption(selection)}</span>{/each}</div>
  {#each visibleData as item}
    <button type="button" class="mb-2 block w-full rounded-lg p-2 text-left hover:bg-secondary/30 focus-visible:outline focus-visible:outline-primary" aria-label={`${item.label}. View people and comparison details.`} onclick={()=>inspect(item)}>
      <span class="mb-2 block text-sm font-medium">{item.label}</span>
      {#each selections as selection}
        {@const value=measure(item,selection)}
        <span class="mb-2 flex items-center gap-3 text-xs"><span class="w-3 text-muted-foreground">{selection.role}</span><span class="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><span class="block h-full rounded-full" class:bg-primary={selection.role==='A'} class:bg-warning={selection.role==='B'} style={`width:${(value || 0)/maximum*100}%`}></span></span><strong class="min-w-12 text-right">{value ?? 'Unavailable'}{unit}</strong></span>
      {/each}
    </button>
  {:else}<p class="py-10 text-center text-sm text-muted-foreground">No matching data</p>{/each}
  {#if data.length>8}<button type="button" class="mt-3 text-xs text-primary" onclick={()=>showAll=!showAll}>{showAll?'Show fewer':`Show all ${data.length} meeting types`}</button>{/if}
  <p class="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">Attendance average = total attendance ÷ held meetings for each programme. Unique people and meetings held are counts.</p>
</section>
<ChartPointDetails bind:detail />
