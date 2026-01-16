<script>
    import { Card } from "$lib/components/ui";
    import EngagementRadar from "$lib/components/charts/EngagementRadar.svelte";

    let { engagementData, cellGroupDetail, person } = $props();
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="md:col-span-1">
        <EngagementRadar data={engagementData} {cellGroupDetail} size={220} />
    </div>
    <div class="md:col-span-2 flex items-center">
        <Card>
            <div class="p-4">
                <h4 class="text-sm font-medium text-muted-foreground mb-2">
                    Engagement Overview
                </h4>
                <p class="text-sm text-foreground/80">
                    This radar shows {person.first_name}'s engagement across 6
                    key dimensions. Hover over any axis for details.
                    {#if Array.isArray(engagementData)}
                        {@const smallGroupScore =
                            engagementData.find(
                                (d) => d.subject === "Small Group",
                            )?.A ?? 0}
                        {@const outreachScore =
                            engagementData.find((d) => d.subject === "Outreach")
                                ?.A ?? 0}
                        {#if smallGroupScore < 30}
                            <span class="text-warning">
                                Cell group participation could use attention.
                            </span>
                        {:else if outreachScore > 60}
                            <span class="text-success">
                                Strong evangelism contributor!
                            </span>
                        {/if}
                    {/if}
                </p>
            </div>
        </Card>
    </div>
</div>
