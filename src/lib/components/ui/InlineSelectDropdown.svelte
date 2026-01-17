<!--
  InlineSelectDropdown.svelte
  A compact inline dropdown for quick field editing within modals/detail views.
  
  Follows the same styling patterns as MultiSelectFilter:
  - Search input for filtering options
  - Consistent dark theme styling
  - Checkbox-style selection indicators
  - Smooth animations
  
  Use Cases:
  - Quick status changes in detail modals
  - Inline category/response editing
  - Toggle boolean fields with Yes/No options
-->

<script>
    /**
     * @type {Array<{value: any, label: string}>} options - Available options
     * @type {any} value - Currently selected value
     * @type {string} placeholder - Search placeholder text
     * @type {boolean} showSearch - Whether to show search input (for short lists like Yes/No, hide it)
     * @type {function} onSelect - Callback when selection changes
     * @type {boolean} isOpen - Whether dropdown is open (bindable)
     * @type {'bottom' | 'top'} placement - Position of the dropdown relative to trigger
     */
    let {
        options = [],
        value = null,
        placeholder = "Search...",
        showSearch = true,
        onSelect = null,
        disabled = false,
        isOpen = $bindable(true),
        placement = "bottom",
        class: className = "",
        ...restProps
    } = $props();

    // Local state
    let searchQuery = $state("");
    let dropdownRef = $state(null);

    // Filter options based on search query
    const filteredOptions = $derived(() => {
        if (!searchQuery.trim()) return options;
        const query = searchQuery.toLowerCase();
        return options.filter((opt) => opt.label.toLowerCase().includes(query));
    });

    // Check if a value is selected
    function isSelected(optValue) {
        return value === optValue;
    }

    // Select an option
    function selectOption(optValue) {
        searchQuery = "";
        onSelect?.(optValue);
    }

    // Handle click outside to close dropdown
    function handleClickOutside(event) {
        if (dropdownRef && !dropdownRef.contains(event.target)) {
            isOpen = false;
            searchQuery = "";
        }
    }

    // Handle keyboard navigation
    function handleKeydown(event) {
        if (event.key === "Escape") {
            isOpen = false;
            searchQuery = "";
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

{#if isOpen}
    <div
        class="inline-select-dropdown {className}"
        class:placement-top={placement === "top"}
        bind:this={dropdownRef}
        {...restProps}
    >
        <div class="dropdown-panel" role="listbox">
            <!-- Search Input (optional) -->
            {#if showSearch && options.length > 4}
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
            {/if}

            <!-- Options List -->
            <div class="options-list">
                {#each filteredOptions() as option (option.value)}
                    <button
                        type="button"
                        class="option-item"
                        class:selected={isSelected(option.value)}
                        onclick={() => selectOption(option.value)}
                        {disabled}
                    >
                        <span class="checkbox-indicator">
                            {#if isSelected(option.value)}
                                <svg
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
                        </span>
                        <span class="option-label">{option.label}</span>
                    </button>
                {:else}
                    <div class="no-results">No options found</div>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    .inline-select-dropdown {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        z-index: 50;
    }

    .inline-select-dropdown:not(.placement-top) {
        top: 100%;
        margin-top: 0.25rem;
    }

    .inline-select-dropdown.placement-top {
        bottom: 100%;
        margin-bottom: 0.25rem;
    }

    .dropdown-panel {
        min-width: 220px;
        max-width: 280px;
        background: hsl(var(--card));
        color: hsl(var(--card-foreground));
        border: 1px solid hsl(var(--border-hover));
        border-radius: 0.5rem;
        box-shadow:
            0 10px 25px -5px rgba(0, 0, 0, 0.5),
            0 4px 6px -2px rgba(0, 0, 0, 0.3);
        animation: dropdownIn 0.15s ease-out;
        overflow: hidden;
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
        color: hsl(var(--muted-foreground));
        pointer-events: none;
    }

    .search-input {
        width: 100%;
        padding: 0.375rem 1.75rem 0.375rem 2rem;
        background: hsl(var(--card));
        border: 1px solid var(--border);
        border-radius: 0.375rem;
        color: hsl(var(--foreground));
        font-size: 0.875rem;
    }

    .search-input:focus {
        outline: none;
        border-color: hsl(var(--primary));
    }

    .search-input::placeholder {
        color: hsl(var(--muted-foreground));
    }

    .clear-search {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        padding: 0.25rem;
        background: none;
        border: none;
        color: hsl(var(--muted-foreground));
        cursor: pointer;
        border-radius: 0.25rem;
        transition: color 0.15s;
    }

    .clear-search:hover {
        color: hsl(var(--foreground));
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
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: none;
        background: none;
        border-radius: 0.375rem;
        cursor: pointer;
        transition: background 0.15s;
        text-align: left;
        color: hsl(var(--foreground));
    }

    .option-item:hover {
        background: hsl(var(--secondary));
    }

    .option-item.selected {
        background: rgba(var(--primary), 0.1);
    }

    .option-item:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .checkbox-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1rem;
        height: 1rem;
        border: 1.5px solid var(--border);
        border-radius: 0.25rem;
        background: hsl(var(--card));
        color: hsl(var(--primary));
        flex-shrink: 0;
    }

    .option-item.selected .checkbox-indicator {
        background: hsl(var(--primary));
        border-color: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
    }

    .option-label {
        flex: 1;
        font-size: 0.875rem;
        color: hsl(var(--foreground));
    }

    .no-results {
        padding: 1rem;
        text-align: center;
        color: hsl(var(--muted-foreground));
        font-size: 0.875rem;
    }
</style>
