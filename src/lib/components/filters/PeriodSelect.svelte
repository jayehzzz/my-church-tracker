<script>
  import { filterStore, dateRange } from "$lib/stores/filterStore";
  import {
    getAvailableYears,
    getMonthNames,
    QUARTERS,
  } from "$lib/utils/dateUtils";
  import { fade, slide } from "svelte/transition";

  // State for dropdown visibility
  let isOpen = $state(false);

  // State for active tab: 'common' | 'history'
  let activeTab = $state("common");

  // Get available options
  const years = getAvailableYears();
  const quarters = Object.keys(QUARTERS);
  const months = getMonthNames(); // ['January', 'February', ...]

  // Close dropdown when clicking outside
  function clickOutside(node) {
    const handleClick = (event) => {
      if (!node.contains(event.target)) {
        isOpen = false;
      }
    };
    document.addEventListener("click", handleClick, true);
    return {
      destroy() {
        document.removeEventListener("click", handleClick, true);
      },
    };
  }

  // Handle selection
  function selectOption(type, param1, param2) {
    if (type === "thisMonth") filterStore.setThisMonth();
    else if (type === "thisYear") filterStore.setThisYear();
    else if (type === "thisQuarter") filterStore.setThisQuarter();
    else if (type === "lastMonth") filterStore.setLastMonth();
    else if (type === "last3Months") filterStore.setLast3Months();
    else if (type === "last6Months") filterStore.setLast6Months();
    else if (type === "last12Months") filterStore.setLast12Months();
    else if (type === "year") filterStore.setYear(param1);
    else if (type === "quarter") filterStore.setQuarter(param1, param2);
    else if (type === "month") filterStore.setMonth(param1, param2);
    else if (type === "custom") {
      dispatchCustomRange();
    }

    if (type !== "custom") {
      isOpen = false;
    }
  }

  // We need to dispatch a custom event for "Custom Range" selection
  let { onCustomRange } = $props();
  function dispatchCustomRange() {
    isOpen = false;
    if (onCustomRange) onCustomRange();
  }

  // Compute active label for display
  const activeLabel = $derived($dateRange.label);

  // Reset tab when closing
  $effect(() => {
    if (!isOpen) {
      // Optional: reset to common tab on close?
      // activeTab = 'common';
      // Keeping it might be better UX if they re-open immediately.
    }
  });
</script>

<div class="relative" use:clickOutside>
  <!-- Trigger Button -->
  <button
    onclick={() => (isOpen = !isOpen)}
    class="flex items-center justify-between w-full sm:w-[260px] px-4 py-2.5 bg-secondary/50 hover:bg-secondary border border-border rounded-lg transition-all duration-200 group"
    aria-expanded={isOpen}
    aria-haspopup="true"
  >
    <div class="flex items-center gap-2 overflow-hidden">
      <svg
        class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <span class="text-sm font-medium text-foreground truncate">
        {activeLabel}
      </span>
    </div>

    <svg
      class="w-4 h-4 text-muted-foreground transition-transform duration-200 {isOpen
        ? 'rotate-180'
        : ''}"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M19 9l-7 7-7-7"
      />
    </svg>
  </button>

  <!-- Dropdown Menu -->
  {#if isOpen}
    <div
      transition:slide={{ duration: 150, axis: "y" }}
      class="absolute right-0 sm:left-0 z-50 w-full sm:w-[320px] mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/5"
    >
      <!-- Tabs Header -->
      <div class="flex items-center border-b border-border/50 bg-secondary/30">
        <button
          class="flex-1 py-2.5 text-xs font-medium text-center transition-colors hover:text-primary {activeTab ===
          'common'
            ? 'text-primary border-b-2 border-primary -mb-px bg-primary/5'
            : 'text-muted-foreground'}"
          onclick={() => (activeTab = "common")}
        >
          Common
        </button>
        <button
          class="flex-1 py-2.5 text-xs font-medium text-center transition-colors hover:text-primary {activeTab ===
          'history'
            ? 'text-primary border-b-2 border-primary -mb-px bg-primary/5'
            : 'text-muted-foreground'}"
          onclick={() => (activeTab = "history")}
        >
          History & More
        </button>
      </div>

      <div class="py-1 custom-scrollbar max-h-[450px] overflow-y-auto">
        {#if activeTab === "common"}
          <!-- TAB: COMMON (No scrolling needed preferably) -->
          <div in:fade={{ duration: 150 }}>
            <!-- Quick Options Grid -->
            <div class="p-2 grid grid-cols-2 gap-2">
              <button
                onclick={() => selectOption("thisMonth")}
                class="flex flex-col items-center justify-center p-2 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group {$filterStore.type ===
                'thisMonth'
                  ? 'bg-primary/10 border-primary/50'
                  : 'bg-secondary/20'}"
              >
                <span
                  class="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5"
                  >Current</span
                >
                <span
                  class="text-sm font-medium {$filterStore.type === 'thisMonth'
                    ? 'text-primary'
                    : 'text-foreground group-hover:text-primary'}"
                  >This Month</span
                >
              </button>
              <button
                onclick={() => selectOption("lastMonth")}
                class="flex flex-col items-center justify-center p-2 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group {$filterStore.type ===
                'lastMonth'
                  ? 'bg-primary/10 border-primary/50'
                  : 'bg-secondary/20'}"
              >
                <span
                  class="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5"
                  >Previous</span
                >
                <span
                  class="text-sm font-medium {$filterStore.type === 'lastMonth'
                    ? 'text-primary'
                    : 'text-foreground group-hover:text-primary'}"
                  >Last Month</span
                >
              </button>
              <button
                onclick={() => selectOption("thisQuarter")}
                class="flex flex-col items-center justify-center p-2 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group {$filterStore.type ===
                'thisQuarter'
                  ? 'bg-primary/10 border-primary/50'
                  : 'bg-secondary/20'}"
              >
                <span
                  class="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5"
                  >Period</span
                >
                <span
                  class="text-sm font-medium {$filterStore.type ===
                  'thisQuarter'
                    ? 'text-primary'
                    : 'text-foreground group-hover:text-primary'}"
                  >This Quarter</span
                >
              </button>
              <button
                onclick={() => selectOption("thisYear")}
                class="flex flex-col items-center justify-center p-2 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group {$filterStore.type ===
                'thisYear'
                  ? 'bg-primary/10 border-primary/50'
                  : 'bg-secondary/20'}"
              >
                <span
                  class="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5"
                  >Annual</span
                >
                <span
                  class="text-sm font-medium {$filterStore.type === 'thisYear'
                    ? 'text-primary'
                    : 'text-foreground group-hover:text-primary'}"
                  >This Year</span
                >
              </button>
            </div>

            <div class="h-px bg-border/50 mx-2 mb-2"></div>

            <!-- Month Grid -->
            <div class="px-2 pb-2">
              <div
                class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2"
              >
                Select Month ({new Date().getFullYear()})
              </div>
              <div class="grid grid-cols-4 gap-1.5">
                {#each months as month, i}
                  {@const year = new Date().getFullYear()}
                  {@const isSelected =
                    $filterStore.type === "specificMonth" &&
                    $filterStore.month === i &&
                    $filterStore.year === year}
                  <button
                    onclick={() => selectOption("month", year, i)}
                    class="py-1.5 text-xs font-medium text-center rounded-md transition-all border border-transparent {isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-primary/10 hover:text-primary text-muted-foreground hover:scale-105 bg-secondary/30'}"
                  >
                    {month.substring(0, 3)}
                  </button>
                {/each}
              </div>
            </div>

            <div class="h-px bg-border/50 mx-2 mb-2"></div>

            <!-- Custom Range Button -->
            <div class="px-2 pb-2">
              <button
                onclick={() => selectOption("custom")}
                class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-primary hover:text-primary-foreground hover:bg-primary rounded-lg transition-all border border-dashed border-primary/30 hover:border-primary"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  /></svg
                >
                Custom Date Range...
              </button>
            </div>
          </div>
        {:else}
          <!-- TAB: HISTORY and MORE -->
          <div in:fade={{ duration: 150 }} class="p-2">
            <!-- Past Years (Moved to Top & Grid) -->
            <div class="mb-3">
              <div
                class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5 flex items-center gap-2"
              >
                <svg
                  class="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  /></svg
                >
                Archived Years
              </div>
              <div class="grid grid-cols-3 gap-2">
                {#each years as year}
                  {@const isSelected =
                    $filterStore.type === "specificYear" &&
                    $filterStore.year === year}
                  <button
                    onclick={() => selectOption("year", year)}
                    class="py-2 text-xs font-medium text-center rounded-md transition-all border border-transparent {isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'}"
                  >
                    {year}
                  </button>
                {/each}
              </div>
            </div>

            <div class="h-px bg-border/50 mx-1 mb-3"></div>

            <!-- Quarters (Grid) -->
            <div class="mb-3">
              <div
                class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5"
              >
                Fiscal Quarters
              </div>
              <div class="grid grid-cols-2 gap-2">
                {#each quarters as quarter}
                  {@const year = new Date().getFullYear()}
                  {@const isSelected =
                    $filterStore.type === "specificQuarter" &&
                    $filterStore.quarter === quarter &&
                    $filterStore.year === year}
                  <button
                    onclick={() => selectOption("quarter", year, quarter)}
                    class="px-3 py-2 text-xs font-medium text-center rounded-md transition-all border border-transparent {isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'}"
                  >
                    {QUARTERS[quarter].label}
                  </button>
                {/each}
              </div>
            </div>

            <div class="h-px bg-border/50 mx-1 mb-3"></div>

            <!-- Relative History (Compact List) -->
            <div>
              <div
                class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5"
              >
                Extended History
              </div>
              <div class="space-y-1">
                <button
                  onclick={() => selectOption("last3Months")}
                  class="w-full text-left px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-between {$filterStore.type ===
                  'last3Months'
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}"
                >
                  <span>Last 3 Months</span>
                  {#if $filterStore.type === "last3Months"}
                    <div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
                  {/if}
                </button>
                <button
                  onclick={() => selectOption("last6Months")}
                  class="w-full text-left px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-between {$filterStore.type ===
                  'last6Months'
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}"
                >
                  <span>Last 6 Months</span>
                  {#if $filterStore.type === "last6Months"}
                    <div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
                  {/if}
                </button>
                <button
                  onclick={() => selectOption("last12Months")}
                  class="w-full text-left px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-between {$filterStore.type ===
                  'last12Months'
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}"
                >
                  <span>Last 12 Months</span>
                  {#if $filterStore.type === "last12Months"}
                    <div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
                  {/if}
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
