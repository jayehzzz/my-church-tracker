<!--
  Conversion Funnel Chart Component
  Displays a journey from Contact → Parallel Milestones (Attended/Saved) → Joined
  
  Props:
    - data: Object with { contacts, attended, saved, joined } counts
    - title: Optional chart title
-->

<script>
    /** @type {{ contacts: number, attended: number, saved: number, joined: number }} */
    let {
        data = { contacts: 0, attended: 0, saved: 0, joined: 0 },
        title = "Conversion Journey",
    } = $props();

    // Calculate percentages relative to contacts
    const max = $derived(Math.max(data.contacts, 1)); // Prevent division by zero

    const stats = $derived({
        contacts: {
            value: data.contacts,
            percentage: 100,
            color: "bg-blue-500",
            label: "Contacts",
        },
        saved: {
            value: data.saved,
            percentage: Math.round((data.saved / max) * 100),
            color: "bg-amber-500",
            label: "Salvation Decision",
        },
        attended: {
            value: data.attended,
            percentage: Math.round((data.attended / max) * 100),
            color: "bg-purple-500",
            label: "Attended Service",
        },
        joined: {
            value: data.joined,
            percentage: Math.round((data.joined / max) * 100),
            color: "bg-green-500",
            label: "Joined Church",
        },
    });
</script>

{#snippet funnelBar(item)}
    <div class="flex items-center gap-3 w-full">
        <!-- Stage Label -->
        <div class="w-32 text-right shrink-0">
            <span class="text-xs text-muted-foreground">{item.label}</span>
        </div>

        <!-- Bar Container -->
        <div
            class="flex-1 h-8 bg-secondary/30 rounded-lg overflow-hidden relative min-w-0"
        >
            <!-- Animated Bar -->
            <div
                class="h-full {item.color} rounded-lg transition-all duration-700 ease-out flex items-center justify-end px-3"
                style="width: {item.percentage}%"
            >
                {#if item.percentage >= 15}
                    <span
                        class="text-xs font-semibold text-white drop-shadow-md"
                    >
                        {item.value}
                    </span>
                {/if}
            </div>

            <!-- Value shown outside if bar too small -->
            {#if item.percentage < 15}
                <span
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-foreground"
                >
                    {item.value}
                </span>
            {/if}
        </div>

        <!-- Percentage -->
        <div class="w-12 text-right shrink-0">
            <span class="text-xs font-medium text-foreground"
                >{item.percentage}%</span
            >
        </div>
    </div>
{/snippet}

<div class="card-base p-4">
    <h3 class="text-sm font-medium text-muted-foreground mb-4">{title}</h3>

    <div class="space-y-1">
        <!-- 1. Contacts (Top) -->
        {@render funnelBar(stats.contacts)}

        <!-- Connector Down -->
        <div class="flex items-center gap-3 py-1">
            <div class="w-32 shrink-0"></div>
            <div class="flex-1 flex justify-center">
                <div class="h-4 w-0.5 bg-border/60"></div>
            </div>
            <div class="w-12 shrink-0"></div>
        </div>

        <!-- 2. Parallel Milestones Container -->
        <div
            class="relative py-3 px-2 rounded-xl border border-dashed border-border/60 bg-secondary/5"
        >
            <div
                class="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-card px-2 text-[10px] text-muted-foreground/80 uppercase tracking-wider font-medium"
            >
                Milestones (Any Order)
            </div>

            <div class="space-y-3 pt-1">
                {@render funnelBar(stats.saved)}
                {@render funnelBar(stats.attended)}
            </div>
        </div>

        <!-- Connector Down -->
        <div class="flex items-center gap-3 py-1">
            <div class="w-32 shrink-0"></div>
            <div class="flex-1 flex justify-center">
                <div class="h-4 w-0.5 bg-border/60"></div>
            </div>
            <div class="w-12 shrink-0"></div>
        </div>

        <!-- 3. Joined (Bottom) -->
        {@render funnelBar(stats.joined)}
    </div>

    <!-- Conversion Rate Summary -->
    <div
        class="mt-4 pt-4 border-t border-border flex justify-between items-center"
    >
        <span class="text-xs text-muted-foreground"
            >Overall Conversion Rate</span
        >
        <span class="text-lg font-bold text-primary">
            {stats.contacts > 0
                ? Math.round((stats.joined.value / stats.contacts.value) * 100)
                : 0}%
        </span>
    </div>
</div>
