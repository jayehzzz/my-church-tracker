<script>
  let { axes, comparison = null, basis = 'weeks', selected = 'prayer', name = 'Person', compareName = '' } = $props();
  const cx = 170, cy = 145, radius = 101;
  const percent = a => a[basis].offered ? a[basis].attended / a[basis].offered * 100 : null;
  const point = (i, value) => { const angle = (-90 + i * 90) * Math.PI / 180; return { x: cx + Math.cos(angle) * radius * value / 100, y: cy + Math.sin(angle) * radius * value / 100 }; };
  const polygon = values => values.map((v, i) => { const p = point(i, v); return `${p.x},${p.y}`; }).join(' ');
  const segments = values => values.map((v,i) => { const next=(i+1)%4; if(v===null||values[next]===null)return '';const a=point(i,v),b=point(next,values[next]);return `M${a.x},${a.y} L${b.x},${b.y}`; }).join(' ');
  let values = $derived(axes.map(percent));
  let other = $derived(comparison?.map(percent));
</script>
<svg viewBox="0 0 340 300" role="img" aria-label="Attendance comparison radar">
  <title>{name}: {axes.map((a,i) => `${a.label} ${values[i] === null ? 'not available' : Math.round(values[i]) + '%'}`).join(', ')}{comparison ? `. ${compareName}: ${comparison.map((a,i) => `${a.label} ${other[i] === null ? 'not available' : Math.round(other[i]) + '%'}`).join(', ')}` : ''}</title>
  {#each [25,50,75,100] as n}<polygon points={polygon([n,n,n,n])} class="grid-line"/><text x={cx+5} y={cy-radius*n/100+12} class="scale">{n}%</text>{/each}
  {#each axes as axis, i}{@const end=point(i,100)}<line x1={cx} y1={cy} x2={end.x} y2={end.y} class="grid-line"/><text x={end.x+(i===1?11:i===3?-11:0)} y={end.y+(i===0?-17:i===2?24:4)} text-anchor={i===1?'start':i===3?'end':'middle'} class="label">{axis.shortLabel}</text>{/each}
  {#if other}{#if other.every(v => v !== null)}<polygon points={polygon(other)} class="other"/>{:else}<path d={segments(other)} class="other"/>{/if}{#each other as value,i}{#if value!==null}{@const p=point(i,value)}<circle cx={p.x} cy={p.y} r="4" class="other-point"/>{/if}{/each}{/if}
  {#if values.every(v => v !== null)}<polygon points={polygon(values)} class="shape"/>{:else}<path d={segments(values)} class="shape incomplete"/>{/if}
  {#each values as value,i}{#if value!==null}{@const p=point(i,value)}<circle cx={p.x} cy={p.y} r={axes[i].key===selected?6:4} class="point"/>{/if}{/each}
</svg>
<style>
  svg{display:block;width:100%;max-width:400px;margin:auto}.grid-line{fill:none;stroke:hsl(var(--muted-foreground)/.22);stroke-width:1}.scale{font-size:10px;fill:hsl(var(--muted-foreground))}.label{font-size:12px;fill:hsl(var(--foreground))}.shape{fill:hsl(var(--primary)/.14);stroke:hsl(var(--primary));stroke-width:2}.other{fill:none;stroke:hsl(var(--warning));stroke-width:2;stroke-dasharray:5 4}.incomplete{fill:none}.other-point{fill:hsl(var(--card));stroke:hsl(var(--warning));stroke-width:2}.point{fill:hsl(var(--primary));stroke:hsl(var(--card));stroke-width:2}
</style>
