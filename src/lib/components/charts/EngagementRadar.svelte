<!--
  Engagement Radar Chart
  Displays member engagement across 6 dimensions as a radar/spider chart
  Styled to match Shadcn 'Charts' library aesthetic
-->

<script>
    import { fade, draw } from "svelte/transition";
    import { quintOut } from "svelte/easing";
    import Card from "$lib/components/ui/Card.svelte";

    /**
     * @type {{
     *   serviceAttendance: number,
     *   prayerMeetings: number,
     *   cellGroups: number,
     *   evangelismImpact: number,
     *   givingConsistency: number,
     *   visitationActivity: number
     * }}
     */
    let {
        data = {
            serviceAttendance: 0,
            prayerMeetings: 0,
            cellGroups: 0,
            evangelismImpact: 0,
            givingConsistency: 0,
            visitationActivity: 0,
        },
        title = "Engagement Profile",
        size = 200,
        cellGroupDetail = null,
    } = $props();

    // Axis definitions with labels
    const axes = [
        { key: "serviceAttendance", label: "Services", angle: -90 },
        { key: "prayerMeetings", label: "Prayer", angle: -30 },
        { key: "cellGroups", label: "Cell Groups", angle: 30 },
        { key: "evangelismImpact", label: "Evangelism", angle: 90 },
        { key: "givingConsistency", label: "Giving", angle: 150 },
        { key: "visitationActivity", label: "Visitation", angle: 210 },
    ];

    // SVG Layout Constants
    const center = size / 2;
    const maxRadius = size / 2 - 40; // Tighter padding for cleaner look
    const gridLevels = [25, 50, 75, 100];

    // Interactions
    let hoveredAxis = $state(null);
    let showCellGroupDetail = $state(false);

    function polarToCartesian(angle, radius) {
        const radians = (angle * Math.PI) / 180;
        return {
            x: center + radius * Math.cos(radians),
            y: center + radius * Math.sin(radians),
        };
    }

    function getHexagonPath(radius) {
        const points = axes.map((axis) => {
            const pos = polarToCartesian(axis.angle, radius);
            return `${pos.x},${pos.y}`;
        });
        return `M ${points.join(" L ")} Z`;
    }

    const dataPolygonPath = $derived(() => {
        const points = axes.map((axis) => {
            const value = Math.min(100, Math.max(0, data[axis.key] || 0));
            const radius = (value / 100) * maxRadius;
            const pos = polarToCartesian(axis.angle, radius);
            return `${pos.x},${pos.y}`;
        });
        return `M ${points.join(" L ")} Z`;
    });

    const overallScore = $derived(() => {
        const values = axes.map((a) => data[a.key] || 0);
        return Math.round(values.reduce((acc, v) => acc + v, 0) / axes.length);
    });

    function getLabelPosition(angle) {
        const labelRadius = maxRadius + 15;
        return polarToCartesian(angle, labelRadius);
    }

    function handleAxisHover(axis) {
        hoveredAxis = axis;
        if (axis?.key === "cellGroups" && cellGroupDetail)
            showCellGroupDetail = true;
    }

    function handleAxisLeave() {
        hoveredAxis = null;
        showCellGroupDetail = false;
    }
</script>

<div class="w-full">
    <!-- Darker background for better contrast, Removed Header as requested -->
    <Card class="w-full border-border/60 bg-black/40 shadow-sm">
        <div class="flex flex-col items-center justify-center p-6 pt-8">
            <div
                class="relative group"
                style="width: {size}px; height: {size}px;"
            >
                <svg
                    viewBox="0 0 {size} {size}"
                    class="w-full h-full overflow-visible"
                    role="img"
                    aria-label="Engagement radar chart"
                >
                    <!-- Background Grid (Stronger Lines: stroke-width 1.5, higher opacity) -->
                    {#each gridLevels as level}
                        <path
                            d={getHexagonPath((level / 100) * maxRadius)}
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.5"
                            class="text-muted-foreground/30"
                        />
                    {/each}

                    <!-- Axis Spokes -->
                    {#each axes as axis}
                        {@const end = polarToCartesian(axis.angle, maxRadius)}
                        <line
                            x1={center}
                            y1={center}
                            x2={end.x}
                            y2={end.y}
                            stroke="currentColor"
                            stroke-width="1.5"
                            class="text-muted-foreground/30"
                        />
                    {/each}

                    <!-- Data Polygon (Solid Blue Fill) -->
                    <path
                        d={dataPolygonPath()}
                        fill="hsl(var(--primary))"
                        fill-opacity="0.5"
                        stroke="hsl(var(--primary))"
                        stroke-width="2"
                        stroke-linejoin="round"
                        class="transition-all duration-700 ease-out hover:fill-opacity-60"
                    />

                    <!-- Data Points (Hidden by default, appear on hover like Shadcn behavior) -->
                    {#each axes as axis}
                        {@const value = Math.min(
                            100,
                            Math.max(0, data[axis.key] || 0),
                        )}
                        {@const radius = (value / 100) * maxRadius}
                        {@const pos = polarToCartesian(axis.angle, radius)}

                        <!-- Interactive Area -->
                        <circle
                            cx={pos.x}
                            cy={pos.y}
                            r="8"
                            class="fill-transparent cursor-pointer"
                            onmouseenter={() => handleAxisHover(axis)}
                            onmouseleave={handleAxisLeave}
                            role="button"
                            tabindex="0"
                        />

                        <!-- Visible Point (on hover only) -->
                        <circle
                            cx={pos.x}
                            cy={pos.y}
                            r="4"
                            class="fill-background stroke-primary stroke-2 pointer-events-none transition-opacity duration-200"
                            style="opacity: {hoveredAxis?.key === axis.key
                                ? 1
                                : 0}"
                        />
                    {/each}

                    <!-- Labels -->
                    {#each axes as axis}
                        {@const pos = getLabelPosition(axis.angle)}
                        <text
                            x={pos.x}
                            y={pos.y}
                            text-anchor="middle"
                            dominant-baseline="middle"
                            class="text-[11px] font-medium fill-muted-foreground capitalize pointer-events-none select-none"
                            dy={axis.angle === 90
                                ? "8"
                                : axis.angle === -90
                                  ? "-4"
                                  : "0"}
                        >
                            {axis.label}
                        </text>
                    {/each}

                    <!-- Center Score -->
                    <foreignObject
                        x={center - 30}
                        y={center - 25}
                        width="60"
                        height="50"
                    >
                        <div
                            class="h-full flex flex-col items-center justify-center pointer-events-none"
                        >
                            <span
                                class="text-2xl font-bold leading-none tracking-tighter text-foreground/90"
                            >
                                {overallScore()}
                            </span>
                        </div>
                    </foreignObject>
                </svg>

                <!-- Tooltip Overlay -->
                {#if hoveredAxis}
                    <div
                        in:fade={{ duration: 150 }}
                        out:fade={{ duration: 100 }}
                        class="absolute top-0 right-0 z-20 pointer-events-none"
                        style="transform: translate(10%, -10%);"
                    >
                        <div
                            class="bg-popover text-popover-foreground border shadow-sm rounded-md px-3 py-1.5 text-xs"
                        >
                            <div class="font-semibold mb-0.5">
                                {hoveredAxis.label}
                            </div>
                            <div class="flex items-baseline gap-2">
                                <span class="font-bold text-lg"
                                    >{Math.round(
                                        data[hoveredAxis.key] || 0,
                                    )}</span
                                >
                                <span
                                    class="text-muted-foreground/70 text-[10px]"
                                    >SCORE</span
                                >
                            </div>
                            <!-- Cell Group Detail -->
                            {#if hoveredAxis.key === "cellGroups" && cellGroupDetail && showCellGroupDetail}
                                <div
                                    class="mt-2 pt-1 border-t border-border/50 text-[10px] space-y-0.5"
                                >
                                    <div class="flex justify-between gap-3">
                                        <span class="text-muted-foreground"
                                            >Bacenta</span
                                        >
                                        <span>{cellGroupDetail.bacenta}%</span>
                                    </div>
                                    <div class="flex justify-between gap-3">
                                        <span class="text-muted-foreground"
                                            >Basonta</span
                                        >
                                        <span>{cellGroupDetail.basonta}%</span>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        </div>

        {#snippet footer()}
            <div
                class="flex items-center gap-2 px-6 py-4 text-sm text-muted-foreground border-t border-border/40 bg-muted/5"
            >
                <!-- Inline Trending Up Icon -->
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="text-emerald-500"
                >
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                    <polyline points="16 7 22 7 22 13"></polyline>
                </svg>
                <div class="flex flex-col leading-none gap-0.5">
                    <span class="font-medium text-foreground"
                        >Trending up by 5.2% this month</span
                    >
                    <span class="text-xs text-muted-foreground/70"
                        >January - June 2024</span
                    >
                </div>
            </div>
        {/snippet}
    </Card>
</div>

<style>
    path {
        animation: radarFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes radarFadeIn {
        from {
            opacity: 0;
            transform: scale(0.95);
            transform-origin: center;
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
</style>
