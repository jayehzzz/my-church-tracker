<!--
  Button.svelte
  A styled button component for the church tracker dashboard.
  
  Features:
  - Multiple variants: primary, secondary, danger, ghost
  - Multiple sizes: sm, md, lg
  - Loading state with spinner
  - Icon support (left or right position) via snippets
  - Full width option
  - Accessible with proper ARIA attributes
  - Uses Svelte 5 runes syntax
-->

<script>
  /**
   * @typedef {'primary' | 'secondary' | 'danger' | 'ghost'} ButtonVariant
   * @typedef {'sm' | 'md' | 'lg'} ButtonSize
   * @typedef {'left' | 'right'} IconPosition
   * @typedef {'button' | 'submit' | 'reset'} ButtonType
   */
  
  let { 
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    iconPosition = 'left',
    fullWidth = false,
    type = 'button',
    children,
    icon,
    onclick,
    ...restProps
  } = $props();
  
  // Variant class mappings
  const variantClassMap = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive',
    ghost: 'bg-transparent text-foreground hover:bg-secondary/50'
  };
  
  // Size class mappings
  const sizeClassMap = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2.5'
  };
  
  // Icon size mappings
  const iconSizeMap = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
  
  // Derived values using $derived
  const variantClasses = $derived(variantClassMap[variant] || variantClassMap.primary);
  const sizeClasses = $derived(sizeClassMap[size] || sizeClassMap.md);
  const iconSize = $derived(iconSizeMap[size] || iconSizeMap.md);
  
  const buttonClasses = $derived(
    `inline-flex items-center justify-center font-medium rounded-lg transition-premium
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    ${variantClasses} ${sizeClasses} ${fullWidth ? 'w-full' : ''}`
  );
  
  const isDisabled = $derived(disabled || loading);
</script>

<button
  {type}
  class={buttonClasses}
  disabled={isDisabled}
  aria-disabled={isDisabled}
  aria-busy={loading}
  {onclick}
  {...restProps}
>
  {#if loading}
    <!-- Loading spinner -->
    <svg
      class="{iconSize} animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  {:else if icon && iconPosition === 'left'}
    <span class={iconSize} aria-hidden="true">
      {@render icon()}
    </span>
  {/if}
  
  {#if children}
    {@render children()}
  {/if}
  
  {#if !loading && icon && iconPosition === 'right'}
    <span class={iconSize} aria-hidden="true">
      {@render icon()}
    </span>
  {/if}
</button>

<style>
  button {
    /* Ensure consistent appearance across browsers */
    -webkit-appearance: none;
    appearance: none;
  }
</style>
