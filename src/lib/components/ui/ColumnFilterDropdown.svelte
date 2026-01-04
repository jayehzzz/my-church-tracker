<!--
  ColumnFilterDropdown.svelte
  A dropdown button for toggling column visibility in tables.
  
  Features:
  - Filter icon button
  - Dropdown with checkboxes for each column
  - Uses Svelte 5 runes syntax
-->

<script>
    import { onMount } from "svelte";

    let {
        columns = $bindable({}),
        class: className = "",
        ...restProps
    } = $props();

    let isOpen = $state(false);
    let dropdownRef = $state(null);

    // Column labels for display
    const columnLabels = {
        date: "Date",
        type: "Type",
        topic: "Topic",
        attendance: "Attendance",
        guests: "Guests",
        decisions: "Decisions",
        individuals: "Individuals",
        photos: "Photos",
    };

    /**
     * Toggle column visibility
     */
    function toggleColumn(key) {
        columns[key] = !columns[key];
    }

    /**
     * Close dropdown when clicking outside
     */
    function handleClickOutside(event) {
        if (dropdownRef && !dropdownRef.contains(event.target)) {
            isOpen = false;
        }
    }

    onMount(() => {
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    });
</script>

<div class="relative inline-block" bind:this={dropdownRef} {...restProps}>
    <button
        type="button"
        class="p-2 rounded-lg text-muted-foreground hover:text-foreground
           hover:bg-secondary/50 transition-premium
           focus:outline-none focus:ring-2 focus:ring-primary {className}"
        onclick={() => (isOpen = !isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Toggle columns"
    >
        <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
        </svg>
    </button>

    {#if isOpen}
        <div
            class="absolute top-full right-0 mt-1 min-w-[160px] py-2 bg-card border border-border
             rounded-lg shadow-lg z-30 animate-in fade-in slide-in-from-top-2 duration-150"
        >
            <div
                class="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border mb-1"
            >
                Visible Columns
            </div>

            {#each Object.entries(columnLabels) as [key, label]}
                <label
                    class="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-secondary/50 transition-colors"
                >
                    <input
                        type="checkbox"
                        checked={columns[key]}
                        onchange={() => toggleColumn(key)}
                        class="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-input"
                    />
                    <span class="text-sm text-foreground">{label}</span>
                </label>
            {/each}
        </div>
    {/if}
</div>
