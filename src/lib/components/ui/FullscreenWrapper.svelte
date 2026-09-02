<!--
  FullscreenWrapper.svelte
  Keeps a chart's state intact while moving the same content into fullscreen.
-->

<script>
  let {
    title = "",
    children,
    filters,
    class: className = "",
    ...restProps
  } = $props();

  let isFullscreen = $state(false);
  let previousOverflow = $state("");

  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
    if (isFullscreen) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflow;
    }
  }

  function exitFullscreen() {
    if (!isFullscreen) return;
    isFullscreen = false;
    document.body.style.overflow = previousOverflow;
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && isFullscreen) exitFullscreen();
  }

  $effect(() => {
    return () => {
      if (typeof window !== "undefined" && isFullscreen) {
        document.body.style.overflow = previousOverflow;
      }
    };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="relative {className} {isFullscreen ? 'fullscreen-active' : ''}"
  role={isFullscreen ? "dialog" : undefined}
  aria-modal={isFullscreen ? "true" : undefined}
  aria-label={isFullscreen ? title || "Fullscreen view" : undefined}
  {...restProps}
>
  {#if isFullscreen}
    <div class="fullscreen-header">
      {#if title}<h2 class="text-lg font-semibold text-foreground">{title}</h2>{/if}
      <button type="button" class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" onclick={exitFullscreen} aria-label="Exit fullscreen">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>

    {#if filters}
      <div class="fullscreen-filters">
        {@render filters()}
      </div>
    {/if}
  {/if}

  <div class={isFullscreen ? "fullscreen-content" : ""}>
    {@render children?.()}
  </div>

  {#if !isFullscreen}
    <button
      type="button"
      class="absolute right-3 top-3 z-10 rounded-lg bg-secondary/50 p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      onclick={toggleFullscreen}
      aria-label="Enter fullscreen"
      title="Enter fullscreen"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    </button>
  {/if}
</div>

<style>
  .fullscreen-active {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: hsl(var(--background));
  }

  .fullscreen-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 0 0 auto;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid hsl(var(--border));
    background: hsl(var(--card));
  }

  .fullscreen-filters {
    flex: 0 0 auto;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid hsl(var(--border));
    background: hsl(var(--card) / 0.5);
  }

  .fullscreen-content {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem;
  }

  .fullscreen-content > :global(*) {
    flex: 1;
    width: 100%;
    min-height: calc(100vh - 8rem);
  }

  .fullscreen-content :global(.card-base) {
    height: 100%;
    min-height: calc(100vh - 8rem);
    display: flex;
    flex-direction: column;
  }

  .fullscreen-content :global(.card-base .chart-svg) {
    height: min(62vh, 640px) !important;
    min-height: 360px;
  }
</style>
