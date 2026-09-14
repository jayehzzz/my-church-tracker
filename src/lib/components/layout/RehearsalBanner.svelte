<script>
  import { isRehearsalMode } from "$lib/convex.js";
</script>

{#if isRehearsalMode()}
  <div
    class="w-full border-b border-amber-200/40 bg-amber-300 px-4 py-2 text-center text-xs font-semibold text-black sm:text-sm"
    role="status"
    data-testid="rehearsal-banner"
  >
    <span class="font-black tracking-[0.14em]">REHEARSAL</span>
    <span class="mx-2" aria-hidden="true">•</span>
    <span>Safe test sandbox — edits here do not affect the live church site.</span>
    <span class="hidden sm:inline"> Starting rehearsal again resets this data from production.</span>
  </div>
{/if}
