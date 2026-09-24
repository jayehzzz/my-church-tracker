<script>
  import { serviceHref, personHref } from './recordHrefs.js';
  let { domain, records = [], totalCount = records.length, status = 'ready', error = '',
    onretry = null, onselect = null, hasMore = false, onmore = null,
    countLabel = '', contributionLabel = 'Contribution' } = $props();
  const hrefFor = { service: serviceHref, person: personHref };
  const actionFor = { service: 'View service', meeting: 'View meeting', person: 'View profile', care: 'View care record', contact: 'View contact' };
</script>

<section aria-label="Contributing records" class="space-y-3">
  {#if status === 'loading'}<p role="status">Loading records…</p>
  {:else if status === 'unavailable' || status === 'restricted'}
    <p role="status">{error || (status === 'restricted' ? 'These records are restricted.' : 'Records are unavailable.')}</p>
    {#if onretry}<button type="button" onclick={onretry}>Retry</button>{/if}
  {:else}
    <p class="text-sm text-muted-foreground">{countLabel || `${totalCount} matching record${totalCount === 1 ? '' : 's'}`}{hasMore ? ` · ${records.length} shown` : ''}</p>
    {#if !records.length}<p>No matching records.</p>{/if}
    <ul class="space-y-2">
      {#each records as record, index (`${record.id ?? record._id ?? 'missing'}-${index}`)}
        {@const recordId = record.id ?? record._id}
        {@const href = hrefFor[domain]?.(recordId)}
        <li class="rounded-xl border border-border p-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-medium">{record.title || record.name || record.date || 'Recorded item'}</p>
              {#if record.date}<p class="text-xs text-muted-foreground">{record.date}</p>{/if}
              {#if record.contribution != null}<p class="text-sm">{contributionLabel}: {record.contribution}</p>{/if}
              {#if record.note}<p class="text-sm text-muted-foreground">{record.note}</p>{/if}
            </div>
            {#if recordId && onselect}
              <button type="button" data-drilldown-focus={String(recordId)} onclick={() => onselect(record)} class="text-sm text-primary">{actionFor[record.domain || domain] || 'View record'}</button>
            {:else if recordId && href}
              <a {href} data-drilldown-focus={String(recordId)} class="text-sm text-primary">{actionFor[record.domain || domain]}</a>
            {:else}
              <span class="text-xs text-muted-foreground">Record unavailable</span>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
    {#if hasMore && onmore}<button type="button" onclick={onmore} class="rounded-lg border border-border px-3 py-2 text-sm">Load more</button>{/if}
  {/if}
</section>
