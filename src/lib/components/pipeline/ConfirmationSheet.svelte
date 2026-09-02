<!--
  ConfirmationSheet.svelte
  
  The Sunday Confirmation Sheet component for the Follow-Up Pipeline.
  Provides a checklist and resolution interface for verifying whether promised
  contacts attended Sunday service.
  
  Features:
  - Header with service date and expected attendee count
  - Card-based contact checklist with individual ✅ / ❌ resolution buttons
  - Resolved status badges (Showed Up / No Show)
  - Bulk confirmation ("Confirm All & Close Week")
  - Accessible and responsive with Svelte 5 runes syntax
  
  @component
-->

<script>
  /**
   * @typedef {Object} PromiseItem
   * @property {string} [_id] - Unique promise record identifier
   * @property {string} [id] - Fallback identifier
   * @property {string} contact_name - Name of the contact
   * @property {string} [contact_phone] - Phone number of the contact
   * @property {string} [leader_name] - Leader who secured the promise
   * @property {string|Date} [promised_date] - Date the promise was made
   * @property {string|Date} [follow_up_date] - Follow-up interaction date
   * @property {boolean|null} [promise_fulfilled] - Confirmation status (true = showed up, false = no show, null = pending)
   */

  /**
   * Component Props
   * @type {{
   *   promises?: PromiseItem[],
   *   onResolve?: (follow_up_id: string, fulfilled: boolean) => void,
   *   onBulkResolve?: (resolutions: Array<{ follow_up_id: string, fulfilled: boolean }>) => void,
   *   serviceDateLabel?: string
   * }}
   */
  let {
    promises = [],
    onResolve,
    onBulkResolve,
    serviceDateLabel = "Sunday",
  } = $props();

  // Internal reactive state for bulk checkboxes (Set of promise IDs that are checked)
  let checkedIds = $state(new Set());

  // Automatically initialize / update checked state for promises when list changes
  $effect(() => {
    const nextChecked = new Set();
    for (const promise of promises) {
      const id = promise._id || promise.id;
      if (!id) continue;
      // Pre-check items that are already fulfilled or pending (unless explicitly marked false)
      if (promise.promise_fulfilled === true || promise.promise_fulfilled === undefined || promise.promise_fulfilled === null) {
        nextChecked.add(id);
      }
    }
    checkedIds = nextChecked;
  });

  /**
   * Toggle checkbox for a specific promise ID
   * @param {string} id
   */
  function toggleCheck(id) {
    const next = new Set(checkedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    checkedIds = next;
  }

  /**
   * Handle single item resolution
   * @param {string} id
   * @param {boolean} fulfilled
   */
  function handleSingleResolve(id, fulfilled) {
    if (fulfilled) {
      const next = new Set(checkedIds);
      next.add(id);
      checkedIds = next;
    } else {
      const next = new Set(checkedIds);
      next.delete(id);
      checkedIds = next;
    }
    onResolve?.(id, fulfilled);
  }

  /**
   * Handle bulk confirmation
   */
  function handleBulkConfirm() {
    const resolutions = promises.map((promise) => {
      const id = promise._id || promise.id;
      return {
        follow_up_id: id,
        fulfilled: checkedIds.has(id),
      };
    });

    onBulkResolve?.(resolutions);
  }

  /**
   * Format day/date string for display
   * @param {string|Date} dateVal
   * @returns {string}
   */
  function formatDay(dateVal) {
    if (!dateVal) return "—";
    const dateObj = new Date(dateVal);
    if (isNaN(dateObj.getTime())) {
      return String(dateVal);
    }
    return dateObj.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  // Count calculations
  const totalCount = $derived(promises.length);
</script>

<div class="space-y-4">
  <!-- Header Section -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-1">
    <div>
      <h2 class="text-lg font-semibold text-foreground flex items-center gap-2">
        <span aria-hidden="true">📋</span>
        <span>Sunday Confirmation Sheet — {serviceDateLabel}</span>
      </h2>
      <p class="text-sm text-muted-foreground mt-0.5">
        Expected This Week ({totalCount} {totalCount === 1 ? "person" : "people"})
      </p>
    </div>
  </div>

  <!-- Contact List or Empty State -->
  {#if promises.length === 0}
    <div
      class="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center"
      role="status"
    >
      <div class="text-3xl mb-2" aria-hidden="true">💪</div>
      <p class="text-sm text-muted-foreground font-medium">
        No promises to confirm this week. Keep following up! 💪
      </p>
    </div>
  {:else}
    <div class="space-y-3" role="list" aria-label="Expected contacts confirmation list">
      {#each promises as promise (promise._id || promise.id)}
        {@const id = promise._id || promise.id}
        {@const isResolved = promise.promise_fulfilled !== null && promise.promise_fulfilled !== undefined}
        {@const isFulfilled = promise.promise_fulfilled === true}
        {@const isChecked = checkedIds.has(id)}

        <div
          class="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-card-elevated transition-colors"
          role="listitem"
        >
          <!-- Checkbox on the left -->
          <div class="flex items-center justify-center flex-shrink-0">
            <input
              type="checkbox"
              id="check-{id}"
              checked={isChecked}
              onchange={() => toggleCheck(id)}
              class="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-background bg-secondary/50 accent-primary cursor-pointer transition-colors"
              aria-label="Select {promise.contact_name} for confirmation"
            />
          </div>

          <!-- Contact Information -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <label
                for="check-{id}"
                class="font-medium text-foreground truncate cursor-pointer select-none"
              >
                {promise.contact_name}
              </label>
            </div>

            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
              {#if promise.contact_phone}
                <span class="inline-flex items-center gap-1">
                  <svg
                    class="w-3 h-3 text-muted-foreground/70"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  {promise.contact_phone}
                </span>
              {/if}

              <span>Promised: {formatDay(promise.promised_date || promise.follow_up_date)}</span>

              {#if promise.leader_name}
                <span class="inline-flex items-center gap-1">
                  <span class="opacity-60">•</span>
                  Leader: {promise.leader_name}
                </span>
              {/if}
            </div>
          </div>

          <!-- Action Buttons or Status Badge -->
          <div class="flex items-center gap-1.5 flex-shrink-0">
            {#if isResolved}
              {#if isFulfilled}
                <span
                  class="inline-flex items-center gap-1 font-medium rounded-full bg-success/15 text-success px-2.5 py-1 text-xs"
                  role="status"
                  aria-label="Status: Showed Up"
                >
                  <svg
                    class="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Showed Up
                </span>
              {:else}
                <span
                  class="inline-flex items-center gap-1 font-medium rounded-full bg-destructive/15 text-destructive px-2.5 py-1 text-xs"
                  role="status"
                  aria-label="Status: No Show"
                >
                  <svg
                    class="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  No Show
                </span>
              {/if}
            {:else}
              <!-- Single Action Buttons -->
              <button
                type="button"
                onclick={() => handleSingleResolve(id, true)}
                class="p-1.5 rounded-md bg-success/15 text-success hover:bg-success/25 border border-success/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success cursor-pointer"
                title="Mark {promise.contact_name} as Showed Up"
                aria-label="Mark {promise.contact_name} as Showed Up"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2.5"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                type="button"
                onclick={() => handleSingleResolve(id, false)}
                class="p-1.5 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive cursor-pointer"
                title="Mark {promise.contact_name} as No Show"
                aria-label="Mark {promise.contact_name} as No Show"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2.5"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <!-- Bottom Bar: Bulk Confirm Action -->
    <div class="pt-2">
      <button
        type="button"
        onclick={handleBulkConfirm}
        class="w-full bg-primary text-primary-foreground rounded-lg py-3 font-medium hover:bg-primary/90 transition-all duration-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Confirm All & Close Week
      </button>
    </div>
  {/if}
</div>
