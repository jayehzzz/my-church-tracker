<script>
  import { attentionRows } from '$lib/services/followUpAttention.js';
  import { guestInvitationName, activeGuestInvitation } from '$lib/services/expectedGuestLogic.js';
  import { Button, Badge } from '$lib/components/ui';
  let { workspace = {}, onOpen = () => {}, onManageInvitation = null, onDateChange = () => {}, onPrevious = () => {}, onNext = () => {}, onCurrent = () => {}, onConfirm = () => {}, onAddGuest = null } = $props();
  let search = $state('');
  let expanded = $state('');
  const name = person => person?.attention_kind === 'guest_invitation' ? guestInvitationName(person) : person?.name || [person?.preferred_name || person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Person unavailable';
  const id = person => String(person?._id || person?.id || '');
  const rows = $derived(attentionRows(workspace, 'expected-sunday'));
  const available = $derived(Array.isArray(workspace.attendance_forecast?.expected_person_ids) && rows.length === Number(workspace.attendance_forecast?.expected_total || 0));
  const visible = $derived(rows.filter(row => [name(row), row.phone, worker(row), invitation(row)?.inviter_name].filter(Boolean).join(' ').toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => name(a).localeCompare(name(b))));
  function invitation(row) {
    return row.attention_kind === 'guest_invitation' ? row : (workspace.guest_invitations || []).find(item => String(item.person_id) === id(row) && activeGuestInvitation(item));
  }
  function worker(row) {
    const leader = row.assigned_leader;
    return leader ? name(leader) : invitation(row)?.leader_name || '';
  }
  function confirmed(row) {
    return (workspace.sunday_commitments || []).some(item => String(item.person_id || item.person?._id || item.person?.id) === id(row) && (item.response || 'yes') === 'yes' && (item.resolution || 'pending') === 'pending' && !item.entered_in_error)
      || row.attendance_plan?.status === 'confirmed';
  }
  $effect(() => { workspace.service_date; expanded = ''; });
</script>

<section class="space-y-4" aria-labelledby="expected-people-title">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div><h2 id="expected-people-title" class="text-xl font-semibold">Expected for Sunday</h2><p class="mt-1 text-sm text-muted-foreground">Everyone confirmed or reported coming, counted once. Tentative invitations and recorded results are excluded.</p></div>
    <div class="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onclick={onConfirm}>Confirm people</Button>{#if onAddGuest}<Button size="sm" onclick={onAddGuest}>Add guest</Button>{/if}</div>
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <Button size="sm" variant="ghost" onclick={onPrevious}>Previous Sunday</Button>
    <label class="text-sm">Sunday <input aria-label="Expected Sunday date" type="date" value={workspace.service_date} onchange={event => onDateChange(event.currentTarget.value)} class="ml-1 rounded-lg border border-border bg-input px-2 py-2" /></label>
    <Button size="sm" variant="ghost" onclick={onNext}>Next Sunday</Button>
    <Button size="sm" variant="secondary" onclick={onCurrent}>This Sunday</Button>
  </div>
  <div class="overflow-hidden rounded-xl border border-border bg-card">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
      <p class="font-semibold" role="status" aria-label="Expected people count">{available ? `${visible.length}${search ? ` of ${rows.length}` : ''} ${rows.length === 1 ? 'person' : 'people'} expected` : 'Expected list unavailable'}</p>
      <label class="w-full sm:w-72"><span class="sr-only">Search expected people</span><input type="search" bind:value={search} placeholder="Search name, phone or worker" class="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm" /></label>
    </div>
    {#if !available}<p class="p-6 text-sm text-destructive" role="alert">The expected list could not be verified. Refresh to try again.</p>
    {:else}
      <ul class="divide-y divide-border" aria-label="People expected for Sunday">
        {#each visible as row (id(row))}
          {@const guest = invitation(row)}
          <li class="px-4 py-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="min-w-0 flex-1">
                {#if row.unavailable}<p class="font-semibold">Person unavailable</p>
                {:else}<button type="button" class="break-words text-left font-semibold hover:text-primary hover:underline" onclick={() => row.attention_kind === 'guest_invitation' ? expanded = expanded === id(row) ? '' : id(row) : onOpen(row)}>{row.attention_kind === 'guest_invitation' ? guestInvitationName(row) : name(row)}</button>{/if}
                <p class="mt-1 text-xs text-muted-foreground">{worker(row) ? `Worker: ${worker(row)}` : 'No worker assigned'}{#if guest?.inviter_name} · Invited by {guest.inviter_name}{/if}</p>
              </div>
              <Badge size="sm" variant={confirmed(row) ? 'success' : 'info'}>{confirmed(row) ? 'Personally confirmed' : 'Reported coming'}</Badge>
              {#if !row.unavailable}<Button size="sm" variant="ghost" onclick={() => row.attention_kind === 'guest_invitation' ? expanded = expanded === id(row) ? '' : id(row) : onOpen(row)}>{row.attention_kind === 'guest_invitation' ? 'View invitation' : 'View person'}</Button>{/if}
            </div>
            {#if expanded === id(row) && guest}
              <div class="mt-3 space-y-2 rounded-lg bg-secondary/30 p-3 text-sm">
                <p>{guest.name_unknown ? 'Name and details pending.' : 'Guest details saved; person profile not yet linked.'}</p>
                {#if guest.phone}<a href={`tel:${guest.phone}`} class="block text-primary hover:underline">Call {guest.phone}</a>{/if}
                {#if guest.email}<a href={`mailto:${guest.email}`} class="block text-primary hover:underline">{guest.email}</a>{/if}
                {#if guest.note}<p class="break-words">{guest.note}</p>{/if}
                {#if onManageInvitation}<Button size="sm" variant="secondary" onclick={() => onManageInvitation(guest)}>Edit invitation</Button>{/if}
              </div>
            {/if}
          </li>
        {:else}<li class="p-8 text-center text-sm text-muted-foreground">{search ? 'No expected people match your search.' : 'No one is confirmed or reported coming for this Sunday yet.'}</li>{/each}
      </ul>
    {/if}
  </div>
</section>
