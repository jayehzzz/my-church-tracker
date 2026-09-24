<script>
  import DrilldownDialog from './DrilldownDialog.svelte';
  import ContributionList from './ContributionList.svelte';
  import EventDetail from './EventDetail.svelte';
  import { reportDisplayRow } from '$lib/utils/reportDrilldown.js';
  import { serviceHref, meetingHref, contactHref, careHref, personHref } from './recordHrefs.js';
  let { state = $bindable(null), groups = {}, status = 'ready', error = '', onretry = null } = $props();
  const href = { services: serviceHref, meetings: meetingHref, evangelism: contactHref, visitation: careHref, people: personHref };
  const metricFor = frame => Object.values(groups).flat().find(metric => metric.key === frame.key);
  const display = (metric, rows) => rows.map(row => reportDisplayRow(metric, row));
</script>

{#snippet view(current, navigate)}
  {#if status !== 'ready'}
    <ContributionList domain="person" {status} {error} {onretry} />
  {:else if metricFor(current)}
    {@const metric = metricFor(current)}
    {#if current.kind === 'record'}
      {@const record = metric.rows.find(row => String(row.id ?? row._id) === String(current.id))}
      {#if record}
        {@const shown = reportDisplayRow(metric, record)}
        <EventDetail title={shown.title} date={shown.date} summary={`${metric.label} · contribution ${shown.contribution}`} facts={[
          { label: 'Report scope', value: metric.periodLabel || 'Selected period' },
          { label: 'Recorded status', value: record.status || record.member_status || record.outcome || 'Not recorded' },
          ...(metric.domain === 'meetings' ? [{ label: 'Duration', value: record.duration_minutes != null ? `${record.duration_minutes} minutes` : 'Not recorded' }] : []),
          ...(metric.domain === 'visitation' ? [{ label: 'Next task', value: record.next_task?.status || 'Not recorded' }] : []),
        ]} />
        <div class="mt-4 flex flex-wrap gap-4 text-sm">
          {#if href[metric.domain]?.(shown.id)}<a class="text-primary" href={href[metric.domain](shown.id)}>{metric.domain === 'services' ? 'View service' : metric.domain === 'meetings' ? 'View meeting' : metric.domain === 'evangelism' ? 'View contact' : metric.domain === 'visitation' ? 'View care record' : 'View profile'}</a>{/if}
          {#if shown.personId && metric.domain !== 'people'}<a class="text-primary" href={personHref(shown.personId)}>View profile</a>{/if}
        </div>
      {:else}<p role="status">The requested record is unavailable or restricted.</p>{/if}
    {:else}
      {@const rows = current.month ? metric.rows.filter(row => String(row[metric.dateField] || '').startsWith(current.month)) : metric.rows}
      <p class="mb-3 text-sm text-muted-foreground">{current.month || metric.periodLabel || current.periodLabel || 'Selected period'} · {metric.label}</p>
      {#if current.mode === 'average' && !current.month}
        <p class="mb-3 font-medium">{metric.total} ÷ {metric.denominator} {metric.domain === 'services' ? 'completed services' : metric.domain === 'meetings' ? 'held meetings' : 'calendar months'} = {metric.average ?? 'Unavailable'}</p>
        {#if metric.months.length}
          <ul aria-label="Contributing months" class="mb-4 space-y-1 text-sm">
            {#each metric.months as month}
              <li><button type="button" class="text-primary" onclick={() => navigate({ kind: 'list', key: metric.key, month: month.key, mode: 'total', periodLabel: month.key, title: `${month.key} · ${metric.label}` })}>{month.key}: {month.total} · View records</button></li>
            {/each}
          </ul>
        {/if}
      {:else}<p class="mb-3 font-medium">{metric.key === 'prayerHours' ? `${(rows.reduce((sum, row) => sum + Number(row.duration_minutes || 0), 0) / 60).toFixed(1)} hours` : rows.reduce((sum, row) => sum + metric.contribution(row), 0)} from {rows.length} matching records</p>{/if}
      {#if metric.note}<p class="mb-3 text-sm text-muted-foreground">{metric.note}</p>{/if}
      <ContributionList domain={metric.domain === 'evangelism' ? 'contact' : metric.domain === 'visitation' ? 'care' : metric.domain === 'services' ? 'service' : metric.domain === 'meetings' ? 'meeting' : 'person'} records={display(metric, rows)} onselect={row => navigate({ kind: 'record', key: metric.key, id: row.id, title: row.title }, row.id)} />
    {/if}
  {:else}<p role="status">This report metric is unavailable.</p>{/if}
{/snippet}

<DrilldownDialog bind:state renderView={view} />
