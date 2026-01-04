<!--
  InfoRow.svelte
  Reusable label/value display component for profile pages.
  
  Props:
    - label: The label text
    - value: The value to display
    - icon: Optional SVG icon markup
-->

<script>
    let { label = "", value = null, icon = null, ...restProps } = $props();

    // Format display value
    const displayValue = $derived(value ?? "—");
</script>

<div class="flex items-start gap-3 py-2" {...restProps}>
    {#if icon}
        <div class="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5">
            {@html icon}
        </div>
    {/if}
    <div class="flex-1 min-w-0">
        <span class="text-sm text-muted-foreground">{label}</span>
        <div class="text-sm font-medium text-foreground truncate">
            {displayValue}
        </div>
    </div>
</div>
