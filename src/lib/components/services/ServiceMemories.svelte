<script>
  import Button from "$lib/components/ui/Button.svelte";

  let { services = [], onOpen, onEdit } = $props();

  let serviceIndex = $state(0);
  let photoIndex = $state(0);

  const memoryServices = $derived(() =>
    [...services]
      .filter((service) => Array.isArray(service.photos) && service.photos.length > 0)
      .sort((a, b) => new Date(b.service_date) - new Date(a.service_date)),
  );

  const currentService = $derived(() => memoryServices()[serviceIndex]);
  const currentPhotos = $derived(() => currentService()?.photos || []);
  const currentPhoto = $derived(() => currentPhotos()[photoIndex]);

  $effect(() => {
    const serviceCount = memoryServices().length;
    if (!serviceCount) {
      serviceIndex = 0;
      photoIndex = 0;
      return;
    }
    if (serviceIndex >= serviceCount) serviceIndex = serviceCount - 1;
    const photoCount = currentPhotos().length;
    if (photoIndex >= photoCount) photoIndex = Math.max(0, photoCount - 1);
  });

  function formatDate(value) {
    if (!value) return "Date not recorded";
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  }

  function formatServiceType(value) {
    return String(value || "service")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function selectService(index) {
    serviceIndex = index;
    photoIndex = 0;
  }

  function previousService() {
    const count = memoryServices().length;
    if (!count) return;
    serviceIndex = (serviceIndex - 1 + count) % count;
    photoIndex = 0;
  }

  function nextService() {
    const count = memoryServices().length;
    if (!count) return;
    serviceIndex = (serviceIndex + 1) % count;
    photoIndex = 0;
  }

  function previousPhoto() {
    const count = currentPhotos().length;
    if (!count) return;
    photoIndex = (photoIndex - 1 + count) % count;
  }

  function nextPhoto() {
    const count = currentPhotos().length;
    if (!count) return;
    photoIndex = (photoIndex + 1) % count;
  }

</script>

{#if memoryServices().length === 0}
  <section class="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
    <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
    <h2 class="mt-4 text-lg font-semibold text-foreground">No photo memories in this period</h2>
    <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Add photos and a reflection when recording or editing a service. They will become part of the church’s visual history here.</p>
  </section>
{:else}
  {@const service = currentService()}
  <section class="overflow-hidden rounded-2xl border border-border bg-card" aria-labelledby="church-memories-title">
    <header class="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Looking back</p>
        <h2 id="church-memories-title" class="mt-1 text-lg font-semibold text-foreground">Church memories</h2>
        <p class="mt-1 text-sm text-muted-foreground">Photos, messages and moments from every stage of the journey.</p>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary text-foreground transition-colors hover:border-primary/50 hover:text-primary" onclick={previousService} aria-label="Previous service memory">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span class="min-w-20 text-center text-xs font-medium text-muted-foreground">{serviceIndex + 1} of {memoryServices().length}</span>
        <button type="button" class="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary text-foreground transition-colors hover:border-primary/50 hover:text-primary" onclick={nextService} aria-label="Next service memory">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </header>

    <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.8fr)]">
      <div class="border-b border-border bg-black xl:border-b-0 xl:border-r">
        <div class="relative aspect-[16/10] min-h-[320px] max-h-[680px] sm:aspect-video">
          <img src={currentPhoto()} alt="{service.sermon_topic || formatServiceType(service.service_type)} on {formatDate(service.service_date)}" class="h-full w-full object-contain" />

          <div class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/65 to-transparent px-4 pb-10 pt-4 text-white">
            <span class="rounded-full bg-black/35 px-3 py-1 text-xs font-medium backdrop-blur-sm">{formatDate(service.service_date)}</span>
            <span class="rounded-full bg-black/35 px-3 py-1 text-xs font-medium backdrop-blur-sm">Photo {photoIndex + 1} of {currentPhotos().length}</span>
          </div>

          {#if currentPhotos().length > 1}
            <button type="button" class="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" onclick={previousPhoto} aria-label="Previous photo">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button type="button" class="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" onclick={nextPhoto} aria-label="Next photo">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          {/if}
        </div>

        {#if currentPhotos().length > 1}
          <div class="flex gap-2 overflow-x-auto border-t border-white/10 bg-black px-4 py-3">
            {#each currentPhotos() as photo, index}
              <button type="button" class="h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-all {photoIndex === index ? 'border-primary opacity-100' : 'border-transparent opacity-55 hover:opacity-90'}" onclick={() => (photoIndex = index)} aria-label="Show photo {index + 1}" aria-current={photoIndex === index ? "true" : undefined}>
                <img src={photo} alt="" class="h-full w-full object-cover" />
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <article class="flex flex-col p-5 sm:p-6">
        <div>
          <span class="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{formatServiceType(service.service_type)}</span>
          <p class="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Message preached</p>
          <h3 class="mt-2 text-2xl font-semibold leading-tight tracking-[-0.025em] text-foreground">{service.sermon_topic || "Message not recorded"}</h3>
          <p class="mt-2 text-sm text-muted-foreground">{service.sermon_speaker ? `Preached by ${service.sermon_speaker}` : "Speaker not recorded"}</p>
        </div>

        <div class="mt-6 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-secondary/20">
          <div class="px-3 py-4 text-center">
            <p class="text-xl font-semibold text-foreground">{service.total_attendance || 0}</p>
            <p class="mt-1 text-[11px] text-muted-foreground">Attendance</p>
          </div>
          <div class="px-3 py-4 text-center">
            <p class="text-xl font-semibold text-info">{service.guests_count || 0}</p>
            <p class="mt-1 text-[11px] text-muted-foreground">Guests</p>
          </div>
          <div class="px-3 py-4 text-center">
            <p class="text-xl font-semibold text-success">{service.salvation_decisions || 0}</p>
            <p class="mt-1 text-[11px] text-muted-foreground">Decisions</p>
          </div>
        </div>

        <div class="mt-6 flex-1 rounded-xl border border-border bg-secondary/15 p-4">
          <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
            <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h6m-8 8l-1-4a9 9 0 1116 0l-1 4-4-2H9l-4 2z" /></svg>
            Remembering the day
          </div>
          {#if service.notes}
            <p class="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{service.notes}</p>
          {:else}
            <p class="mt-3 text-sm italic leading-6 text-muted-foreground">No reflection was recorded for this service. Add one while the memories are still fresh.</p>
          {/if}
        </div>

        <div class="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" size="sm" onclick={() => onEdit?.(service)}>{service.notes ? "Edit memory" : "Add reflection"}</Button>
          <Button size="sm" onclick={() => onOpen?.(service)}>Open service record</Button>
        </div>
      </article>
    </div>

    {#if memoryServices().length > 1}
      <footer class="border-t border-border px-5 py-4">
        <p class="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">More memories</p>
        <div class="flex gap-3 overflow-x-auto pb-1">
          {#each memoryServices() as memory, index}
            <button type="button" class="group flex w-48 shrink-0 items-center gap-3 rounded-lg border p-2 text-left transition-colors {serviceIndex === index ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-secondary/35'}" onclick={() => selectService(index)} aria-current={serviceIndex === index ? "true" : undefined}>
              <img src={memory.photos[0]} alt="" class="h-12 w-16 rounded-md object-cover" />
              <span class="min-w-0">
                <span class="block truncate text-xs font-medium text-foreground group-hover:text-primary">{memory.sermon_topic || formatServiceType(memory.service_type)}</span>
                <span class="mt-1 block text-[11px] text-muted-foreground">{formatDate(memory.service_date)}</span>
              </span>
            </button>
          {/each}
        </div>
      </footer>
    {/if}
  </section>
{/if}
