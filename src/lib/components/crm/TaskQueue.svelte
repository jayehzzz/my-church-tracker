<script>
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';

  let {
    tasks = [],
    onComplete = () => {},
    onOpen = () => {},
    title = 'My Tasks',
    description = 'Contact the newest people first, then record the outcome and next action.',
    initialLimit = null,
    showFreshness = true,
  } = $props();

  let expanded = $state(false);

  const completedStatuses = new Set(['completed', 'complete', 'done', 'cancelled', 'canceled']);
  const priorityOrder = { urgent: 0, high: 1, normal: 2, medium: 2, low: 3 };

  const actionableTasks = $derived(
    (tasks || [])
      .filter((task) => {
        const status = String(task?.status || '').toLowerCase();
        return task && !task.completed_at && !task.cancelled_at && !completedStatuses.has(status);
      })
      .slice()
      .sort((a, b) => {
        const dueDifference = dateValue(a.due_date) - dateValue(b.due_date);
        if (dueDifference !== 0) return dueDifference;
        return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      }),
  );
  const titleId = $derived(`task-queue-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`);
  const visibleTasks = $derived(
    !initialLimit || expanded ? actionableTasks : actionableTasks.slice(0, initialLimit),
  );
  const hiddenTaskCount = $derived(Math.max(0, actionableTasks.length - visibleTasks.length));

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateValue(value) {
    return parseDate(value)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  }

  function startOfToday() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  function dueInfo(value) {
    const due = parseDate(value);
    if (!due) return { label: 'No due date', variant: 'default' };

    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const days = Math.round((dueDay.getTime() - startOfToday().getTime()) / 86400000);

    if (days < 0) {
      const count = Math.abs(days);
      return { label: `${count} day${count === 1 ? '' : 's'} overdue`, variant: 'danger' };
    }
    if (days === 0) return { label: 'Due today', variant: 'default' };
    if (days === 1) return { label: 'Due tomorrow', variant: 'default' };
    return {
      label: `Due ${due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
      variant: 'default',
    };
  }

  function freshnessInfo(value) {
    const contacted = parseDate(value);
    if (!contacted) return 'Contact date unknown';

    const days = Math.max(0, Math.floor((startOfToday().getTime() - contacted.getTime()) / 86400000));
    if (days === 0) return 'Added today';
    if (days === 1) return 'Added yesterday';
    if (days <= 14) return `Added ${days} days ago`;
    return `Added ${Math.floor(days / 7)} weeks ago`;
  }

  function personName(person) {
    const name = [person?.first_name, person?.last_name].filter(Boolean).join(' ').trim();
    return name || 'Unnamed person';
  }

  function leaderName(leader) {
    if (!leader) return null;
    if (typeof leader === 'string') return leader;
    return leader.name || [leader.first_name, leader.last_name].filter(Boolean).join(' ') || null;
  }

  function readableLabel(value, fallback) {
    if (!value) return fallback;
    return String(value)
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function safePhone(value) {
    if (!value) return null;
    const raw = String(value).trim();
    const hasPlus = raw.startsWith('+');
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 7) return null;
    return `${hasPlus ? '+' : ''}${digits}`;
  }

  function whatsappPhone(value) {
    const phone = safePhone(value);
    return phone ? phone.replace(/\D/g, '') : null;
  }
</script>

<section aria-labelledby={titleId} class="space-y-4 rounded-2xl border border-border bg-card/40 p-4 sm:p-5">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 id={titleId} class="text-lg font-semibold text-foreground">{title}</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        {description}
      </p>
    </div>
    <Badge variant="default">
      {actionableTasks.length} open
    </Badge>
  </div>

  {#if actionableTasks.length === 0}
    <div
      class="rounded-xl border border-dashed border-border bg-card/50 px-5 py-10 text-center"
      role="status"
    >
      <p class="text-sm font-medium text-foreground">No follow-up tasks are due.</p>
      <p class="mt-1 text-xs text-muted-foreground">New assignments and scheduled follow-ups will appear here.</p>
    </div>
  {:else}
    <div class="space-y-3" role="list" aria-label={title}>
      {#each visibleTasks as task, index (task._id || index)}
        {@const due = dueInfo(task.due_date)}
        {@const freshness = freshnessInfo(task.person?.contact_date)}
        {@const phone = safePhone(task.person?.phone)}
        {@const whatsApp = whatsappPhone(task.person?.phone)}
        {@const owner = leaderName(task.assigned_leader)}
        <Card padding="md" class="overflow-hidden" role="listitem">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" class="truncate text-left text-base font-semibold text-foreground hover:underline" onclick={() => onOpen(task.person)}>
                  {personName(task.person)}
                </button>
                <Badge size="sm" variant={due.variant}>{due.label}</Badge>
                {#if task.priority === 'urgent' || task.priority === 'high'}
                  <span class="text-xs font-medium text-destructive">{readableLabel(task.priority, 'High priority')}</span>
                {/if}
                {#if task.automation_key === 'quarterly_reengagement' || String(task.reason || '').includes('90-day')}
                  <Badge size="sm" variant="default">90-day check-in</Badge>
                {/if}
              </div>

              <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {#if showFreshness}<span>{freshness}</span>{/if}
                <span>{readableLabel(task.task_type, 'Follow up')}</span>
                {#if owner}<span>Assigned to {owner}</span>{/if}
                {#if task.person?.follow_up_status}
                  <span>{readableLabel(task.person.follow_up_status, '')}</span>
                {/if}
              </div>

              {#if task.reason}
                <p class="mt-2 text-sm text-foreground/90">{task.reason}</p>
              {/if}
            </div>

            <div class="flex flex-wrap items-center gap-2 lg:justify-end">
              {#if phone}
                <a
                  class="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                  href={`tel:${phone}`}
                  aria-label={`Call ${personName(task.person)}`}
                >
                  Call
                </a>
              {/if}
              {#if whatsApp}
                <a
                  class="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                  href={`https://wa.me/${whatsApp}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Message ${personName(task.person)} on WhatsApp`}
                >
                  WhatsApp
                </a>
              {/if}
              <Button size="sm" onclick={() => onComplete(task)}>Log outcome</Button>
            </div>
          </div>
        </Card>
      {/each}
    </div>
    {#if initialLimit && actionableTasks.length > initialLimit}
      <div class="flex justify-center border-t border-border/70 pt-3">
        <Button size="sm" variant="ghost" onclick={() => (expanded = !expanded)}>
          {expanded ? "Show fewer" : `Show ${hiddenTaskCount} more`}
        </Button>
      </div>
    {/if}
  {/if}
</section>
