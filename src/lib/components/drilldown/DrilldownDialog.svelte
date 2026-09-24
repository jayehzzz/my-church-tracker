<script>
  import { tick } from 'svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import { backDrilldown, pushDrilldown } from './selection.js';

  // `renderView(current, navigate)` is a page-owned snippet. It must render
  // only the current frame. A route owner may save `state` in page/session
  // storage before following an href and restore it on return.
  let { state: navigation = $bindable(null), renderView, onclose = null } = $props();
  let scroller = $state(null);
  let backButton = $state(null);
  const isOpen = $derived(Boolean(navigation));
  const title = $derived(navigation?.current?.title || 'Details');

  async function navigate(view, focusKey = null) {
    navigation = pushDrilldown(navigation, view, { scrollTop: scroller?.scrollTop || 0, focusKey });
    await tick();
    if (scroller) scroller.scrollTop = 0;
  }
  async function back() {
    navigation = backDrilldown(navigation);
    await tick();
    if (scroller) scroller.scrollTop = navigation.current.scrollTop || 0;
    const key = navigation.current.focusKey;
    const target = key && [...scroller?.querySelectorAll('[data-drilldown-focus]') || []]
      .find(element => element.getAttribute('data-drilldown-focus') === key);
    (target || backButton || scroller)?.focus();
  }
  function close() { navigation = null; onclose?.(); }
</script>

<Modal isOpen={isOpen} {title} size="xl" onclose={close}>
  {#if navigation}
    {#if navigation.history.length}
      <button bind:this={backButton} type="button" onclick={back} class="mb-4 rounded-lg border border-border px-3 py-2 text-sm font-medium" aria-label="Back to previous details">← Back</button>
    {/if}
    <div bind:this={scroller} tabindex="-1" aria-label={title} class="max-h-[65dvh] overflow-y-auto" data-drilldown-scroll>
      {@render renderView(navigation.current, navigate)}
    </div>
  {/if}
</Modal>
