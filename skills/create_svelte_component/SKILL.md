---
description: Create a new Svelte 5 UI component following the Church Tracker Design Philosophy (Runes, Motion, Tailwind).
---

# Create Svelte Component

This skill guides you through creating a new UI component that aligns with the project's design philosophy (Svelte 5, Motion, Interactivity).

## 1. Requirement Analysis
Before writing code, verify:
- **Interactivity**: Is this component clickable? If so, does it have `cursor-pointer` and hover states?
- **Animation**: Should it use the `Motion` wrapper for entrance?
- **Props**: Define strict types using JSDoc and `$props()`.

## 2. Template Structure
Use the following template for new components.

```svelte
<!--
  [ComponentName].svelte
  [Brief description of purpose]
-->
<script>
    import Motion from '$lib/components/ui/Motion.svelte';
    import { cn } from '$lib/utils'; // if needed for class merging

    /**
     * @typedef {Object} Props
     * @property {import('svelte').Snippet} [children]
     * @property {string} [class]
     * @property {string} [title]
     * // Add other props here
     */

    let {
        children,
        class: className = "",
        title = "",
        ...rest
    } = $props();
</script>

<Motion>
    <div class={cn("p-4 rounded-xl bg-card border border-border", className)} {...rest}>
        {#if title}
            <h3 class="text-lg font-semibold mb-2">{title}</h3>
        {/if}
        {@render children?.()}
    </div>
</Motion>
```

## 3. Checklist
- [ ] Uses `$props()` generic destructuring.
- [ ] Uses `{@render children()}` for slots.
- [ ] Wrapped in `<Motion>` (if it's a structural element).
- [ ] Uses Tailwind colors (bg-card, text-primary, etc.) not hardcoded hex values.
- [ ] "on:click" requires `cursor-pointer` and hover effects (e.g. `hover:bg-muted/50`).
