<script>
  let { data = null, loading = false, error = '', onRetry = null, onOpen = null, firstTimersOnly = false, fromDate = $bindable(''), toDate = $bindable(''), showDates = true } = $props();
  let activeList = $state('first_timers');
  let search = $state('');
  let serviceType = $state('all');
  function matchesService(event) {
    const type = event.service_type || event.label?.replaceAll(' ', '_');
    return serviceType === 'all' || (serviceType === 'special' ? ['special_service', 'easter_service', 'christmas_service'].includes(type) : type === serviceType);
  }
  const today = new Date();
  function dateOnly(value) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
  function choosePeriod(period) {
    toDate = period === 'all' ? '' : dateOnly(today);
    if (period === 'month') fromDate = `${toDate.slice(0, 7)}-01`;
    else if (period === '30days') { const start = new Date(today); start.setDate(start.getDate() - 29); fromDate = dateOnly(start); }
    else fromDate = '';
  }

  const firstTimers = $derived(data?.first_timers || []);
  const converts = $derived(data?.new_converts || []);
  const matchingPeople = $derived.by(() => {
    const records = activeList === 'first_timers' ? firstTimers : converts;
    const needle = search.trim().toLocaleLowerCase();
    return records.map(record => ({
      ...record,
      visibleEvents: (record.events || []).filter(event => (!fromDate || event.date >= fromDate) && (!toDate || event.date <= toDate) && matchesService(event)),
    })).filter(record => record.visibleEvents.length > 0 && (!needle || [
      record.person?.first_name, record.person?.last_name, record.person?.phone, record.person?.email,
      record.assigned_worker?.first_name, record.assigned_worker?.last_name,
      ...record.visibleEvents.flatMap(event => [event.label, event.location, event.date]),
    ].filter(Boolean).join(' ').toLocaleLowerCase().includes(needle)))
      .sort((a, b) => String(b.visibleEvents.at(-1)?.date || '').localeCompare(String(a.visibleEvents.at(-1)?.date || '')));
  });
  const unnamedEvents = $derived((data?.unnamed_decisions || []).filter(event => (!fromDate || event.date >= fromDate) && (!toDate || event.date <= toDate) && matchesService(event)));
  const unnamedCount = $derived(unnamedEvents.reduce((total, event) => total + Number(event.count || 0), 0));

  function personName(person) {
    return [person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Name not recorded';
  }

  function formatDate(value) {
    if (!value) return 'Date not recorded';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? 'Date not recorded' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function openRecord(record) {
    if (record?.person) onOpen?.(record.person);
  }
</script>

<section class="overflow-hidden rounded-xl border border-border bg-card" aria-label="First visits and salvation overview">
  <header class="border-b border-border p-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><h2 class="text-lg font-semibold text-foreground">{activeList === 'first_timers' ? 'First timers' : 'Salvation decisions'}</h2><p class="mt-1 text-sm text-muted-foreground">Recorded first visits across all church services, including special services. Confirmed first timers and first recorded visits are labelled separately.</p></div>
      {#if activeList === 'new_converts' && data?.unnamed_decisions_available && unnamedCount}
        <div class="rounded-lg bg-secondary/60 px-3 py-2 text-sm"><span class="font-semibold text-foreground">{unnamedCount}</span><span class="ml-1 text-muted-foreground">unnamed service decisions</span></div>
      {/if}
    </div>
    {#if !firstTimersOnly}<div class="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Journey records">
      <button type="button" role="tab" aria-selected={activeList === 'first_timers'} class="rounded-lg px-3 py-2 text-sm font-semibold {activeList === 'first_timers' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}" onclick={() => activeList = 'first_timers'}>First timers <span class="ml-1 opacity-80">{firstTimers.length}</span></button>
      <button type="button" role="tab" aria-selected={activeList === 'new_converts'} class="rounded-lg px-3 py-2 text-sm font-semibold {activeList === 'new_converts' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}" onclick={() => activeList = 'new_converts'}>New converts <span class="ml-1 opacity-80">{converts.length}</span></button>
    </div>{/if}
    {#if showDates}<div class="mt-4 flex flex-wrap gap-2" aria-label="First timer period">
      <button type="button" class="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary" onclick={() => choosePeriod('month')}>This month</button>
      <button type="button" class="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary" onclick={() => choosePeriod('30days')}>Last 30 days</button>
      <button type="button" class="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary" onclick={() => choosePeriod('all')}>All time</button>
    </div>{/if}
    <label class="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">Service type<select bind:value={serviceType} class="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="all">All services (including special services)</option><option value="sunday_service">Sunday services</option><option value="special">Special services (including Easter and Christmas)</option><option value="midweek_service">Midweek services</option></select></label>
    <div class="mt-4 grid gap-3 {showDates ? 'sm:grid-cols-3' : ''}">
      <label><span class="sr-only">Search people and gatherings</span><input type="search" bind:value={search} placeholder="Search name, phone or worker" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" /></label>
      {#if showDates}
      <label class="flex items-center gap-2 text-xs text-muted-foreground">From <input aria-label="From date" type="date" bind:value={fromDate} class="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" /></label>
      <label class="flex items-center gap-2 text-xs text-muted-foreground">To <input aria-label="To date" type="date" bind:value={toDate} class="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground" /></label>
      {/if}
    </div>
    {#if !loading && !error && (!fromDate || !toDate || fromDate <= toDate)}<p class="mt-3 text-sm font-semibold" role="status">{matchingPeople.length} {matchingPeople.length === 1 ? 'person' : 'people'}{activeList === 'first_timers' ? matchingPeople.length === 1 ? ' recorded as a first timer' : ' recorded as first timers' : ' with salvation decisions'}{fromDate || toDate ? ' in this period' : ' · all time'}</p>{/if}
    {#if fromDate && toDate && fromDate > toDate}<p class="mt-2 text-sm text-destructive" role="alert">The start date must be on or before the end date.</p>{/if}
  </header>

  {#if loading}
    <p class="px-5 py-16 text-center text-sm text-muted-foreground" role="status">Loading first timer records and salvation decisions…</p>
  {:else if error}
    <div class="px-5 py-12 text-center"><p class="text-sm text-destructive" role="alert">{error}</p><button type="button" class="mt-3 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-secondary" onclick={onRetry}>Retry</button></div>
  {:else if fromDate && toDate && fromDate > toDate}
    <p class="px-5 py-12 text-center text-sm text-muted-foreground">Adjust the date range to see records.</p>
  {:else if matchingPeople.length}
    <div class="divide-y divide-border">
      {#each matchingPeople as record (record.person.id)}
        <article class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <button type="button" class="text-left text-sm font-semibold text-foreground hover:text-primary hover:underline" onclick={() => openRecord(record)}>{personName(record.person)}</button>
            <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {#if record.person.phone}<a class="hover:text-primary hover:underline" href="tel:{record.person.phone}">{record.person.phone}</a>{/if}
              {#if record.person.email}<a class="hover:text-primary hover:underline" href="mailto:{record.person.email}">{record.person.email}</a>{/if}
              {#if record.assigned_worker}<span>Worker: {personName(record.assigned_worker)}</span>{/if}
              {#if record.person.member_status === 'archived'}<span class="font-medium text-warning">Archived profile</span>{/if}
            </div>
            {#if activeList === 'first_timers'}<p class="mt-2 text-xs font-medium text-primary">{record.visibleEvents.some(event => event.confirmed_first_timer === true) ? 'Confirmed first timer' : 'First recorded visit'}</p>{/if}
            <p class="mt-2 text-sm text-muted-foreground">{activeList === 'first_timers' ? 'First visit' : 'Decision recorded'}: {formatDate(record.visibleEvents[0]?.date)}</p>
            <details class="mt-2 text-xs text-muted-foreground"><summary class="cursor-pointer hover:text-foreground">Visit details</summary><ul class="mt-2 space-y-1.5">
              {#each record.visibleEvents as event (`${event.id || 'date'}-${event.date}`)}
                <li class="text-xs text-muted-foreground"><span class="font-semibold capitalize text-foreground">{event.label}</span><span> · {formatDate(event.date)}</span>{#if event.time}<span> · {event.time}</span>{/if}{#if event.location}<span> · {event.location}</span>{/if}</li>
              {/each}
            </ul></details>
          </div>
          <button type="button" class="self-start rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-secondary" onclick={() => openRecord(record)}>View person</button>
        </article>
      {/each}
    </div>
  {:else}
    <p class="px-5 py-16 text-center text-sm text-muted-foreground">{search || fromDate || toDate || serviceType !== 'all' ? 'No records match your search, service type and date range.' : activeList === 'first_timers' ? 'No first visits have been recorded at church services.' : 'No service salvation decisions have been recorded.'}</p>
  {/if}

  {#if !loading && !error && activeList === 'new_converts' && data?.unnamed_decisions_available && unnamedEvents.length}
    <details class="border-t border-border px-5 py-4"><summary class="cursor-pointer text-sm font-semibold text-foreground">Unnamed decisions by service</summary><ul class="mt-3 divide-y divide-border">{#each unnamedEvents as event (`${event.date}-${event.label}`)}<li class="flex justify-between gap-3 py-2 text-sm"><span class="capitalize text-muted-foreground">{event.label} · {formatDate(event.date)}</span><strong>{event.count}</strong></li>{/each}</ul></details>
  {/if}
</section>
