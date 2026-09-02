<!--
  FreshnessBadge.svelte
  A badge that shows how fresh/old a contact is since their contact date.

  Props:
    - freshness: 'this_week' | 'last_week' | 'two_plus_weeks' | 'month_plus'
    - class: Optional additional CSS classes

  Features:
    - Color-coded visual indicator based on contact freshness
    - Uses Svelte 5 runes ($props, $derived)
    - Accessible ARIA attributes
-->

<script>
  /**
   * @typedef {'this_week' | 'last_week' | 'two_plus_weeks' | 'month_plus'} FreshnessType
   */

  let {
    freshness = 'this_week',
    class: className = '',
    ...restProps
  } = $props();

  const freshnessConfigs = {
    this_week: {
      label: 'This Week',
      emoji: '🆕',
      classes: 'bg-success/15 text-success',
    },
    last_week: {
      label: 'Last Week',
      emoji: '📅',
      classes: 'bg-primary/15 text-primary',
    },
    two_plus_weeks: {
      label: '2+ Weeks',
      emoji: '⚠️',
      classes: 'bg-warning/15 text-warning',
    },
    month_plus: {
      label: 'Month+',
      emoji: '🔴',
      classes: 'bg-destructive/15 text-destructive',
    },
  };

  const config = $derived(
    freshnessConfigs[freshness] || {
      label: freshness || 'Unknown',
      emoji: '⏳',
      classes: 'bg-secondary text-muted-foreground',
    }
  );
</script>

<span
  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium leading-[1.4] {config.classes} {className}"
  role="status"
  aria-label="Freshness: {config.label}"
  {...restProps}
>
  <span aria-hidden="true">{config.emoji}</span>
  <span>{config.label}</span>
</span>
