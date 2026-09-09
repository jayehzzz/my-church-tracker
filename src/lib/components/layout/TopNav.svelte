<!--
  Top Navigation Bar Component
  ============================

  A premium top navigation bar for the church tracker dashboard.
  Features mobile hamburger menu, dynamic page titles, search, live notification center,
  interactive church hub launchpad, and user profile management.

  Features:
  - Mobile hamburger menu toggle
  - Dynamic page title based on current route
  - Interactive Church Hub & Quick Action Launchpad (Top-left CT logo)
  - Global Search with ⌘K trigger
  - Live Notification Center with unread counter badge (Top-right Bell icon)
  - User Profile & Admin Settings menu (Top-right Avatar icon)
  - Keyboard Shortcuts modal (⌘K, ⌘B, Esc)
  - Sticky positioning with backdrop blur
-->

<script>
  import { navigationStore, sidebarVisible } from "$lib/stores/navigationStore";
  import { openSearch } from "$lib/stores/searchStore";
  import { unreadCount } from "$lib/stores/notificationStore";
  import { session } from "$lib/auth/session.js";
  import { page } from "$app/stores";
  import GlobalSearch from "./GlobalSearch.svelte";
  import ChurchHubDropdown from "./ChurchHubDropdown.svelte";
  import NotificationDropdown from "./NotificationDropdown.svelte";
  import ProfileDropdown from "./ProfileDropdown.svelte";
  import KeyboardShortcutsModal from "./KeyboardShortcutsModal.svelte";

  // Dropdown states
  let isChurchHubOpen = $state(false);
  let isNotificationsOpen = $state(false);
  let isProfileOpen = $state(false);
  let isShortcutsModalOpen = $state(false);

  // Handle sidebar toggle
  function toggleSidebar() {
    navigationStore.toggleSidebar();
    navigationStore.saveToStorage();
  }

  // Page title mapping based on routes
  const pageTitles = {
    "/": "Dashboard",
    "/evangelism": "Evangelism",
    "/services": "Sunday Services",
    "/meetings": "Meetings & Attendance",
    "/memories": "Memories",
    "/people": "People Directory",
    "/development": "Development",
    "/visitation": "Pastoral Care",
    "/reports": "Reports",
  };

  // Svelte 5: Get current page title using $derived
  const currentTitle = $derived(
    pageTitles[$page.url.pathname] || "Church Tracker",
  );

  function goBack() {
    window.history.back();
  }

  function goForward() {
    window.history.forward();
  }

  // Handle mobile sidebar toggle
  function toggleMobileSidebar() {
    navigationStore.toggleMobileSidebar();
  }

  // Open global search
  function handleSearch() {
    isChurchHubOpen = false;
    isNotificationsOpen = false;
    isProfileOpen = false;
    openSearch();
  }

  function toggleChurchHub() {
    isNotificationsOpen = false;
    isProfileOpen = false;
    isChurchHubOpen = !isChurchHubOpen;
  }

  function toggleNotifications() {
    isChurchHubOpen = false;
    isProfileOpen = false;
    isNotificationsOpen = !isNotificationsOpen;
  }

  function toggleProfile() {
    isChurchHubOpen = false;
    isNotificationsOpen = false;
    isProfileOpen = !isProfileOpen;
  }

  // Global keyboard shortcuts (⌘K for search, ⌘B for sidebar toggle)
  function handleGlobalKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      handleSearch();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      toggleSidebar();
    }
  }
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<!-- Global Search Component -->
<GlobalSearch />

<!-- Keyboard Shortcuts Modal -->
<KeyboardShortcutsModal
  bind:isOpen={isShortcutsModalOpen}
  onclose={() => (isShortcutsModalOpen = false)}
/>

<!-- Top Navigation Bar -->
<header
  class="sticky top-0 z-30 w-full border-b border-border bg-card/80 backdrop-blur-md supports-[backdrop-filter]:bg-card/60 transition-all duration-200"
>
  <div class="flex h-16 min-w-0 items-center justify-between relative">
    <!-- Left Section: Logo + Toggle + Title -->
    <div class="flex min-w-0 flex-1 items-center">
      <!-- Logo/Brand Area - width matches sidebar -->
      <div
        class="hidden md:flex items-center justify-between px-4 border-r border-border/50 transition-all duration-300 relative {$sidebarVisible
          ? 'w-64'
          : 'w-16'}"
      >
        {#if $sidebarVisible}
          <button
            type="button"
            data-churchhub-trigger
            onclick={toggleChurchHub}
            class="flex items-center space-x-2.5 p-1.5 -ml-1.5 rounded-lg hover:bg-secondary/70 transition-all text-left group cursor-pointer"
            aria-label="Open Church Hub and Quick Actions"
            title="Church Hub & Quick Actions"
          >
            <div
              class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform flex-shrink-0"
            >
              <span class="text-primary-foreground font-bold text-sm">CT</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors truncate">
                Church Tracker
              </span>
              <span class="text-[10px] text-muted-foreground font-medium flex items-center gap-0.5">
                Quick Hub
                <svg class="w-2.5 h-2.5 transition-transform group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
          </button>
        {:else}
          <button
            type="button"
            data-churchhub-trigger
            onclick={toggleChurchHub}
            class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto hover:scale-105 transition-transform shadow-sm cursor-pointer"
            aria-label="Open Church Hub"
            title="Church Hub & Quick Actions"
          >
            <span class="text-primary-foreground font-bold text-sm">CT</span>
          </button>
        {/if}

        <!-- Collapse Toggle Button -->
        {#if $sidebarVisible}
          <button
            onclick={toggleSidebar}
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Collapse sidebar"
            title="Collapse sidebar (⌘B)"
          >
            <svg
              class="w-4 h-4"
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
        class="md:hidden flex shrink-0 items-center justify-center w-10 h-10 ml-2 rounded-lg hover:bg-secondary transition-colors"
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
          class="hidden md:flex w-6 h-6 ml-2 items-center justify-center rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Expand sidebar"
          title="Expand sidebar (⌘B)"
        >
          <svg
            class="w-4 h-4"
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
      <div class="ml-2 flex min-w-0 items-center gap-1 sm:ml-4 sm:gap-2">
        <div class="flex shrink-0 items-center rounded-lg border border-border bg-secondary/25 p-0.5" aria-label="Page history controls">
          <button
            type="button"
            onclick={goBack}
            class="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            aria-label="Go back to the previous page"
            title="Back"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 19l-7-7 7-7" />
            </svg>
            <span class="hidden lg:inline">Back</span>
          </button>
          <span class="h-5 w-px bg-border" aria-hidden="true"></span>
          <button
            type="button"
            onclick={goForward}
            class="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            aria-label="Go forward to the next page"
            title="Forward"
          >
            <span class="hidden lg:inline">Forward</span>
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="m9 5 7 7-7 7" />
            </svg>
          </button>
        </div>
        <p class="min-w-0 truncate text-lg font-semibold text-foreground">
          {currentTitle}
        </p>
      </div>
    </div>

    <!-- Right Section: Search + Notifications + Profile -->
    <div class="flex shrink-0 items-center gap-1 pr-2 sm:gap-3 sm:pr-4 md:pr-6">
      <!-- Search Input Trigger -->
      <div class="hidden md:flex items-center">
        <div class="relative">
          <div
            class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground"
          >
            <svg
              class="w-4 h-4"
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
            class="w-64 pl-10 pr-3 py-1.5 bg-secondary/80 border border-border rounded-lg text-sm text-muted-foreground text-left cursor-pointer hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary transition-all flex items-center justify-between"
          >
            <span>Search...</span>
            <kbd class="px-1.5 py-0.5 text-[10px] font-mono bg-card border border-border rounded text-muted-foreground">⌘K</kbd>
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

      <!-- Notifications Bell Button -->
      <div class="relative">
        <button
          type="button"
          data-notification-trigger
          onclick={toggleNotifications}
          class="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-secondary transition-colors {isNotificationsOpen ? 'bg-secondary text-foreground' : 'text-muted-foreground'}"
          aria-label="Open notifications"
          title="Notification Center"
        >
          <svg
            class="w-5 h-5 transition-transform hover:scale-110"
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
          {#if $unreadCount > 0}
            <span
              class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-md"
            >
              {$unreadCount}
            </span>
          {/if}
        </button>

        <!-- Notification Dropdown -->
        <NotificationDropdown
          isOpen={isNotificationsOpen}
          onclose={() => (isNotificationsOpen = false)}
        />
      </div>

      <!-- User Profile Avatar Button -->
      <div class="relative">
        <button
          type="button"
          data-profile-trigger
          onclick={toggleProfile}
          class="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-secondary transition-colors {isProfileOpen ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}"
          aria-label="User profile & settings"
          title="Your profile and settings"
        >
          <div
            class="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-sm text-primary-foreground font-semibold text-xs hover:scale-105 transition-transform"
          >
            {($session.user?.name || "?").split(" ").map(part => part[0]).slice(0, 2).join("")}
          </div>
        </button>

        <!-- Profile Dropdown -->
        <ProfileDropdown
          isOpen={isProfileOpen}
          onclose={() => (isProfileOpen = false)}
          onOpenShortcuts={() => (isShortcutsModalOpen = true)}
        />
      </div>
    </div>

    <!-- Church Hub Dropdown (Anchored relative to header) -->
    <ChurchHubDropdown
      isOpen={isChurchHubOpen}
      onclose={() => (isChurchHubOpen = false)}
    />
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
