<script>
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';

  let {
    commitments = [],
    onResolve = () => {},
    onOpen = () => {},
    title = 'Coming this week',
    description = 'People who explicitly said yes to a gathering.',
    emptyMessage = 'No confirmed gathering plans yet.',
  } = $props();

  const confirmedCommitments = $derived(
    (commitments || [])
      .filter((commitment) => String(commitment?.response || '').toLowerCase() === 'yes')
      .slice()
      .sort((a, b) => dateValue(a.gathering_date) - dateValue(b.gathering_date)),
  );

  function parseDate(value) {
    if (!value) return null;
    const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateValue(value) {
    return parseDate(value)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  }

  function formatDate(value) {
    const date = parseDate(value);
    if (!date) return 'Date not set';
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  function gatheringLabel(type) {
    const labels = {
      sunday_service: 'Sunday service',
      bacenta: 'Bacenta',
      special_event: 'Special event',
    };
    return labels[type] || String(type || 'Gathering').replace(/[_-]+/g, ' ');
  }

  function personName(person) {
    return [person?.first_name, person?.last_name].filter(Boolean).join(' ').trim() || 'Unnamed person';
  }

  function leaderName(leader) {
    if (!leader) return null;
    if (typeof leader === 'string') return leader;
    return leader.name || [leader.first_name, leader.last_name].filter(Boolean).join(' ').trim() || null;
  }

  function resolutionInfo(resolution) {
    const options = {
      pending: { label: 'Awaiting attendance', variant: 'warning' },
      attended: { label: 'Attended', variant: 'success' },
      no_show: { label: 'No-show', variant: 'danger' },
      cancelled: { label: 'Cancelled', variant: 'default' },
    };
    return options[resolution] || options.pending;
  }
</script>

<section aria-labelledby="coming-this-week-title" class="space-y-4">
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h2 id="coming-this-week-title" class="text-lg font-semibold text-foreground">{title}</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        {description}
      </p>
    </div>
    <Badge variant="default">
      {confirmedCommitments.length} confirmed
    </Badge>
  </div>

  {#if confirmedCommitments.length === 0}
    <div class="rounded-xl border border-dashed border-border bg-card/50 px-5 py-10 text-center" role="status">
      <p class="text-sm font-medium text-foreground">{emptyMessage}</p>
      <p class="mt-1 text-xs text-muted-foreground">A person appears here only after giving a clear yes.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-3 xl:grid-cols-2" role="list" aria-label="Confirmed gathering commitments">
      {#each confirmedCommitments as commitment, index (commitment._id || index)}
        {@const resolution = resolutionInfo(commitment.resolution)}
        {@const owner = leaderName(commitment.leader)}
        <Card padding="md" role="listitem">
          <div class="flex h-full flex-col justify-between gap-4">
            <div>
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <button type="button" class="truncate text-left text-base font-semibold text-foreground hover:underline" onclick={() => onOpen(commitment.person)}>
                    {personName(commitment.person)}
                  </button>
                  <p class="mt-1 text-sm text-muted-foreground">
                    {gatheringLabel(commitment.gathering_type)} · {formatDate(commitment.gathering_date)}
                  </p>
                </div>
                <Badge size="sm" variant={resolution.variant}>{resolution.label}</Badge>
              </div>
              {#if owner}
                <p class="mt-3 text-xs text-muted-foreground">Followed up by {owner}</p>
              {/if}
            </div>

            {#if !commitment.resolution || commitment.resolution === 'pending'}
              <div class="flex flex-wrap gap-2 border-t border-border/70 pt-4" aria-label={`Resolve attendance for ${personName(commitment.person)}`}>
                <Button size="sm" onclick={() => onResolve(commitment, 'attended')}>Attended</Button>
                <Button variant="secondary" size="sm" onclick={() => onResolve(commitment, 'no_show')}>No-show</Button>
                <Button variant="ghost" size="sm" onclick={() => onResolve(commitment, 'cancelled')}>Cancelled</Button>
              </div>
            {/if}
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</section>
