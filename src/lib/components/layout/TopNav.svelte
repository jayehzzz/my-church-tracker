<!--
  Top Navigation Bar Component
  ============================

  A premium top navigation bar for the church tracker dashboard.
  Features mobile hamburger menu, dynamic page titles, and user controls.

  Features:
  - Mobile hamburger menu toggle
  - Dynamic page title based on current route
  - Search input placeholder
  - Notification bell with badge
  - User avatar/profile dropdown placeholder
  - Sticky positioning with backdrop blur
-->

<script>
  import { navigationStore, sidebarVisible } from "$lib/stores/navigationStore";
  import { openSearch } from "$lib/stores/searchStore";
  import { page } from "$app/stores";
  import GlobalSearch from "./GlobalSearch.svelte";

  // Handle sidebar toggle
  function toggleSidebar() {
    navigationStore.toggleSidebar();
    navigationStore.saveToStorage();
  }

  // Page title mapping based on routes
  const pageTitles = {
    "/": "Dashboard",
    "/evangelism": "Evangelism Contacts",
    "/services": "Sunday Services",
    "/meetings": "Meetings & Prayer",
    "/people": "People Directory",
    "/visitation": "Visitation",
    "/reports": "Reports",
  };

  // Svelte 5: Get current page title using $derived
  const currentTitle = $derived(
    pageTitles[$page.url.pathname] || "Church Tracker",
  );

  // Handle mobile sidebar toggle
  function toggleMobileSidebar() {
    navigationStore.toggleMobileSidebar();
  }

  // Open global search
  function handleSearch() {
    openSearch();
  }

  function handleNotifications() {
    // Placeholder - notifications to be implemented
    console.log("Notifications clicked");
  }

  function handleProfile() {
    // Placeholder - user profile to be implemented
    console.log("Profile clicked");
  }
</script>

<!-- Global Search Component -->
<GlobalSearch />

<!-- Top Navigation Bar -->
<header
  class="sticky top-0 z-30 w-full border-b border-border bg-card/80 backdrop-blur-md supports-[backdrop-filter]:bg-card/60 transition-all duration-200"
>
  <div class="flex h-16 items-center justify-between">
    <!-- Left Section: Logo + Toggle + Title -->
    <div class="flex items-center">
      <!-- Logo/Brand Area - width matches sidebar -->
      <div
        class="hidden md:flex items-center justify-between px-4 border-r border-border/50 transition-all duration-300 {$sidebarVisible
          ? 'w-64'
          : 'w-16'}"
      >
        {#if $sidebarVisible}
          <div class="flex items-center space-x-3">
            <div
              class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"
            >
              <span class="text-primary-foreground font-bold text-sm">CT</span>
            </div>
            <span class="font-semibold text-foreground">Church Tracker</span>
          </div>
        {:else}
          <div
            class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto"
          >
            <span class="text-primary-foreground font-bold text-sm">CT</span>
          </div>
        {/if}
        <!-- Collapse Toggle Button -->
        {#if $sidebarVisible}
          <button
            onclick={toggleSidebar}
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary transition-colors"
            aria-label="Collapse sidebar"
          >
            <svg
              class="w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        {/if}
      </div>

      <!-- Mobile Hamburger Menu -->
      <button
        onclick={toggleMobileSidebar}
        class="md:hidden flex items-center justify-center w-10 h-10 ml-4 rounded-lg hover:bg-secondary transition-colors"
        aria-label="Toggle mobile menu"
      >
        <svg
          class="w-5 h-5 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <!-- Expand button when collapsed (shown inline with title) -->
      {#if !$sidebarVisible}
        <button
          onclick={toggleSidebar}
          class="hidden md:flex w-6 h-6 ml-2 items-center justify-center rounded hover:bg-secondary transition-colors"
          aria-label="Expand sidebar"
        >
          <svg
            class="w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      {/if}

      <!-- Page Title -->
      <div class="flex items-center ml-4">
        <h1 class="text-lg font-semibold text-foreground truncate">
          {currentTitle}
        </h1>
      </div>
    </div>

    <!-- Right Section: Search + Notifications + Profile -->
    <div class="flex items-center space-x-3 pr-4 md:pr-6">
      <!-- Search Input (Placeholder) -->
      <div class="hidden md:flex items-center">
        <div class="relative">
          <div
            class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
          >
            <svg
              class="w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            type="button"
            onclick={handleSearch}
            class="w-64 pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm text-muted-foreground text-left cursor-pointer hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
          >
            Search...
          </button>
        </div>
      </div>

      <!-- Mobile Search Button -->
      <button
        onclick={handleSearch}
        class="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-secondary transition-colors"
        aria-label="Search"
      >
        <svg
          class="w-5 h-5 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>

      <!-- Notifications -->
      <button
        onclick={handleNotifications}
        class="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-secondary transition-colors"
        aria-label="Notifications"
      >
        <svg
          class="w-5 h-5 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 17h5l-5 5v-5z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v5l4 4h10l4-4z"
          />
        </svg>
        <!-- Notification Badge -->
        <span
          class="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full"
        ></span>
      </button>

      <!-- User Profile -->
      <button
        onclick={handleProfile}
        class="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-secondary transition-colors"
        aria-label="User profile"
      >
        <div
          class="w-8 h-8 bg-primary rounded-full flex items-center justify-center"
        >
          <svg
            class="w-4 h-4 text-primary-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      </button>
    </div>
  </div>
</header>

<style>
  /* Backdrop blur support for older browsers */
  .backdrop-blur-md {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  /* Fallback for browsers without backdrop-filter support */
  @supports not (backdrop-filter: blur(12px)) {
    .backdrop-blur-md {
      background-color: hsl(var(--card));
    }
  }
</style>
