<!--
  MultiSelectFilter.svelte
  A searchable multi-select dropdown filter component.
  
  Features:
  - Searchable input to filter options
  - Checkbox list for multi-selection
  - Selected items shown as removable chips
  - Clear All / Select All actions
  - Smooth animations
  - Keyboard accessible
-->

<script>
    /**
     * @type {string} label - Display label for the filter
     * @type {Array<{value: string, label: string}>} options - Available options
     * @type {Array<string>} selected - Currently selected values (bindable)
     * @type {string} placeholder - Search placeholder text
     */
    let {
        label = "Filter",
        options = [],
        selected = $bindable([]),
        placeholder = "Search...",
        ...restProps
    } = $props();

    // Local state
    let isOpen = $state(false);
    let searchQuery = $state("");
    let dropdownRef = $state(null);

    // Filter options based on search query
    const filteredOptions = $derived(() => {
        if (!searchQuery.trim()) return options;
        const query = searchQuery.toLowerCase();
        return options.filter((opt) => opt.label.toLowerCase().includes(query));
    });

    // Check if a value is selected
    function isSelected(value) {
        return selected.includes(value);
    }

    // Toggle selection of a value
    function toggleOption(value) {
        if (isSelected(value)) {
            selected = selected.filter((v) => v !== value);
        } else {
            selected = [...selected, value];
        }
    }

    // Remove a specific selection
    function removeSelection(value) {
        selected = selected.filter((v) => v !== value);
    }

    // Clear all selections
    function clearAll() {
        selected = [];
    }

    // Select all visible options
    function selectAll() {
        const allValues = filteredOptions().map((opt) => opt.value);
        const uniqueValues = [...new Set([...selected, ...allValues])];
        selected = uniqueValues;
    }

    // Get label for a value
    function getLabel(value) {
        const opt = options.find((o) => o.value === value);
        return opt ? opt.label : value;
    }

    // Handle click outside to close dropdown
    function handleClickOutside(event) {
        if (dropdownRef && !dropdownRef.contains(event.target)) {
            isOpen = false;
        }
    }

    // Handle keyboard navigation
    function handleKeydown(event) {
        if (event.key === "Escape") {
            isOpen = false;
        }
    }

    $effect(() => {
        if (isOpen) {
            document.addEventListener("click", handleClickOutside);
            document.addEventListener("keydown", handleKeydown);
        }
        return () => {
            document.removeEventListener("click", handleClickOutside);
            document.removeEventListener("keydown", handleKeydown);
        };
    });
</script>

<div class="multi-select-filter" bind:this={dropdownRef} {...restProps}>
    <!-- Label -->
    <span
        class="filter-label"
        id="filter-label-{label.replace(/\s+/g, '-').toLowerCase()}"
        >{label}</span
    >

    <!-- Trigger Button -->
    <button
        type="button"
        class="filter-trigger"
        class:has-selection={selected.length > 0}
        onclick={() => (isOpen = !isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby="filter-label-{label
            .replace(/\s+/g, '-')
            .toLowerCase()}"
    >
        {#if selected.length === 0}
            <span class="placeholder-text">All</span>
        {:else if selected.length === 1}
            <span class="selection-text">{getLabel(selected[0])}</span>
        {:else}
            <span class="selection-text">{selected.length} selected</span>
        {/if}

        <!-- Dropdown Arrow -->
        <svg
            class="dropdown-arrow"
            class:open={isOpen}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
            />
        </svg>
    </button>

    <!-- Selected Chips (shown when closed and has selections) -->
    {#if selected.length > 0 && !isOpen}
        <div class="selected-chips">
            {#each selected.slice(0, 3) as value}
                <span class="chip">
                    {getLabel(value)}
                    <button
                        type="button"
                        class="chip-remove"
                        onclick={(e) => {
                            e.stopPropagation();
                            removeSelection(value);
                        }}
                        aria-label="Remove {getLabel(value)}"
                    >
                        <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="3"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </span>
            {/each}
            {#if selected.length > 3}
                <span class="chip chip-more">+{selected.length - 3}</span>
            {/if}
        </div>
    {/if}

    <!-- Dropdown Panel -->
    {#if isOpen}
        <div class="dropdown-panel" role="listbox" aria-multiselectable="true">
            <!-- Search Input -->
            <div class="search-wrapper">
                <svg
                    class="search-icon"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
                <input
                    type="text"
                    class="search-input"
                    {placeholder}
                    bind:value={searchQuery}
                    onclick={(e) => e.stopPropagation()}
                />
                {#if searchQuery}
                    <button
                        type="button"
                        class="clear-search"
                        onclick={() => (searchQuery = "")}
                        aria-label="Clear search"
                    >
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                {/if}
            </div>

            <!-- Action Buttons -->
            <div class="actions-row">
                <button type="button" class="action-btn" onclick={selectAll}>
                    Select All
                </button>
                <button
                    type="button"
                    class="action-btn"
                    onclick={clearAll}
                    disabled={selected.length === 0}
                >
                    Clear All
                </button>
            </div>

            <!-- Options List -->
            <div class="options-list">
                {#each filteredOptions() as option (option.value)}
                    <label
                        class="option-item"
                        class:selected={isSelected(option.value)}
                    >
                        <input
                            type="checkbox"
                            checked={isSelected(option.value)}
                            onchange={() => toggleOption(option.value)}
                            onclick={(e) => e.stopPropagation()}
                        />
                        <span class="option-label">{option.label}</span>
                        {#if isSelected(option.value)}
                            <svg
                                class="check-icon"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        {/if}
                    </label>
                {:else}
                    <div class="no-results">No options found</div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
    .multi-select-filter {
        position: relative;
        display: inline-block;
        min-width: 140px;
    }

    .filter-label {
        display: block;
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--muted-foreground);
        margin-bottom: 0.25rem;
    }

    .filter-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        width: 100%;
        padding: 0.5rem 0.75rem;
        background: var(--input);
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        color: var(--foreground);
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .filter-trigger:hover {
        border-color: var(--primary);
    }

    .filter-trigger:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
    }

    .filter-trigger.has-selection {
        border-color: var(--primary);
        background: rgba(var(--primary-rgb), 0.05);
    }

    .placeholder-text {
        color: var(--muted-foreground);
    }

    .selection-text {
        font-weight: 500;
    }

    .dropdown-arrow {
        flex-shrink: 0;
        transition: transform 0.2s ease;
    }

    .dropdown-arrow.open {
        transform: rotate(180deg);
    }

    .selected-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        margin-top: 0.5rem;
    }

    .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.125rem 0.5rem;
        background: var(--primary);
        color: var(--primary-foreground);
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .chip-remove {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        background: none;
        border: none;
        color: inherit;
        opacity: 0.7;
        cursor: pointer;
        transition: opacity 0.15s;
    }

    .chip-remove:hover {
        opacity: 1;
    }

    .chip-more {
        background: var(--secondary);
        color: var(--secondary-foreground);
    }

    .dropdown-panel {
        position: absolute;
        top: calc(100% + 0.25rem);
        left: 0;
        z-index: 50;
        min-width: 220px;
        max-width: 300px;
        background: hsl(var(--card));
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        box-shadow:
            0 10px 25px -5px rgba(0, 0, 0, 0.3),
            0 4px 6px -2px rgba(0, 0, 0, 0.1);
        animation: dropdownIn 0.15s ease-out;
    }

    @keyframes dropdownIn {
        from {
            opacity: 0;
            transform: translateY(-4px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .search-wrapper {
        position: relative;
        padding: 0.5rem;
        border-bottom: 1px solid var(--border);
    }

    .search-icon {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--muted-foreground);
        pointer-events: none;
    }

    .search-input {
        width: 100%;
        padding: 0.375rem 1.75rem 0.375rem 2rem;
        background: var(--input);
        border: 1px solid var(--border);
        border-radius: 0.375rem;
        color: var(--foreground);
        font-size: 0.875rem;
    }

    .search-input:focus {
        outline: none;
        border-color: var(--primary);
    }

    .clear-search {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        padding: 0.25rem;
        background: none;
        border: none;
        color: var(--muted-foreground);
        cursor: pointer;
        border-radius: 0.25rem;
        transition: color 0.15s;
    }

    .clear-search:hover {
        color: var(--foreground);
    }

    .actions-row {
        display: flex;
        gap: 0.5rem;
        padding: 0.5rem;
        border-bottom: 1px solid var(--border);
    }

    .action-btn {
        flex: 1;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--primary);
        background: transparent;
        border: 1px solid var(--primary);
        border-radius: 0.375rem;
        cursor: pointer;
        transition: all 0.15s;
    }

    .action-btn:hover:not(:disabled) {
        background: var(--primary);
        color: var(--primary-foreground);
    }

    .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .options-list {
        max-height: 200px;
        overflow-y: auto;
        padding: 0.25rem;
    }

    .option-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        border-radius: 0.375rem;
        cursor: pointer;
        transition: background 0.15s;
    }

    .option-item:hover {
        background: var(--secondary);
    }

    .option-item.selected {
        background: rgba(var(--primary-rgb), 0.1);
    }

    .option-item input[type="checkbox"] {
        width: 1rem;
        height: 1rem;
        accent-color: var(--primary);
        cursor: pointer;
    }

    .option-label {
        flex: 1;
        font-size: 0.875rem;
        color: var(--foreground);
    }

    .check-icon {
        color: var(--primary);
        flex-shrink: 0;
    }

    .no-results {
        padding: 1rem;
        text-align: center;
        color: var(--muted-foreground);
        font-size: 0.875rem;
    }
</style>
