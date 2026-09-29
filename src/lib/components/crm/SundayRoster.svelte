<script>
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';

  let {
    roster = [],
    savingIds = [],
    onStatusChange = () => {},
    onOpen = () => {},
  } = $props();

  const members = $derived(
    (roster || [])
      .slice()
      .sort((a, b) => personName(a).localeCompare(personName(b))),
  );
  const confirmedCount = $derived(
    members.filter((person) => person.attendance_plan?.status === 'confirmed').length,
  );

  function personId(person) {
    return person?._id || person?.id;
  }

  function personName(person) {
    return person?.name || [person?.preferred_name || person?.first_name, person?.last_name]
      .filter(Boolean).join(' ') || 'Unnamed member';
  }

  function currentStatus(person) {
    return person?.attendance_plan?.status || 'not_expected';
  }

  function isSaving(person) {
    return savingIds.includes(String(personId(person)));
  }
</script>

<section aria-labelledby="regular-roster-title" class="space-y-4">
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h2 id="regular-roster-title" class="text-lg font-semibold text-foreground">Sunday member plans</h2>
      <p class="mt-1 text-sm text-muted-foreground">Record who has confirmed for this Sunday or who is away.</p>
    </div>
    <Badge variant="default">{confirmedCount} personally confirmed</Badge>
  </div>

  <Card padding="none" class="overflow-hidden">
    {#if members.length === 0}
      <div class="px-5 py-10 text-center text-sm text-muted-foreground">No members are available in the roster.</div>
    {:else}
      <div class="divide-y divide-border" role="list" aria-label="Members for Sunday">
        {#each members as person (personId(person))}
          {@const status = currentStatus(person)}
          <div class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" role="listitem">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" class="truncate text-left text-sm font-medium text-foreground hover:underline" onclick={() => onOpen(person)}>{personName(person)}</button>
                {#if status === 'away'}
                  <Badge size="sm" variant="default">Away</Badge>
                {:else if status === 'confirmed'}
                  <Badge size="sm" variant="default">Confirmed</Badge>
                {:else}
                  <Badge size="sm" variant="default">No plan recorded</Badge>
                {/if}
              </div>
              <p class="mt-1 text-xs text-muted-foreground">Plans apply to this Sunday only.</p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <label class="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  class="h-4 w-4 accent-primary"
                  checked={status === 'confirmed'}
                  disabled={isSaving(person)}
                  onchange={(event) => onStatusChange(person, event.currentTarget.checked ? 'confirmed' : 'expected')}
                />
                <span>{status === 'confirmed' ? 'Confirmed' : 'Confirm'}</span>
              </label>
              <Button
                variant="ghost"
                size="sm"
                loading={isSaving(person)}
                onclick={() => onStatusChange(person, status === 'away' ? 'expected' : 'away')}
              >
                {status === 'away' ? 'Clear away' : 'Away'}
              </Button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </Card>
</section>
