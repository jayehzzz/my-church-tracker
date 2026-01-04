<script>
  import { MONTH_NAMES, MONTH_NAMES_SHORT } from "$lib/utils/dateUtils";

  /**
   * DateRangePicker Component
   * A modal component for custom date range selection with dual calendar views.
   *
   * @prop {boolean} isOpen - Controls modal visibility
   * @prop {{ start: Date | null, end: Date | null }} initialRange - Initial date range
   * @prop {() => void} onclose - Callback when modal is cancelled
   * @prop {(detail: { start: Date, end: Date }) => void} onapply - Callback with { start: Date, end: Date } when range is applied
   */

  /** @type {{ isOpen?: boolean, initialRange?: { start: Date | null, end: Date | null }, onclose?: () => void, onapply?: (detail: { start: Date, end: Date }) => void }} */
  let {
    isOpen = false,
    initialRange = { start: null, end: null },
    onclose,
    onapply,
  } = $props();

  // Calendar state
  let startCalendarMonth = $state(new Date().getMonth());
  let startCalendarYear = $state(new Date().getFullYear());
  let endCalendarMonth = $state(new Date().getMonth());
  let endCalendarYear = $state(new Date().getFullYear());

  // Selected dates
  let selectedStart = $state(null);
  let selectedEnd = $state(null);

  // Track if modal has been initialized (to prevent re-initialization on re-renders)
  let wasOpen = $state(false);

  // Today's date for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Days of week headers
  const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Preset ranges
  const presets = [
    {
      label: "Last 7 days",
      getDates: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        return { start, end };
      },
    },
    {
      label: "Last 30 days",
      getDates: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        return { start, end };
      },
    },
    {
      label: "Last 90 days",
      getDates: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 90);
        return { start, end };
      },
    },
    {
      label: "This Year",
      getDates: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        return { start, end };
      },
    },
  ];

  // Reference to modal for focus trap
  let modalRef = $state(null);
  let firstFocusableElement = $state(null);
  let lastFocusableElement = $state(null);

  /**
   * Initialize component when opened (only on first open, not on re-renders)
   */
  $effect(() => {
    if (isOpen && !wasOpen) {
      wasOpen = true;
      // Initialize selected dates from props
      selectedStart = initialRange.start ? new Date(initialRange.start) : null;
      selectedEnd = initialRange.end ? new Date(initialRange.end) : null;

      // Set calendar views based on selected dates or current date
      if (selectedStart) {
        startCalendarMonth = selectedStart.getMonth();
        startCalendarYear = selectedStart.getFullYear();
      } else {
        startCalendarMonth = today.getMonth();
        startCalendarYear = today.getFullYear();
      }

      if (selectedEnd) {
        endCalendarMonth = selectedEnd.getMonth();
        endCalendarYear = selectedEnd.getFullYear();
      } else {
        // Default end calendar to next month
        const nextMonth = new Date(
          startCalendarYear,
          startCalendarMonth + 1,
          1,
        );
        endCalendarMonth = nextMonth.getMonth();
        endCalendarYear = nextMonth.getFullYear();
      }
    } else if (!isOpen && wasOpen) {
      // Reset the flag when modal closes so it can be re-initialized next time
      wasOpen = false;
    }
  });

  /**
   * Get days in a month
   * @param {number} year
   * @param {number} month
   * @returns {number}
   */
  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  /**
   * Get the day of week for the first day of a month (0 = Sunday)
   * @param {number} year
   * @param {number} month
   * @returns {number}
   */
  function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
  }

  /**
   * Generate calendar grid for a month
   * @param {number} year
   * @param {number} month
   * @returns {Array<{ day: number | null, date: Date | null }>}
   */
  function generateCalendarDays(year, month) {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, date: null });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, date: new Date(year, month, day) });
    }

    return days;
  }

  /**
   * Check if a date is today
   * @param {Date} date
   * @returns {boolean}
   */
  function isToday(date) {
    if (!date) return false;
    return date.toDateString() === today.toDateString();
  }

  /**
   * Check if a date is in the future
   * @param {Date} date
   * @returns {boolean}
   */
  function isFuture(date) {
    if (!date) return false;
    return date > today;
  }

  /**
   * Check if a date is selected as start
   * @param {Date} date
   * @returns {boolean}
   */
  function isSelectedStart(date) {
    if (!date || !selectedStart) return false;
    return date.toDateString() === selectedStart.toDateString();
  }

  /**
   * Check if a date is selected as end
   * @param {Date} date
   * @returns {boolean}
   */
  function isSelectedEnd(date) {
    if (!date || !selectedEnd) return false;
    return date.toDateString() === selectedEnd.toDateString();
  }

  /**
   * Check if a date is within the selected range
   * @param {Date} date
   * @returns {boolean}
   */
  function isInRange(date) {
    if (!date || !selectedStart || !selectedEnd) return false;
    return date > selectedStart && date < selectedEnd;
  }

  /**
   * Handle date selection
   * @param {Date} date
   * @param {'start' | 'end'} calendar
   */
  function selectDate(date, calendar) {
    if (!date || isFuture(date)) return;

    if (calendar === "start") {
      selectedStart = date;
      // If end date is before start date, clear it
      if (selectedEnd && selectedEnd < date) {
        selectedEnd = null;
      }
    } else {
      // Prevent selecting end date before start date
      if (selectedStart && date < selectedStart) {
        // Swap: make this the new start date
        selectedEnd = selectedStart;
        selectedStart = date;
      } else {
        selectedEnd = date;
      }
    }
  }

  /**
   * Navigate calendar month
   * @param {'start' | 'end'} calendar
   * @param {number} direction - -1 for previous, 1 for next
   */
  function navigateMonth(calendar, direction) {
    if (calendar === "start") {
      startCalendarMonth += direction;
      if (startCalendarMonth > 11) {
        startCalendarMonth = 0;
        startCalendarYear++;
      } else if (startCalendarMonth < 0) {
        startCalendarMonth = 11;
        startCalendarYear--;
      }
    } else {
      endCalendarMonth += direction;
      if (endCalendarMonth > 11) {
        endCalendarMonth = 0;
        endCalendarYear++;
      } else if (endCalendarMonth < 0) {
        endCalendarMonth = 11;
        endCalendarYear--;
      }
    }
  }

  /**
   * Apply a preset range
   * @param {{ start: Date, end: Date }} range
   */
  function applyPreset(preset) {
    const { start, end } = preset.getDates();
    selectedStart = start;
    selectedEnd = end;

    // Update calendar views
    startCalendarMonth = start.getMonth();
    startCalendarYear = start.getFullYear();
    endCalendarMonth = end.getMonth();
    endCalendarYear = end.getFullYear();
  }

  /**
   * Format a date for display
   * @param {Date | null} date
   * @returns {string}
   */
  function formatDate(date) {
    if (!date) return "...";
    return `${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  /**
   * Handle apply button click
   */
  function handleApply() {
    if (selectedStart && selectedEnd) {
      onapply?.({ start: selectedStart, end: selectedEnd });
    }
  }

  /**
   * Handle cancel/close
   */
  function handleClose() {
    onclose?.();
  }

  /**
   * Handle backdrop click
   * @param {MouseEvent} event
   */
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  /**
   * Handle keyboard events
   * @param {KeyboardEvent} event
   */
  function handleKeydown(event) {
    if (!isOpen) return;

    if (event.key === "Escape") {
      handleClose();
    } else if (event.key === "Enter" && selectedStart && selectedEnd) {
      handleApply();
    } else if (event.key === "Tab") {
      // Focus trap
      const focusableElements = modalRef?.querySelectorAll(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements && focusableElements.length > 0) {
        firstFocusableElement = focusableElements[0];
        lastFocusableElement = focusableElements[focusableElements.length - 1];

        if (
          event.shiftKey &&
          document.activeElement === firstFocusableElement
        ) {
          event.preventDefault();
          lastFocusableElement.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === lastFocusableElement
        ) {
          event.preventDefault();
          firstFocusableElement.focus();
        }
      }
    }
  }

  // Reactive calendar days and state
  const startCalendarDays = $derived(
    generateCalendarDays(startCalendarYear, startCalendarMonth),
  );
  const endCalendarDays = $derived(
    generateCalendarDays(endCalendarYear, endCalendarMonth),
  );
  const canApply = $derived(selectedStart && selectedEnd);

  // Reactive selected range display
  const selectedRangeDisplay = $derived(
    !selectedStart && !selectedEnd
      ? "Select a date range"
      : `${formatDate(selectedStart)} - ${formatDate(selectedEnd)}`,
  );
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- Modal Backdrop -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="date-picker-title"
    tabindex="-1"
  >
    <!-- Modal Content -->
    <div
      bind:this={modalRef}
      class="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-5 border-b border-border">
        <h2
          id="date-picker-title"
          class="text-lg font-semibold text-foreground"
        >
          Select Date Range
        </h2>
        <button
          type="button"
          onclick={handleClose}
          class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
          aria-label="Close date picker"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-5">
        <!-- Preset Buttons -->
        <div class="flex flex-wrap gap-2 mb-6">
          {#each presets as preset}
            <button
              type="button"
              onclick={() => applyPreset(preset)}
              class="px-4 py-2 text-sm font-medium rounded-full bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              {preset.label}
            </button>
          {/each}
        </div>

        <!-- Selected Range Display -->
        <div class="mb-6 p-4 bg-secondary/50 rounded-lg border border-border">
          <span class="text-sm text-muted-foreground">Selected Range:</span>
          <span class="ml-2 text-sm font-medium text-foreground"
            >{selectedRangeDisplay}</span
          >
        </div>

        <!-- Calendars Container -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Start Date Calendar -->
          <div class="calendar-container">
            <div class="flex items-center justify-between mb-4">
              <button
                type="button"
                onclick={() => navigateMonth("start", -1)}
                class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                aria-label="Previous month"
              >
                <svg
                  class="w-5 h-5"
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
              <span class="text-sm font-medium text-foreground">
                {MONTH_NAMES[startCalendarMonth]}
                {startCalendarYear}
              </span>
              <button
                type="button"
                onclick={() => navigateMonth("start", 1)}
                class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                aria-label="Next month"
              >
                <svg
                  class="w-5 h-5"
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
            </div>

            <!-- Day Headers -->
            <div class="grid grid-cols-7 gap-1 mb-2">
              {#each DAYS_OF_WEEK as day}
                <div
                  class="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              {/each}
            </div>

            <!-- Calendar Grid -->
            <div class="grid grid-cols-7 gap-1">
              {#each startCalendarDays as { day, date }}
                {#if day === null}
                  <div class="aspect-square"></div>
                {:else}
                  <button
                    type="button"
                    onclick={() => selectDate(date, "start")}
                    disabled={isFuture(date)}
                    class="aspect-square flex items-center justify-center text-sm rounded-lg transition-all duration-200
                      {isSelectedStart(date)
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : ''}
                      {isSelectedEnd(date)
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : ''}
                      {isInRange(date) ? 'bg-primary/20 text-foreground' : ''}
                      {isToday(date) &&
                    !isSelectedStart(date) &&
                    !isSelectedEnd(date)
                      ? 'ring-2 ring-primary ring-inset'
                      : ''}
                      {isFuture(date)
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : 'hover:bg-secondary text-foreground cursor-pointer'}
                      focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="{MONTH_NAMES[
                      startCalendarMonth
                    ]} {day}, {startCalendarYear}"
                    aria-pressed={isSelectedStart(date) || isSelectedEnd(date)}
                  >
                    {day}
                  </button>
                {/if}
              {/each}
            </div>

            <div class="mt-3 text-xs text-muted-foreground text-center">
              Start Date
            </div>
          </div>

          <!-- End Date Calendar -->
          <div class="calendar-container">
            <div class="flex items-center justify-between mb-4">
              <button
                type="button"
                onclick={() => navigateMonth("end", -1)}
                class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                aria-label="Previous month"
              >
                <svg
                  class="w-5 h-5"
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
              <span class="text-sm font-medium text-foreground">
                {MONTH_NAMES[endCalendarMonth]}
                {endCalendarYear}
              </span>
              <button
                type="button"
                onclick={() => navigateMonth("end", 1)}
                class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                aria-label="Next month"
              >
                <svg
                  class="w-5 h-5"
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
            </div>

            <!-- Day Headers -->
            <div class="grid grid-cols-7 gap-1 mb-2">
              {#each DAYS_OF_WEEK as day}
                <div
                  class="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              {/each}
            </div>

            <!-- Calendar Grid -->
            <div class="grid grid-cols-7 gap-1">
              {#each endCalendarDays as { day, date }}
                {#if day === null}
                  <div class="aspect-square"></div>
                {:else}
                  <button
                    type="button"
                    onclick={() => selectDate(date, "end")}
                    disabled={isFuture(date)}
                    class="aspect-square flex items-center justify-center text-sm rounded-lg transition-all duration-200
                      {isSelectedStart(date)
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : ''}
                      {isSelectedEnd(date)
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : ''}
                      {isInRange(date) ? 'bg-primary/20 text-foreground' : ''}
                      {isToday(date) &&
                    !isSelectedStart(date) &&
                    !isSelectedEnd(date)
                      ? 'ring-2 ring-primary ring-inset'
                      : ''}
                      {isFuture(date)
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : 'hover:bg-secondary text-foreground cursor-pointer'}
                      focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="{MONTH_NAMES[
                      endCalendarMonth
                    ]} {day}, {endCalendarYear}"
                    aria-pressed={isSelectedStart(date) || isSelectedEnd(date)}
                  >
                    {day}
                  </button>
                {/if}
              {/each}
            </div>

            <div class="mt-3 text-xs text-muted-foreground text-center">
              End Date
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="flex items-center justify-end gap-3 p-5 border-t border-border"
      >
        <button
          type="button"
          onclick={handleClose}
          class="px-5 py-2.5 text-sm font-medium rounded-lg bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={handleApply}
          disabled={!canApply}
          class="px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
            {canApply
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-secondary text-muted-foreground cursor-not-allowed'}"
        >
          Apply Range
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .calendar-container {
    background: linear-gradient(
      135deg,
      hsl(var(--card)) 0%,
      hsl(0 0% 10%) 100%
    );
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    padding: 1rem;
  }
</style>
