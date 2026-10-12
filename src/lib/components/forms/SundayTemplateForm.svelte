<script>
  import { Modal, Button, Input } from '$lib/components/ui';
  import * as templates from '$lib/services/serviceTemplatesService.js';
  import * as peopleService from '$lib/services/peopleService.js';
  let { isOpen = $bindable(false) } = $props();
  let loadFailed = $state(false);
  let loading = $state(false), saving = $state(false), error = $state('');
  let time = $state('09:00'), location = $state(''), people = $state([]), ids = $state([]), search = $state('');
  let generation = 0;
  const id = person => person.id || person._id;
  const name = person => [person.preferred_name || person.first_name, person.last_name].filter(Boolean).join(' ');
  const matches = $derived(people.filter(person => name(person).toLowerCase().includes(search.trim().toLowerCase())));
  $effect(() => {
    if (isOpen) void load(++generation);
    else generation++;
  });
  async function load(key) {
    loading = true; loadFailed = false; error = ''; search = '';
    const [template, directory] = await Promise.all([templates.get(), peopleService.getAll()]);
    if (generation !== key) return;
    loading = false;
    if (template.error || directory.error) { loadFailed = true; error = 'Sunday defaults could not be loaded. Try again.'; return; }
    people = (directory.data || []).filter(person => person.member_status !== 'archived');
    time = template.data?.service_time ?? '09:00'; location = template.data?.location || '';
    const available = new Set(people.map(id));
    ids = (template.data?.expected_person_ids || []).filter(personId => available.has(personId));
  }
  function toggle(personId) { ids = ids.includes(personId) ? ids.filter(value => value !== personId) : [...ids, personId]; }
  async function save() {
    saving = true; error = '';
    const result = await templates.save({ service_time: time, location, expected_person_ids: ids });
    saving = false;
    if (result.error) { error = result.error.message || 'Sunday defaults could not be saved.'; return; }
    isOpen = false;
  }
</script>

<Modal bind:isOpen title="Sunday service defaults" size="lg" closable={!saving} closeOnBackdrop={!saving}>
  <form class="space-y-5" onsubmit={event => { event.preventDefault(); void save(); }}>
    <p class="text-sm text-muted-foreground">Save the usual time, venue and people once. Each new Sunday starts with these defaults; check in the people who actually attend.</p>
    {#if loading}<p role="status">Loading Sunday defaults…</p>
    {:else if error}<p role="alert" class="text-sm text-destructive">{error}</p>{#if loadFailed}<Button variant="secondary" onclick={() => load(++generation)}>Try again</Button>{/if}{/if}
    <fieldset disabled={loading || saving || loadFailed} class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-2"><Input label="Usual start time" type="time" bind:value={time} /><Input label="Usual venue" bind:value={location} maxlength="500" /></div>
      <div><h3 class="font-medium">Usual people</h3><p class="mt-1 text-sm text-muted-foreground">Include regular guests as well as members. This list does not confirm Sunday's plans or record attendance.</p></div>
      <label class="block text-sm">Search usual people<input type="search" bind:value={search} class="mt-1 w-full rounded-lg border border-border bg-input p-2" /></label>
      <div class="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
        {#each matches as person (id(person))}<label class="flex cursor-pointer items-center gap-3 p-3 text-sm"><input type="checkbox" checked={ids.includes(id(person))} onchange={() => toggle(id(person))} /><span>{name(person)} <small class="text-muted-foreground">· {person.member_status?.replaceAll('_', ' ')}</small></span></label>{:else}<p class="p-4 text-sm text-muted-foreground">No people match your search.</p>{/each}
      </div>
      <p class="text-xs text-muted-foreground">{ids.length} on the usual list</p>
    </fieldset>
    <div class="flex justify-end gap-2"><Button variant="secondary" disabled={saving} onclick={() => isOpen = false}>Cancel</Button><Button type="submit" loading={saving} disabled={loading || loadFailed}>Save Sunday defaults</Button></div>
  </form>
</Modal>
