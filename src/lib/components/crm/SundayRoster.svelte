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

  const regularMembers = $derived(
    (roster || [])
      .filter((person) => person.default_expected || person.activity_status === 'regular')
      .slice()
      .sort((a, b) => personName(a).localeCompare(personName(b))),
  );
  const confirmedCount = $derived(
    regularMembers.filter((person) => person.attendance_plan?.status === 'confirmed').length,
  );

  function personId(person) {
    return person?._id || person?.id;
  }

  function personName(person) {
    return person?.name || [person?.preferred_name || person?.first_name, person?.last_name]
      .filter(Boolean).join(' ') || 'Unnamed member';
  }

  function currentStatus(person) {
    return person?.attendance_plan?.status || 'expected';
  }

  function isSaving(person) {
    return savingIds.includes(String(personId(person)));
  }
</script>

<section aria-labelledby="regular-roster-title" class="space-y-4">
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h2 id="regular-roster-title" class="text-lg font-semibold text-foreground">Regular-member confirmations</h2>
      <p class="mt-1 text-sm text-muted-foreground">Tick members after speaking to them, or mark a known absence.</p>
    </div>
    <Badge variant="default">{confirmedCount} personally confirmed</Badge>
  </div>

  <Card padding="none" class="overflow-hidden">
    {#if regularMembers.length === 0}
      <div class="px-5 py-10 text-center text-sm text-muted-foreground">No regular members are available in the roster.</div>
    {:else}
      <div class="divide-y divide-border" role="list" aria-label="Regular members for Sunday">
        {#each regularMembers as person (personId(person))}
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
                  <Badge size="sm" variant="default">Expected</Badge>
                {/if}
              </div>
              <p class="mt-1 text-xs text-muted-foreground">Expected by default unless marked away.</p>
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
                {status === 'away' ? 'Expected instead' : 'Away'}
              </Button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </Card>
</section>
