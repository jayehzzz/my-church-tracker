<!--
  CopyButton.svelte
  A reusable copy-to-clipboard button component.
  
  Features:
  - Copies text/JSON data to clipboard
  - Optional CSV format for arrays
  - Shows success checkmark after copy
  - Accessible with ARIA labels
  - Uses Svelte 5 runes syntax
-->

<script>
    /**
     * @typedef {'json' | 'csv' | 'text'} CopyFormat
     */

    let {
        data = "",
        format = "json",
        label = "Copy",
        size = "sm",
        showLabel = false,
        class: className = "",
        ...restProps
    } = $props();

    let copied = $state(false);
    let copyTimeout = $state(null);

    // Size classes
    const sizeClasses = {
        sm: "p-1.5",
        md: "p-2",
        lg: "p-2.5",
    };

    const iconSizes = {
        sm: "w-3.5 h-3.5",
        md: "w-4 h-4",
        lg: "w-5 h-5",
    };

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
                        // Escape quotes and wrap in quotes if contains comma
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
    function formatData() {
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
    async function handleCopy() {
        try {
            const textToCopy = formatData();
            await navigator.clipboard.writeText(textToCopy);

            copied = true;

            // Clear any existing timeout
            if (copyTimeout) clearTimeout(copyTimeout);

            // Reset after 2 seconds
            copyTimeout = setTimeout(() => {
                copied = false;
            }, 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    }
</script>

<button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-md text-muted-foreground
         hover:text-foreground hover:bg-secondary/50 transition-premium
         focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
         focus:ring-offset-background {sizeClasses[size]} {className}"
    onclick={handleCopy}
    aria-label={copied ? "Copied!" : label}
    title={copied ? "Copied!" : label}
    {...restProps}
>
    {#if copied}
        <!-- Checkmark icon -->
        <svg
            class="{iconSizes[size]} text-success"
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
    {:else}
        <!-- Copy icon -->
        <svg
            class={iconSizes[size]}
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
    {/if}

    {#if showLabel}
        <span class="text-xs font-medium">{copied ? "Copied!" : label}</span>
    {/if}
</button>
