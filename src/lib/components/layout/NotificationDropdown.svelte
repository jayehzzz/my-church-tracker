<!--
  NotificationDropdown.svelte
  Live Notification Center dropdown for church alerts, urgent follow-ups, and milestone events.
-->
<script>
  import { goto } from "$app/navigation";
  import { fade, scale } from "svelte/transition";
  import {
    notifications,
    unreadCount,
    notificationStore,
  } from "$lib/stores/notificationStore";

  let { isOpen = false, onclose } = $props();

  let dropdownRef = $state(null);
  let activeTab = $state("all"); // 'all' | 'followup' | 'milestone'

  // Dismiss dropdown when clicking anywhere in the empty space outside
  $effect(() => {
    if (isOpen) {
      function handleClickOutside(event) {
        if (dropdownRef && !dropdownRef.contains(event.target)) {
          const isTrigger = event.target.closest("[data-notification-trigger]");
          if (!isTrigger) {
            onclose?.();
          }
        }
      }

      const timer = setTimeout(() => {
        window.addEventListener("pointerdown", handleClickOutside);
      }, 0);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("pointerdown", handleClickOutside);
      };
    }
  });

  // Filter notifications based on active tab
  const filteredNotifications = $derived(
    $notifications.filter((n) => {
      if (activeTab === "all") return true;
      if (activeTab === "followup") return n.category === "followup";
      if (activeTab === "milestone") return n.category === "milestone";
      return true;
    })
  );

  function handleNotificationClick(item) {
    notificationStore.markAsRead(item.id);
    onclose?.();
    if (item.href) {
      goto(item.href);
    }
  }

  function handleMarkAllRead() {
    notificationStore.markAllAsRead();
  }

  function handleDismiss(e, id) {
    e.stopPropagation();
    notificationStore.removeNotification(id);
  }

  function formatTimeAgo(isoString) {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  function handleKeydown(e) {
    if (e.key === "Escape" && isOpen) {
      onclose?.();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- Notification Menu Panel -->
  <div
    bind:this={dropdownRef}
    class="absolute right-0 top-12 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden text-card-foreground transition-all"
    transition:scale={{ start: 0.95, duration: 150 }}
  >
    <!-- Header -->
    <div class="p-4 bg-secondary/40 border-b border-border/60">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v5l4 4h10l4-4z" />
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-foreground text-sm leading-tight flex items-center gap-2">
              Notifications
              {#if $unreadCount > 0}
                <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground">
                  {$unreadCount} new
                </span>
              {/if}
            </h3>
            <p class="text-[11px] text-muted-foreground">Church alerts & follow-up queue</p>
          </div>
        </div>

        <div class="flex items-center space-x-1">
          {#if $unreadCount > 0}
            <button
              onclick={handleMarkAllRead}
              class="text-xs text-primary hover:underline font-medium px-2 py-1 rounded hover:bg-secondary transition-colors"
            >
              Mark all read
            </button>
          {/if}
          <button
            onclick={() => onclose?.()}
            class="w-7 h-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="flex items-center space-x-1 mt-3 p-0.5 bg-secondary/80 rounded-lg border border-border/50 text-xs">
        <button
          onclick={() => (activeTab = "all")}
          class="flex-1 py-1 px-2 rounded-md font-medium transition-all {activeTab === 'all'
            ? 'bg-card text-foreground shadow-sm font-semibold'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          All ({$notifications.length})
        </button>
        <button
          onclick={() => (activeTab = "followup")}
          class="flex-1 py-1 px-2 rounded-md font-medium transition-all {activeTab === 'followup'
            ? 'bg-card text-foreground shadow-sm font-semibold'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          Follow-ups
        </button>
        <button
          onclick={() => (activeTab = "milestone")}
          class="flex-1 py-1 px-2 rounded-md font-medium transition-all {activeTab === 'milestone'
            ? 'bg-card text-foreground shadow-sm font-semibold'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          Milestones
        </button>
      </div>
    </div>

    <!-- Notification List -->
    <div class="max-h-80 overflow-y-auto divide-y divide-border/40">
      {#if filteredNotifications.length === 0}
        <div class="p-8 text-center">
          <div class="w-12 h-12 rounded-full bg-secondary/50 text-muted-foreground flex items-center justify-center mx-auto mb-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p class="text-sm font-medium text-foreground">All caught up!</p>
          <p class="text-xs text-muted-foreground mt-0.5">No notifications in this category.</p>
        </div>
      {:else}
        {#each filteredNotifications as item (item.id)}
          <div
            onclick={() => handleNotificationClick(item)}
            onkeydown={(e) => e.key === "Enter" && handleNotificationClick(item)}
            role="button"
            tabindex="0"
            class="p-3.5 flex items-start space-x-3 hover:bg-secondary/50 transition-colors cursor-pointer text-left group relative {item.read ? 'opacity-75' : 'bg-primary/5'}"
          >
            <!-- Unread indicator bar -->
            {#if !item.read}
              <div class="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r"></div>
            {/if}

            <!-- Icon -->
            <div
              class="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center {item.priority === 'urgent'
                ? 'bg-destructive/15 text-destructive'
                : item.priority === 'success'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-primary/15 text-primary'}"
            >
              {#if item.icon === 'phone'}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              {:else if item.icon === 'heart'}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              {:else if item.icon === 'home'}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              {:else if item.icon === 'church'}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              {:else}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              {/if}
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0 pr-6">
              <div class="flex items-center justify-between gap-1 mb-0.5">
                <h4 class="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {item.title}
                </h4>
                <span class="text-[10px] text-muted-foreground flex-shrink-0 font-medium">
                  {formatTimeAgo(item.timestamp)}
                </span>
              </div>
              <p class="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            </div>

            <!-- Dismiss Button -->
            <button
              onclick={(e) => handleDismiss(e, item.id)}
              class="absolute right-2 top-3 w-5 h-5 rounded hover:bg-secondary text-muted-foreground/60 hover:text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Dismiss notification"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Footer -->
    <div class="p-3 bg-secondary/30 border-t border-border/60 flex items-center justify-between text-xs">
      <button
        onclick={() => notificationStore.resetNotifications()}
        class="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Restore sample alerts
      </button>
      <span class="text-muted-foreground text-[11px]">Real-time Sync</span>
    </div>
  </div>
{/if}
