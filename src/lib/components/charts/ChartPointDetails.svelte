<script>
  import Modal from "$lib/components/ui/Modal.svelte";
  let { detail = $bindable(null) } = $props();
  let open = $derived(Boolean(detail));
</script>
<Modal isOpen={open} title={detail?.title || "Chart details"} onclose={() => detail = null} zIndex={70}>
  {#if detail}
    {#if detail.subtitle}<p class="mb-4 text-sm text-muted-foreground">{detail.subtitle}</p>{/if}
    <dl class="divide-y divide-border">
      {#each detail.metrics as metric}
        <div class="flex items-start justify-between gap-6 py-3 text-sm"><dt class="text-muted-foreground">{metric.label}</dt><dd class="text-right font-semibold text-foreground">{metric.value ?? "Unavailable"}</dd></div>
      {/each}
    </dl>
  {/if}
</Modal>
