<!--
  StaleAlerts.svelte
  Warning cards for contacts that have gone cold and leaders who haven't been active.
  
  Features:
  - Stale contacts (2+ weeks without progress, not paused)
  - Serial promisers (3+ promises, 0 shows)
  - Inactive leaders (no follow-ups in 7+ days)
  - Actionable suggestions per alert
  - Uses Svelte 5 runes syntax
-->

<script>
  import { Badge } from '$lib/components/ui';

  /**
   * @param {Array} staleContacts - Contacts with no recent activity
   * @param {Array} leaderStats - Leader stats for finding inactive leaders
   */
  let {
    staleContacts = [],
    leaderStats = [],
  } = $props();

  // Find serial promisers (3+ promises, 0 shows)
  const serialPromisers = $derived(
    staleContacts.filter(c => (c.promises_made || 0) >= 3 && (c.promises_kept || 0) === 0)
  );

  // Find inactive leaders (no activity in 7+ days)
  const sevenDaysAgo = $derived((() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  })());

  const inactiveLeaders = $derived(
    leaderStats.filter(l => !l.last_activity || l.last_activity < sevenDaysAgo)
  );

  // Regular stale contacts (not serial promisers)
  const regularStale = $derived(
    staleContacts.filter(c => !((c.promises_made || 0) >= 3 && (c.promises_kept || 0) === 0))
  );

  const totalAlerts = $derived(serialPromisers.length + inactiveLeaders.length + regularStale.length);

  // Helper for relative dates
  function getRelativeDate(dateStr) {
    if (!dateStr) return 'Never';
    const now = new Date();
    const date = new Date(dateStr);
    const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 14) return '1 week ago';
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  }
</script>

<div class="space-y-6">
  <!-- Summary -->
  <div class="flex items-center gap-2">
    <span class="text-lg">⚠️</span>
    <h3 class="text-base font-semibold text-foreground">
      Alerts
    </h3>
    {#if totalAlerts > 0}
      <Badge variant="danger">{totalAlerts} items need attention</Badge>
    {:else}
      <Badge variant="success">All clear!</Badge>
    {/if}
  </div>

  {#if totalAlerts === 0}
    <div class="text-center py-12 text-muted-foreground">
      <p class="text-3xl mb-3">🎉</p>
      <p class="text-sm">No alerts right now. Keep up the great work!</p>
    </div>
  {:else}
    <!-- Serial Promisers -->
    {#if serialPromisers.length > 0}
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-destructive flex items-center gap-2">
          <span>🔴</span> Serial Promisers — Promised but never showed
        </h4>
        {#each serialPromisers as contact}
          <div class="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
            <div>
              <p class="text-sm font-medium text-foreground">{contact.first_name} {contact.last_name}</p>
              <p class="text-xs text-muted-foreground">
                Promised {contact.promises_made} times, showed {contact.promises_kept || 0} times
                {#if contact.leader_name}
                  · Leader: {contact.leader_name}
                {/if}
              </p>
            </div>
            <Badge variant="danger" size="sm">Unreliable</Badge>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Inactive Leaders -->
    {#if inactiveLeaders.length > 0}
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-warning flex items-center gap-2">
          <span>👤</span> Inactive Leaders — No follow-ups in 7+ days
        </h4>
        {#each inactiveLeaders as leader}
          <div class="flex items-center justify-between p-3 rounded-lg border border-warning/20 bg-warning/5">
            <div>
              <p class="text-sm font-medium text-foreground">{leader.leader_name}</p>
              <p class="text-xs text-muted-foreground">
                Last active: {getRelativeDate(leader.last_activity)}
                · {leader.assigned_contacts} contacts assigned
                · {leader.stale_contacts} going stale
              </p>
            </div>
            <Badge variant="warning" size="sm">Inactive</Badge>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Stale Contacts -->
    {#if regularStale.length > 0}
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <span>❄️</span> Going Cold — 2+ weeks without progress
        </h4>
        {#each regularStale.slice(0, 10) as contact}
          <div class="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
            <div>
              <p class="text-sm font-medium text-foreground">{contact.first_name} {contact.last_name}</p>
              <p class="text-xs text-muted-foreground">
                Last follow-up: {getRelativeDate(contact.last_follow_up_date)}
                {#if contact.leader_name}
                  · Leader: {contact.leader_name}
                {/if}
              </p>
            </div>
            <Badge variant="default" size="sm">Stale</Badge>
          </div>
        {/each}
        {#if regularStale.length > 10}
          <p class="text-xs text-muted-foreground text-center">
            + {regularStale.length - 10} more stale contacts
          </p>
        {/if}
      </div>
    {/if}
  {/if}
</div>
