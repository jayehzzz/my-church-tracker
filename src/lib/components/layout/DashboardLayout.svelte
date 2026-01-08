<script>
  import Sidebar from "./Sidebar.svelte";
  import TopNav from "./TopNav.svelte";
  import { sidebarVisible } from "$lib/stores/navigationStore";
  import { onMount } from "svelte";

  // Svelte 5: Props with snippets for slot replacement
  let { children, filters } = $props();

  let isScrolled = $state(false);

  onMount(() => {
    const handleScroll = () => {
      isScrolled = window.scrollY > 10;
    };

    // Initial check
    handleScroll();

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  });
</script>

<div class="min-h-screen bg-background flex flex-col">
  <!-- Top Navigation - Full Width -->
  <TopNav />

  <!-- Body with Sidebar and Content -->
  <div class="flex flex-1">
    <!-- Sidebar Navigation -->
    <Sidebar />

    <!-- Main Content Area -->
    <div
      class="flex-1 flex flex-col {$sidebarVisible
        ? 'md:ml-64'
        : 'md:ml-16'} transition-all duration-300"
    >
      <!-- 
      Global Filters Bar (Sticky) 
      Sticks below the TopNav (top-16 = 64px)
    -->
      {#if filters}
        <div
          class="sticky top-16 z-20 w-full transition-all duration-500 ease-in-out {isScrolled
            ? 'bg-background/95 backdrop-blur-md border-b border-border/40 shadow-sm supports-[backdrop-filter]:bg-background/60'
            : 'bg-background border-b border-transparent shadow-none'}"
        >
          <div class="w-full max-w-7xl mx-auto pl-4 pr-6 md:pr-8 lg:pr-10 py-3">
            {@render filters()}
          </div>
        </div>
      {/if}

      <!-- Page Content -->
      <main
        class="flex-1 w-full max-w-7xl mx-auto pl-4 pr-6 md:pr-8 lg:pr-10 py-6"
      >
        <!-- Main content -->
        {@render children?.()}
      </main>
    </div>
  </div>
</div>

<style>
  /* Custom scrollbar for premium feel */
  :global(::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
  }

  :global(::-webkit-scrollbar-track) {
    background: hsl(0 0% 6%);
  }

  :global(::-webkit-scrollbar-thumb) {
    background: hsl(0 0% 20%);
    border-radius: 4px;
  }

  :global(::-webkit-scrollbar-thumb:hover) {
    background: hsl(0 0% 25%);
  }
</style>
