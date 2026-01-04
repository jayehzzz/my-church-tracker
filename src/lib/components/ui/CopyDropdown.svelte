<!--
  CopyDropdown.svelte
  A dropdown button for copying data in multiple formats.
  
  Features:
  - "Copy as..." button with dropdown options
  - JSON and CSV format support
  - Shows success checkmark after copy
  - Closes dropdown after selection
  - Uses Svelte 5 runes syntax
-->

<script>
    import { onMount } from "svelte";

    let {
        data = "",
        label = "Copy as...",
        class: className = "",
        ...restProps
    } = $props();

    let isOpen = $state(false);
    let copied = $state(false);
    let copiedFormat = $state("");
    let copyTimeout = $state(null);
    let dropdownRef = $state(null);

    /**
     * Convert array of objects to CSV string
     */
    function arrayToCSV(arr) {
        if (!Array.isArray(arr) || arr.length === 0) return "";

        const headers = Object.keys(arr[0]);
        const csvRows = [
            headers.join(","),
            ...arr.map((row) =>
                headers
                    .map((header) => {
                        const value = row[header];
                        if (
                            typeof value === "string" &&
                            (value.includes(",") || value.includes('"'))
                        ) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value ?? "";
                    })
                    .join(","),
            ),
        ];
        return csvRows.join("\n");
    }

    /**
     * Format data for copying based on format type
     */
    function formatData(format) {
        if (typeof data === "string") return data;

        if (format === "csv" && Array.isArray(data)) {
            return arrayToCSV(data);
        }

        if (format === "json" || typeof data === "object") {
            return JSON.stringify(data, null, 2);
        }

        return String(data);
    }

    /**
     * Copy to clipboard
     */
    async function handleCopy(format) {
        try {
            const textToCopy = formatData(format);
            await navigator.clipboard.writeText(textToCopy);

            copied = true;
            copiedFormat = format.toUpperCase();
            isOpen = false;

            if (copyTimeout) clearTimeout(copyTimeout);

            copyTimeout = setTimeout(() => {
                copied = false;
                copiedFormat = "";
            }, 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
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
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
           bg-secondary/50 text-foreground hover:bg-secondary transition-premium
           focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
           focus:ring-offset-background {className}"
        onclick={() => (isOpen = !isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
    >
        {#if copied}
            <svg
                class="w-4 h-4 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                />
            </svg>
            <span>Copied {copiedFormat}!</span>
        {:else}
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
            </svg>
            <span>{label}</span>
            <svg
                class="w-3 h-3 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                />
            </svg>
        {/if}
    </button>

    {#if isOpen}
        <div
            class="absolute top-full left-0 mt-1 min-w-[120px] py-1 bg-card border border-border
             rounded-lg shadow-lg z-20 animate-in fade-in slide-in-from-top-2 duration-150"
        >
            <button
                type="button"
                class="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-secondary/50
               transition-colors flex items-center gap-2"
                onclick={() => handleCopy("json")}
            >
                <svg
                    class="w-4 h-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                    />
                </svg>
                JSON
            </button>
            <button
                type="button"
                class="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-secondary/50
               transition-colors flex items-center gap-2"
                onclick={() => handleCopy("csv")}
            >
                <svg
                    class="w-4 h-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
                CSV
            </button>
        </div>
    {/if}
</div>
