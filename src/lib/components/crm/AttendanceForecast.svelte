<script>
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  let {
    forecast = {},
    onManage = null,
  } = $props();

  const regularBaseline = $derived(Number(forecast?.regular_baseline) || 0);
  const knownAway = $derived(Number(forecast?.known_away) || 0);
  const confirmedIrregular = $derived(Number(forecast?.confirmed_irregular) || 0);
  const confirmedGuests = $derived(Number(forecast?.confirmed_guests) || 0);
  const confirmedRegular = $derived(Number(forecast?.confirmed_regular) || 0);
  const calculatedTotal = $derived(
    Math.max(0, regularBaseline - knownAway + confirmedIrregular + confirmedGuests),
  );
  const expectedTotal = $derived(
    forecast?.expected_total === undefined || forecast?.expected_total === null
      ? calculatedTotal
      : Number(forecast.expected_total) || 0,
  );
  const confirmedTotal = $derived(
    forecast?.confirmed_total === undefined || forecast?.confirmed_total === null
      ? confirmedRegular + confirmedIrregular + confirmedGuests
      : Number(forecast.confirmed_total) || 0,
  );

  function formatServiceDate(value) {
    if (!value) return 'Upcoming service';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ? new Date(`${value}T00:00:00`)
      : new Date(value);
    if (Number.isNaN(date.getTime())) return 'Upcoming service';
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }
</script>

<section aria-labelledby="attendance-forecast-title">
  <Card padding="none" class="overflow-hidden">
    <div class="border-b border-border px-5 py-4 sm:px-6">
      <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sunday admin forecast</p>
      <h2 id="attendance-forecast-title" class="mt-1 text-base font-semibold text-foreground">
        {formatServiceDate(forecast?.service_date)}
      </h2>
    </div>

    <div class="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div class="bg-primary/5 p-5 sm:p-6">
        <p class="text-sm text-muted-foreground">Expected total</p>
        <p class="mt-2 text-4xl font-semibold tracking-tight text-foreground" aria-label={`${expectedTotal} people expected`}>{expectedTotal}</p>
        <p class="mt-2 text-xs text-muted-foreground">Regular members minus away, plus confirmed irregular members and guests.</p>
      </div>
      <div class="p-5 sm:p-6">
        <p class="text-sm text-muted-foreground">Confirmed so far</p>
        <p class="mt-2 text-4xl font-semibold tracking-tight text-foreground" aria-label={`${confirmedTotal} people confirmed`}>{confirmedTotal}</p>
        <p class="mt-2 text-xs text-muted-foreground">{confirmedRegular} regular · {confirmedIrregular} irregular · {confirmedGuests} guests</p>
      </div>
      <div class="p-5 sm:p-6">
        <p class="text-sm text-muted-foreground">Known away</p>
        <p class="mt-2 text-4xl font-semibold tracking-tight text-foreground" aria-label={`${knownAway} people known away`}>{knownAway}</p>
        <p class="mt-2 text-xs text-muted-foreground">Removed from the regular baseline of {regularBaseline}.</p>
      </div>
    </div>

    <div class="flex flex-col gap-3 border-t border-border px-5 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p>Unticked regular members remain expected; confirmation only shows who has been personally checked.</p>
      {#if onManage}<Button variant="secondary" size="sm" onclick={onManage}>Manage roster</Button>{/if}
    </div>
  </Card>
</section>
