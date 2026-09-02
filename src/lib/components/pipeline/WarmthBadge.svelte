<!--
  WarmthBadge.svelte
  A badge showing warmth score for a pipeline contact.

  Props:
    - warmth: 'hot' | 'warm' | 'cool' | 'cold' | 'dead'
    - size: 'sm' | 'md' (default: 'md')
    - class: Optional additional CSS classes

  Features:
    - Color-coded warmth indicators (hot, warm, cool, cold, dead)
    - Configurable sizes (sm, md)
    - Uses Svelte 5 runes ($props, $derived)
    - Accessible ARIA attributes
-->

<script>
  /**
   * @typedef {'hot' | 'warm' | 'cool' | 'cold' | 'dead'} WarmthType
   * @typedef {'sm' | 'md'} BadgeSize
   */

  let {
    warmth = 'warm',
    size = 'md',
    class: className = '',
    ...restProps
  } = $props();

  const warmthConfigs = {
    hot: {
      label: 'Hot',
      emoji: '🔥',
      classes: 'bg-success/15 text-success',
    },
    warm: {
      label: 'Warm',
      emoji: '🟡',
      classes: 'bg-warning/15 text-warning',
    },
    cool: {
      label: 'Cool',
      emoji: '🔵',
      classes: 'bg-primary/15 text-primary',
    },
    cold: {
      label: 'Cold',
      emoji: '❄️',
      classes: 'bg-secondary text-muted-foreground',
    },
    dead: {
      label: 'Dead Lead',
      emoji: '☠️',
      classes: 'bg-destructive/15 text-destructive',
    },
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[11px]',
    md: 'px-2 py-0.5 text-xs',
  };

  const config = $derived(
    warmthConfigs[warmth?.toLowerCase()] || {
      label: warmth || 'Unknown',
      emoji: '⚪',
      classes: 'bg-secondary text-muted-foreground',
    }
  );

  const sizeClass = $derived(sizeClasses[size] || sizeClasses.md);
</script>

<span
  class="inline-flex items-center gap-1 rounded-full font-medium leading-[1.4] {config.classes} {sizeClass} {className}"
  role="status"
  aria-label="Warmth: {config.label}"
  {...restProps}
>
  <span aria-hidden="true">{config.emoji}</span>
  <span>{config.label}</span>
</span>
