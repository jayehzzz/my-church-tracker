<!--
  Global Search Component
  =======================
  Search dropdown with results from all modules.
  
  Features:
  - Debounced search input
  - Results grouped by type
  - Keyboard navigation
  - Click to navigate
-->

<script>
    import { goto } from "$app/navigation";
    import {
        searchQuery,
        searchResults,
        isSearching,
        isSearchOpen,
        performSearch,
        closeSearch,
    } from "$lib/stores/searchStore";

    // Local state
    let inputElement = $state(null);
    let selectedIndex = $state(-1);

    // Watch for search open to focus input
    $effect(() => {
        if ($isSearchOpen && inputElement) {
            setTimeout(() => inputElement?.focus(), 50);
        }
    });

    // Handle input change
    function handleInput(e) {
        const query = e.target.value;
        performSearch(query);
        selectedIndex = -1;
    }

    // Handle keyboard navigation
    function handleKeydown(e) {
        const results = $searchResults;

        if (e.key === "Escape") {
            closeSearch();
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
            return;
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            return;
        }

        if (e.key === "Enter" && selectedIndex >= 0 && results[selectedIndex]) {
            e.preventDefault();
            handleResultClick(results[selectedIndex]);
            return;
        }
    }

    // Handle result click
    function handleResultClick(result) {
        closeSearch();
        goto(result.href);
    }

    // Handle backdrop click
    function handleBackdropClick() {
        closeSearch();
    }

    // Get icon SVG by type
    function getIcon(iconType) {
        const icons = {
            user: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>`,
            users: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"/>
      </svg>`,
            calendar: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>`,
            clock: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>`,
        };
        return icons[iconType] || icons.user;
    }

    // Get type label
    function getTypeLabel(type) {
        const labels = {
            person: "Person",
            contact: "Contact",
            service: "Service",
            meeting: "Meeting",
        };
        return labels[type] || type;
    }
</script>

{#if $isSearchOpen}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 z-40 bg-black/30"
        onclick={handleBackdropClick}
        onkeydown={(e) => e.key === "Escape" && closeSearch()}
        role="button"
        tabindex="-1"
        aria-label="Close search"
    ></div>

    <!-- Search Panel -->
    <div
        class="fixed top-16 left-1/2 -translate-x-1/2 w-full max-w-xl z-50 px-4"
    >
        <div
            class="bg-card border border-border rounded-lg shadow-xl overflow-hidden"
        >
            <!-- Search Input -->
            <div class="relative">
                <div
                    class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
                >
                    {#if $isSearching}
                        <svg
                            class="animate-spin w-5 h-5 text-primary"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                class="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                stroke-width="4"
                            ></circle>
                            <path
                                class="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                        </svg>
                    {:else}
                        <svg
                            class="w-5 h-5 text-muted-foreground"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    {/if}
                </div>
                <input
                    bind:this={inputElement}
                    type="text"
                    placeholder="Search people, contacts, services, meetings..."
                    value={$searchQuery}
                    oninput={handleInput}
                    onkeydown={handleKeydown}
                    class="w-full pl-12 pr-4 py-4 bg-card text-foreground placeholder-muted-foreground focus:outline-none text-base"
                />
                <button
                    type="button"
                    onclick={closeSearch}
                    class="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground"
                    aria-label="Close search"
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

            <!-- Search Results -->
            {#if $searchResults.length > 0}
                <div class="border-t border-border max-h-80 overflow-y-auto">
                    {#each $searchResults as result, index}
                        <button
                            type="button"
                            onclick={() => handleResultClick(result)}
                            class="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors
                     {index === selectedIndex
                                ? 'bg-primary/10'
                                : 'hover:bg-secondary/50'}"
                        >
                            <div
                                class="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground"
                            >
                                {@html getIcon(result.icon)}
                            </div>
                            <div class="flex-1 min-w-0">
                                <p
                                    class="text-sm font-medium text-foreground truncate"
                                >
                                    {result.title}
                                </p>
                                <p
                                    class="text-xs text-muted-foreground truncate"
                                >
                                    {result.subtitle}
                                </p>
                            </div>
                            <span
                                class="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
                            >
                                {getTypeLabel(result.type)}
                            </span>
                        </button>
                    {/each}
                </div>
            {:else if $searchQuery && $searchQuery.length >= 2 && !$isSearching}
                <div class="border-t border-border px-4 py-8 text-center">
                    <p class="text-muted-foreground">
                        No results found for "{$searchQuery}"
                    </p>
                </div>
            {:else if $searchQuery && $searchQuery.length < 2}
                <div class="border-t border-border px-4 py-6 text-center">
                    <p class="text-sm text-muted-foreground">
                        Type at least 2 characters to search
                    </p>
                </div>
            {/if}

            <!-- Keyboard hints -->
            <div
                class="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground"
            >
                <span class="flex items-center gap-1">
                    <kbd class="px-1.5 py-0.5 bg-secondary rounded">↑↓</kbd> Navigate
                </span>
                <span class="flex items-center gap-1">
                    <kbd class="px-1.5 py-0.5 bg-secondary rounded">Enter</kbd> Select
                </span>
                <span class="flex items-center gap-1">
                    <kbd class="px-1.5 py-0.5 bg-secondary rounded">Esc</kbd> Close
                </span>
            </div>
        </div>
    </div>
{/if}
