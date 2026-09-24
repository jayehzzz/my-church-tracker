<script>
  import Button from '$lib/components/ui/Button.svelte';

  /**
   * Worker table for leaders. The headline columns are the ones a leader uses
   * to judge a worker: how many people they worked and whether their Sunday
   * promises turned into attendance. Activity detail sits behind an expand.
   */
  let { stats = [], period = 'week', onPeriodChange = () => {}, onViewLeader = () => {}, onMetric = () => {} } = $props();

  let expandedId = $state('');

  const number = (value) => Number(value) || 0;
  const leaderId = (stat) => String(stat?.leader_id || stat?._id || stat?.leader?._id || stat?.leader?.id || '');
  const leaderName = (stat) => stat?.leader_name || stat?.name || 'Unnamed worker';
  const attentionCount = (stat) => number(stat.overdue_tasks) + number(stat.people_without_next_action);

  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'W';
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase() || 'W';
  }

  function conversionRate(stat) {
    const promises = number(stat.sunday_promises);
    const attended = number(stat.promises_attended);
    if (!promises) return null;
    return Math.round((attended / promises) * 100);
  }

  function toggle(stat) {
    expandedId = expandedId === leaderId(stat) ? '' : leaderId(stat);
  }
</script>

<section aria-labelledby="worker-assessment-title" class="space-y-4">
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h2 id="worker-assessment-title" class="text-lg font-semibold text-foreground">Workers</h2>
      <p class="mt-1 text-sm text-muted-foreground">People worked and Sunday results for the period. Use View list to open that worker’s people, or Details for their activity breakdown.</p>
    </div>
    <div class="flex rounded-lg border border-border bg-secondary/40 p-1" aria-label="Assessment period">
      <button type="button" class="rounded-md px-3 py-1.5 text-xs font-semibold {period === 'week' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}" onclick={() => onPeriodChange('week')}>This week</button>
      <button type="button" class="rounded-md px-3 py-1.5 text-xs font-semibold {period === 'month' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}" onclick={() => onPeriodChange('month')}>This month</button>
    </div>
  </div>

  <div class="overflow-x-auto rounded-xl border border-border bg-card">
    <table class="w-full min-w-[640px] text-left">
      <thead class="border-b border-border bg-secondary/40 text-xs text-muted-foreground">
        <tr>
          <th class="px-4 py-3 font-medium">Worker</th>
          <th class="px-3 py-3 font-medium">People worked</th>
          <th class="px-3 py-3 font-medium">Said yes to Sunday</th>
          <th class="px-3 py-3 font-medium">Attended</th>
          <th class="px-3 py-3 font-medium">Didn’t attend</th>
          <th class="px-3 py-3 font-medium">Needs attention</th>
          <th class="px-3 py-3"><span class="sr-only">Details</span></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border text-sm">
        {#each stats as stat (leaderId(stat))}
          <tr class="hover:bg-secondary/20">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2.5">
                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                  {initials(leaderName(stat))}
                </span>
                <span class="font-semibold text-foreground">{leaderName(stat)}</span>
              </div>
            </td>
            <td class="px-3 py-3 text-foreground"><button type="button" class="font-semibold underline decoration-dotted underline-offset-4" onclick={() => onMetric(stat, 'period_unique_contacts')}>{number(stat.period_unique_contacts)}<span class="sr-only"> {number(stat.period_unique_contacts) === 1 ? 'person' : 'people'} worked by {leaderName(stat)}</span></button></td>
            <td class="px-3 py-3 text-foreground"><button type="button" class="font-semibold underline decoration-dotted underline-offset-4" onclick={() => onMetric(stat, 'sunday_promises')}>{number(stat.sunday_promises)}<span class="sr-only"> Sunday promises for {leaderName(stat)}</span></button></td>
            <td class="px-3 py-3">
              <button type="button" class="font-semibold text-success underline decoration-dotted underline-offset-4" onclick={() => onMetric(stat, 'promises_attended')}>{number(stat.promises_attended)}<span class="sr-only"> attended promises for {leaderName(stat)}</span></button>
              {#if conversionRate(stat) !== null}
                <span class="ml-1 text-xs text-muted-foreground font-normal">({conversionRate(stat)}%)</span>
              {/if}
            </td>
            <td class="px-3 py-3 {number(stat.promises_missed) ? 'font-semibold text-destructive' : 'text-foreground'}"><button type="button" class="underline decoration-dotted underline-offset-4" onclick={() => onMetric(stat, 'promises_missed')}>{number(stat.promises_missed)}<span class="sr-only"> missed promises for {leaderName(stat)}</span></button></td>
            <td class="px-3 py-3 {attentionCount(stat) ? 'font-semibold text-warning-foreground' : 'text-muted-foreground'}"><button type="button" class="underline decoration-dotted underline-offset-4" onclick={() => onMetric(stat, 'attention')}>{attentionCount(stat) ? `${attentionCount(stat)} ${attentionCount(stat) === 1 ? 'item' : 'items'}` : 'None'}<span class="sr-only"> needing attention for {leaderName(stat)}</span></button></td>
            <td class="px-3 py-3 text-right">
              <div class="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onclick={() => onViewLeader(leaderId(stat))}>View list</Button>
                <Button size="sm" variant="ghost" onclick={() => toggle(stat)}>{expandedId === leaderId(stat) ? 'Hide' : 'Details'}</Button>
              </div>
            </td>
          </tr>
          {#if expandedId === leaderId(stat)}
            <tr class="bg-secondary/10">
              <td colspan="7" class="px-4 py-3">
                <dl class="grid gap-3 text-sm sm:grid-cols-4">
                  {#each [['meaningful_conversations', 'Real conversations'], ['serious_candidates', 'Serious now'], ['overdue_tasks', 'Overdue calls'], ['people_without_next_action', 'People with no next call']] as [key, label]}
                    <div><dt class="text-xs text-muted-foreground">{label}</dt><dd><button type="button" class="font-medium text-foreground underline decoration-dotted underline-offset-4" onclick={() => onMetric(stat, key)}>{number(stat[key])}<span class="sr-only"> {label.toLowerCase()} for {leaderName(stat)}</span></button></dd></div>
                  {/each}
                </dl>
              </td>
            </tr>
          {/if}
        {:else}
          <tr><td colspan="7" class="px-5 py-12 text-center text-sm text-muted-foreground">No worker activity is available for this period.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
