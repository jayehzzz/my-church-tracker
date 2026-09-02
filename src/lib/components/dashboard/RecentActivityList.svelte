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
  import ActivityDetailModal from "./ActivityDetailModal.svelte";
  import AllActivitiesModal from "./AllActivitiesModal.svelte";

  /**
   * Default mock data for demonstration purposes
   */
  const defaultActivities = [
    {
      id: "1",
      personId: "1",
      type: "contact",
      action: "New contact added",
      person: "Samuel Owusu",
      statusOrOutcome: "Responsive",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
      route: "/evangelism",
      routeLabel: "Evangelism Hub",
      notes: "Met during street outreach. Interested in joining the worship ministry.",
    },
    {
      id: "2",
      personId: "2",
      type: "attendance",
      action: "Marked present at Sunday Service",
      person: "Grace Mensah",
      statusOrOutcome: "Present",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      route: "/services",
      routeLabel: "Services",
    },
    {
      id: "3",
      personId: "3",
      type: "conversion",
      action: "Salvation decision recorded",
      person: "David Boateng",
      statusOrOutcome: "Converted",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
      route: "/evangelism",
      routeLabel: "Evangelism Hub",
      notes: "Made salvation commitment at altar call. Scheduled for foundation class.",
    },
    {
      id: "4",
      personId: "4",
      type: "event",
      action: "Registered for Youth Camp",
      person: "Emmanuel Asante",
      statusOrOutcome: "Registered",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      route: "/meetings",
      routeLabel: "Meetings",
    },
    {
      id: "5",
      personId: "5",
      type: "note",
      action: "Follow-up note added",
      person: "Abigail Darko",
      statusOrOutcome: "In Progress",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
      route: "/visitation",
      routeLabel: "Pastoral Care",
      notes: "Pastoral phone check-in completed. Will attend midweek prayer meeting.",
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
    showFilters = true,
  } = $props();

  // Modal state
  let isModalOpen = $state(false);
  let isAllActivitiesModalOpen = $state(false);
  let selectedActivity = $state(null);
  let selectedType = $state("all");

  const typeFilters = [
    { id: "all", label: "All" },
    { id: "service", label: "Services" },
    { id: "meeting", label: "Meetings" },
    { id: "contact", label: "Evangelism" },
    { id: "visitation", label: "Pastoral Care" },
    { id: "salvation", label: "Salvation" },
  ];

  function handleActivityClick(activity) {
    selectedActivity = activity;
    isModalOpen = true;
  }

  /**
   * Gets the color for an activity type (used for left border)
   * @param {string} type - The activity type
   * @returns {string} Hex color code
   */
  function getActivityColor(type) {
    const colors = {
      service: "#3b82f6", // blue
      meeting: "#8b5cf6", // purple
      contact: "#06b6d4", // cyan
      visitation: "#eab308", // yellow/amber
      salvation: "#ec4899", // pink
      conversion: "#10b981", // green
      attendance: "#10b981", // green
      event: "#8b5cf6", // purple
      note: "#6b7280", // gray
      new_member: "#06b6d4", // cyan
      visitor: "#10b981", // green
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

  // Filter activities by selectedType
  const filteredActivities = $derived.by(() => {
    if (selectedType === "all") return activities;
    if (selectedType === "salvation") {
      return activities.filter((a) => a.type === "salvation" || a.type === "conversion");
    }
    return activities.filter((a) => a.type === selectedType);
  });

  // Derived state: limit activities to maxItems using $derived
  const displayedActivities = $derived(filteredActivities.slice(0, maxItems));

  // Derived state: check if list is empty using $derived
  const isEmpty = $derived(displayedActivities.length === 0);
</script>

<!-- 
  Main card container using design system classes
  Uses card-base from app.css for consistent styling
-->
<div class="card-base">
  <!-- Header section with title and "View All" link -->
  <div class="flex items-center justify-between mb-3">
    <div class="flex items-center gap-2">
      <h2 class="text-lg font-semibold text-foreground">{title}</h2>
      <span class="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
        {filteredActivities.length}
      </span>
    </div>
    <button
      type="button"
      onclick={() => (isAllActivitiesModalOpen = true)}
      class="text-sm text-primary hover:underline transition-premium cursor-pointer bg-transparent border-0 p-0 font-medium"
    >
      View All ({activities.length})
    </button>
  </div>

  <!-- Filter chips row -->
  {#if showFilters}
    <div class="flex items-center gap-1.5 overflow-x-auto pb-3 mb-2 no-scrollbar">
      {#each typeFilters as filter}
        <button
          type="button"
          class="px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 shrink-0 cursor-pointer
                 {selectedType === filter.id
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 border border-border/60'}"
          onclick={() => (selectedType = filter.id)}
        >
          {filter.label}
        </button>
      {/each}
    </div>
  {/if}

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
      <p class="text-muted-foreground text-sm">No activity for this category</p>
      <p class="text-muted-foreground text-xs mt-1 opacity-70">
        Try selecting a different filter or date range
      </p>
    </div>
  {:else}
    <div class="space-y-2" role="list" aria-label="Recent activity list">
      {#each displayedActivities as activity (activity.id)}
        <div role="listitem">
          <button
            type="button"
            onclick={() => handleActivityClick(activity)}
            class="activity-entry w-full text-left flex items-center gap-4 p-3.5 rounded-xl border-l-[3px] transition-premium hover:bg-[#1e1e1e] cursor-pointer group"
            style="border-left-color: {getActivityColor(activity.type)}"
          >
          <!-- Avatar / Icon with initials -->
          <div
            class="w-9 h-9 rounded-full bg-[#252525] flex items-center justify-center text-sm font-medium text-foreground shrink-0 group-hover:scale-105 transition-transform"
          >
            {#if activity.type === 'service'}
              🏛️
            {:else if activity.type === 'meeting'}
              👥
            {:else if activity.type === 'salvation'}
              ✝️
            {:else if activity.type === 'visitation'}
              🏠
            {:else}
              {getInitials(activity.person)}
            {/if}
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p
              class="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors"
            >
              {activity.type === 'service' || activity.type === 'meeting' ? activity.description : activity.person}
            </p>
            <p class="text-xs text-muted-foreground truncate">
              {activity.action || activity.description}
            </p>
          </div>

          <!-- Time & Arrow Indicator -->
          <div class="flex items-center gap-2 shrink-0">
            <time
              datetime={toISOString(activity.timestamp)}
              class="text-xs text-subtle"
            >
              {formatRelativeTime(activity.timestamp)}
            </time>
            <svg
              class="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Activity Detail Popup Modal -->
<ActivityDetailModal
  bind:isOpen={isModalOpen}
  activity={selectedActivity}
  onclose={() => (selectedActivity = null)}
/>

<!-- All Activities List Modal -->
<AllActivitiesModal
  bind:isOpen={isAllActivitiesModalOpen}
  {activities}
  onSelectActivity={(act) => {
    isAllActivitiesModalOpen = false;
    selectedActivity = act;
    isModalOpen = true;
  }}
/>

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
