<script>
  let {
    value = "line",
    onChange = null,
    label = "Chart view",
  } = $props();

  const options = [
    { value: "line", label: "Line" },
    { value: "bar", label: "Bar" },
  ];
</script>

<div class="inline-flex items-center rounded-lg border border-border bg-secondary/35 p-0.5" role="group" aria-label={label}>
  {#each options as option}
    <button
      type="button"
      class="rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors {value === option.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
      aria-pressed={value === option.value}
      onclick={() => onChange?.(option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>
