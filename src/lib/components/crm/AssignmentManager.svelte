<script>
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { getAssignmentDirectory, batchAssignContacts } from '$lib/services/followUpCrmService.js';
  let { onChanged = () => {}, onOpen = () => {} } = $props();
  let people = $state([]), loading = $state(true), saving = $state(false);
  let loadError = $state(''), failures = $state([]), message = $state('');
  let search = $state(''), scope = $state('all'), leaderId = $state('');
  // Selected rows retain the assignment version the administrator reviewed.
  let selected = $state([]);
  const statusLabels = { member: 'Member', leader: 'Leader', contact: 'Outreach contact', guest: 'Non-member', visitor: 'Non-member', new_believer: 'Non-member' };
  const leaders = $derived(people.filter(row => row.member_status === 'leader'));
  const visible = $derived(people.filter(row => {
    const text = `${row.name} ${row.phone || ''} ${row.assigned_leader_name || ''}`.toLowerCase();
    return text.includes(search.trim().toLowerCase()) && (scope === 'all' || scope === 'unassigned' && !row.assigned_leader_id || scope === 'assigned' && row.assigned_leader_id);
  }));
  const moving = $derived(selected.reduce((sum,row) => sum + (row.assigned_leader_id === leaderId ? 0 : row.open_follow_up_count), 0));
  async function load() {
    loading = true; loadError = '';
    try {
      const result = await getAssignmentDirectory();
      if (result.error) loadError = result.error.message || 'Assignments could not be loaded.';
      else people = result.data || [];
    } catch (error) { loadError = error.message || 'Assignments could not be loaded.'; }
    finally { loading = false; }
  }
  function toggle(row) { selected = selected.some(item => item._id === row._id) ? selected.filter(item => item._id !== row._id) : [...selected, { ...row }]; }
  async function assign(rows) {
    if (saving || !leaderId || !rows.length) return;
    saving = true; failures = []; message = '';
    try {
      const result = await batchAssignContacts(rows.map(row => row._id), leaderId, undefined, {
        createFirstContactTask: false,
        expectedAssignments: Object.fromEntries(rows.map(row => [row._id, row.assignment_id])),
      });
      const succeeded = result.succeededPersonIds || [];
      selected = selected.filter(row => !succeeded.includes(row._id));
      failures = (result.errors || []).map(failure => ({ name: rows.find(row => row._id === failure.personId)?.name || 'Person', message: failure.error.message }));
      message = `${succeeded.length} ${succeeded.length === 1 ? 'person assigned' : 'people assigned'}${failures.length ? `; ${failures.length} failed` : ''}.`;
      await load();
      if (succeeded.length) await onChanged();
    } catch (error) { failures = [{ name: 'Assignment', message: error.message || 'Could not save assignments.' }]; }
    finally { saving = false; }
  }
  onMount(load);
</script>

<section aria-labelledby="assignment-title" class="space-y-4">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div><h2 id="assignment-title" class="text-lg font-semibold">Assign people</h2><p class="text-sm text-muted-foreground">Members, leaders and contacts · one responsible leader per person.</p></div>
    <Button variant="secondary" size="sm" disabled={saving} loading={loading} onclick={() => { selected = []; void load(); }}>Refresh assignments</Button>
  </div>
  <p class="text-sm text-muted-foreground">Open follow-up and Sunday confirmation tasks move to the new leader with their existing dates. Completed history and Sunday responses stay recorded. Bacenta, care and visitation responsibilities stay with their existing leaders. Assignment alone does not schedule a new call.</p>
  {#if loading}<p role="status">Loading assignments…</p>
  {:else if loadError}<div role="alert" class="rounded-xl border border-destructive/30 p-4 text-destructive">{loadError}<Button variant="secondary" size="sm" onclick={load}>Retry assignments</Button></div>
  {:else}
    <div class="grid gap-3 sm:grid-cols-2">
      <label class="text-sm">Search people<input class="mt-1 w-full rounded-lg border border-border bg-input p-2" type="search" bind:value={search} placeholder="Name, phone or responsible leader" disabled={saving} /></label>
      <label class="text-sm">Assignment status<select class="mt-1 w-full rounded-lg border border-border bg-input p-2" bind:value={scope} disabled={saving}><option value="all">Everyone ({people.length})</option><option value="unassigned">Unassigned ({people.filter(row => !row.assigned_leader_id).length})</option><option value="assigned">Assigned</option></select></label>
    </div>
    <div class="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <label class="block text-sm">Responsible leader<select class="mt-1 w-full rounded-lg border border-border bg-input p-2" bind:value={leaderId} disabled={saving}><option value="">Choose a leader</option>{#each leaders as leader (leader._id)}<option value={leader._id}>{leader.name}</option>{/each}</select></label>
      {#if !leaders.length}<p role="status">No eligible leaders. Add or update a leader in People before assigning.</p>{/if}
      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-sm">{selected.length} selected · {moving} open tasks to transfer</span>
        <Button size="sm" loading={saving} disabled={!leaderId || !selected.length || loading} onclick={() => assign(selected)}>Assign selected</Button>
        {#if selected.length}<Button size="sm" variant="ghost" disabled={saving} onclick={() => selected = []}>Clear selection</Button>{/if}
      </div>
      {#if selected.length}<p class="text-xs text-muted-foreground">Selected: {selected.map(row => row.name).join(', ')}</p>{/if}
    </div>
    {#if message}<p role="status" class="text-sm">{message}</p>{/if}
    {#if failures.length}<div role="alert" class="rounded-xl border border-destructive/30 p-4 text-sm text-destructive"><p class="font-semibold">These assignments failed. Successful assignments were saved.</p><ul>{#each failures as failure}<li>{failure.name}: {failure.message}</li>{/each}</ul><p class="mt-2">If an assignment changed, refresh assignments and review the new leader before retrying.</p></div>{/if}
    <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p>{visible.length} matching people</p><Button size="sm" variant="secondary" disabled={saving || !visible.some(row => !row.blocked_reason)} onclick={() => selected = [...new Map([...selected, ...visible.filter(row => !row.blocked_reason).map(row => ({ ...row }))].map(row => [row._id, row])).values()]}>Select matching people</Button>
    </div>
    <ul class="space-y-2" aria-label="People assignments">
      {#each visible as person (person._id)}
        <li class="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
          <label class="flex min-w-0 flex-1 items-start gap-3"><input class="mt-1 shrink-0" type="checkbox" aria-label="Select {person.name}" checked={selected.some(row => row._id === person._id)} disabled={saving || !!person.blocked_reason} onchange={() => toggle(person)} /><span class="min-w-0 break-words"><span class="block font-semibold">{person.name}</span><span class="block text-xs text-muted-foreground">{statusLabels[person.member_status] || 'Non-member'} {person.phone ? `· ${person.phone}` : ''}</span><span class="block text-sm">Responsible: {person.assigned_leader_name || 'Unassigned'}</span><span class="block text-xs text-muted-foreground">{person.open_follow_up_count} open follow-up tasks</span>{#if person.blocked_reason}<span class="block text-sm text-destructive">{person.blocked_reason}</span>{/if}</span></label>
          <div class="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={saving} onclick={() => onOpen(person)}>View {person.name}</Button><Button size="sm" disabled={saving || loading || !leaderId || !!person.blocked_reason || person.assigned_leader_id === leaderId} onclick={() => assign([person])}>{person.assigned_leader_id ? 'Change leader' : 'Assign leader'}</Button></div>
        </li>
      {:else}<li class="p-6 text-center text-sm text-muted-foreground">No people match this search.</li>{/each}
    </ul>
  {/if}
</section>
