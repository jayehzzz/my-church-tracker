<!--
  ChurchHubDropdown.svelte
  Interactive Church Overview, Campus Switcher, and Quick Action Launchpad.
  Triggered when clicking the top-left Church Tracker logo / brand.
-->
<script>
  import { goto } from "$app/navigation";
  import { fade, scale } from "svelte/transition";

  let { isOpen = false, onclose } = $props();

  let dropdownRef = $state(null);
  let selectedCampus = $state("Central Campus (Luton)");
  const campuses = [
    "Central Campus (Luton)",
    "North Campus (Bedford)",
    "Online Campus",
  ];

  // Dismiss dropdown when clicking anywhere in the empty space outside
  $effect(() => {
    if (isOpen) {
      function handleClickOutside(event) {
        if (dropdownRef && !dropdownRef.contains(event.target)) {
          const isTrigger = event.target.closest("[data-churchhub-trigger]");
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

  function handleSelectCampus(campus) {
    selectedCampus = campus;
  }

  function handleKeydown(e) {
    if (e.key === "Escape" && isOpen) {
      onclose?.();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- Dropdown Card -->
  <div
    bind:this={dropdownRef}
    class="absolute left-4 top-14 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden text-card-foreground transition-all"
    transition:scale={{ start: 0.95, duration: 150 }}
  >
    <!-- Header: Church Branding & Status -->
    <div class="p-4 bg-secondary/40 border-b border-border/60">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center space-x-2.5">
          <div
            class="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/20 text-primary-foreground font-bold text-sm"
          >
            CT
          </div>
          <div>
            <h2 class="font-bold text-foreground text-sm leading-tight">
              Grace Community Church
            </h2>
            <div class="flex items-center space-x-1.5 mt-0.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span class="text-xs text-muted-foreground font-medium">
                Live Ministry Hub
              </span>
            </div>
          </div>
        </div>

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

      <!-- Campus Switcher -->
      <div class="mt-3">
        <label for="campus-select" class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Active Campus
        </label>
        <div class="relative mt-1">
          <select
            id="campus-select"
            value={selectedCampus}
            onchange={(e) => handleSelectCampus(e.target.value)}
            class="w-full bg-secondary/80 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer appearance-none pr-8"
          >
            {#each campuses as campus}
              <option value={campus}>{campus}</option>
            {/each}
          </select>
          <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-muted-foreground">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Ministry Health Snapshot -->
    <div class="px-4 py-3 bg-secondary/15 border-b border-border/40 grid grid-cols-3 gap-2 text-center">
      <div class="p-2 rounded-lg bg-card/60 border border-border/40">
        <span class="block text-base font-bold text-foreground">30</span>
        <span class="text-[10px] text-muted-foreground font-medium">Members</span>
      </div>
      <div class="p-2 rounded-lg bg-card/60 border border-border/40">
        <span class="block text-base font-bold text-primary">185</span>
        <span class="text-[10px] text-muted-foreground font-medium">Avg Sunday</span>
      </div>
      <div class="p-2 rounded-lg bg-card/60 border border-border/40">
        <span class="block text-base font-bold text-amber-500">8</span>
        <span class="text-[10px] text-muted-foreground font-medium">Follow-ups</span>
      </div>
    </div>

    <!-- Quick Action Launchpad -->
    <div class="p-3">
      <p class="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Quick Actions & Shortcuts
      </p>
      <div class="space-y-1">
        <button
          onclick={() => handleAction('/evangelism')}
          class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-secondary text-left transition-colors group"
        >
          <div class="w-7 h-7 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <div class="flex-1">
            <span class="block text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
              Log Evangelism Outreach
            </span>
            <span class="block text-[11px] text-muted-foreground">Record new contacts & souls</span>
          </div>
          <svg class="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onclick={() => handleAction('/services')}
          class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-secondary text-left transition-colors group"
        >
          <div class="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="flex-1">
            <span class="block text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
              Record Sunday Service
            </span>
            <span class="block text-[11px] text-muted-foreground">Log attendance & sermon notes</span>
          </div>
          <svg class="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onclick={() => handleAction('/meetings')}
          class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-secondary text-left transition-colors group"
        >
          <div class="w-7 h-7 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="flex-1">
            <span class="block text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
              Log Prayer & Bacenta Meeting
            </span>
            <span class="block text-[11px] text-muted-foreground">Track small groups & prayer duration</span>
          </div>
          <svg class="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onclick={() => handleAction('/visitation')}
          class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-secondary text-left transition-colors group"
        >
          <div class="w-7 h-7 rounded-md bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div class="flex-1">
            <span class="block text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
              Open Pastoral Care
            </span>
            <span class="block text-[11px] text-muted-foreground">Assign care, complete tasks & record outcomes</span>
          </div>
          <svg class="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onclick={() => handleAction('/people')}
          class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-secondary text-left transition-colors group"
        >
          <div class="w-7 h-7 rounded-md bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div class="flex-1">
            <span class="block text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
              People Directory & Member Profiles
            </span>
            <span class="block text-[11px] text-muted-foreground">Manage spiritual journeys & roles</span>
          </div>
          <svg class="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div class="p-3 bg-secondary/30 border-t border-border/60 flex items-center justify-between text-xs">
      <button
        onclick={() => handleAction('/')}
        class="text-primary hover:underline font-medium inline-flex items-center space-x-1"
      >
        <span>Go to Dashboard</span>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>
      <span class="text-muted-foreground text-[11px]">Church Tracker v3.0</span>
    </div>
  </div>
{/if}
