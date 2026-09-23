<script>
  import { isRehearsalMode } from "$lib/convex.js";
</script>

{#if isRehearsalMode()}
  <div
    class="w-full border-b border-amber-200/40 bg-amber-300 px-4 py-2 text-center text-xs font-semibold text-black sm:text-sm"
    role="status"
    data-testid="rehearsal-banner"
  >
    <span class="font-black tracking-[0.14em]">PRACTICE</span>
    <span class="mx-2" aria-hidden="true">•</span>
    <span>These are copied records. Edits here do not affect live data.</span>
    <span class="block sm:hidden">Refresh replaces Practice edits.</span>
    <span class="hidden sm:inline"> Refreshing Practice replaces your Practice edits with a new copy of live data.</span>
  </div>
{/if}
