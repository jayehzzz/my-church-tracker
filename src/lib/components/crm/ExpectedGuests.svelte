<script>
  import { Button, Modal, Badge } from '$lib/components/ui';
  import GatheringAttendanceDialog from './GatheringAttendanceDialog.svelte';
  import { getAssignmentDirectory, saveExpectedGuest } from '$lib/services/followUpCrmService.js';
  import { activeGuestInvitation, guestInvitationKey, guestInvitationName, guestInvitationResult, guestInvitationVersion } from '$lib/services/expectedGuestLogic.js';
  let { rows = null, serviceDate = '', forecast = {}, canManage = false, today = '', onChanged = async () => {}, onOpen = () => {} } = $props();
  let modalOpen = $state(false), mode = $state('create'), editing = $state(null), saving = $state(false), error = $state(''), directoryError = $state(''), directoryLoading = $state(false);
  let directory = $state([]), search = $state(''), linkPerson = $state(''), changeReason = $state(''), enteredInError = $state(false);
  let form = $state(blank());
  let attendanceOpen = $state(false), attendanceGuest = $state(null), notice = $state('');
  let request = 0;
  const states = { tentative: 'Hoping to bring someone', coming: 'Reported coming', cancelled: 'Cancelled', no_show: 'Did not arrive', attended: 'Attendance recorded' };
  const visible = $derived((rows || []).filter(row => `${row.display_name || guestInvitationName(row)} ${row.inviter_name || ''}`.toLowerCase().includes(search.trim().toLowerCase())));
  const comingCount = $derived(new Set((rows || []).filter(activeGuestInvitation).map(guestInvitationKey)).size);
  const leaders = $derived(directory.filter(person => person.member_status === 'leader'));
  const dated = value => value ? new Date(value.includes('T') ? value : `${value}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  function blank() { return { serviceDate, nameUnknown: false, firstName: '', lastName: '', phone: '', email: '', inviterId: '', leaderId: '', state: 'tentative', reportSource: 'guest_report', note: '' }; }
  async function open(kind, row = null) {
    const key = ++request;
    mode = kind; editing = row; error = ''; directoryError = ''; changeReason = ''; enteredInError = Boolean(row?.entered_in_error); linkPerson = ''; notice = '';
    form = row ? { serviceDate: row.service_date, nameUnknown: row.name_unknown, firstName: row.first_name || '', lastName: row.last_name || '', phone: row.phone || '', email: row.email || '', inviterId: row.inviter_id || '', leaderId: row.responsible_leader_id || '', state: row.state, reportSource: row.report_source, note: row.note || '' } : blank();
    modalOpen = true; directoryLoading = true;
    const result = await getAssignmentDirectory();
    if (key !== request) return;
    directoryLoading = false;
    if (result.error) { directoryError = result.error.message || 'People could not be loaded.'; return; }
    directory = result.data || [];
  }
  function nameUnknownChanged(event) {
    if (event.currentTarget.checked) { form.firstName = ''; form.lastName = ''; form.reportSource = 'inviter_report'; }
  }
  function reviewed() { return { invitationId: editing._id || editing.id, expectedVersion: editing.version || guestInvitationVersion(editing) }; }
  async function save() {
    if (saving) return;
    saving = true; error = '';
    let result;
    try {
      if (mode === 'link') result = await saveExpectedGuest('link', { ...reviewed(), ...(linkPerson === 'new' ? { createPerson: true } : { personId: linkPerson }), changeReason });
      else if (mode === 'attendance-correction') result = await saveExpectedGuest('attendance', { ...reviewed(), attended: false, serviceId: editing.attendance_service_id, afterRemoval: form.state, changeReason });
      else {
        const args = { ...form, firstName: form.firstName.trim() || undefined, lastName: form.lastName.trim() || undefined, phone: form.phone.trim() || undefined, email: form.email.trim() || undefined, inviterId: form.inviterId || undefined, leaderId: form.leaderId || undefined, note: form.note.trim() || undefined };
        result = await saveExpectedGuest(mode === 'create' ? 'create' : 'update', mode === 'create' ? args : { ...args, ...reviewed(), changeReason, enteredInError });
      }
      if (result?.error) { error = result.error.message || 'Invitation could not be saved.'; return; }
      modalOpen = false; notice = mode === 'create' ? 'Invitation saved. No outreach activity or attendance was recorded.' : 'Invitation updated; its history is retained.';
      await onChanged();
    } catch (e) { error = e.message || 'Invitation could not be saved.'; }
    finally { saving = false; }
  }
  function attendance(row) { attendanceGuest = row; attendanceOpen = true; error = ''; }
  async function recordAttendance(gathering) {
    const row = attendanceGuest;
    const result = await saveExpectedGuest('attendance', { invitationId: row._id || row.id, expectedVersion: row.version || guestInvitationVersion(row), attended: true, ...gathering });
    if (!result.error) { notice = 'Actual attendance saved to the church register.'; await onChanged(); }
    return result;
  }
  $effect(() => { serviceDate; modalOpen = false; attendanceOpen = false; request++; directoryLoading = false; error = ''; notice = ''; });
</script>

<section aria-labelledby="expected-guests-title" class="mb-8 space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div><h2 id="expected-guests-title" class="text-lg font-semibold">Guest invitations · {dated(serviceDate)}</h2><p class="mt-1 text-sm text-muted-foreground">Add a guest without an outreach record. An invitation is separate from a first visit or actual attendance.</p></div>
    {#if canManage}<Button size="sm" onclick={() => open('create')}>Add expected guest</Button>{/if}
  </div>
  {#if rows === null}<p role="alert" class="text-sm text-destructive">Guest invitations are unavailable. Reload after the matching backend is ready.</p>
  {:else}
    <p class="text-sm text-muted-foreground">{comingCount} reported coming · {forecast.tentative_guest_count || 0} tentative, excluded from expectations · {forecast.additional_expected_guests || 0} additional people in the forecast. Linked people are counted once across invitations and Sunday confirmations.</p>
    {#if notice}<p role="status" class="text-sm text-primary">{notice}</p>{/if}
    {#if rows.length}<label class="block text-sm">Search guest invitations<input type="search" bind:value={search} class="mt-1 w-full rounded-lg border border-border bg-input p-2" /></label>{/if}
    <ul class="space-y-3" aria-label="Guest invitations for the selected Sunday">
      {#each visible as row (row._id || row.id)}
        <li class="rounded-lg border border-border p-4">
          <div class="flex flex-wrap items-start justify-between gap-3"><div class="min-w-0 flex-1"><p class="break-words font-semibold">{row.display_name || guestInvitationName(row)}</p><p class="text-sm text-muted-foreground">{row.name_unknown ? 'Name and details pending' : row.person_id ? 'Linked to a person' : 'Name saved · person record not yet linked'}</p></div><Badge>{row.entered_in_error ? 'Entered in error' : states[guestInvitationResult(row)]}</Badge></div>
          <p class="mt-2 text-sm">{row.report_source === 'inviter_report' ? `Reported by ${row.inviter_name || 'the inviter'} · this invitation records no conversation with the guest` : 'Report from the guest · this invitation records no follow-up conversation'}.</p>
          <p class="mt-1 text-xs text-muted-foreground">Inviter: {row.inviter_name || 'Not recorded'} · Responsible leader: {row.leader_name || 'Not assigned'}</p>
          {#if row.note}<p class="mt-2 break-words text-sm text-muted-foreground">{row.note}</p>{/if}
          {#if row.person_archived}<p class="mt-2 text-sm">The linked person is archived and excluded from expectations.</p>{/if}
          <div class="mt-3 flex flex-wrap gap-2">
            {#if canManage}<Button size="sm" variant="secondary" onclick={() => open('update', row)}>Edit details or status</Button><Button size="sm" variant="ghost" disabled={row.entered_in_error || Boolean(row.attendance_service_id)} onclick={() => open('link', row)}>{row.person_id ? 'Correct person link' : 'Link or create person'}</Button>{/if}
            {#if row.person}<Button size="sm" variant="ghost" onclick={() => onOpen(row.person)}>View person</Button>{/if}
            {#if canManage && row.person_id && !row.entered_in_error && serviceDate <= today}
              {#if row.attendance_service_id}<Button size="sm" variant="ghost" onclick={() => open('attendance-correction', row)}>Correct actual attendance</Button>{:else}<Button size="sm" onclick={() => attendance(row)}>Record actual attendance</Button>{/if}
            {/if}
          </div>
          {#if canManage && !row.person_id}<p class="mt-2 text-xs text-muted-foreground">Add their real name or link a person before a named check-in. Invitations never add to service headcounts.</p>{/if}
          <details class="mt-3 text-sm"><summary class="cursor-pointer font-medium">Invitation history ({row.history?.length || 0})</summary><ul class="mt-2 space-y-2">
            {#each row.history || [] as change, i (i)}<li class="break-words border-l-2 border-border pl-3"><p>{dated(change.at)} · {change.action.replaceAll('_', ' ')}</p>{#if change.change_reason}<p class="text-muted-foreground">{change.change_reason}</p>{/if}{#if change.after?.state}<p class="text-xs text-muted-foreground">Status: {states[change.before?.state] || 'New'} → {states[change.after.state]}</p>{/if}{#if change.before?.name_unknown && change.after?.person_id}<p class="text-xs text-muted-foreground">Previously an unnamed friend reported by {change.before.inviter_name || 'the inviter'}; invitation attribution retained.</p>{/if}
            </li>{/each}</ul></details>
        </li>
      {:else}<li class="p-4 text-sm text-muted-foreground">{rows.length ? 'No invitations match this search.' : 'No guest invitations saved for this Sunday.'}</li>{/each}
    </ul>
  {/if}
</section>

<Modal bind:isOpen={modalOpen} title={mode === 'create' ? 'Add expected guest' : mode === 'link' ? 'Link guest to a person' : mode === 'attendance-correction' ? 'Correct actual attendance' : 'Update guest invitation'} size="lg">
  <form class="space-y-4" onsubmit={event => { event.preventDefault(); void save(); }}>
    {#if editing}<p class="font-medium">{editing.display_name || guestInvitationName(editing)} · {dated(editing.service_date)}</p>{/if}
    {#if directoryLoading}<p>Loading people…</p>{/if}
    {#if directoryError}<p role="alert" class="text-destructive">{directoryError}</p>{/if}
    {#if mode === 'link'}
      <p class="text-sm text-muted-foreground">Search the existing people before creating another record. Linking keeps this invitation and its inviter/history. It does not change an existing person's inviter, permanent leader assignment or attendance.</p>
      <label class="block text-sm">Existing person or new record<select bind:value={linkPerson} class="mt-1 w-full rounded-lg border border-border bg-input p-2"><option value="">Choose a person</option>{#each directory as person (person._id)}<option value={person._id} disabled={Boolean(person.blocked_reason)}>{person.name}{person.phone ? ` · ${person.phone}` : person.email ? ` · ${person.email}` : ''}{person.blocked_reason ? ` · ${person.blocked_reason}` : ''}</option>{/each}{#if !editing?.name_unknown && !editing?.person_id}<option value="new">Create a person from the saved real name and details</option>{/if}</select></label>
      {#if editing?.name_unknown}<p class="text-sm text-muted-foreground">To create a new person, first save the guest's real name using Edit details.</p>{/if}
    {:else if mode === 'attendance-correction'}
      <p class="text-sm">This explicitly removes the linked person's check-in from the church register for this service. If several invitations link to them, all reflect the same corrected check-in.</p>
      <label class="block text-sm">Invitation state after removal<select bind:value={form.state} class="mt-1 w-full rounded-lg border border-border bg-input p-2"><option value="coming">Coming, result pending</option><option value="no_show">Did not arrive</option><option value="cancelled">Cancelled</option></select></label>
    {:else}
      <p class="text-sm text-muted-foreground">No outreach date, salvation, membership or first attendance will be recorded by this form.</p>
      <label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={form.nameUnknown} disabled={Boolean(editing?.person_id)} onchange={nameUnknownChanged} />Name not known yet</label>
      {#if !form.nameUnknown}<div class="grid gap-3 sm:grid-cols-2"><label class="text-sm">Guest first name<input bind:value={form.firstName} maxlength="100" required class="mt-1 w-full rounded-lg border border-border bg-input p-2" /></label><label class="text-sm">Guest surname (optional)<input bind:value={form.lastName} maxlength="100" class="mt-1 w-full rounded-lg border border-border bg-input p-2" /></label></div>{/if}
      <div class="grid gap-3 sm:grid-cols-2"><label class="text-sm">Guest phone (optional)<input type="tel" bind:value={form.phone} class="mt-1 w-full rounded-lg border border-border bg-input p-2" /></label><label class="text-sm">Guest email (optional)<input type="email" bind:value={form.email} class="mt-1 w-full rounded-lg border border-border bg-input p-2" /></label></div>
      <label class="block text-sm">Inviter<select bind:value={form.inviterId} class="mt-1 w-full rounded-lg border border-border bg-input p-2"><option value="">Not recorded</option>{#each directory as person (person._id)}<option value={person._id}>{person.name}</option>{/each}</select></label>
      <label class="block text-sm">Who reported the plan?<select bind:value={form.reportSource} disabled={form.nameUnknown} class="mt-1 w-full rounded-lg border border-border bg-input p-2"><option value="inviter_report">The inviter</option><option value="guest_report">The guest</option></select></label>
      <div class="grid gap-3 sm:grid-cols-2"><label class="text-sm">Sunday<input type="date" bind:value={form.serviceDate} required class="mt-1 w-full rounded-lg border border-border bg-input p-2" /></label><label class="text-sm">Responsible leader (optional)<select bind:value={form.leaderId} class="mt-1 w-full rounded-lg border border-border bg-input p-2"><option value="">Not assigned</option>{#each leaders as person (person._id)}<option value={person._id}>{person.name}</option>{/each}</select></label></div>
      <label class="block text-sm">Invitation status<select bind:value={form.state} class="mt-1 w-full rounded-lg border border-border bg-input p-2"><option value="tentative">Tentative — hoping to come or bring someone</option><option value="coming">Reported coming</option>{#if editing}<option value="cancelled">Cancelled</option>{#if form.serviceDate < today}<option value="no_show">Did not arrive after being reported coming</option>{/if}{/if}</select></label>
      <label class="block text-sm">Invitation note (optional)<textarea rows="2" maxlength="2000" bind:value={form.note} class="mt-1 w-full rounded-lg border border-border bg-input p-2"></textarea></label>
      {#if editing}<label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={enteredInError} />This invitation was entered in error (exclude from counts)</label><p class="text-xs text-muted-foreground">Edits apply to invitation details. Independent Sunday responses stay recorded; review them separately if the plan changed. Use the person profile to change a linked person's contact details.</p>{/if}
    {/if}
    {#if mode !== 'create'}<label class="block text-sm">Reason for this change<textarea rows="2" maxlength="500" bind:value={changeReason} required class="mt-1 w-full rounded-lg border border-border bg-input p-2"></textarea></label>{/if}
    {#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
    <div class="flex flex-wrap justify-end gap-2"><Button variant="secondary" disabled={saving} onclick={() => modalOpen = false}>Cancel</Button><Button type="submit" loading={saving} disabled={directoryLoading || Boolean(directoryError) || mode === 'link' && !linkPerson}>{mode === 'create' ? 'Save invitation' : 'Save change'}</Button></div>
  </form>
</Modal>
<GatheringAttendanceDialog bind:isOpen={attendanceOpen} gatheringType="sunday_service" gatheringDate={attendanceGuest?.service_date || serviceDate} personName={attendanceGuest ? guestInvitationName(attendanceGuest) : ''} onconfirm={recordAttendance} />
