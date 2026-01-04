<!--
  Conversion Funnel Chart Component
  Displays a vertical funnel visualization showing the journey from Contact → Attended → Saved → Joined
  
  Props:
    - data: Object with { contacts, attended, saved, joined } counts
    - title: Optional chart title
-->

<script>
    /** @type {{ contacts: number, attended: number, saved: number, joined: number }} */
    let {
        data = { contacts: 0, attended: 0, saved: 0, joined: 0 },
        title = "Conversion Funnel",
    } = $props();

    // Calculate percentages for bar widths (relative to contacts as 100%)
    const stages = $derived(() => {
        const max = Math.max(data.contacts, 1); // Prevent division by zero
        return [
            {
                label: "Contacts",
                value: data.contacts,
                percentage: 100,
                color: "bg-blue-500",
            },
            {
                label: "Attended Service",
                value: data.attended,
                percentage: Math.round((data.attended / max) * 100),
                color: "bg-purple-500",
            },
            {
                label: "Salvation Decision",
                value: data.saved,
                percentage: Math.round((data.saved / max) * 100),
                color: "bg-amber-500",
            },
            {
                label: "Joined Church",
                value: data.joined,
                percentage: Math.round((data.joined / max) * 100),
                color: "bg-green-500",
            },
        ];
    });
</script>

<div class="card-base p-4">
    <h3 class="text-sm font-medium text-muted-foreground mb-4">{title}</h3>

    <div class="space-y-3">
        {#each stages() as stage, i}
            <div class="flex items-center gap-3">
                <!-- Stage Label -->
                <div class="w-32 text-right">
                    <span class="text-xs text-muted-foreground"
                        >{stage.label}</span
                    >
                </div>

                <!-- Bar Container -->
                <div
                    class="flex-1 h-8 bg-secondary/30 rounded-lg overflow-hidden relative"
                >
                    <!-- Animated Bar -->
                    <div
                        class="h-full {stage.color} rounded-lg transition-all duration-700 ease-out flex items-center justify-end px-3"
                        style="width: {stage.percentage}%"
                    >
                        {#if stage.percentage >= 15}
                            <span
                                class="text-xs font-semibold text-white drop-shadow-md"
                            >
                                {stage.value}
                            </span>
                        {/if}
                    </div>

                    <!-- Value shown outside if bar too small -->
                    {#if stage.percentage < 15}
                        <span
                            class="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-foreground"
                        >
                            {stage.value}
                        </span>
                    {/if}
                </div>

                <!-- Percentage -->
                <div class="w-12 text-right">
                    <span class="text-xs font-medium text-foreground"
                        >{stage.percentage}%</span
                    >
                </div>
            </div>

            <!-- Connector Arrow (except after last item) -->
            {#if i < stages().length - 1}
                <div class="flex items-center gap-3">
                    <div class="w-32"></div>
                    <div class="flex-1 flex justify-center">
                        <svg
                            class="w-4 h-4 text-muted-foreground/50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M19 14l-7 7m0 0l-7-7m7 7V3"
                            />
                        </svg>
                    </div>
                    <div class="w-12"></div>
                </div>
            {/if}
        {/each}
    </div>

    <!-- Conversion Rate Summary -->
    <div
        class="mt-4 pt-4 border-t border-border flex justify-between items-center"
    >
        <span class="text-xs text-muted-foreground"
            >Overall Conversion Rate</span
        >
        <span class="text-lg font-bold text-primary">
            {data.contacts > 0
                ? Math.round((data.joined / data.contacts) * 100)
                : 0}%
        </span>
    </div>
</div>
