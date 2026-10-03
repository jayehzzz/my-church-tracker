<script>
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  let { rows = null, serviceDate = '', canDelegate = false, saving = false, onRespond = async () => ({}), onOpen = () => {}, onCorrect = () => {}, onAssignments = () => {}, onDateChange = () => {} } = $props();
  let search = $state(''), filter = $state('all');
  let editing = $state(null), response = $state('yes'), note = $state(''), saveError = $state('');
  let modalOpen = $state(false);
  const labels = { not_contacted: 'Not contacted', yes: 'Yes', maybe: 'Maybe', no: 'No', cancelled: 'Cancelled' };
  const counts = $derived(Object.fromEntries(Object.keys(labels).map(key => [key, (rows || []).filter(row => row.sunday_response === key).length])));
  const unassigned = $derived((rows || []).filter(row => !row.assigned_leader_id).length);
  const visible = $derived((rows || []).filter(row => (!search.trim() || `${row.name} ${row.assigned_leader_name || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
    && (filter === 'all' || filter === 'unassigned' && !row.assigned_leader_id || row.sunday_response === filter)));
  function edit(row) { editing = row; response = ['yes', 'maybe', 'no'].includes(row.sunday_response) ? row.sunday_response : 'yes'; note = ''; saveError = ''; modalOpen = true; }
  async function save() {
    const result = await onRespond(editing, response, note);
    if (result?.error) saveError = result.error.message || 'Sunday response could not be saved.';
    else { modalOpen = false; editing = null; }
  }
  $effect(() => { serviceDate; modalOpen = false; editing = null; });
  const dated = value => value ? new Date(value.includes('T') ? value : `${value}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
</script>

<section aria-labelledby="confirmation-title" class="space-y-4 mb-8">
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div><h2 id="confirmation-title" class="text-lg font-semibold">My people to confirm</h2><p class="text-sm text-muted-foreground">Responsibility stays assigned across Sundays. Responses apply only to {dated(serviceDate)}.</p></div>
    <label class="text-sm">Sunday date<input type="date" value={serviceDate} disabled={saving} onchange={event => onDateChange(event.currentTarget.value)} class="ml-2 rounded-lg border border-border bg-input p-2" /></label>
  </div>
  <p class="text-sm text-muted-foreground">Only a dated Yes counts as confirmed. Not contacted, Maybe, No and cancellations are excluded. Actual attendance is recorded separately.</p>
  {#if rows === null}<p role="alert" class="text-sm text-destructive">The Sunday confirmation list is unavailable. Reload after the matching backend is ready.</p>
  {:else}
    <div class="flex flex-wrap gap-2 text-sm" aria-label="Confirmation counts">
      {#each Object.entries(labels) as [key, label]}<Badge>{label}: {counts[key]}</Badge>{/each}
      {#if canDelegate}<Badge>Needs assignment: {unassigned}</Badge><Button size="sm" variant="secondary" onclick={onAssignments}>Review assignments</Button>{/if}
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <label class="text-sm">Search confirmation list<input type="search" bind:value={search} class="mt-1 w-full rounded-lg border border-border bg-input p-2" /></label>
      <label class="text-sm">Sunday response filter<select bind:value={filter} class="mt-1 w-full rounded-lg border border-border bg-input p-2"><option value="all">Everyone</option>{#each Object.entries(labels) as [key, label]}<option value={key}>{label}</option>{/each}{#if canDelegate}<option value="unassigned">Needs assignment</option>{/if}</select></label>
    </div>
    <ul class="max-h-[36rem] space-y-2 overflow-y-auto" aria-label="People to confirm this Sunday">
      {#each visible as row (row._id || row.id)}
        <li class="rounded-xl border border-border bg-card p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 flex-1"><button type="button" class="break-words text-left font-semibold hover:underline" onclick={() => onOpen(row)}>{row.name}</button><p class="text-xs text-muted-foreground">{['member', 'leader'].includes(row.member_status) ? 'Member' : 'Contact / non-member'} · Responsible: {row.assigned_leader_name || 'Needs assignment'}</p></div>
            <Badge>{labels[row.sunday_response]}</Badge>
          </div>
          {#if row.response_note}<p class="mt-2 break-words text-sm text-muted-foreground">{dated(row.response_note_at)} · {row.response_note}</p>{/if}
          {#if row.actual_result}<p class="mt-2 text-sm">Actual result: {row.actual_result === 'attended' ? 'Attended' : 'Did not attend'} · use history to correct a mistake.</p>{/if}
          {#if row.contact_blocked}<p class="mt-2 text-sm text-muted-foreground">{row.is_paused ? 'Follow-up paused. Reactivate explicitly before contacting.' : 'Asked not to be contacted.'}</p>{/if}
          <div class="mt-3 flex flex-wrap gap-2">
            {#if !row.actual_result && row.assigned_leader_id && !row.contact_blocked}<Button size="sm" variant="secondary" disabled={saving} onclick={() => edit(row)}>Record response for {row.name}</Button>{/if}
            <Button size="sm" variant="ghost" onclick={() => onOpen(row)}>View history</Button>
            {#if row.sunday_commitment}<Button size="sm" variant="ghost" disabled={saving} onclick={() => onCorrect({ ...row.sunday_commitment, person: row }, 'mistake')}>Correct a mistake</Button>{/if}
          </div>
        </li>
      {:else}<li class="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">{rows.length ? 'No people match this filter.' : 'No people are assigned to this leader yet.'}</li>{/each}
    </ul>
  {/if}
</section>

<Modal bind:isOpen={modalOpen} title="Sunday response" size="lg">
  {#if editing}<form class="space-y-4" onsubmit={event => { event.preventDefault(); void save(); }}>
    <p>{editing.name} · {dated(serviceDate)}</p>
    <label class="block text-sm">Response<select bind:value={response} class="mt-1 w-full rounded-lg border border-border bg-input p-2" disabled={saving}><option value="yes">Yes</option><option value="maybe">Maybe</option><option value="no">No</option></select></label>
    <label class="block text-sm">Note or reason (optional)<textarea bind:value={note} maxlength="2000" rows="3" class="mt-1 w-full rounded-lg border border-border bg-input p-2" disabled={saving}></textarea></label>
    <p class="text-xs text-muted-foreground">Changing a Yes to Maybe or No keeps its cancellation history. Use “Correct a mistake” for an entry made in error.</p>
    {#if saveError}<p role="alert" class="text-sm text-destructive">{saveError}</p>{/if}
    <div class="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={saving} onclick={() => modalOpen = false}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save response'}</Button></div>
  </form>{/if}
</Modal>
