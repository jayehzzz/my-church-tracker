<!--
  Motion.svelte
  A wrapper component for entrance animations.
  Uses Svelte 5 snippets and svelte/transition.
-->
<script>
    import { fly } from "svelte/transition";
    import { cubicOut } from "svelte/easing";

    /**
     * @typedef {Object} MotionProps
     * @property {import('svelte').Snippet} [children]
     * @property {number} [delay] - Delay in ms
     * @property {number} [duration] - Duration in ms
     * @property {number} [y] - Y-axis offset for fly animation
     * @property {number} [x] - X-axis offset for fly animation
     * @property {string} [class] - Additional classes
     */

    let {
        children,
        delay = 0,
        duration = 400,
        y = 20,
        x = 0,
        class: className = "",
    } = $props();
</script>

<div class={className} in:fly={{ y, x, duration, delay, easing: cubicOut }}>
    {@render children?.()}
</div>
