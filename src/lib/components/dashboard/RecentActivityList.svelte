<!--
  RecentActivityList.svelte
  
  A dashboard component that displays the latest activity entries in the church tracker.
  Shows avatar initials, person names, action descriptions, and relative timestamps.
  Features color-coded left borders based on activity type.
  Uses Svelte 5 runes syntax.
  
  @component
  @example
  <RecentActivityList />
  <RecentActivityList activities={customActivities} maxItems={10} />
-->

<script>
  // Import the dateRange store for filter awareness
  import { dateRange } from "$lib/stores/filterStore";

  /**
   * Default mock data for demonstration purposes
   */
  const defaultActivities = [
    {
      id: "1",
      type: "contact",
      action: "New contact added",
      person: "Sarah Johnson",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    },
    {
      id: "2",
      type: "attendance",
      action: "Marked present at Sunday Service",
      person: "Michael Chen",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    },
    {
      id: "3",
      type: "conversion",
      action: "Salvation decision recorded",
      person: "Emily Davis",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    },
    {
      id: "4",
      type: "event",
      action: "Registered for Youth Camp",
      person: "James Wilson",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    },
    {
      id: "5",
      type: "note",
      action: "Follow-up note added",
      person: "Lisa Anderson",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    },
  ];

  /**
   * Component Props using Svelte 5 $props() rune
   * @param {Array} [activities] - Array of activity items
   * @param {string} [title='Recent Activity'] - Section title
   * @param {number} [maxItems=5] - Maximum items to display
   */
  let {
    activities = defaultActivities,
    title = "Recent Activity",
    maxItems = 5,
  } = $props();

  // Get the current filter label for display using $derived
  const filterLabel = $derived($dateRange?.label || "All Time");

  /**
   * Gets the color for an activity type (used for left border)
   * @param {string} type - The activity type
   * @returns {string} Hex color code
   */
  function getActivityColor(type) {
    const colors = {
      contact: "#06b6d4", // cyan
      attendance: "#10b981", // green
      conversion: "#f59e0b", // amber
      event: "#8b5cf6", // purple
      note: "#6b7280", // gray
      new_member: "#06b6d4", // cyan
      visitor: "#10b981", // green
      salvation: "#f59e0b", // amber
      baptism: "#3b82f6", // blue
    };
    return colors[type] || colors.note;
  }

  /**
   * Gets initials from a person's name
   * @param {string} name - Full name
   * @returns {string} Up to 2 character initials
   */
  function getInitials(name) {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Formats a date/timestamp to a relative time string
   * @param {Date|string} timestamp - The date to format
   * @returns {string} Formatted relative time string (e.g., "30m ago", "2h ago", "1d ago")
   */
  function formatRelativeTime(timestamp) {
    const now = new Date();
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  /**
   * Formats a date to ISO string for datetime attribute
   * @param {Date|string} date - The date to format
   * @returns {string} ISO formatted date string
   */
  function toISOString(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString();
  }

  // Derived state: limit activities to maxItems using $derived
  const displayedActivities = $derived(activities.slice(0, maxItems));

  // Derived state: check if list is empty using $derived
  const isEmpty = $derived(displayedActivities.length === 0);
</script>

<!-- 
  Main card container using design system classes
  Uses card-base from app.css for consistent styling
-->
<div class="card-base">
  <!-- Header section with title and "View All" link -->
  <div class="flex items-center justify-between mb-6">
    <h3 class="text-section-title">{title}</h3>
    <a
      href="/activity"
      onclick={(e) => e.preventDefault()}
      class="text-sm text-primary hover:underline transition-premium"
    >
      View All
    </a>
  </div>

  <!-- Activity list -->
  {#if isEmpty}
    <!-- Empty state message -->
    <div class="py-8 text-center">
      <svg
        class="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="text-muted-foreground text-sm">No activity for this period</p>
      <p class="text-muted-foreground text-xs mt-1 opacity-70">
        Try selecting a different date range
      </p>
    </div>
  {:else}
    <div class="space-y-2" role="list" aria-label="Recent activity list">
      {#each displayedActivities as activity (activity.id)}
        <a
          href={activity.personId ? `/people/${activity.personId}` : "#"}
          class="activity-entry flex items-center gap-4 p-4 rounded-xl border-l-[3px] transition-premium hover:bg-[#1e1e1e] no-underline cursor-pointer"
          style="border-left-color: {getActivityColor(activity.type)}"
          role="listitem"
        >
          <!-- Avatar with initials -->
          <div
            class="w-9 h-9 rounded-full bg-[#252525] flex items-center justify-center text-sm font-medium text-foreground shrink-0"
          >
            {getInitials(activity.person)}
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p
              class="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors"
            >
              {activity.person}
            </p>
            <p class="text-sm text-muted-foreground truncate">
              {activity.action || activity.description}
            </p>
          </div>

          <!-- Time -->
          <time
            datetime={toISOString(activity.timestamp)}
            class="text-xs text-subtle shrink-0"
          >
            {formatRelativeTime(activity.timestamp)}
          </time>
        </a>
      {/each}
    </div>
  {/if}
</div>

<style>
  /*
   * Component-specific styles
   * Most styling is handled via Tailwind classes and design system tokens
   */

  /* Activity entry base styles */
  .activity-entry {
    background: transparent;
  }

  /* Responsive adjustments for very small screens */
  @media (max-width: 400px) {
    .activity-entry {
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    /* Stack timestamp below content on very small screens */
    .activity-entry time {
      width: 100%;
      padding-left: 3.25rem; /* Align with content after avatar */
    }
  }
</style>
