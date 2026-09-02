<script>
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';

  let {
    tasks = [],
    onComplete = () => {},
    onContact = () => {},
    title = 'Member Care',
  } = $props();

  const inactiveStatuses = new Set(['completed', 'complete', 'done', 'cancelled', 'canceled']);
  const careTasks = $derived(
    (tasks || [])
      .filter((task) => {
        const status = String(task?.status || '').toLowerCase();
        return task && !task.completed_at && !task.cancelled_at && !inactiveStatuses.has(status);
      })
      .slice()
      .sort((a, b) => dateValue(a.due_date) - dateValue(b.due_date)),
  );

  function parseDate(value) {
    if (!value) return null;
    const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateValue(value) {
    return parseDate(value)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  }

  function dueInfo(value) {
    const due = parseDate(value);
    if (!due) return { label: 'No due date', variant: 'default' };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const days = Math.round((dueDay.getTime() - today.getTime()) / 86400000);

    if (days < 0) {
      const count = Math.abs(days);
      return { label: `${count} day${count === 1 ? '' : 's'} overdue`, variant: 'danger' };
    }
    if (days === 0) return { label: 'Check in today', variant: 'warning' };
    if (days === 1) return { label: 'Check in tomorrow', variant: 'info' };
    return {
      label: `Check in ${due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
      variant: 'default',
    };
  }

  function personName(person) {
    return [person?.first_name, person?.last_name].filter(Boolean).join(' ').trim() || 'Unnamed member';
  }

  function leaderName(leader) {
    if (!leader) return null;
    if (typeof leader === 'string') return leader;
    return leader.name || [leader.first_name, leader.last_name].filter(Boolean).join(' ').trim() || null;
  }

  function careReason(task) {
    if (task.reason) return task.reason;
    const labels = {
      member_care: 'Pastoral check-in',
      absence: 'Unexpected absence',
      welfare: 'Welfare check-in',
      visitation: 'Arrange a visit',
      prayer: 'Prayer follow-up',
    };
    return labels[task.task_type] || 'Member care check-in';
  }

  function safePhone(value) {
    if (!value) return null;
    const raw = String(value).trim();
    const hasPlus = raw.startsWith('+');
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 7) return null;
    return `${hasPlus ? '+' : ''}${digits}`;
  }

  function whatsAppPhone(value) {
    return safePhone(value)?.replace(/\D/g, '') || null;
  }
</script>

<section aria-labelledby="member-care-title" class="space-y-4">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 id="member-care-title" class="text-lg font-semibold text-foreground">{title}</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Check in with regular members who may need support or pastoral care.
      </p>
    </div>
    <Badge variant={careTasks.length > 0 ? 'warning' : 'default'}>{careTasks.length} to check in</Badge>
  </div>

  {#if careTasks.length === 0}
    <div class="rounded-xl border border-dashed border-border bg-card/50 px-5 py-10 text-center" role="status">
      <svg class="mx-auto h-8 w-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3s-4.5 4.03-4.5 9 2.015 9 4.5 9Zm0 0a8.963 8.963 0 01-5.262-1.703M12 21a8.963 8.963 0 005.262-1.703M3.284 14.253A9.06 9.06 0 013 12c0-.778.099-1.533.284-2.253m0 4.506a12.318 12.318 0 017.216-2.182m10.216 2.182A9.06 9.06 0 0021 12c0-.778-.099-1.533-.284-2.253m0 4.506a12.318 12.318 0 00-7.216-2.182M3.284 9.747A12.318 12.318 0 0110.5 11.93m10.216-2.183A12.318 12.318 0 0013.5 11.93" />
      </svg>
      <p class="mt-3 text-sm font-medium text-foreground">No member-care check-ins are due.</p>
      <p class="mt-1 text-xs text-muted-foreground">Absence and pastoral tasks will appear here when action is needed.</p>
    </div>
  {:else}
    <div class="space-y-3" role="list" aria-label={title}>
      {#each careTasks as task, index (task._id || index)}
        {@const due = dueInfo(task.due_date)}
        {@const phone = safePhone(task.person?.phone)}
        {@const whatsApp = whatsAppPhone(task.person?.phone)}
        {@const owner = leaderName(task.assigned_leader)}
        <Card padding="md" role="listitem">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="truncate text-base font-semibold text-foreground">{personName(task.person)}</h3>
                <Badge size="sm" variant={due.variant}>{due.label}</Badge>
                {#if task.priority === 'urgent' || task.priority === 'high'}
                  <Badge size="sm" variant="danger">Priority care</Badge>
                {/if}
              </div>
              <p class="mt-2 text-sm text-foreground/90">{careReason(task)}</p>
              {#if owner}
                <p class="mt-1 text-xs text-muted-foreground">Assigned to {owner}</p>
              {/if}
            </div>

            <div class="flex flex-wrap items-center gap-2 lg:justify-end">
              {#if phone}
                <a
                  class="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                  href={`tel:${phone}`}
                  onclick={() => onContact(task)}
                  aria-label={`Call ${personName(task.person)}`}
                >Call</a>
              {/if}
              {#if whatsApp}
                <a
                  class="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                  href={`https://wa.me/${whatsApp}`}
                  target="_blank"
                  rel="noreferrer"
                  onclick={() => onContact(task)}
                  aria-label={`Message ${personName(task.person)} on WhatsApp`}
                >WhatsApp</a>
              {/if}
              <Button variant="ghost" size="sm" onclick={() => onContact(task)}>Add note</Button>
              <Button size="sm" onclick={() => onComplete(task)}>Care complete</Button>
            </div>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</section>
