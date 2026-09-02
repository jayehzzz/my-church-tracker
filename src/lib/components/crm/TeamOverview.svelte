<script>
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';

  let {
    stats = [],
    onViewLeader = () => {},
  } = $props();

  function leaderId(stat) {
    return stat?.leader_id || stat?._id || stat?.leader?.['_id'] || stat?.leader?.id;
  }

  function leaderName(stat) {
    if (stat?.leader_name) return stat.leader_name;
    if (stat?.name) return stat.name;
    const leader = stat?.leader;
    return leader?.name || [leader?.first_name, leader?.last_name].filter(Boolean).join(' ').trim() || 'Unnamed leader';
  }

  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'L';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase();
  }

  function number(value) {
    return Number(value) || 0;
  }

  function coverage(stat) {
    const assigned = number(stat?.fresh_assigned);
    const contacted = number(stat?.fresh_contacted);
    if (assigned === 0) return 100;
    return Math.min(100, Math.round((contacted / assigned) * 100));
  }

  function formatLastActivity(value) {
    if (!value) return 'No activity recorded';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'No activity recorded';

    const difference = Date.now() - date.getTime();
    if (difference < 0 || difference < 60000) return 'Active just now';
    const minutes = Math.floor(difference / 60000);
    if (minutes < 60) return `Active ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Active ${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Active yesterday';
    if (days < 7) return `Active ${days}d ago`;
    return `Last active ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  }
</script>

<section aria-labelledby="team-overview-title" class="space-y-4">
  <div>
    <h2 id="team-overview-title" class="text-lg font-semibold text-foreground">Team Overview</h2>
    <p class="mt-1 text-sm text-muted-foreground">
      See ownership, overdue work, fresh-contact coverage and confirmed guests.
    </p>
  </div>

  {#if !stats || stats.length === 0}
    <div class="rounded-xl border border-dashed border-border bg-card/50 px-5 py-10 text-center" role="status">
      <p class="text-sm font-medium text-foreground">No leader activity to show.</p>
      <p class="mt-1 text-xs text-muted-foreground">Assign leaders to contacts to begin tracking team coverage.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2" role="list" aria-label="Leader follow-up activity">
      {#each stats as stat, index (leaderId(stat) || leaderName(stat) || index)}
        {@const name = leaderName(stat)}
        {@const id = leaderId(stat)}
        {@const open = number(stat.open_tasks)}
        {@const overdue = number(stat.overdue_tasks)}
        {@const freshAssigned = number(stat.fresh_assigned)}
        {@const freshContacted = number(stat.fresh_contacted)}
        {@const percent = coverage(stat)}
        <Card padding="md" role="listitem">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary" aria-hidden="true">
                {initials(name)}
              </div>
              <div class="min-w-0">
                <h3 class="truncate text-base font-semibold text-foreground">{name}</h3>
                <p class="mt-0.5 text-xs text-muted-foreground">{formatLastActivity(stat.last_activity)}</p>
              </div>
            </div>
            {#if overdue > 0}
              <Badge size="sm" variant="danger">{overdue} overdue</Badge>
            {:else}
              <Badge size="sm" variant="default">On track</Badge>
            {/if}
          </div>

          <dl class="mt-5 grid grid-cols-2 gap-4 border-t border-border/70 pt-4 sm:grid-cols-4">
            <div>
              <dt class="text-xs text-muted-foreground">Assigned</dt>
              <dd class="mt-1 text-xl font-semibold text-foreground">{number(stat.assigned_contacts)}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted-foreground">Open tasks</dt>
              <dd class="mt-1 text-xl font-semibold text-foreground">{open}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted-foreground">Overdue</dt>
              <dd class="mt-1 text-xl font-semibold {overdue > 0 ? 'text-destructive' : 'text-foreground'}">{overdue}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted-foreground">Confirmed guests</dt>
              <dd class="mt-1 text-xl font-semibold text-foreground">{number(stat.confirmed_guests ?? stat.confirmed_this_sunday)}</dd>
            </div>
          </dl>

          <div class="mt-5">
            <div class="mb-2 flex items-center justify-between gap-3 text-xs">
              <span class="text-muted-foreground">Fresh contacts reached (first 14 days)</span>
              <span class="font-medium text-foreground">{freshContacted} of {freshAssigned}</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label={`${name} fresh contact coverage`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}>
              <div class="h-full rounded-full bg-primary transition-[width] duration-300" style={`width: ${percent}%`}></div>
            </div>
          </div>

          <div class="mt-5 flex justify-end border-t border-border/70 pt-4">
            <Button variant="secondary" size="sm" disabled={!id} onclick={() => onViewLeader(id)}>
              View work
            </Button>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</section>
