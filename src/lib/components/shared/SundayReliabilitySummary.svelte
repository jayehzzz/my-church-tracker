<script>
  import Badge from "$lib/components/ui/Badge.svelte";
  import { summarizeSundayCommitments, sundayResolutionLabel } from "$lib/utils/sundayReliability.js";

  let {
    commitments = [],
    summary = null,
    title = "Sunday follow-through",
    compact = false,
    showEmpty = true,
  } = $props();

  const reliability = $derived({ ...summarizeSundayCommitments(commitments), ...(summary || {}) });
  const rateLabel = $derived(reliability.follow_through_rate === null ? "Not enough history" : `${reliability.follow_through_rate}% kept`);
  const missedRatioLabel = $derived(reliability.decided ? `${reliability.missed}/${reliability.decided}` : "0/0");

  function formatDate(value) {
    if (!value) return "Unknown Sunday";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function resolutionClass(value) {
    if (value === "attended") return "text-success";
    if (value === "no_show") return "text-destructive";
    if (value === "pending") return "text-primary";
    return "text-muted-foreground";
  }

  function actionLabel(value) {
    return ({ confirmed: "Confirmed", reconfirmed: "Reconfirmed", confirmation_updated: "Confirmation updated", attended: "Attended", no_show: "Didn’t attend", cancelled: "Cancelled", response_maybe: "Changed to maybe", response_no: "Changed to no" }[value] || String(value || "Updated").replaceAll("_", " "));
  }

  function formatTimestamp(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }
</script>

{#if showEmpty || reliability.expected > 0}
  <section class="rounded-xl border border-border bg-card {compact ? 'p-3' : 'p-4'}" aria-label={title}>
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h4 class="text-sm font-semibold text-foreground">{title}</h4>
        <p class="mt-1 text-xs text-muted-foreground">Explicit Sundays where this person said they would come.</p>
        <p class="mt-1 text-xs font-medium {reliability.missed ? 'text-destructive' : 'text-muted-foreground'}">Missed when expected: {missedRatioLabel}</p>
      </div>
      <Badge size="sm" variant={reliability.repeated_misses ? "warning" : reliability.decided && reliability.follow_through_rate >= 75 ? "success" : "default"}>
        {rateLabel}
      </Badge>
    </div>

    {#if reliability.expected > 0}
      <dl class="mt-3 grid grid-cols-2 gap-2 {compact ? '' : 'sm:grid-cols-5'}">
        <div class="rounded-lg bg-secondary/30 px-3 py-2"><dt class="text-[11px] text-muted-foreground">Expected Sundays</dt><dd class="mt-0.5 text-lg font-semibold text-foreground">{reliability.expected}</dd></div>
        <div class="rounded-lg bg-success/10 px-3 py-2"><dt class="text-[11px] text-muted-foreground">Attended</dt><dd class="mt-0.5 text-lg font-semibold text-success">{reliability.attended}</dd></div>
        <div class="rounded-lg bg-destructive/10 px-3 py-2"><dt class="text-[11px] text-muted-foreground">Missed</dt><dd class="mt-0.5 text-lg font-semibold text-destructive">{reliability.missed}</dd></div>
        <div class="rounded-lg bg-secondary/30 px-3 py-2"><dt class="text-[11px] text-muted-foreground">Cancelled</dt><dd class="mt-0.5 text-lg font-semibold text-foreground">{reliability.cancelled}</dd></div>
        {#if !compact}<div class="rounded-lg bg-primary/10 px-3 py-2"><dt class="text-[11px] text-muted-foreground">Awaiting result</dt><dd class="mt-0.5 text-lg font-semibold text-primary">{reliability.pending}</dd></div>{/if}
      </dl>
      <p class="mt-3 text-xs leading-relaxed text-muted-foreground">
        Follow-through is based on attended vs missed resolved commitments. Cancellations stay in the expected total but are shown separately from no-shows.
      </p>
      {#if !compact && reliability.entries?.length}
        <div class="mt-4 border-t border-border pt-3">
          <p class="text-xs font-medium text-foreground">Recent explicit Sunday commitments</p>
          <div class="mt-2 grid gap-1.5 sm:grid-cols-2">
            {#each reliability.entries.slice(0, 6) as entry (entry.id)}
              <div class="rounded-lg bg-secondary/20 px-3 py-2 text-xs">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-foreground">{formatDate(entry.gathering_date)}</span>
                  <span class="font-medium {resolutionClass(entry.resolution)}">{sundayResolutionLabel(entry.resolution)}</span>
                </div>
                {#if entry.history?.length}
                  <div class="mt-2 space-y-1 border-t border-border/70 pt-2">
                    {#each [...entry.history].reverse() as change, changeIndex (`${entry.id}-${change.at}-${changeIndex}`)}
                      <p class="leading-relaxed text-muted-foreground"><span class="font-medium text-foreground">{actionLabel(change.action)}</span>{#if change.at} · {formatTimestamp(change.at)}{/if}{#if change.note} — {change.note}{/if}</p>
                    {/each}
                  </div>
                {:else if entry.resolution_note || entry.confirmation_note}
                  <p class="mt-2 border-t border-border/70 pt-2 leading-relaxed text-muted-foreground">{entry.resolution_note || entry.confirmation_note}</p>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {:else}
      <p class="mt-3 text-sm text-muted-foreground">No explicit Sunday “yes” has been recorded for this person yet.</p>
    {/if}
  </section>
{/if}
