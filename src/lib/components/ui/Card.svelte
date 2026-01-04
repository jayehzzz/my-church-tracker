<!--
  Card.svelte
  A card container component for the church tracker dashboard.
  
  Features:
  - Multiple padding options: none, sm, md, lg
  - Optional hover effect
  - Header, body, and footer snippets
  - Premium dark theme styling with gradient
  - Accessible with proper ARIA attributes
  - Uses Svelte 5 runes syntax
-->

<script>
  /**
   * @typedef {'none' | 'sm' | 'md' | 'lg'} CardPadding
   */

  let {
    padding = "md",
    hoverable = false,
    header,
    children,
    footer,
    class: className = "",
    onclick,
    ...restProps
  } = $props();

  // Padding class mappings
  const paddingClassMap = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  };

  // Section padding mappings (for header/footer)
  const sectionPaddingMap = {
    none: "px-0 py-0",
    sm: "px-3 py-2",
    md: "px-5 py-3",
    lg: "px-6 py-4",
  };

  // Body padding mappings (when header or footer exists)
  const bodyPaddingMap = {
    none: "",
    sm: "px-3",
    md: "px-5",
    lg: "px-6",
  };

  // Derived values using $derived
  const paddingClasses = $derived(
    paddingClassMap[padding] || paddingClassMap.md,
  );
  const sectionPadding = $derived(
    sectionPaddingMap[padding] || sectionPaddingMap.md,
  );
  const bodyPadding = $derived(bodyPaddingMap[padding] || bodyPaddingMap.md);

  // Check if header or footer snippets are provided
  const hasHeader = $derived(!!header);
  const hasFooter = $derived(!!footer);

  // Check interactivity
  const isInteractive = $derived(hoverable || !!onclick);

  // Combined card classes
  const cardClasses = $derived(
    `rounded-xl border border-border bg-gradient-to-br from-card to-card-elevated
    ${isInteractive ? "card-interactive cursor-pointer" : ""}
    ${!hasHeader && !hasFooter ? paddingClasses : ""}
    ${className}`,
  );

  // Body classes based on header/footer presence
  const bodyClasses = $derived(
    hasHeader || hasFooter ? `${bodyPadding} py-4` : "",
  );
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class={cardClasses}
  role={isInteractive ? "button" : undefined}
  tabindex={isInteractive ? 0 : undefined}
  {onclick}
  onkeydown={isInteractive
    ? (e) => (e.key === "Enter" || e.key === " ") && onclick?.(e)
    : undefined}
  {...restProps}
>
  {#if header}
    <div class="border-b border-border {sectionPadding}">
      {@render header()}
    </div>
  {/if}

  <div class={bodyClasses}>
    {#if children}
      {@render children()}
    {/if}
  </div>

  {#if footer}
    <div class="border-t border-border {sectionPadding}">
      {@render footer()}
    </div>
  {/if}
</div>

<style>
  div {
    /* Ensure proper stacking context */
    position: relative;
  }
</style>
