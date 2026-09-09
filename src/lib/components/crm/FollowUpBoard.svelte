<script>
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  /**
   * Weekly follow-up list for leaders.
   *
   * Every row has the same shape: who, which worker owns them, what to do and
   * when. Rows are grouped by urgency (Needs a worker, Overdue, Today, This
   * week). Includes direct click-to-call/WhatsApp, 1-click speed logging,
   * batch assignment, and real-time search/filters.
   */
  let {
    unassigned = [],
    tasks = [],
    commitments = [],
    leaders = [],
    today = '',
    weekEnd = '',
    view = 'list',
    assigningId = '',
    quickLoggingTaskId = '',
    onComplete = () => {},
    onQuickNoAnswer = () => {},
    onAssign = () => {},
    onBatchAssign = () => {},
    onOpen = () => {},
  } = $props();

  let expandedGroups = $state([]);
  let assignDate = $state('');
  let chosenLeaderByPerson = $state({});
  let searchQuery = $state('');
  let urgencyFilter = $state('all');
  let selectedUnassigned = $state([]);
  let batchLeaderId = $state('');

  $effect(() => {
    if (!assignDate && today) assignDate = today;
    if (!batchLeaderId && leaders[0]) batchLeaderId = String(personId(leaders[0]));
  });

  function personId(person) {
    return person?._id || person?.id;
  }

  function personName(person) {
    return (
      person?.name ||
      [person?.preferred_name || person?.first_name, person?.last_name]
        .filter(Boolean)
        .join(' ') ||
      'Unnamed person'
    );
  }

  function initials(person) {
    const name = personName(person);
    const parts = name.split(' ').filter(Boolean);
    return (
      (parts[0]?.[0] || '') + (parts.length > 1 ? parts.at(-1)[0] : '')
    ).toUpperCase() || '?';
  }

  function ownerName(entry) {
    const owner = entry.task?.assigned_leader || entry.person?.assigned_leader;
    return (
      owner?.name ||
      [owner?.preferred_name || owner?.first_name, owner?.last_name]
        .filter(Boolean)
        .join(' ') ||
      ''
    );
  }

  function cleanPhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/[^\d+]/g, '');
  }

  function whatsAppUrl(phone, person) {
    const clean = cleanPhone(phone).replace(/^\+/, '');
    if (!clean) return '';
    const firstName = (person?.preferred_name || person?.first_name || personName(person)).split(' ')[0] || 'there';
    const text = encodeURIComponent(
      `Hi ${firstName}, hope you're having a blessed week! Reaching out from church to check in on you.`,
    );
    return `https://wa.me/${clean}?text=${text}`;
  }

  function shortDate(value, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
    if (!value) return '';
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', options);
  }

  function dueLabel(task) {
    if (!task?.due_date) return 'No date';
    if (task.due_date < today) {
      const days = daysSince(task.due_date);
      return `Overdue · ${days ? `${days}d ago` : shortDate(task.due_date, { day: 'numeric', month: 'short' })}`;
    }
    if (task.due_date === today) return 'Today';
    return shortDate(task.due_date);
  }

  function actionLabel(task) {
    const labels = {
      first_contact: 'First conversation',
      follow_up: 'Call or message',
      sunday_confirmation: 'Confirm Sunday',
      reengagement: 'Review again',
    };
    return labels[task?.task_type] || 'Call or message';
  }

  function daysSince(value) {
    if (!value || !today) return null;
    const captured = new Date(`${value}T00:00:00`);
    const current = new Date(`${today}T00:00:00`);
    return Math.floor((current.getTime() - captured.getTime()) / 86400000);
  }

  function isFresh(person) {
    const age = daysSince(person?.contact_date);
    return age !== null && age >= 0 && age <= 14;
  }

  function leaderFor(person) {
    const chosen = chosenLeaderByPerson[String(personId(person))];
    return chosen || (leaders[0] ? String(personId(leaders[0])) : '');
  }

  function chooseLeader(person, leaderId) {
    chosenLeaderByPerson = { ...chosenLeaderByPerson, [String(personId(person))]: leaderId };
  }

  function toggleSelectUnassigned(id) {
    const strId = String(id);
    selectedUnassigned = selectedUnassigned.includes(strId)
      ? selectedUnassigned.filter((item) => item !== strId)
      : [...selectedUnassigned, strId];
  }

  function toggleSelectAllUnassigned(entries) {
    const allIds = entries.map((e) => String(personId(e.person)));
    const allSelected = allIds.every((id) => selectedUnassigned.includes(id));
    selectedUnassigned = allSelected
      ? selectedUnassigned.filter((id) => !allIds.includes(id))
      : Array.from(new Set([...selectedUnassigned, ...allIds]));
  }

  function handleBatchAssignSubmit() {
    if (!selectedUnassigned.length || !batchLeaderId) return;
    onBatchAssign(selectedUnassigned, batchLeaderId, assignDate);
    selectedUnassigned = [];
  }

  const promiseByPerson = $derived(
    new Map(
      (commitments || [])
        .filter(
          (item) =>
            (item.response || 'yes') === 'yes' &&
            (item.resolution || 'pending') === 'pending',
        )
        .map((item) => [String(personId(item.person) || item.person_id), item]),
    ),
  );

  function chips(entry) {
    const person = entry.person || {};
    const list = [];
    const promise = promiseByPerson.get(String(personId(person)));
    if (promise) {
      list.push({
        id: 'promise',
        variant: 'info',
        text: `Said yes for ${shortDate(promise.gathering_date || promise.service_date, { weekday: 'short', day: 'numeric', month: 'short' }) || 'Sunday'}`,
      });
    }
    if ((person.attended_meetings || person.promises_kept || 0) > 0) {
      list.push({
        id: 'attended',
        variant: 'success',
        text: `Attended ${person.attended_meetings || person.promises_kept} ${(person.attended_meetings || person.promises_kept) === 1 ? 'Sunday' : 'Sundays'}`,
      });
    }
    if (isFresh(person)) list.push({ id: 'fresh', variant: 'default', text: 'New contact' });
    if (person.should_move_to_later) {
      list.push({
        id: 'review',
        variant: 'warning',
        text: `Review: ${person.recommendation_reason}`,
      });
    }
    return list;
  }

  function sortEntries(entries) {
    return entries.slice().sort((a, b) => {
      const left = a.task?.due_date || '9999';
      const right = b.task?.due_date || '9999';
      return left === right
        ? personName(a.person).localeCompare(personName(b.person))
        : left.localeCompare(right);
    });
  }

  function filterBySearch(entries) {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => {
      const name = personName(entry.person).toLowerCase();
      const phone = String(entry.person?.phone || '').toLowerCase();
      const inviter = String(entry.person?.invited_by_name || '').toLowerCase();
      const worker = ownerName(entry).toLowerCase();
      return (
        name.includes(query) ||
        phone.includes(query) ||
        inviter.includes(query) ||
        worker.includes(query)
      );
    });
  }

  const openTasks = $derived(
    (tasks || [])
      .filter((task) => !task.status || task.status === 'open')
      .filter((task) => !weekEnd || !task.due_date || task.due_date <= weekEnd),
  );

  const rawNeedsWorker = $derived(sortEntries((unassigned || []).map((person) => ({ person, task: null }))));
  const rawOverdue = $derived(sortEntries(openTasks.filter((task) => task.due_date && task.due_date < today).map((task) => ({ person: task.person, task }))));
  const rawDueToday = $derived(sortEntries(openTasks.filter((task) => task.due_date === today).map((task) => ({ person: task.person, task }))));
  const rawThisWeek = $derived(sortEntries(openTasks.filter((task) => !task.due_date || task.due_date > today).map((task) => ({ person: task.person, task }))));

  const needsWorker = $derived(filterBySearch(rawNeedsWorker));
  const overdue = $derived(filterBySearch(rawOverdue));
  const dueToday = $derived(filterBySearch(rawDueToday));
  const thisWeek = $derived(filterBySearch(rawThisWeek));

  const groups = $derived([
    { id: 'unassigned', title: 'Needs a worker', description: 'Choose who owns this person', tone: 'warning', entries: needsWorker, rawCount: rawNeedsWorker.length },
    { id: 'overdue', title: 'Overdue', description: 'The planned date has passed', tone: 'danger', entries: overdue, rawCount: rawOverdue.length },
    { id: 'today', title: 'Today', description: 'Planned for today', tone: 'default', entries: dueToday, rawCount: rawDueToday.length },
    { id: 'week', title: 'This week', description: `Planned before ${shortDate(weekEnd) || 'next week'}`, tone: 'default', entries: thisWeek, rawCount: rawThisWeek.length },
  ]);

  const total = $derived(groups.reduce((sum, group) => sum + group.entries.length, 0));
  const totalRaw = $derived(rawNeedsWorker.length + rawOverdue.length + rawDueToday.length + rawThisWeek.length);

  const boardGroups = $derived(
    groups.filter((group) => urgencyFilter === 'all' || group.id === urgencyFilter),
  );

  const listGroups = $derived(
    groups.filter((group) => {
      if (urgencyFilter !== 'all' && group.id !== urgencyFilter) return false;
      return group.entries.length > 0;
    }),
  );

  function isExpanded(groupId) {
    return expandedGroups.includes(groupId);
  }

  function toggleGroup(groupId) {
    expandedGroups = isExpanded(groupId)
      ? expandedGroups.filter((id) => id !== groupId)
      : [...expandedGroups, groupId];
  }

  function visibleEntries(group, limit) {
    return isExpanded(group.id) ? group.entries : group.entries.slice(0, limit);
  }
</script>

{#snippet directCommButtons(person)}
  {#if person?.phone}
    <div class="flex items-center gap-1.5 shrink-0">
      <a
        href="tel:{cleanPhone(person.phone)}"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary/40 text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-colors"
        title="Call {personName(person)}"
        aria-label="Call {personName(person)}"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      </a>
      <a
        href={whatsAppUrl(person.phone, person)}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary/40 text-muted-foreground hover:border-success/50 hover:bg-success/10 hover:text-success transition-colors"
        title="WhatsApp {personName(person)}"
        aria-label="WhatsApp {personName(person)}"
      >
        <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.53 1.942.812 2.791.812 3.179 0 5.766-2.587 5.766-5.768 0-3.18-2.587-5.766-5.766-5.766zm9.969 5.766c0 5.517-4.484 9.999-10 9.999-1.748 0-3.385-.45-4.819-1.238l-5.181 1.357 1.385-5.048c-.86-1.488-1.385-3.224-1.385-5.07 0-5.516 4.484-10 10-10 5.516 0 10 4.484 10 10z"/>
        </svg>
      </a>
    </div>
  {/if}
{/snippet}

{#snippet assignControls(entry, compact = false)}
  <div class="flex {compact ? 'flex-col' : 'flex-wrap items-center'} gap-2">
    <label class="min-w-0 {compact ? 'w-full' : ''}">
      <span class="sr-only">Worker for {personName(entry.person)}</span>
      <select
        value={leaderFor(entry.person)}
        onchange={(event) => chooseLeader(entry.person, event.currentTarget.value)}
        class="w-full rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-sm text-foreground {compact ? '' : 'sm:w-44'}"
      >
        {#each leaders as leader (personId(leader))}
          <option value={String(personId(leader))}>{personName(leader)}</option>
        {/each}
      </select>
    </label>
    <Button
      size="sm"
      class={compact ? 'w-full' : ''}
      loading={String(assigningId) === String(personId(entry.person))}
      disabled={!leaderFor(entry.person) || !assignDate}
      onclick={() => onAssign(entry.person, leaderFor(entry.person), assignDate)}
    >
      Assign
    </Button>
  </div>
{/snippet}

{#snippet chipRow(entry)}
  {#if chips(entry).length}
    <div class="mt-1.5 flex flex-wrap gap-1.5">
      {#each chips(entry) as chip (chip.id)}
        <Badge size="sm" variant={chip.variant}>{chip.text}</Badge>
      {/each}
    </div>
  {/if}
{/snippet}

{#snippet rowOpenHint(entry)}
  <span class="sr-only">Open {personName(entry.person)} details</span>
{/snippet}

{#snippet listRow(entry, group)}
  <div
    class="grid cursor-pointer gap-3 px-4 py-3 md:grid-cols-[1.6fr_1fr_auto] md:items-center md:gap-4 border-l-4 transition-colors hover:bg-secondary/20 {group.id === 'overdue' ? 'border-l-destructive bg-destructive/[0.02]' : group.id === 'today' ? 'border-l-primary bg-primary/[0.02]' : group.id === 'unassigned' ? 'border-l-amber-500 bg-amber-500/[0.02]' : 'border-l-transparent'}"
    onclick={(event) => {
      if (event.target.closest('button, a, input, select, textarea, label')) return;
      onOpen(entry.person);
    }}
    onkeydown={(event) => {
      if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      onOpen(entry.person);
    }}
    role="button"
    tabindex="0"
  >
    {@render rowOpenHint(entry)}
    <div class="flex items-start gap-3 min-w-0">
      {#if group.id === 'unassigned'}
        <input
          type="checkbox"
          checked={selectedUnassigned.includes(String(personId(entry.person)))}
          onchange={() => toggleSelectUnassigned(personId(entry.person))}
          class="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
          aria-label="Select {personName(entry.person)}"
        />
      {/if}

      <span
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold {group.id === 'overdue' ? 'bg-destructive/15 text-destructive' : group.id === 'today' ? 'bg-primary/15 text-primary' : 'bg-secondary text-foreground'}"
      >
        {initials(entry.person)}
      </span>

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="truncate text-left text-sm font-semibold text-foreground hover:underline"
            onclick={() => onOpen(entry.person)}
          >
            {personName(entry.person)}
          </button>
          {@render directCommButtons(entry.person)}
        </div>

        <p class="mt-0.5 truncate text-xs text-muted-foreground">
          {#if entry.person?.phone}
            <span class="font-mono text-foreground/80">{entry.person.phone}</span> ·
          {/if}
          {#if entry.task}
            {ownerName(entry) || 'No worker'} · {actionLabel(entry.task)}
          {:else}
            {entry.person?.invited_by_name ? `invited by ${entry.person.invited_by_name}` : 'Waiting for a worker'}
          {/if}
        </p>

        {@render chipRow(entry)}
      </div>
    </div>

    {#if entry.task}
      <div class="min-w-0">
        <span class="block text-sm {group.id === 'overdue' ? 'font-semibold text-destructive' : 'text-foreground'}">
          {dueLabel(entry.task)}
        </span>
        <span class="text-xs text-muted-foreground truncate block">
          {actionLabel(entry.task)}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          class="text-xs text-muted-foreground hover:text-foreground"
          loading={String(quickLoggingTaskId) === String(entry.task._id || entry.task.id)}
          onclick={() => onQuickNoAnswer(entry.task)}
          title="Quickly record 'No answer' and reschedule for +2 days"
        >
          ⚡ No answer
        </Button>
        <Button size="sm" onclick={() => onComplete(entry.task)}>
          Log call
        </Button>
      </div>
    {:else}
      <span class="text-xs text-muted-foreground">
        {isFresh(entry.person)
          ? `Captured ${daysSince(entry.person.contact_date)} day${daysSince(entry.person.contact_date) === 1 ? '' : 's'} ago`
          : 'Needs an assigned worker'}
      </span>
      {@render assignControls(entry)}
    {/if}
  </div>
{/snippet}

{#snippet card(entry, group)}
  <article
    class="rounded-xl border border-border bg-background p-3.5 border-l-4 shadow-sm transition-all {group.id === 'overdue' ? 'border-l-destructive' : group.id === 'today' ? 'border-l-primary' : group.id === 'unassigned' ? 'border-l-amber-500' : 'border-l-border'}"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-2.5 min-w-0">
        {#if group.id === 'unassigned'}
          <input
            type="checkbox"
            checked={selectedUnassigned.includes(String(personId(entry.person)))}
            onchange={() => toggleSelectUnassigned(personId(entry.person))}
            class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            aria-label="Select {personName(entry.person)}"
          />
        {/if}
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold {group.id === 'overdue' ? 'bg-destructive/15 text-destructive' : group.id === 'today' ? 'bg-primary/15 text-primary' : 'bg-secondary text-foreground'}"
        >
          {initials(entry.person)}
        </span>
        <button
          type="button"
          class="min-w-0 truncate text-left text-sm font-semibold text-foreground hover:underline"
          onclick={() => onOpen(entry.person)}
        >
          {personName(entry.person)}
        </button>
      </div>
      {@render directCommButtons(entry.person)}
    </div>

    <div class="mt-2 text-xs text-muted-foreground space-y-0.5">
      {#if entry.person?.phone}
        <p class="font-mono text-foreground/80">{entry.person.phone}</p>
      {/if}
      <p class="truncate">
        {entry.task ? `${ownerName(entry) || 'No worker'} · ${actionLabel(entry.task)}` : entry.person?.invited_by_name ? `Invited by ${entry.person.invited_by_name}` : 'Awaiting worker'}
      </p>
      {#if entry.task}
        <p class="font-medium {group.id === 'overdue' ? 'text-destructive' : 'text-foreground'}">
          {dueLabel(entry.task)}
        </p>
      {/if}
    </div>

    {@render chipRow(entry)}

    <div class="mt-3 border-t border-border/70 pt-2.5">
      {#if entry.task}
        <div class="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            class="flex-1 text-xs text-muted-foreground"
            loading={String(quickLoggingTaskId) === String(entry.task._id || entry.task.id)}
            onclick={() => onQuickNoAnswer(entry.task)}
            title="Quick record 'No answer'"
          >
            ⚡ No answer
          </Button>
          <Button size="sm" class="flex-1" onclick={() => onComplete(entry.task)}>
            Log call
          </Button>
        </div>
      {:else}
        {@render assignControls(entry, true)}
      {/if}
    </div>
  </article>
{/snippet}

<section aria-labelledby="weekly-board-title" class="space-y-4">
  <!-- Board Header & Quick Filters Bar -->
  <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <h2 id="weekly-board-title" class="text-lg font-semibold text-foreground">
        This week
      </h2>
      <p class="mt-0.5 text-xs text-muted-foreground">
        Everyone has one worker and one scheduled next touchpoint. Work from top to bottom.
      </p>
    </div>

    <!-- Search & Urgency Pill Filters -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Search Input -->
      <label class="relative min-w-48 sm:w-60">
        <span class="sr-only">Search follow-up</span>
        <input
          type="search"
          bind:value={searchQuery}
          placeholder="Search name, phone, worker…"
          class="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none"
        />
      </label>

      <!-- Urgency Filter Pills -->
      <div class="flex rounded-lg border border-border bg-secondary/40 p-0.5 text-xs">
        <button
          type="button"
          class="rounded-md px-2.5 py-1 font-semibold transition-colors {urgencyFilter === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => urgencyFilter = 'all'}
        >
          All ({totalRaw})
        </button>
        {#if rawOverdue.length}
          <button
            type="button"
            class="rounded-md px-2.5 py-1 font-semibold transition-colors {urgencyFilter === 'overdue' ? 'bg-destructive/20 text-destructive shadow-sm' : 'text-destructive/80 hover:text-destructive'}"
            onclick={() => urgencyFilter = 'overdue'}
          >
            Overdue ({rawOverdue.length})
          </button>
        {/if}
        {#if rawDueToday.length}
          <button
            type="button"
            class="rounded-md px-2.5 py-1 font-semibold transition-colors {urgencyFilter === 'today' ? 'bg-primary/20 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => urgencyFilter = 'today'}
          >
            Today ({rawDueToday.length})
          </button>
        {/if}
        {#if rawNeedsWorker.length}
          <button
            type="button"
            class="rounded-md px-2.5 py-1 font-semibold transition-colors {urgencyFilter === 'unassigned' ? 'bg-amber-500/20 text-amber-500 shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => urgencyFilter = 'unassigned'}
          >
            Needs Worker ({rawNeedsWorker.length})
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Batch Action Toolbar for Unassigned Contacts -->
  {#if rawNeedsWorker.length > 0 && selectedUnassigned.length > 0}
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground">
      <div class="flex items-center gap-2">
        <span class="font-semibold text-amber-500">
          {selectedUnassigned.length} selected
        </span>
        <span>Assign selected to:</span>
        <select
          bind:value={batchLeaderId}
          class="rounded-lg border border-border bg-secondary px-2 py-1 text-xs text-foreground"
        >
          {#each leaders as leader (personId(leader))}
            <option value={String(personId(leader))}>{personName(leader)}</option>
          {/each}
        </select>
        <span>First call:</span>
        <input
          type="date"
          min={today}
          bind:value={assignDate}
          class="rounded-lg border border-border bg-secondary px-2 py-1 text-xs text-foreground"
        />
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="text-xs text-muted-foreground hover:underline"
          onclick={() => selectedUnassigned = []}
        >
          Cancel
        </button>
        <Button size="sm" onclick={handleBatchAssignSubmit}>
          Assign {selectedUnassigned.length} contacts
        </Button>
      </div>
    </div>
  {/if}

  {#if total === 0}
    <div class="rounded-xl border border-border bg-card px-5 py-14 text-center text-sm text-muted-foreground">
      {#if searchQuery || urgencyFilter !== 'all'}
        <p>No follow-up matches this filter or search.</p>
        <button
          type="button"
          class="mt-2 text-xs font-semibold text-primary hover:underline"
          onclick={() => { searchQuery = ''; urgencyFilter = 'all'; }}
        >
          Clear filters
        </button>
      {:else}
        <p>Nothing is waiting this week. New contacts and planned calls will appear here.</p>
      {/if}
    </div>
  {:else if view === 'board'}
    <div class="grid gap-4 xl:grid-cols-4">
      {#each boardGroups as group (group.id)}
        <section
          class="min-w-0 rounded-xl border border-border bg-card/60 p-3"
          aria-labelledby={`column-${group.id}`}
        >
          <div class="mb-3 flex items-start justify-between gap-2 px-1">
            <div>
              <h3 id={`column-${group.id}`} class="text-sm font-semibold text-foreground">
                {group.title}
              </h3>
              <p class="mt-0.5 text-xs text-muted-foreground">{group.description}</p>
            </div>
            <Badge size="sm" variant={group.entries.length ? group.tone : 'default'}>
              {group.entries.length}
            </Badge>
          </div>

          <div class="space-y-2">
            {#each visibleEntries(group, 6) as entry, index (`${group.id}-${personId(entry.person)}-${index}`)}
              {@render card(entry, group)}
            {:else}
              <p class="rounded-lg border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
                No one here
              </p>
            {/each}

            {#if group.entries.length > 6}
              <Button
                size="sm"
                variant="ghost"
                class="w-full"
                onclick={() => toggleGroup(group.id)}
              >
                {isExpanded(group.id) ? 'Show fewer' : `Show ${group.entries.length - 6} more`}
              </Button>
            {/if}
          </div>
        </section>
      {/each}
    </div>
  {:else}
    <div class="space-y-4">
      {#each listGroups as group (group.id)}
        <section
          class="overflow-hidden rounded-xl border border-border bg-card"
          aria-labelledby={`group-${group.id}`}
        >
          <div class="flex items-center justify-between gap-3 border-b border-border bg-secondary/30 px-4 py-2.5">
            <div class="flex items-center gap-2">
              {#if group.id === 'unassigned' && group.entries.length > 1}
                <button
                  type="button"
                  class="text-xs font-semibold text-primary hover:underline"
                  onclick={() => toggleSelectAllUnassigned(group.entries)}
                >
                  {group.entries.every((e) => selectedUnassigned.includes(String(personId(e.person)))) ? 'Deselect all' : 'Select all'}
                </button>
                <span class="text-muted-foreground">·</span>
              {/if}
              <h3 id={`group-${group.id}`} class="text-sm font-semibold text-foreground">
                {group.title}
              </h3>
              <Badge size="sm" variant={group.tone}>{group.entries.length}</Badge>
            </div>
            <p class="text-xs text-muted-foreground">{group.description}</p>
          </div>

          <div class="divide-y divide-border">
            {#each visibleEntries(group, 8) as entry, index (`${group.id}-${personId(entry.person)}-${index}`)}
              {@render listRow(entry, group)}
            {/each}
          </div>

          {#if group.entries.length > 8}
            <div class="flex justify-center border-t border-border px-4 py-2">
              <Button size="sm" variant="ghost" onclick={() => toggleGroup(group.id)}>
                {isExpanded(group.id) ? 'Show fewer' : `Show ${group.entries.length - 8} more`}
              </Button>
            </div>
          {/if}
        </section>
      {/each}
    </div>
  {/if}
</section>
