<!--
  SearchableSelect.svelte
  A searchable single-select dropdown component.
  
  Features:
  - Searchable input to filter options
  - Single selection
  - Custom styling matching the dashboard aesthetic
  - Floating label support
  - Clearable selection
-->

<script>
    /**
     * @typedef {Object} Option
     * @property {string} value - Option value
     * @property {string} label - Option display label
     */

    let {
        label = "",
        options = [],
        value = $bindable(""),
        placeholder = "Select...",
        disabled = false,
        error = "",
        required = false,
        id = `searchable-select-${Math.random().toString(36).slice(2, 9)}`,
        ...restProps
    } = $props();

    // Local state
    let isOpen = $state(false);
    let searchQuery = $state("");
    let dropdownRef = $state(null);
    let isFocused = $state(false);

    // Initial selected label
    let selectedLabel = $derived.by(() => {
        const opt = options.find((o) => o.value === value);
        return opt ? opt.label : "";
    });

    // Filter options based on search query
    const filteredOptions = $derived(() => {
        if (!searchQuery.trim()) return options;
        const query = searchQuery.toLowerCase();
        return options.filter((opt) => opt.label.toLowerCase().includes(query));
    });

    // Handle selection
    function selectOption(optValue) {
        value = optValue;
        isOpen = false;
        searchQuery = "";
    }

    // Clear selection
    function clearSelection(e) {
        e.stopPropagation();
        value = "";
    }

    // Handle click outside
    function handleClickOutside(event) {
        if (dropdownRef && !dropdownRef.contains(event.target)) {
            isOpen = false;
            isFocused = false;
        }
    }

    // Handle keydown
    function handleKeydown(event) {
        if (event.key === "Escape") {
            isOpen = false;
            isFocused = false;
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

    // Determine if label should float
    const shouldFloat = $derived(
        isFocused || isOpen || value !== "" || searchQuery !== "",
    );

    // Classes
    const wrapperClasses = $derived(() => {
        let classes =
            "relative flex items-center rounded-lg border transition-premium bg-background";

        if (error) {
            classes +=
                " border-destructive focus-within:border-destructive focus-within:ring-1 focus-within:ring-destructive";
        } else if (disabled) {
            classes += " border-border bg-secondary/30 cursor-not-allowed";
        } else {
            classes +=
                " border-border hover:border-border-hover focus-within:border-primary focus-within:ring-1 focus-within:ring-primary";
        }

        return classes;
    });

    const labelClasses = $derived(() => {
        let classes =
            "absolute left-3 transition-all duration-200 pointer-events-none z-10";

        if (shouldFloat) {
            classes += " -top-2.5 text-xs px-1 bg-background";
            if (error) {
                classes += " text-destructive";
            } else if (isFocused || isOpen) {
                classes += " text-primary";
            } else {
                classes += " text-muted-foreground";
            }
        } else {
            classes +=
                " top-1/2 -translate-y-1/2 text-sm text-muted-foreground";
        }

        return classes;
    });
</script>

<div class="w-full relative" bind:this={dropdownRef}>
    <!-- Trigger Area -->
    <div
        class={wrapperClasses()}
        onclick={() => {
            if (!disabled) {
                isOpen = !isOpen;
                isFocused = true;
                if (isOpen) {
                    // Focus search input on open
                    setTimeout(() => {
                        const searchInput =
                            dropdownRef?.querySelector(".search-input");
                        searchInput?.focus();
                    }, 50);
                }
            }
        }}
        role="button"
        tabindex="0"
        onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
                if (!disabled) {
                    isOpen = !isOpen;
                    isFocused = true;
                }
            }
        }}
    >
        {#if label}
            <label for={id} class={labelClasses()}>
                {label}
                {#if required}
                    <span class="text-destructive ml-0.5" aria-hidden="true"
                        >*</span
                    >
                {/if}
            </label>
        {/if}

        <div class="flex-1 h-10 px-3 flex items-center min-w-0">
            {#if value}
                <span class="text-foreground text-sm truncate"
                    >{selectedLabel}</span
                >
            {:else if !label}
                <span class="text-muted-foreground text-sm">{placeholder}</span>
            {/if}
        </div>

        <!-- Icons -->
        <div class="flex items-center gap-1 pr-3">
            {#if value && !disabled}
                <button
                    type="button"
                    class="text-muted-foreground hover:text-foreground p-0.5 rounded-full transition-colors"
                    onclick={clearSelection}
                    aria-label="Clear selection"
                >
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            {/if}

            <svg
                class="w-4 h-4 text-muted-foreground transition-transform duration-200 {isOpen
                    ? 'rotate-180'
                    : ''}"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M19 9l-7 7-7-7"
                />
            </svg>
        </div>
    </div>

    {#if error}
        <p class="mt-1.5 text-xs text-destructive">{error}</p>
    {/if}

    <!-- Dropdown Panel -->
    {#if isOpen}
        <div
            class="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
            <!-- Search -->
            <div class="p-2 border-b border-border">
                <input
                    type="text"
                    class="search-input w-full px-2 py-1.5 text-sm bg-input border border-border rounded text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground"
                    {placeholder}
                    bind:value={searchQuery}
                    onclick={(e) => e.stopPropagation()}
                />
            </div>

            <!-- Options -->
            <div class="max-h-60 overflow-y-auto p-1">
                {#each filteredOptions() as option (option.value)}
                    <button
                        type="button"
                        class="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary text-foreground flex items-center justify-between group {value ===
                        option.value
                            ? 'bg-secondary/50'
                            : ''}"
                        onclick={(e) => {
                            e.stopPropagation();
                            selectOption(option.value);
                        }}
                    >
                        <span>{option.label}</span>
                        {#if value === option.value}
                            <svg
                                class="w-4 h-4 text-primary"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        {/if}
                    </button>
                {:else}
                    <div
                        class="px-2 py-4 text-center text-sm text-muted-foreground"
                    >
                        No results found
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>
