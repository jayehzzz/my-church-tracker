<script>
  import Modal from "$lib/components/ui/Modal.svelte";
  let { detail = $bindable(null) } = $props();
  let open = $derived(Boolean(detail));
</script>
<Modal isOpen={open} title={detail?.title || "Chart details"} onclose={() => detail = null} zIndex={70}>
  {#if detail}
    {#if detail.subtitle}<p class="mb-4 text-sm text-muted-foreground">{detail.subtitle}</p>{/if}
    {#if detail.summary}<p class="mb-4 rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm leading-relaxed text-foreground">{detail.summary}</p>{/if}
    {#if detail.metrics?.length}<dl class="divide-y divide-border">
      {#each detail.metrics as metric}
        <div class="flex items-start justify-between gap-6 py-3 text-sm"><dt class="text-muted-foreground">{metric.label}</dt><dd class="text-right font-semibold text-foreground">{metric.value ?? "Unavailable"}</dd></div>
      {/each}
    </dl>{/if}
    {#if detail.context?.length}
      <div class="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
        {#each detail.context as item}
          <div class="rounded-xl bg-secondary/30 p-3"><p class="text-xs text-muted-foreground">{item.label}</p><p class="mt-1 text-lg font-semibold text-foreground">{item.value}</p></div>
        {/each}
      </div>
    {/if}
    {#if detail.items?.length}
      <div class="mt-5 border-t border-border pt-4">
        <h3 class="mb-2 text-sm font-semibold text-foreground">{detail.itemsTitle || 'Records'}</h3>
        <div class="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border">
          {#each detail.items as item}
            <button type="button" class="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-secondary/30 focus-visible:bg-secondary/30" onclick={() => item.onClick?.()}>
              <span class="min-w-0"><span class="block text-sm font-medium text-foreground">{item.label}</span>{#if item.note}<span class="mt-0.5 block truncate text-xs text-muted-foreground">{item.note}</span>{/if}</span>
              {#if item.value !== undefined}<strong class="shrink-0 text-sm text-foreground">{item.value}</strong>{/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</Modal>
