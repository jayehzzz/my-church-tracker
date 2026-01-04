<!--
  FullscreenWrapper.svelte
  A wrapper component that enables fullscreen mode for content.
  
  Features:
  - Enter/exit fullscreen toggle
  - Renders optional filter bar in fullscreen
  - Keyboard shortcut (Escape to exit)
  - Smooth transitions
  - Uses Svelte 5 runes syntax
-->

<script>
    import { fade, scale } from "svelte/transition";
    import { onDestroy } from "svelte";

    let {
        title = "",
        children,
        filters,
        class: className = "",
        ...restProps
    } = $props();

    let isFullscreen = $state(false);
    let previousOverflow = $state("");

    /**
     * Toggle fullscreen mode
     */
    function toggleFullscreen() {
        isFullscreen = !isFullscreen;

        if (isFullscreen) {
            previousOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = previousOverflow;
        }
    }

    /**
     * Exit fullscreen
     */
    function exitFullscreen() {
        if (isFullscreen) {
            isFullscreen = false;
            document.body.style.overflow = previousOverflow;
        }
    }

    /**
     * Handle keydown for Escape
     */
    function handleKeydown(e) {
        if (e.key === "Escape" && isFullscreen) {
            exitFullscreen();
        }
    }

    // Cleanup on unmount
    onDestroy(() => {
        if (typeof window !== "undefined" && isFullscreen) {
            document.body.style.overflow = previousOverflow;
        }
    });
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Normal Mode -->
<div class="relative {className}" {...restProps}>
    <!-- Fullscreen Toggle Button -->
    <button
        type="button"
        class="absolute top-3 right-3 z-10 p-2 rounded-lg bg-secondary/50 text-muted-foreground
           hover:bg-secondary hover:text-foreground transition-premium
           focus:outline-none focus:ring-2 focus:ring-primary"
        onclick={toggleFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        title={isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
    >
        {#if isFullscreen}
            <!-- Minimize icon -->
            <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                />
            </svg>
        {:else}
            <!-- Maximize icon -->
            <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
            </svg>
        {/if}
    </button>

    <!-- Content -->
    {#if children}
        {@render children()}
    {/if}
</div>

<!-- Fullscreen Overlay -->
{#if isFullscreen}
    <div
        class="fullscreen-overlay"
        transition:fade={{ duration: 200 }}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Fullscreen view"}
    >
        <div
            class="fullscreen-container"
            transition:scale={{ duration: 200, start: 0.95 }}
        >
            <!-- Header -->
            <div class="fullscreen-header">
                <div class="flex items-center gap-3">
                    {#if title}
                        <h2 class="text-lg font-semibold text-foreground">
                            {title}
                        </h2>
                    {/if}
                </div>

                <button
                    type="button"
                    class="p-2 rounded-lg text-muted-foreground hover:text-foreground
                 hover:bg-secondary transition-premium"
                    onclick={exitFullscreen}
                    aria-label="Exit fullscreen"
                >
                    <svg
                        class="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <!-- Filters (if provided) -->
            {#if filters}
                <div class="fullscreen-filters">
                    {@render filters()}
                </div>
            {/if}

            <!-- Main Content -->
            <div class="fullscreen-content">
                {#if children}
                    {@render children()}
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .fullscreen-overlay {
        position: fixed;
        inset: 0;
        z-index: 50;
        background-color: hsl(var(--background));
        display: flex;
        flex-direction: column;
    }

    .fullscreen-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
    }

    .fullscreen-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid hsl(var(--border));
        background: hsl(var(--card));
    }

    .fullscreen-filters {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid hsl(var(--border));
        background: hsl(var(--card) / 0.5);
    }

    .fullscreen-content {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
    }
</style>
