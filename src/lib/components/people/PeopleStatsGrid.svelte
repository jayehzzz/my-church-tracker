<script>
  let { totalAttendance = 0, lastAttended = null, unavailable = false } = $props();
  const latestDate = $derived(lastAttended ? new Date(lastAttended).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not recorded");
</script>
<dl class="attendance-summary">
  <div><dt>Recorded attendance</dt><dd>{unavailable ? "Unavailable" : totalAttendance}</dd><p>Services and meetings held to date</p></div>
  <div><dt>Last attended</dt><dd>{unavailable ? "Unavailable" : latestDate}</dd><p>Most recent recorded attendance</p></div>
</dl>
<style>
  .attendance-summary { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid hsl(var(--border)); border-radius: 12px; background: hsl(var(--card)); }
  .attendance-summary > div { padding: 20px 24px; min-width: 0; } .attendance-summary > div + div { border-left: 1px solid hsl(var(--border)); }
  dt { font-size: 12px; color: hsl(var(--muted-foreground)); } dd { font-size: 24px; font-weight: 600; letter-spacing: -.02em; margin-top: 6px; } p { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 4px; }
  @media(max-width: 500px) { .attendance-summary > div { padding: 16px; } dd { font-size: 18px; } }
</style>
