<!--
  Sparkline Component
  ===================
  A lightweight SVG-based mini chart for displaying trends in KPI cards.
  
  Props:
  - data: Array of numbers to plot
  - width: Width of the sparkline (default: 80)
  - height: Height of the sparkline (default: 24)
  - color: Line color (default: primary)
  - variant: 'success' | 'warning' | 'danger' | 'info' | 'default'
  - showArea: Whether to show area fill under the line (default: true)
-->

<script>
    // Props
    let {
        data = [],
        width = 80,
        height = 24,
        color = undefined,
        variant = "default",
        showArea = true,
    } = $props();

    // Calculate min/max for scaling
    const dataMin = $derived(data.length > 0 ? Math.min(...data) : 0);
    const dataMax = $derived(data.length > 0 ? Math.max(...data) : 0);
    const dataRange = $derived(dataMax - dataMin || 1);

    // Padding for the chart
    const padding = 2;
    const chartWidth = $derived(width - padding * 2);
    const chartHeight = $derived(height - padding * 2);

    // Calculate points for the polyline
    const points = $derived(() => {
        if (data.length < 2) return "";

        const stepX = chartWidth / (data.length - 1);

        return data
            .map((value, index) => {
                const x = padding + index * stepX;
                const y =
                    padding +
                    chartHeight -
                    ((value - dataMin) / dataRange) * chartHeight;
                return `${x},${y}`;
            })
            .join(" ");
    });

    // Calculate area polygon points (for filled area under line)
    const areaPoints = $derived(() => {
        if (data.length < 2) return "";

        const stepX = chartWidth / (data.length - 1);
        const linePoints = data.map((value, index) => {
            const x = padding + index * stepX;
            const y =
                padding +
                chartHeight -
                ((value - dataMin) / dataRange) * chartHeight;
            return `${x},${y}`;
        });

        // Add bottom corners to close the polygon
        const bottomRight = `${padding + chartWidth},${padding + chartHeight}`;
        const bottomLeft = `${padding},${padding + chartHeight}`;

        return [...linePoints, bottomRight, bottomLeft].join(" ");
    });

    // Get color based on variant
    const strokeColor = $derived(() => {
        if (color) return color;

        const colors = {
            success: "rgb(74, 222, 128)", // green-400
            warning: "rgb(251, 191, 36)", // amber-400
            danger: "rgb(248, 113, 113)", // red-400
            info: "rgb(96, 165, 250)", // blue-400
            default: "rgb(34, 211, 238)", // cyan-400 (primary)
        };

        return colors[variant] || colors.default;
    });

    // Get fill color (lighter version)
    const fillColor = $derived(() => {
        if (color) return `${color}20`;

        const colors = {
            success: "rgba(74, 222, 128, 0.15)",
            warning: "rgba(251, 191, 36, 0.15)",
            danger: "rgba(248, 113, 113, 0.15)",
            info: "rgba(96, 165, 250, 0.15)",
            default: "rgba(34, 211, 238, 0.15)",
        };

        return colors[variant] || colors.default;
    });
</script>

{#if data.length >= 2}
    <svg
        {width}
        {height}
        viewBox="0 0 {width} {height}"
        class="sparkline"
        preserveAspectRatio="none"
    >
        <!-- Area fill -->
        {#if showArea}
            <polygon
                points={areaPoints()}
                fill={fillColor()}
                class="sparkline-area"
            />
        {/if}

        <!-- Line -->
        <polyline
            points={points()}
            fill="none"
            stroke={strokeColor()}
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="sparkline-line"
        />

        <!-- End dot -->
        {#if data.length > 0}
            {@const lastX = padding + chartWidth}
            {@const lastY =
                padding +
                chartHeight -
                ((data[data.length - 1] - dataMin) / dataRange) * chartHeight}
            <circle
                cx={lastX}
                cy={lastY}
                r="2"
                fill={strokeColor()}
                class="sparkline-dot"
            />
        {/if}
    </svg>
{:else}
    <!-- Placeholder for insufficient data -->
    <svg
        {width}
        {height}
        viewBox="0 0 {width} {height}"
        class="sparkline opacity-30"
    >
        <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="currentColor"
            stroke-width="1"
            stroke-dasharray="2,2"
        />
    </svg>
{/if}

<style>
    .sparkline {
        display: block;
    }

    .sparkline-area {
        transition: opacity 0.2s ease;
    }

    .sparkline-line {
        transition: stroke 0.2s ease;
    }

    .sparkline-dot {
        transition: r 0.2s ease;
    }

    .sparkline:hover .sparkline-dot {
        r: 3;
    }
</style>
