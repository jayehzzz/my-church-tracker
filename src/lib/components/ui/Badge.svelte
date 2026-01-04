<!--
  Badge.svelte
  A status badge/tag component for the church tracker dashboard.
  
  Features:
  - Multiple variants: default, success, warning, danger, info
  - Two sizes: sm, md
  - Optional status dot instead of text
  - Accessible with proper ARIA attributes
  - Uses Svelte 5 runes syntax
-->

<script>
  /**
   * @typedef {'default' | 'success' | 'warning' | 'danger' | 'info'} BadgeVariant
   * @typedef {'sm' | 'md'} BadgeSize
   */
  
  let { 
    variant = 'default',
    size = 'md',
    dot = false,
    children,
    ...restProps
  } = $props();
  
  // Variant class mappings for background and text
  const variantClassMap = {
    default: 'bg-secondary text-secondary-foreground',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-destructive/15 text-destructive',
    info: 'bg-primary/15 text-primary'
  };
  
  // Dot color class mappings
  const dotColorClassMap = {
    default: 'bg-muted-foreground',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-destructive',
    info: 'bg-primary'
  };
  
  // Size class mappings
  const sizeClassMap = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs'
  };
  
  // Derived values using $derived
  const variantClasses = $derived(variantClassMap[variant] || variantClassMap.default);
  const dotColorClasses = $derived(dotColorClassMap[variant] || dotColorClassMap.default);
  const sizeClasses = $derived(sizeClassMap[size] || sizeClassMap.md);
  const dotSize = $derived(size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2');
  
  const badgeClasses = $derived(
    `inline-flex items-center gap-1.5 font-medium rounded-full ${variantClasses} ${sizeClasses}`
  );
</script>

<span
  class={badgeClasses}
  role="status"
  {...restProps}
>
  {#if dot}
    <span 
      class="{dotSize} {dotColorClasses} rounded-full flex-shrink-0"
      aria-hidden="true"
    ></span>
  {/if}
  
  {#if children}
    {@render children()}
  {/if}
</span>

<style>
  span {
    /* Ensure consistent line-height */
    line-height: 1.4;
  }
</style>
