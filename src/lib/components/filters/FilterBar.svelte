<script>
  import { filterStore, dateRange } from "$lib/stores/filterStore";
  import { formatDateISO } from "$lib/utils/dateUtils";
  import PeriodSelect from "./PeriodSelect.svelte";
  import DateRangePicker from "./DateRangePicker.svelte";

  // State for DateRangePicker modal
  let isDatePickerOpen = $state(false);

  // State for mobile collapse
  let isMobileOpen = $state(false);

  // Get current custom range from store for initial values
  const currentRange = $derived({
    start: $filterStore.customStart ? new Date($filterStore.customStart) : null,
    end: $filterStore.customEnd ? new Date($filterStore.customEnd) : null,
  });

  // Check if default filter is active (thisMonth)
  const isDefaultFilter = $derived($filterStore.type === "thisMonth");

  /**
   * Open the date range picker modal
   */
  function openDatePicker() {
    isDatePickerOpen = true;
  }

  /**
   * Handle date picker close
   */
  function handleDatePickerClose() {
    isDatePickerOpen = false;
  }

  /**
   * Handle date range apply
   * @param {{ start: Date, end: Date }} detail
   */
  function handleDateRangeApply(detail) {
    const { start, end } = detail;

    // Format dates as ISO strings and update the store
    const startISO = formatDateISO(start);
    const endISO = formatDateISO(end);

    filterStore.setCustomRange(startISO, endISO);
    isDatePickerOpen = false;
  }
</script>

<!-- 
  FilterBar Component
  Main container for the global filtering system.
  Simplified to just show the PeriodSelect dropdown and current selection label.
-->
<div class="w-full transition-all duration-200">
  <!-- Main Layout -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <!-- Filter Controls -->
    <div class="flex items-center gap-3 flex-1">
      <PeriodSelect onCustomRange={openDatePicker} />

      {#if !isDefaultFilter}
        <button
          type="button"
          onclick={() => filterStore.reset()}
          class="text-xs text-muted-foreground hover:text-foreground underline px-2 transition-colors"
        >
          Reset
        </button>
      {/if}
    </div>

    <!-- Date Range Label (Right aligned) -->
    <div
      class="hidden sm:flex items-center gap-2 pl-4 border-l border-border/30"
    >
      <span
        class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
        >Showing:</span
      >
      <span class="text-sm font-semibold text-foreground"
        >{$dateRange.label}</span
      >
    </div>

    <!-- Mobile Toggle (Only for label visibility if needed, but current design is simple enough to not allow collapse) -->
    <!-- Simplified design removes the collapsible complexity since it's just one dropdown now -->
  </div>

  <!-- Mobile Label (Visible below on mobile) -->
  <div
    class="mt-3 pt-3 border-t border-border/50 sm:hidden flex items-center justify-between text-sm"
  >
    <span class="text-muted-foreground">Period:</span>
    <span class="font-medium text-foreground">{$dateRange.label}</span>
  </div>
</div>

<!-- Date Range Picker Modal -->
<DateRangePicker
  isOpen={isDatePickerOpen}
  initialRange={currentRange}
  onclose={handleDatePickerClose}
  onapply={handleDateRangeApply}
/>
