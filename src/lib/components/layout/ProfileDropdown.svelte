<!--
  ProfileDropdown.svelte
  User Profile & Admin Settings Dropdown for Church Tracker.
  Triggered when clicking the top-right user avatar icon.
-->
<script>
  import { goto } from "$app/navigation";
  import { fade, scale } from "svelte/transition";
  import { mockPeople } from "$lib/data/mockData";

  let { isOpen = false, onclose, onOpenShortcuts } = $props();

  let dropdownRef = $state(null);
  let isExporting = $state(false);
  let statusMessage = $state("");

  // Dismiss dropdown when clicking anywhere in the empty space outside
  $effect(() => {
    if (isOpen) {
      function handleClickOutside(event) {
        if (dropdownRef && !dropdownRef.contains(event.target)) {
          // If the click was not on the trigger button, close the dropdown
          const isTrigger = event.target.closest("[data-profile-trigger]");
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

  function handleAction(path) {
    onclose?.();
    goto(path);
  }

  function handleExportData() {
    isExporting = true;
    try {
      const backupData = {
        church: "Grace Community Church",
        campus: "Central Campus (Luton)",
        exportedAt: new Date().toISOString(),
        version: "3.0.0",
        totalMembersCount: mockPeople.length,
        peopleSummary: mockPeople.map((p) => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`,
          role: p.role,
          status: p.member_status,
          phone: p.phone,
          email: p.email,
        })),
      };

      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute(
        "download",
        `church-tracker-backup-${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      statusMessage = "Backup downloaded successfully!";
      setTimeout(() => {
        statusMessage = "";
      }, 3000);
    } catch (err) {
      console.error("Export failed:", err);
      statusMessage = "Export failed. Please try again.";
    } finally {
      isExporting = false;
    }
  }

  function handleShortcutsClick() {
    onclose?.();
    onOpenShortcuts?.();
  }

  function handleSignOut() {
    statusMessage = "Signing out session...";
    setTimeout(() => {
      onclose?.();
      goto("/");
    }, 800);
  }

  function handleKeydown(e) {
    if (e.key === "Escape" && isOpen) {
      onclose?.();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- Profile Dropdown Card -->
  <div
    bind:this={dropdownRef}
    class="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden text-card-foreground transition-all"
    transition:scale={{ start: 0.95, duration: 150 }}
  >
    <!-- User Info Header -->
    <div class="p-4 bg-secondary/40 border-b border-border/60">
      <div class="flex items-center space-x-3">
        <div class="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-base shadow-md shadow-primary/20">
          PJ
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-foreground text-sm leading-tight truncate">
            Pastor John Doe
          </h3>
          <p class="text-xs text-muted-foreground truncate">
            pastor.john@churchtracker.app
          </p>
          <div class="mt-1 flex items-center gap-1.5">
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary border border-primary/20">
              Senior Pastor & Admin
            </span>
          </div>
        </div>
      </div>

      {#if statusMessage}
        <div class="mt-2.5 p-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-medium text-center" transition:fade>
          {statusMessage}
        </div>
      {/if}
    </div>

    <!-- Church Organization Info -->
    <div class="px-4 py-2.5 bg-secondary/15 border-b border-border/40 flex items-center justify-between text-xs">
      <div class="flex items-center space-x-1.5 text-muted-foreground">
        <svg class="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span class="font-medium text-foreground">Grace Community Church</span>
      </div>
      <span class="text-[10px] text-muted-foreground">Luton Campus</span>
    </div>

    <!-- Action Links -->
    <div class="p-2 space-y-0.5">
      <button
        onclick={() => handleAction('/people')}
        class="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-secondary text-left text-xs font-medium text-foreground transition-colors group"
      >
        <div class="w-6 h-6 rounded-md bg-secondary text-muted-foreground flex items-center justify-center group-hover:text-primary group-hover:bg-primary/10 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <span class="flex-1">People & Leadership Directory</span>
      </button>

      <button
        onclick={() => handleAction('/reports')}
        class="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-secondary text-left text-xs font-medium text-foreground transition-colors group"
      >
        <div class="w-6 h-6 rounded-md bg-secondary text-muted-foreground flex items-center justify-center group-hover:text-primary group-hover:bg-primary/10 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <span class="flex-1">Growth Reports & Analytics</span>
      </button>

      <button
        onclick={handleShortcutsClick}
        class="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-secondary text-left text-xs font-medium text-foreground transition-colors group"
      >
        <div class="w-6 h-6 rounded-md bg-secondary text-muted-foreground flex items-center justify-center group-hover:text-primary group-hover:bg-primary/10 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>
        <span class="flex-1">Keyboard Shortcuts</span>
        <kbd class="px-1.5 py-0.5 text-[10px] font-mono bg-secondary rounded text-muted-foreground">⌘K</kbd>
      </button>

      <button
        onclick={handleExportData}
        disabled={isExporting}
        class="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-secondary text-left text-xs font-medium text-foreground transition-colors group"
      >
        <div class="w-6 h-6 rounded-md bg-secondary text-muted-foreground flex items-center justify-center group-hover:text-primary group-hover:bg-primary/10 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <span class="flex-1">
          {isExporting ? 'Exporting...' : 'Export Church Backup (JSON)'}
        </span>
      </button>
    </div>

    <!-- Sign Out Footer -->
    <div class="p-2 bg-secondary/30 border-t border-border/60">
      <button
        onclick={handleSignOut}
        class="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span>Sign Out Session</span>
      </button>
    </div>
  </div>
{/if}
