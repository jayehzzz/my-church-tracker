<script>
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  /**
   * Sunday view. Three visually distinct groups: newcomers who said yes
   * (owned by follow-up), regular members (expected unless marked away) and
   * members who are away. A summary strip at the top gives the counts and
   * lets the leader focus on one group. Before the service the lists are about
   * confirming; after it they are about recording who actually came.
   */
  let {
    roster = [],
    commitments = [],
    results = [],
    forecast = {},
    today = '',
    savingIds = [],
    onStatusChange = () => {},
    onResolve = () => {},
    onOpen = () => {},
    onPreviousSunday = () => {},
    onNextSunday = () => {},
    onCurrentSunday = () => {},
  } = $props();

  let memberSearch = $state('');
  let focus = $state('all');
  let lastSundayOpen = $state(false);

  function personId(person) {
    return person?._id || person?.id;
  }

  function personName(person) {
    return person?.name || [person?.preferred_name || person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Unnamed person';
  }

  function initials(person) {
    const parts = personName(person).split(' ').filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase() || '?';
  }

  function cleanPhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/[^\d+]/g, '');
  }

  function whatsAppSundayUrl(phone, person) {
    const clean = cleanPhone(phone).replace(/^\+/, '');
    if (!clean) return '';
    const firstName = (person?.preferred_name || person?.first_name || personName(person)).split(' ')[0] || 'there';
    const text = encodeURIComponent(
      `Hi ${firstName}, looking forward to seeing you at church this Sunday! Let me know if you need any directions or a ride.`
    );
    return `https://wa.me/${clean}?text=${text}`;
  }

  function daysBetweenDates(first, second) {
    if (!first || !second) return null;
    const f = new Date(`${first}T00:00:00`);
    const s = new Date(`${second}T00:00:00`);
    return Math.round((s.getTime() - f.getTime()) / 86400000);
  }

  function ownerName(person) {
    const owner = person?.assigned_leader;
    return owner?.name || [owner?.preferred_name || owner?.first_name, owner?.last_name].filter(Boolean).join(' ') || '';
  }

  function isSaving(person) {
    return savingIds.includes(String(personId(person)));
  }

  function longDate(value) {
    if (!value) return 'Sunday';
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function shortDate(value) {
    if (!value) return '';
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function memberStatus(person) {
    const status = person.attendance_plan?.status;
    if (status === 'attended') return 'Attended';
    if (status === 'absent') return 'Didn’t attend';
    if (status === 'confirmed') return 'Confirmed';
    return status === 'away' ? 'Away' : 'Expected';
  }

  function newcomerStatus(commitment) {
    if (commitment.resolution === 'attended') return 'Attended';
    if (commitment.resolution === 'no_show') return 'Didn’t attend';
    if (commitment.resolution === 'cancelled') return 'Cancelled';
    return 'Said yes';
  }

  function statusVariant(status) {
    if (status === 'Attended') return 'success';
    if (status === 'Didn’t attend' || status === 'Cancelled') return 'danger';
    if (status === 'Confirmed') return 'info';
    return 'default';
  }

  function plural(count, singular, pluralWord = `${singular}s`) {
    return `${count} ${count === 1 ? singular : pluralWord}`;
  }

  const serviceDate = $derived(forecast?.service_date || '');
  const afterService = $derived(Boolean(today && serviceDate && serviceDate <= today));
  const countdownLabel = $derived.by(() => {
    if (!today || !serviceDate) return '';
    const diff = daysBetweenDates(today, serviceDate);
    if (diff === null) return '';
    if (diff === 0) return 'Service is today';
    if (diff === 1) return 'Tomorrow';
    if (diff > 1) return `In ${diff} days`;
    if (diff === -1) return 'Yesterday';
    return `${Math.abs(diff)} days ago`;
  });

  const newcomers = $derived(
    (commitments || [])
      .filter((commitment) => (commitment.response || 'yes') === 'yes')
      .map((commitment) => ({ commitment, person: commitment.person, status: newcomerStatus(commitment) }))
      .sort((a, b) => personName(a.person).localeCompare(personName(b.person))),
  );
  const newcomerPending = $derived(newcomers.filter((row) => row.status === 'Said yes').length);
  const newcomerAttended = $derived(newcomers.filter((row) => row.status === 'Attended').length);
  const newcomerMissed = $derived(newcomers.filter((row) => row.status !== 'Said yes' && row.status !== 'Attended').length);
  const newcomerActive = $derived(newcomers.filter((row) => row.status !== 'Cancelled').length);

  const members = $derived((roster || []).map((person) => ({ person, status: memberStatus(person) })));
  const expectedMembers = $derived(members.filter((row) => row.status !== 'Away').sort((a, b) => personName(a.person).localeCompare(personName(b.person))));
  const awayMembers = $derived(members.filter((row) => row.status === 'Away').sort((a, b) => personName(a.person).localeCompare(personName(b.person))));
  const searchedMembers = $derived(expectedMembers.filter((row) => personName(row.person).toLowerCase().includes(memberSearch.trim().toLowerCase())));
  const memberConfirmed = $derived(expectedMembers.filter((row) => row.status === 'Confirmed').length);
  const memberPending = $derived(expectedMembers.filter((row) => row.status === 'Expected' || row.status === 'Confirmed').length);
  const memberAttended = $derived(expectedMembers.filter((row) => row.status === 'Attended').length);
  const memberMissed = $derived(expectedMembers.filter((row) => row.status === 'Didn’t attend').length);

  const expectedTotal = $derived(expectedMembers.length + newcomerActive);
  const recordedTotal = $derived(newcomerAttended + newcomerMissed + memberAttended + memberMissed);
  const attendedTotal = $derived(newcomerAttended + memberAttended);

  const tiles = $derived([
    {
      id: 'newcomer',
      label: 'Newcomers who said yes',
      count: newcomerActive,
      accent: 'bg-primary',
      detail: afterService
        ? (newcomerPending ? `${plural(newcomerPending, 'result')} still to record` : `${newcomerAttended} attended · ${newcomerMissed} did not`)
        : (newcomers.length ? 'Record who came after the service' : 'Added when a worker logs a yes'),
      done: newcomerAttended + newcomerMissed,
      total: newcomerActive,
    },
    {
      id: 'member',
      label: 'Regular members expected',
      count: expectedMembers.length,
      accent: 'bg-foreground',
      detail: afterService
        ? (memberPending ? `${plural(memberPending, 'result')} still to record` : `${memberAttended} attended · ${memberMissed} did not`)
        : `${plural(memberConfirmed, 'person has', 'people have')} personally confirmed`,
      done: memberAttended + memberMissed,
      total: expectedMembers.length,
    },
    {
      id: 'away',
      label: 'Away this Sunday',
      count: awayMembers.length,
      accent: 'bg-muted-foreground',
      detail: awayMembers.length ? 'Not counted in the expected total' : 'No member is marked away',
      done: 0,
      total: 0,
    },
  ]);

  const lastSunday = $derived.by(() => {
    const previous = (results || []).filter((result) => !serviceDate || (result.gathering_date && result.gathering_date < serviceDate));
    if (!previous.length) return null;
    const date = previous.map((result) => result.gathering_date).sort().at(-1);
    const rows = previous.filter((result) => result.gathering_date === date);
    return {
      date,
      rows,
      attended: rows.filter((result) => result.resolution === 'attended').length,
      missed: rows.filter((result) => result.resolution !== 'attended').length,
    };
  });

  function toggleFocus(id) {
    focus = focus === id ? 'all' : id;
  }

  function showSection(id) {
    return focus === 'all' || focus === id;
  }
</script>

{#snippet avatar(person, tone)}
  <span aria-hidden="true" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold {tone === 'newcomer' ? 'bg-primary/15 text-primary' : tone === 'away' ? 'border border-dashed border-border text-muted-foreground' : 'bg-secondary text-foreground'}">{initials(person)}</span>
{/snippet}

{#snippet sectionHeader(id, title, description, count, tone)}
  <div class="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
    <div class="flex min-w-0 items-center gap-3">
      <span aria-hidden="true" class="h-8 w-1 shrink-0 rounded-full {tone === 'newcomer' ? 'bg-primary' : tone === 'away' ? 'bg-muted-foreground/50' : 'bg-foreground'}"></span>
      <div class="min-w-0">
        <h3 id={id} class="text-base font-semibold text-foreground">{title}</h3>
        <p class="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
    <span class="shrink-0 text-2xl font-semibold tabular-nums text-foreground">{count}</span>
  </div>
{/snippet}

<div class="space-y-6">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{afterService ? 'Record attendance' : 'Expected this Sunday'}</p>
      <div class="mt-1 flex flex-wrap items-center gap-2.5">
        <h2 class="text-2xl font-semibold text-foreground">{longDate(serviceDate)}</h2>
        {#if countdownLabel}
          <Badge size="sm" variant={afterService ? 'default' : 'info'}>{countdownLabel}</Badge>
        {/if}
      </div>
      <p class="mt-1 text-sm text-muted-foreground">
        {#if afterService}
          {recordedTotal} of {expectedTotal} recorded · {attendedTotal} attended so far
        {:else}
          {plural(expectedTotal, 'person', 'people')} expected in total
        {/if}
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="ghost" onclick={onPreviousSunday}>Previous Sunday</Button>
      <Button size="sm" variant="secondary" onclick={onCurrentSunday}>This Sunday</Button>
      <Button size="sm" variant="ghost" onclick={onNextSunday}>Next Sunday</Button>
    </div>
  </div>

  <div class="grid gap-3 sm:grid-cols-3" role="group" aria-label="Sunday summary">
    {#each tiles as tile (tile.id)}
      <button type="button" aria-pressed={focus === tile.id} onclick={() => toggleFocus(tile.id)} class="relative overflow-hidden rounded-xl border p-4 text-left transition-colors {focus === tile.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}">
        <span aria-hidden="true" class="absolute inset-y-0 left-0 w-1 {tile.accent}"></span>
        <p class="pl-2 text-xs font-medium text-muted-foreground">{tile.label}</p>
        <p class="mt-1 pl-2 text-3xl font-semibold tabular-nums text-foreground">{tile.count}</p>
        <p class="mt-1 pl-2 text-xs text-muted-foreground">{tile.detail}</p>
        {#if afterService && tile.total}
          <div class="mt-3 ml-2 h-1.5 overflow-hidden rounded-full bg-primary/15" role="progressbar" aria-label={`${tile.label} recorded`} aria-valuemin="0" aria-valuemax={tile.total} aria-valuenow={tile.done}>
            <div class="h-full rounded-full bg-primary" style={`width: ${Math.round((tile.done / tile.total) * 100)}%`}></div>
          </div>
        {/if}
      </button>
    {/each}
  </div>
  {#if focus !== 'all'}
    <p class="-mt-3 text-xs text-muted-foreground">Showing one group. <button type="button" class="font-medium text-foreground hover:underline" onclick={() => focus = 'all'}>Show all three</button></p>
  {/if}

  {#if showSection('newcomer')}
  <section aria-labelledby="newcomers-title" class="overflow-hidden rounded-xl border border-border bg-card">
    {@render sectionHeader('newcomers-title', 'Newcomers who said yes', afterService ? 'Record whether each newcomer came.' : 'Added when a worker logs a clear yes. Cancel if plans change.', newcomerActive, 'newcomer')}
    {#if newcomers.length === 0}
      <p class="px-5 py-10 text-center text-sm text-muted-foreground">No newcomer has said yes for this Sunday yet.</p>
    {:else}
      <div class="divide-y divide-border" role="list" aria-label="Newcomers expected this Sunday">
        {#each newcomers as row (row.commitment._id || row.commitment.id)}
          <div class="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between {row.status === 'Cancelled' ? 'opacity-60' : ''}" role="listitem">
            <div class="flex min-w-0 items-center gap-3">
              {@render avatar(row.person, 'newcomer')}
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <button type="button" class="truncate text-left text-sm font-semibold text-foreground hover:underline" onclick={() => onOpen(row.person)}>{personName(row.person)}</button>
                  {#if row.person?.phone}
                    <div class="flex items-center gap-1 shrink-0">
                      <a
                        href="tel:{cleanPhone(row.person.phone)}"
                        class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-secondary/40 text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-colors"
                        title="Call {personName(row.person)}"
                        aria-label="Call {personName(row.person)}"
                      >
                        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </a>
                      <a
                        href={whatsAppSundayUrl(row.person.phone, row.person)}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-secondary/40 text-muted-foreground hover:border-success/50 hover:bg-success/10 hover:text-success transition-colors"
                        title="Send Sunday WhatsApp reminder to {personName(row.person)}"
                        aria-label="Send Sunday WhatsApp reminder to {personName(row.person)}"
                      >
                        <svg class="h-3 w-3 fill-current" viewBox="0 0 24 24">
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.53 1.942.812 2.791.812 3.179 0 5.766-2.587 5.766-5.768 0-3.18-2.587-5.766-5.766-5.766zm9.969 5.766c0 5.517-4.484 9.999-10 9.999-1.748 0-3.385-.45-4.819-1.238l-5.181 1.357 1.385-5.048c-.86-1.488-1.385-3.224-1.385-5.07 0-5.516 4.484-10 10-10 5.516 0 10 4.484 10 10z"/>
                        </svg>
                      </a>
                    </div>
                  {/if}
                </div>
                <p class="mt-0.5 text-xs text-muted-foreground">Newcomer · {ownerName(row.person) || 'No worker'}</p>
              </div>
            </div>
            {#if afterService && row.status === 'Said yes'}
              <div class="flex shrink-0 flex-wrap gap-2" aria-label={`Record attendance for ${personName(row.person)}`}>
                <Button size="sm" onclick={() => onResolve(row.commitment, 'attended')}>Attended</Button>
                <Button size="sm" variant="secondary" onclick={() => onResolve(row.commitment, 'no_show')}>Didn’t attend</Button>
              </div>
            {:else if row.status === 'Said yes'}
              <div class="flex shrink-0 items-center gap-2">
                <Badge size="sm" variant="info" dot>Said yes</Badge>
                <Button size="sm" variant="ghost" onclick={() => onResolve(row.commitment, 'cancelled')}>Cancelled</Button>
              </div>
            {:else}
              <Badge size="sm" variant={statusVariant(row.status)} dot>{row.status}</Badge>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
    {#if lastSunday}
      <div class="border-t border-border bg-secondary/20 px-5 py-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs text-muted-foreground"><span class="font-medium text-foreground">Last Sunday, {shortDate(lastSunday.date)}:</span> {lastSunday.attended} attended · {lastSunday.missed} did not.</p>
          <Button size="sm" variant="ghost" onclick={() => lastSundayOpen = !lastSundayOpen}>{lastSundayOpen ? 'Hide' : 'Show names'}</Button>
        </div>
        {#if lastSundayOpen}
          <ul class="mt-2 grid gap-1 sm:grid-cols-2">
            {#each lastSunday.rows as result, index (result._id || result.id || index)}
              <li class="flex items-center justify-between gap-2 text-sm">
                <button type="button" class="truncate text-left text-foreground hover:underline" onclick={() => onOpen(result.person)}>{personName(result.person)}</button>
                <Badge size="sm" variant={result.resolution === 'attended' ? 'success' : 'danger'} dot>{result.resolution === 'attended' ? 'Attended' : 'Didn’t attend'}</Badge>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
  </section>
  {/if}

  {#if showSection('member')}
  <section aria-labelledby="members-title" class="overflow-hidden rounded-xl border border-border bg-card">
    {@render sectionHeader('members-title', 'Regular members', afterService ? 'Record who came. Members not marked are still expected.' : 'Expected unless marked away. Confirm the ones you have spoken to.', expectedMembers.length, 'member')}
    {#if expectedMembers.length > 6}
      <div class="border-b border-border bg-secondary/20 px-5 py-3">
        <label class="block sm:w-72">
          <span class="sr-only">Search members</span>
          <input type="search" bind:value={memberSearch} placeholder="Search members" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" />
        </label>
      </div>
    {/if}
    {#if searchedMembers.length === 0}
      <p class="px-5 py-10 text-center text-sm text-muted-foreground">{expectedMembers.length ? 'No members match this search.' : 'No regular members are expected.'}</p>
    {:else}
      <div class="max-h-[36rem] divide-y divide-border overflow-y-auto" role="list" aria-label="Regular members this Sunday">
        {#each searchedMembers as row (personId(row.person))}
          <div class="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between" role="listitem">
            <div class="flex min-w-0 items-center gap-3">
              {@render avatar(row.person, 'member')}
              <div class="min-w-0">
                <button type="button" class="truncate text-left text-sm font-semibold text-foreground hover:underline" onclick={() => onOpen(row.person)}>{personName(row.person)}</button>
                <p class="mt-0.5 text-xs text-muted-foreground">Regular member</p>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <Badge size="sm" variant={statusVariant(row.status)} dot>{row.status}</Badge>
              {#if afterService}
                {#if row.status !== 'Attended'}<Button size="sm" variant={row.status === 'Didn’t attend' ? 'ghost' : 'primary'} loading={isSaving(row.person)} onclick={() => onStatusChange(row.person, 'attended')}>Attended</Button>{/if}
                {#if row.status !== 'Didn’t attend'}<Button size="sm" variant="ghost" disabled={isSaving(row.person)} onclick={() => onStatusChange(row.person, 'absent')}>Didn’t attend</Button>{/if}
              {:else}
                <Button size="sm" variant={row.status === 'Confirmed' ? 'secondary' : 'ghost'} loading={isSaving(row.person)} onclick={() => onStatusChange(row.person, row.status === 'Confirmed' ? 'expected' : 'confirmed')}>{row.status === 'Confirmed' ? 'Unconfirm' : 'Confirm'}</Button>
                <Button size="sm" variant="ghost" disabled={isSaving(row.person)} onclick={() => onStatusChange(row.person, 'away')}>Mark away</Button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
  {/if}

  {#if showSection('away')}
  <section aria-labelledby="away-title" class="overflow-hidden rounded-xl border border-dashed border-border bg-card/60">
    {@render sectionHeader('away-title', 'Away this Sunday', 'Members who told us they will not be there. They are not in the expected total.', awayMembers.length, 'away')}
    {#if awayMembers.length === 0}
      <p class="px-5 py-8 text-center text-sm text-muted-foreground">No member is marked away. Use “Mark away” on a regular member to move them here.</p>
    {:else}
      <div class="divide-y divide-border" role="list" aria-label="Members away this Sunday">
        {#each awayMembers as row (personId(row.person))}
          <div class="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between" role="listitem">
            <div class="flex min-w-0 items-center gap-3">
              {@render avatar(row.person, 'away')}
              <div class="min-w-0">
                <button type="button" class="truncate text-left text-sm font-semibold text-muted-foreground hover:underline" onclick={() => onOpen(row.person)}>{personName(row.person)}</button>
                <p class="mt-0.5 text-xs text-muted-foreground">Regular member · away</p>
              </div>
            </div>
            <Button size="sm" variant="secondary" loading={isSaving(row.person)} onclick={() => onStatusChange(row.person, 'expected')}>Expected instead</Button>
          </div>
        {/each}
      </div>
    {/if}
  </section>
  {/if}
</div>
