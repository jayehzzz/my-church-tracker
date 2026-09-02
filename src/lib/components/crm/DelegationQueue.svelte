<script>
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';

  let {
    contacts = [],
    leaders = [],
    today = '',
    assigningId = '',
    onAssign = () => {},
    onOpen = () => {},
  } = $props();

  let personSearch = $state('');
  let leaderSearch = $state('');
  let selectedLeaderId = $state('');
  let dueDate = $state('');

  const matchingContacts = $derived(
    (contacts || []).filter((contact) => {
      const query = personSearch.trim().toLowerCase();
      if (!query) return true;
      return `${personName(contact)} ${contact.phone || ''} ${contact.invited_by_name || ''}`
        .toLowerCase()
        .includes(query);
    }),
  );
  const matchingLeaders = $derived(
    (leaders || []).filter((leader) => personName(leader).toLowerCase().includes(leaderSearch.trim().toLowerCase())),
  );

  $effect(() => {
    if (!dueDate && today) dueDate = today;
    const availableIds = new Set(matchingLeaders.map((leader) => String(personId(leader))));
    if (!selectedLeaderId || !availableIds.has(String(selectedLeaderId))) {
      selectedLeaderId = matchingLeaders[0] ? String(personId(matchingLeaders[0])) : '';
    }
  });

  function personId(person) {
    return person?._id || person?.id;
  }

  function personName(person) {
    return [person?.preferred_name || person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Unnamed person';
  }

  function isFresh(contact) {
    if (!contact?.contact_date) return false;
    const captured = new Date(`${contact.contact_date}T00:00:00`);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const age = Math.floor((start.getTime() - captured.getTime()) / 86400000);
    return age >= 0 && age <= 14;
  }
</script>

<section aria-labelledby="delegation-title" class="space-y-4">
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h2 id="delegation-title" class="text-lg font-semibold text-foreground">Unassigned people</h2>
      <p class="mt-1 text-sm text-muted-foreground">Search the full evangelism handoff list, choose a leader, then assign each person.</p>
    </div>
    <Badge variant="default">{contacts.length} unassigned</Badge>
  </div>

  <Card padding="none" class="overflow-hidden">
    <div class="grid grid-cols-1 gap-3 border-b border-border p-4 lg:grid-cols-[1fr_1fr_220px]">
      <label>
        <span class="mb-1.5 block text-xs font-medium text-muted-foreground">Search people</span>
        <input type="search" bind:value={personSearch} placeholder="Name, phone or inviter" class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" />
      </label>
      <label>
        <span class="mb-1.5 block text-xs font-medium text-muted-foreground">Search leaders</span>
        <input type="search" bind:value={leaderSearch} placeholder="Leader name" class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" />
      </label>
      <label>
        <span class="mb-1.5 block text-xs font-medium text-muted-foreground">First follow-up date</span>
        <input type="date" min={today} bind:value={dueDate} class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground" />
      </label>
    </div>

    <div class="border-b border-border px-4 py-3">
      <label class="flex flex-col gap-1.5 sm:flex-row sm:items-center">
        <span class="text-sm font-medium text-foreground">Assign to</span>
        <select bind:value={selectedLeaderId} class="min-w-64 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">
          {#each matchingLeaders as leader (personId(leader))}
            <option value={personId(leader)}>{personName(leader)}</option>
          {/each}
        </select>
      </label>
      {#if matchingLeaders.length === 0}<p class="mt-2 text-xs text-destructive">No leader matches that search.</p>{/if}
    </div>

    {#if matchingContacts.length === 0}
      <p class="px-5 py-10 text-center text-sm text-muted-foreground">No unassigned people match this search.</p>
    {:else}
      <div class="max-h-[34rem] divide-y divide-border overflow-y-auto" role="list" aria-label="Unassigned evangelism contacts">
        {#each matchingContacts as contact (personId(contact))}
          <div class="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="listitem">
            <div class="min-w-0">
              <button type="button" class="truncate text-left text-sm font-medium text-foreground hover:underline" onclick={() => onOpen(contact)}>{personName(contact)}</button>
              <p class="mt-1 text-xs text-muted-foreground">{isFresh(contact) ? 'Fresh · first 14 days' : 'Older · over 14 days'} · {contact.phone || 'No phone number'}</p>
            </div>
            <Button
              size="sm"
              loading={String(assigningId) === String(personId(contact))}
              disabled={!selectedLeaderId || !dueDate}
              onclick={() => onAssign(contact, selectedLeaderId, dueDate)}
            >Assign</Button>
          </div>
        {/each}
      </div>
    {/if}
  </Card>
</section>
