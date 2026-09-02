<script>
  import { goto } from "$app/navigation";
  import { Badge, Button, Card } from "$lib/components/ui";
  import {
    formatInteraction,
    formatOutcome,
    isOpenCareTask,
    localDate,
    recordId,
  } from "$lib/utils/pastoralCare.js";

  let { person, visitations = [], tasks = [] } = $props();

  const sortedVisits = $derived(
    visitations.slice().sort((a, b) => String(b.visit_date || "").localeCompare(String(a.visit_date || ""))),
  );
  const lastVisit = $derived(sortedVisits[0] || null);
  const openTasks = $derived(
    tasks
      .filter(isOpenCareTask)
      .slice()
      .sort((a, b) => String(a.due_date || "9999-12-31").localeCompare(String(b.due_date || "9999-12-31"))),
  );
  const nextTask = $derived(openTasks[0] || null);
  const personId = $derived(recordId(person));

  function formatDate(value) {
    if (!value) return "Not recorded";
    return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
</script>

<Card padding="none" class="overflow-hidden">
  <div class="border-b border-border bg-secondary/20 px-5 py-4 sm:px-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-semibold text-foreground">Pastoral care</h2>
          {#if nextTask}
            <Badge size="sm" variant={nextTask.due_date && nextTask.due_date < localDate() ? "danger" : "warning"}>
              {nextTask.due_date && nextTask.due_date < localDate() ? "Overdue" : "Action open"}
            </Badge>
          {:else}
            <Badge size="sm" variant="success">No open actions</Badge>
          {/if}
        </div>
        <p class="mt-1 text-sm text-muted-foreground">Care activity and outstanding work linked to this profile.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onclick={() => goto(`/visitation?personId=${encodeURIComponent(personId)}&action=schedule`)}
        >
          Schedule care
        </Button>
        <Button
          size="sm"
          onclick={() => goto(`/visitation?personId=${encodeURIComponent(personId)}&action=log`)}
        >
          Log care
        </Button>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
    <div class="p-5">
      <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last care</span>
      <p class="mt-2 font-semibold text-foreground">{formatDate(lastVisit?.visit_date)}</p>
      <p class="mt-1 text-xs text-muted-foreground">
        {lastVisit ? `${formatInteraction(lastVisit.interaction_type)} · ${formatOutcome(lastVisit.outcome)}` : "No interaction recorded"}
      </p>
    </div>
    <div class="p-5">
      <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next action</span>
      <p class="mt-2 font-semibold text-foreground">{formatDate(nextTask?.due_date)}</p>
      <p class="mt-1 text-xs text-muted-foreground">{nextTask?.reason || "Nothing currently assigned"}</p>
    </div>
    <div class="p-5">
      <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Care coverage</span>
      <p class="mt-2 font-semibold text-foreground">{visitations.length} interaction{visitations.length === 1 ? "" : "s"}</p>
      <button
        type="button"
        class="mt-1 text-xs font-medium text-primary hover:underline"
        onclick={() => goto(`/visitation?view=history&personId=${encodeURIComponent(personId)}`)}
      >
        Open Pastoral Care →
      </button>
    </div>
  </div>
</Card>
