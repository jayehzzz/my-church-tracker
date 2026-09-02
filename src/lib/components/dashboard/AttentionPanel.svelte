<script>
  let { items = [] } = $props();

  const palettes = {
    urgent: {
      icon: "bg-destructive/10 text-destructive",
      value: "text-destructive",
      dot: "bg-destructive",
    },
    warning: {
      icon: "bg-warning/10 text-warning",
      value: "text-warning",
      dot: "bg-warning",
    },
    info: {
      icon: "bg-primary/10 text-primary",
      value: "text-foreground",
      dot: "bg-primary",
    },
    success: {
      icon: "bg-success/10 text-success",
      value: "text-success",
      dot: "bg-success",
    },
  };
</script>

<section class="overflow-hidden rounded-2xl border border-border bg-card" aria-labelledby="attention-title">
  <header class="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <div class="flex items-center gap-2">
        <span class="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(6,182,212,0.75)]" aria-hidden="true"></span>
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Daily check-in</p>
      </div>
      <h2 id="attention-title" class="mt-1.5 text-lg font-semibold text-foreground">What needs attention</h2>
    </div>
    <p class="max-w-lg text-sm text-muted-foreground">Start here, then move into the detailed workspace only when you need it.</p>
  </header>

  <div class="grid grid-cols-2 xl:grid-cols-4">
    {#each items as item, index}
      {@const palette = palettes[item.variant] || palettes.info}
      <a
        href={item.href}
        class="group relative flex min-h-[150px] flex-col justify-between gap-5 p-4 no-underline transition-colors hover:bg-secondary/25 sm:p-5 {index % 2 === 1 ? 'border-l border-border' : ''} {index >= 2 ? 'border-t border-border xl:border-t-0' : ''} {index === 2 ? 'xl:border-l xl:border-border' : ''}"
      >
        <div class="flex items-start justify-between gap-3">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl {palette.icon}" aria-hidden="true">
            {#if item.icon === "handoff"}
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10-2v6m3-3h-6" /></svg>
            {:else if item.icon === "care"}
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
            {:else if item.icon === "sunday"}
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 21V10l8-6 8 6v11M9 21v-6h6v6M8 10h8" /></svg>
            {:else}
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path stroke-linecap="round" d="M12 7v5l3 2" /></svg>
            {/if}
          </span>
          <svg class="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" /></svg>
        </div>

        <div>
          <p class="text-sm font-medium text-muted-foreground">{item.label}</p>
          <div class="mt-1 flex items-baseline gap-2">
            <span class="text-3xl font-semibold tracking-[-0.03em] {palette.value}">{item.value}</span>
            {#if item.valueSuffix}<span class="text-xs text-muted-foreground">{item.valueSuffix}</span>{/if}
          </div>
          <p class="mt-1.5 text-xs leading-5 text-muted-foreground">{item.detail}</p>
        </div>
      </a>
    {/each}
  </div>
</section>
