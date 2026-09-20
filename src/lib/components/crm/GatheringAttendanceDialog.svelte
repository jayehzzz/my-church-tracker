<script>
  import { Modal, Button, Select } from '$lib/components/ui';
  import { getGatheringChoices } from '$lib/services/followUpCrmService.js';
  let { isOpen = $bindable(false), gatheringType = 'sunday_service', gatheringDate = '', personName = '', onconfirm } = $props();
  let choices = $state([]);
  let selected = $state('');
  let loading = $state(false);
  let saving = $state(false);
  let error = $state('');
  let refreshKey = $state(0);
  const typeLabel = $derived(gatheringType.replaceAll('_', ' '));
  const options = $derived(choices.map(g => ({ value: g.serviceId || g.meetingId, label: g.label })));
  $effect(() => {
    if (!isOpen) return;
    refreshKey;
    let active = true;
    loading = true; error = ''; choices = []; selected = '';
    getGatheringChoices(gatheringType, gatheringDate).then(result => {
      if (!active) return;
      loading = false;
      if (result.error) { error = result.error.message; return; }
      choices = result.data || [];
      if (choices.length === 1) selected = choices[0].serviceId || choices[0].meetingId;
      if (!choices.length) error = `No gathering exists for this date and type: ${gatheringDate} · ${typeLabel}. Check the saved date and gathering type in Services or Meetings, then refresh.`;
    }).catch(e => { if (active) { loading = false; error = e.message || 'Gatherings could not be loaded.'; } });
    return () => { active = false; };
  });
  async function save() {
    if (saving || !selected) return;
    saving = true; error = '';
    const choice = choices.find(g => (g.serviceId || g.meetingId) === selected);
    try {
      const result = await onconfirm?.(choice.serviceId ? { serviceId: choice.serviceId } : { meetingId: choice.meetingId });
      if (result?.error) throw result.error;
      isOpen = false;
    } catch (e) { error = e.message || 'Attendance could not be saved.'; }
    finally { saving = false; }
  }
</script>
<Modal bind:isOpen title="Record actual attendance" size="md">
  <div class="space-y-4">
    <p>{personName} · {gatheringDate} · {typeLabel}</p>
    <p class="text-sm text-muted-foreground">Choose the gathering they attended. This updates their check-in history, attendance plan and matching commitment. Unnamed headcounts stay separate.</p>
    {#if loading}<p>Loading gatherings…</p>{:else if options.length}
      <Select label="Gathering attended" {options} bind:value={selected} placeholder="Choose a gathering" disabled={saving} />
    {/if}
    {#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
    <div class="flex flex-wrap justify-end gap-2">
      <Button variant="secondary" onclick={() => refreshKey++} disabled={loading || saving}>Refresh gatherings</Button>
      <Button variant="secondary" onclick={() => isOpen = false} disabled={saving}>Cancel</Button>
      <Button onclick={save} disabled={loading || !selected || saving}>{saving ? 'Saving…' : 'Save attendance'}</Button>
    </div>
  </div>
</Modal>
