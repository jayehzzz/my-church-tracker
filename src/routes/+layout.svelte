<!--
  Root Layout Component
  =====================
  
  This is the root layout for the Church Tracker Dashboard application.
  It wraps all pages and provides:
  - Global CSS imports
  - Dark mode wrapper
  - Base HTML structure
  - Filter state initialization and persistence
  
  SvelteKit automatically wraps all routes with this layout.
  Child routes are rendered in the {@render children()} slot.
  
  @see https://kit.svelte.dev/docs/routing#layout
-->

<script>
  /**
   * Import global styles
   * This imports our Tailwind CSS configuration and custom design tokens
   */
  import "../app.css";

  /**
   * Import filter store for initialization and persistence
   */
  import { filterStore } from "$lib/stores/filterStore";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  /**
   * Svelte 5: Props with children snippet for slot replacement
   */
  let { children } = $props();

  /**
   * Initialize filters on mount
   * Priority: URL params > localStorage > defaults
   */
  onMount(() => {
    // Initialize filter state from URL or localStorage
    filterStore.initialize();
  });

  /**
   * Subscribe to filter changes and sync to URL/localStorage
   * Using $effect for reactive side effects in Svelte 5
   */
  $effect(() => {
    if (browser && $filterStore) {
      // Sync to URL for shareable links
      filterStore.syncToURL();
      // Save to localStorage for persistence across sessions
      filterStore.saveToStorage();
    }
  });
</script>

<!--
  HTML Head Configuration
  -----------------------
  Sets up viewport, theme color, and other meta tags for the app
-->
<svelte:head>
  <!-- Ensure proper scaling on mobile devices -->
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <!-- Theme color for browser chrome (matches our dark background) -->
  <meta name="theme-color" content="#1a1a1a" />

  <!-- Prevent light mode flash on page load -->
  <meta name="color-scheme" content="dark" />
</svelte:head>

<!--
  Main Application Wrapper
  ------------------------
  Provides the dark mode container for the entire application.
  
  Classes:
  - min-h-screen: Ensures the app fills at least the full viewport height
  - bg-background: Uses our design system background color (#1a1a1a)
  - text-foreground: Uses our design system text color (#f5f5f5)
  - antialiased: Improves font rendering on modern displays
-->
<div class="min-h-screen bg-background text-foreground antialiased">
  <!--
    Render child route content
    This is where page components will be inserted
  -->
  {@render children?.()}
</div>
