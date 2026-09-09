<script>
  let { axes = [], max = 12, selected = $bindable('sunday') } = $props();
  const cx = 170, cy = 150, radius = 102;
  function point(index, value) {
    const angle = (-90 + index * 360 / axes.length) * Math.PI / 180;
    const distance = radius * Math.max(0, Math.min(max, value)) / max;
    return { x: cx + Math.cos(angle) * distance, y: cy + Math.sin(angle) * distance };
  }
  function polygon(level) {
    return axes.map((_, index) => { const p = point(index, level); return `${p.x},${p.y}`; }).join(' ');
  }
  let complete = $derived(axes.length > 0 && axes.every(axis => axis.weeks !== null));
  let values = $derived(axes.map((axis, index) => { const p = point(index, axis.weeks || 0); return `${p.x},${p.y}`; }).join(' '));
</script>

<div class="radar">
  <svg viewBox="0 0 340 300" role="img" aria-label="Attendance rhythm: weeks with recorded attendance. Select a category below for details.">
    <title>Recorded attendance over {max} completed weeks</title>
    <desc>{axes.map(axis => `${axis.label}: ${axis.weeks === null ? 'unavailable' : `${axis.weeks} of ${max} weeks`}`).join('. ')}</desc>
    {#each [0.25, 0.5, 0.75, 1] as fraction}
      <polygon points={polygon(max * fraction)} fill="none" stroke="currentColor" class="grid-line" />
      <text x={cx + 5} y={cy - radius * fraction + 13} class="scale-label">{max * fraction}</text>
    {/each}
    {#each axes as axis, index}
      {@const end = point(index, max)}
      <line x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="currentColor" class="grid-line" />
      <text x={index === 1 ? end.x + 10 : index === 3 ? end.x - 10 : end.x} y={index === 0 ? end.y - 18 : index === 2 ? end.y + 24 : end.y + 4} text-anchor={index === 1 ? 'start' : index === 3 ? 'end' : 'middle'} class="axis-label">{axis.shortLabel}</text>
    {/each}
    {#if complete}<polygon points={values} class="data-shape" />{/if}
    {#each axes as axis, index}
      {#if axis.weeks !== null}
        {@const p = point(index, axis.weeks)}
        <circle cx={p.x} cy={p.y} r={selected === axis.key ? 6 : 4} class="data-point" />
      {/if}
    {/each}
  </svg>
  <div class="axis-controls" aria-label="Inspect participation category">
    {#each axes as axis}<button type="button" aria-pressed={selected === axis.key} onclick={() => selected = axis.key}>{axis.shortLabel}</button>{/each}
  </div>
</div>
<style>
  .radar { width: 100%; max-width: 380px; margin: auto; } svg { width: 100%; height: auto; display: block; } .grid-line { color: hsl(var(--muted-foreground) / .25); } .scale-label { font-size: 10px; fill: hsl(var(--muted-foreground)); } .axis-label { font-size: 12px; fill: hsl(var(--foreground)); } .data-shape { fill: hsl(var(--primary) / .18); stroke: hsl(var(--primary)); stroke-width: 2; stroke-linejoin: round; } .data-point { fill: hsl(var(--primary)); stroke: hsl(var(--card)); stroke-width: 2; }
  .axis-controls { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; } button { border-radius: 6px; padding: 7px 10px; font-size: 12px; color: hsl(var(--muted-foreground)); } button[aria-pressed="true"] { color: hsl(var(--primary)); background: hsl(var(--primary) / .12); }
</style>
