<!--
  LeaderScoreboard.svelte
  
  A scoreboard component showing follow-up activity metrics for each leader.
  Displays assigned contacts, follow-up frequencies, showed up counts,
  stale contacts, and conversions in a responsive 3-column card grid.
  
  Features:
  - Responsive grid layout (1 / 2 / 3 columns)
  - Color-coded alert thresholds (destructive for stale contacts, success for conversions)
  - Relative time calculation for leader activity
  - Clean empty state when no leaders are found
  - Uses Svelte 5 runes syntax
  
  @component
-->

<script>
  /**
   * @typedef {Object} LeaderStat
   * @property {string} leader_name - Full name of the leader
   * @property {string|number} [leader_id] - Unique leader ID
   * @property {number} [total_follow_ups] - Total follow-ups performed
   * @property {number} [follow_ups_this_week] - Follow-ups performed this week
   * @property {number} [follow_ups_this_month] - Follow-ups performed this month
   * @property {number} [unique_contacts_this_week] - Unique contacts reached this week
   * @property {number} [unique_contacts_total] - Total unique contacts reached
   * @property {number} [assigned_contacts] - Number of currently assigned contacts
   * @property {number} [stale_contacts] - Number of assigned contacts needing attention
   * @property {number} [showed_up] - Number of contacts who showed up to church
   * @property {number} [converted] - Number of contacts converted / committed
   * @property {string|number|Date|null} [last_activity] - Timestamp of last recorded activity
   */

  /**
   * Component Props
   * @type {{
   *   stats?: LeaderStat[]
   * }}
   */
  let { stats = [] } = $props();

  /**
   * Generate initials from a name string
   * @param {string} name
   * @returns {string}
   */
  function getInitials(name) {
    if (!name) return "L";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Format timestamp into relative date description
   * @param {string|number|Date|null} timestamp
   * @returns {string|null}
   */
  function formatRelativeTime(timestamp) {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return null;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "Just now";

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay}d ago`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;

    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  }
</script>

<div class="space-y-4">
  {#if !stats || stats.length === 0}
    <!-- Empty State -->
    <div
      class="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center"
      role="status"
    >
      <div class="w-12 h-12 rounded-full bg-secondary/80 text-muted-foreground flex items-center justify-center mx-auto mb-3">
        <svg
          class="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <p class="text-sm text-muted-foreground font-medium">
        No leaders found. Add leaders to the People Directory to get started.
      </p>
    </div>
  {:else}
    <!-- Leader Cards Grid -->
    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      role="list"
      aria-label="Leader follow-up scoreboard"
    >
      {#each stats as leader (leader.leader_id || leader.leader_name)}
        {@const relativeTime = formatRelativeTime(leader.last_activity)}
        {@const staleCount = leader.stale_contacts ?? 0}
        {@const convertedCount = leader.converted ?? 0}

        <div
          class="rounded-xl border border-border bg-gradient-to-br from-card to-card-elevated p-5 flex flex-col justify-between transition-all duration-200 hover:border-border/80"
          role="listitem"
        >
          <!-- Card Header -->
          <div class="flex items-start justify-between gap-3 mb-4">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0"
                aria-hidden="true"
              >
                {getInitials(leader.leader_name)}
              </div>
              <div class="min-w-0">
                <h3 class="text-base font-semibold text-foreground truncate">
                  {leader.leader_name}
                </h3>
                {#if relativeTime}
                  <p class="text-xs text-muted-foreground mt-0.5">
                    Active {relativeTime}
                  </p>
                {:else}
                  <p class="text-xs text-destructive mt-0.5 font-medium">
                    No activity yet
                  </p>
                {/if}
              </div>
            </div>
          </div>

          <!-- Metrics Grid (2-column, text-sm) -->
          <div class="grid grid-cols-2 gap-3 pt-3 border-t border-border/60 text-sm">
            <!-- Follow-ups this week -->
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">Follow-ups this week</span>
              <span class="text-sm font-semibold text-foreground mt-0.5">
                {leader.follow_ups_this_week ?? 0}
              </span>
            </div>

            <!-- This month -->
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">This month</span>
              <span class="text-sm font-semibold text-foreground mt-0.5">
                {leader.follow_ups_this_month ?? 0}
              </span>
            </div>

            <!-- Contacts reached (this week) -->
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">Contacts reached (this week)</span>
              <span class="text-sm font-semibold text-foreground mt-0.5">
                {leader.unique_contacts_this_week ?? 0}
              </span>
            </div>

            <!-- Assigned contacts -->
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">Assigned contacts</span>
              <span class="text-sm font-semibold text-foreground mt-0.5">
                {leader.assigned_contacts ?? 0}
              </span>
            </div>

            <!-- People showed up -->
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">People showed up</span>
              <span class="text-sm font-semibold text-foreground mt-0.5">
                {leader.showed_up ?? 0}
              </span>
            </div>

            <!-- Stale contacts -->
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">Stale contacts</span>
              <span
                class="text-sm font-semibold mt-0.5 {staleCount > 0
                  ? 'text-destructive font-bold'
                  : 'text-foreground'}"
              >
                {staleCount}
              </span>
            </div>

            <!-- Converted (spans full width or 2nd column) -->
            <div class="flex flex-col col-span-2 sm:col-span-1 pt-1 sm:pt-0">
              <span class="text-xs text-muted-foreground">Converted</span>
              <span
                class="text-sm font-semibold mt-0.5 {convertedCount > 0
                  ? 'text-success font-bold'
                  : 'text-foreground'}"
              >
                {convertedCount}
              </span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
