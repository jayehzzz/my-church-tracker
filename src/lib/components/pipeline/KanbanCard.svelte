<!--
  KanbanCard.svelte
  A card component representing a single contact within the Follow-Up Pipeline Kanban board.

  Props:
    - contact: Contact object with pipeline details:
      {
        first_name: string,
        last_name: string,
        phone: string,
        contact_date: string,
        freshness: 'this_week' | 'last_week' | 'two_plus_weeks' | 'month_plus',
        warmth_score: 'hot' | 'warm' | 'cool' | 'cold' | 'dead',
        pipeline_stage: string,
        leader_name: string,
        total_follow_ups: number,
        last_follow_up_date: string,
        promises_made: number,
        promises_kept: number
      }
    - onLogFollowUp: Function called when the "Log Follow-Up" button is clicked
    - onViewTimeline: Function called when the card itself is clicked

  Features:
    - Displays contact name, phone, freshness badge, and warmth badge
    - Shows assigned leader with icon
    - Displays follow-up statistics, relative last follow-up date, and promise ratio
    - Accessible keyboard navigation and ARIA attributes
    - Uses Svelte 5 runes syntax ($props, $derived)
-->

<script>
  import FreshnessBadge from './FreshnessBadge.svelte';
  import WarmthBadge from './WarmthBadge.svelte';

  /**
   * Component props
   */
  let {
    contact = {},
    onLogFollowUp = null,
    onViewTimeline = null,
    class: className = '',
    ...restProps
  } = $props();

  // Full name computed
  const fullName = $derived(
    [contact?.first_name, contact?.last_name].filter(Boolean).join(' ') || 'Unnamed Contact'
  );

  // Phone number fallback
  const phone = $derived(contact?.phone || 'No phone');

  /**
   * Format relative date from ISO or standard date string
   * 'Today' if today, 'Yesterday' if yesterday, otherwise 'X days ago'
   * @param {string} dateStr
   * @returns {string | null}
   */
  function formatRelativeDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = today.getTime() - target.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays > 1) return `${diffDays} days ago`;
    if (diffDays < 0) {
      const absDays = Math.abs(diffDays);
      return absDays === 1 ? 'Tomorrow' : `In ${absDays} days`;
    }
    return 'Today';
  }

  // Follow-up count and formatted label
  const followUpCount = $derived(contact?.total_follow_ups ?? 0);
  const followUpLabel = $derived(
    `${followUpCount} follow-up${followUpCount === 1 ? '' : 's'}`
  );

  // Relative last follow-up date
  const lastFollowUpRelative = $derived(
    contact?.last_follow_up_date ? formatRelativeDate(contact.last_follow_up_date) : null
  );

  // Promise ratio tracking
  const hasPromises = $derived(
    contact?.promises_made !== undefined &&
    contact?.promises_made !== null &&
    contact?.promises_made > 0
  );
  const promiseText = $derived(
    hasPromises
      ? `Promises: ${contact?.promises_kept ?? 0}/${contact?.promises_made}`
      : null
  );

  /**
   * Handle card click to view timeline
   */
  function handleCardClick() {
    onViewTimeline?.(contact);
  }

  /**
   * Handle keyboard interaction for card
   * @param {KeyboardEvent} event
   */
  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onViewTimeline?.(contact);
    }
  }

  /**
   * Handle log follow up button click
   * @param {MouseEvent} event
   */
  function handleLogFollowUp(event) {
    event.stopPropagation();
    onLogFollowUp?.(contact);
  }
</script>

<div
  class="rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all cursor-pointer select-none flex flex-col justify-between gap-2.5 {className}"
  role="button"
  tabindex="0"
  onclick={handleCardClick}
  onkeydown={handleKeyDown}
  aria-label="View timeline for {fullName}"
  {...restProps}
>
  <!-- Top Row: Name + FreshnessBadge -->
  <div class="flex items-center justify-between gap-2">
    <span class="font-medium text-sm text-foreground truncate" title={fullName}>
      {fullName}
    </span>
    {#if contact?.freshness}
      <FreshnessBadge freshness={contact.freshness} />
    {/if}
  </div>

  <!-- Second Row: Phone Number + WarmthBadge(size='sm') -->
  <div class="flex items-center justify-between gap-2">
    <span class="text-xs text-muted-foreground truncate">
      {phone}
    </span>
    {#if contact?.warmth_score}
      <WarmthBadge warmth={contact.warmth_score} size="sm" />
    {/if}
  </div>

  <!-- Third Row: Leader Name with Person Icon -->
  {#if contact?.leader_name}
    <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
      <svg
        class="w-3.5 h-3.5 shrink-0 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
      <span class="truncate">{contact.leader_name}</span>
    </div>
  {/if}

  <!-- Fourth Row: Stats (follow-up count, last follow-up relative date, promise ratio) -->
  <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground pt-2 border-t border-border/40">
    <span>{followUpLabel}</span>
    {#if lastFollowUpRelative}
      <span class="text-border" aria-hidden="true">•</span>
      <span>Last: {lastFollowUpRelative}</span>
    {/if}
    {#if promiseText}
      <span class="text-border" aria-hidden="true">•</span>
      <span>{promiseText}</span>
    {/if}
  </div>

  <!-- Bottom Row: Log Follow-Up Button -->
  <div class="flex items-center justify-end pt-1">
    <button
      type="button"
      class="text-xs text-primary hover:bg-primary/10 rounded px-2 py-1 transition-colors cursor-pointer inline-flex items-center gap-1 font-medium"
      onclick={handleLogFollowUp}
      aria-label="Log follow-up for {fullName}"
    >
      <svg
        class="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4v16m8-8H4"
        />
      </svg>
      Log Follow-Up
    </button>
  </div>
</div>
