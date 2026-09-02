<script>
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';

  let {
    contacts = [],
    onOpen = () => {},
  } = $props();

  let search = $state('');
  let filter = $state('active');
  let visibleLimit = $state(30);
  const matchingContacts = $derived(
    (contacts || []).filter((contact) => {
      const haystack = `${personName(contact)} ${contact.phone || ''} ${leaderName(contact.assigned_leader) || ''}`.toLowerCase();
      const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
      if (!matchesSearch) return false;
      if (filter === 'fresh') return isFresh(contact) && !isClosed(contact);
      if (filter === 'older') return !isFresh(contact) && !isClosed(contact);
      if (filter === 'unassigned') return !contact.assigned_leader_id && !contact.assigned_leader && !isClosed(contact);
      if (filter === 'closed') return isClosed(contact);
      return !isClosed(contact);
    }),
  );
  const visibleContacts = $derived(matchingContacts.slice(0, visibleLimit));

  $effect(() => {
    search;
    filter;
    visibleLimit = 30;
  });

  function parseDate(value) {
    if (!value) return null;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ? new Date(`${value}T00:00:00`)
      : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function ageInDays(value) {
    const date = parseDate(value);
    if (!date) return null;
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.max(0, Math.floor((start.getTime() - date.getTime()) / 86400000));
  }

  function personId(person) {
    return person?._id || person?.id;
  }

  function personName(person) {
    return [person?.preferred_name || person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Unnamed person';
  }

  function leaderName(leader) {
    if (!leader) return null;
    return leader.name || [leader.preferred_name || leader.first_name, leader.last_name].filter(Boolean).join(' ') || null;
  }

  function readable(value) {
    return value ? String(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'No status';
  }

  function formatDate(value) {
    const date = parseDate(value);
    if (!date) return 'No date set';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function isQuarterly(contact) {
    return contact?.next_task?.automation_key === 'quarterly_reengagement'
      || String(contact?.next_task?.reason || '').includes('90-day');
  }

  function isFresh(contact) {
    const age = ageInDays(contact?.contact_date);
    return age !== null && age <= 14;
  }

  function isClosed(contact) {
    return contact?.follow_up_status === 'closed'
      || ['do_not_contact', 'wrong_number', 'has_church'].includes(contact?.contact_category);
  }
</script>

<section aria-labelledby="people-directory-title" class="space-y-4">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h2 id="people-directory-title" class="text-lg font-semibold text-foreground">People</h2>
      <p class="mt-1 text-sm text-muted-foreground">The permanent evangelism contact list, with ownership and next actions.</p>
    </div>
    <label class="block sm:w-72">
      <span class="sr-only">Search people</span>
      <input
        type="search"
        bind:value={search}
        placeholder="Search name, phone or leader"
        class="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
      />
    </label>
  </div>

  <div class="flex flex-wrap items-center gap-2" aria-label="Filter people">
    <Button variant={filter === 'active' ? 'primary' : 'secondary'} size="sm" onclick={() => filter = 'active'} aria-pressed={filter === 'active'}>Active</Button>
    <Button variant={filter === 'fresh' ? 'primary' : 'secondary'} size="sm" onclick={() => filter = 'fresh'} aria-pressed={filter === 'fresh'}>Fresh</Button>
    <Button variant={filter === 'older' ? 'primary' : 'secondary'} size="sm" onclick={() => filter = 'older'} aria-pressed={filter === 'older'}>Older</Button>
    <Button variant={filter === 'unassigned' ? 'primary' : 'secondary'} size="sm" onclick={() => filter = 'unassigned'} aria-pressed={filter === 'unassigned'}>Needs owner</Button>
    <Button variant={filter === 'closed' ? 'primary' : 'secondary'} size="sm" onclick={() => filter = 'closed'} aria-pressed={filter === 'closed'}>Closed</Button>
    <span class="ml-auto text-xs text-muted-foreground">Showing {visibleContacts.length} of {matchingContacts.length}</span>
  </div>

  <Card padding="none" class="overflow-hidden">
    {#if visibleContacts.length === 0}
      <div class="px-5 py-10 text-center text-sm text-muted-foreground">No contacts match this search.</div>
    {:else}
      <div class="divide-y divide-border" role="list" aria-label="Evangelism contacts">
        {#each visibleContacts as contact (personId(contact))}
          {@const age = ageInDays(contact.contact_date)}
          {@const owner = leaderName(contact.assigned_leader)}
          <div class="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between" role="listitem">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" class="truncate text-left text-sm font-medium text-foreground hover:underline" onclick={() => onOpen(contact)}>{personName(contact)}</button>
                {#if age !== null && age <= 14}
                  <Badge size="sm" variant="default">Fresh · {age}d</Badge>
                {:else}
                  <Badge size="sm" variant="default">Older{age === null ? '' : ` · ${Math.floor(age / 7)}w`}</Badge>
                {/if}
                {#if isQuarterly(contact)}
                  <Badge size="sm" variant="default">90-day check-in</Badge>
                {/if}
                {#if contact.follow_up_status === 'closed'}
                  <Badge size="sm" variant="danger">Closed</Badge>
                {/if}
              </div>
              <p class="mt-1 text-xs text-muted-foreground">{contact.phone || 'No phone number'} · {owner ? `Owned by ${owner}` : 'Needs an owner'}</p>
            </div>

            <div class="min-w-0 lg:w-64">
              {#if contact.next_task}
                <p class="text-sm text-foreground">{readable(contact.next_task.task_type)}</p>
                <p class="mt-1 text-xs text-muted-foreground">Due {formatDate(contact.next_task.due_date)}</p>
              {:else}
                <p class="text-sm text-muted-foreground">No task scheduled</p>
              {/if}
            </div>

            <Button variant="secondary" size="sm" onclick={() => onOpen(contact)}>View history</Button>
          </div>
        {/each}
      </div>
      {#if visibleContacts.length < matchingContacts.length}
        <div class="flex justify-center border-t border-border px-5 py-4">
          <Button variant="secondary" size="sm" onclick={() => visibleLimit += 30}>
            Show 30 more
          </Button>
        </div>
      {/if}
    {/if}
  </Card>
</section>
