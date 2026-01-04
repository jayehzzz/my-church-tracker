<!--
  Sidebar Navigation Component
  ===========================

  A collapsible sidebar navigation for the church tracker dashboard.
  Features premium dark design with cyan accent highlighting.

  Features:
  - Collapsible with smooth transitions
  - Mobile drawer overlay
  - Active route highlighting
  - Icon-only mode when collapsed
  - Tooltips for collapsed state
  - localStorage persistence
-->

<script>
  import {
    navigationStore,
    sidebarVisible,
    mobileSidebarVisible,
  } from "$lib/stores/navigationStore";
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  // Navigation items configuration
  const navigationItems = [
    { icon: "home", label: "Dashboard", href: "/", active: false },
    {
      icon: "users",
      label: "Evangelism Contacts",
      href: "/evangelism",
      active: false,
    },
    {
      icon: "calendar",
      label: "Sunday Services",
      href: "/services",
      active: false,
    },
    {
      icon: "clock",
      label: "Meetings & Prayer",
      href: "/meetings",
      active: false,
    },
    {
      icon: "user-group",
      label: "People Directory",
      href: "/people",
      active: false,
    },
    {
      icon: "map-pin",
      label: "Visitation",
      href: "/visitation",
      active: false,
    },
    { icon: "chart", label: "Reports", href: "/reports", active: false },
  ];

  // Svelte 5: Reactive navigation items with active state using $derived
  const navItems = $derived(
    navigationItems.map((item) => ({
      ...item,
      active: $page.url.pathname === item.href,
    })),
  );

  // Handle sidebar toggle
  function toggleSidebar() {
    navigationStore.toggleSidebar();
    navigationStore.saveToStorage();
  }

  // Handle mobile sidebar close
  function closeMobileSidebar() {
    navigationStore.closeMobileSidebar();
  }

  // Handle navigation click
  function handleNavClick(href) {
    // Close mobile sidebar when navigating
    navigationStore.closeMobileSidebar();
  }

  // Initialize navigation store
  onMount(() => {
    navigationStore.initialize();
  });

  // Icon components (inline SVGs)
  const icons = {
    home: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
    </svg>`,
    users: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
    </svg>`,
    calendar: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
    </svg>`,
    clock: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>`,
    "user-group": `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
    </svg>`,
    "map-pin": `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>`,
    chart: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
    </svg>`,
  };
</script>

<!-- Mobile overlay -->
{#if $mobileSidebarVisible}
  <div
    class="fixed inset-0 bg-black/50 z-40 md:hidden"
    onclick={closeMobileSidebar}
    role="button"
    tabindex="0"
    aria-label="Close mobile sidebar"
    onkeydown={(e) => e.key === "Enter" && closeMobileSidebar()}
  ></div>
{/if}

<!-- Sidebar -->
<aside
  class={`
    fixed left-0 top-0 h-full z-50
    bg-sidebar border-r border-border
    transition-all duration-300 ease-in-out
    {$sidebarVisible ? 'w-64' : 'w-16'}
    {$mobileSidebarVisible ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
  `}
  style="background-color: hsl(var(--card));"
>
  <!-- Logo/Brand Area -->
  <div class="flex items-center justify-between p-4 border-b border-border">
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
        class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"
      >
        <span class="text-primary-foreground font-bold text-sm">CT</span>
      </div>
    {/if}

    <!-- Collapse Toggle Button -->
    <button
      onclick={toggleSidebar}
      class="hidden md:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-secondary transition-colors"
      aria-label={$sidebarVisible ? "Collapse sidebar" : "Expand sidebar"}
    >
      <svg
        class="w-4 h-4 text-muted-foreground transition-transform {$sidebarVisible
          ? ''
          : 'rotate-180'}"
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
  </div>

  <!-- Navigation Items -->
  <nav class="flex-1 px-3 py-4 space-y-1">
    {#each navItems as item}
      <a
        href={item.href}
        onclick={() => handleNavClick(item.href)}
        class="flex items-center px-3 py-2 rounded-lg transition-all duration-200 {item.active
          ? 'bg-primary text-primary-foreground shadow-lg'
          : 'text-foreground/80 hover:bg-secondary hover:text-foreground'}"
        aria-label={item.label}
      >
        <!-- Icon -->
        <div class="flex-shrink-0 w-5 h-5">
          {@html icons[item.icon]}
        </div>

        <!-- Label (hidden when collapsed) -->
        {#if $sidebarVisible}
          <span class="ml-3 font-medium">{item.label}</span>
        {:else}
          <!-- Tooltip for collapsed state -->
          <div
            class="fixed left-16 ml-2 px-2 py-1 bg-card text-foreground text-sm rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
          >
            {item.label}
          </div>
        {/if}
      </a>
    {/each}
  </nav>

  <!-- Footer/Version Info (optional) -->
  {#if $sidebarVisible}
    <div class="px-3 py-2 border-t border-border">
      <p class="text-xs text-muted-foreground text-center">v3.0.0</p>
    </div>
  {/if}
</aside>

<style>
  /* Custom sidebar background color */
  :global(.bg-sidebar) {
    background-color: hsl(var(--card));
  }

  /* Tooltip styles for collapsed sidebar */
  .group:hover .group-hover\:opacity-100 {
    opacity: 1;
  }
</style>
