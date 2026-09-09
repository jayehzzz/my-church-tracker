<script>
  import Button from "$lib/components/ui/Button.svelte";
  import * as memoriesService from "$lib/services/memoriesService.js";

  let { album = null, services = [], meetings = [], onsaved, oncancel } = $props();

  let title = $state("");
  let eventDate = $state("");
  let location = $state("");
  let category = $state("fellowship");
  let reflection = $state("");
  let visibility = $state("church");
  let gathering = $state("");
  let media = $state([]);
  let coverMediaId = $state("");
  let uploading = $state(false);
  let uploadProgress = $state(0);
  let saving = $state(false);
  let error = $state("");
  let initialized = false;

  $effect(() => {
    if (initialized) return;
    title = album?.title || "";
    eventDate = album?.eventDate || new Date().toISOString().slice(0, 10);
    location = album?.location || "";
    category = album?.category || "fellowship";
    reflection = album?.reflection || "";
    visibility = album?.visibility || "church";
    gathering = album?.serviceId ? `service:${album.serviceId}` : album?.meetingId ? `meeting:${album.meetingId}` : "";
    media = (album?.media || []).map(item => ({ ...item, caption: item.caption || "", isNew: false }));
    coverMediaId = album?.coverMediaId || album?.media?.[0]?.id || "";
    initialized = true;
  });

  const categoryOptions = [
    ["service", "Service"], ["outreach", "Outreach"], ["baptism", "Baptism"],
    ["youth", "Youth"], ["fellowship", "Fellowship"], ["trip", "Trip or outing"],
    ["celebration", "Celebration"], ["conference", "Conference"], ["other", "Other"],
  ];

  function revoke(item) {
    if (item?.isNew && item.url?.startsWith("blob:")) URL.revokeObjectURL(item.url);
  }

  async function addFiles(event) {
    const files = [...(event.currentTarget.files || [])];
    event.currentTarget.value = "";
    if (!files.length) return;
    error = "";
    uploading = true;
    for (let index = 0; index < files.length; index += 1) {
      const result = await memoriesService.upload(files[index], {
        onProgress: value => uploadProgress = Math.round(((index + value / 100) / files.length) * 100),
      });
      if (result.error) {
        error = result.error.message || "A media upload failed.";
        break;
      }
      media = [...media, { ...result.data, caption: "" }];
      if (!coverMediaId) coverMediaId = result.data.id;
    }
    uploading = false;
  }

  async function removeItem(index) {
    const item = media[index];
    media = media.filter((_, itemIndex) => itemIndex !== index);
    if (coverMediaId === item.id) coverMediaId = media[0]?.id || "";
    if (item.isNew) {
      const result = await memoriesService.discardPending(item.id);
      revoke(item);
      if (result.error) error = "The removed upload could not be cleaned up yet. Please try again.";
    }
  }

  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    const next = [...media];
    [next[index], next[target]] = [next[target], next[index]];
    media = next;
  }

  async function cancel() {
    if (saving || uploading) return;
    const pending = media.filter(item => item.isNew);
    await Promise.all(pending.map(item => memoriesService.discardPending(item.id)));
    pending.forEach(revoke);
    oncancel?.();
  }

  async function submit(event) {
    event.preventDefault();
    error = "";
    if (!title.trim()) { error = "Give this memory a title."; return; }
    if (!eventDate) { error = "Choose the date this happened."; return; }
    if (!media.length) { error = "Add at least one photo or video."; return; }
    saving = true;
    const [sourceType, sourceId] = gathering ? gathering.split(":") : [];
    const result = await memoriesService.save({
      ...(album?.sourceType === "album" ? { id: album.id } : {}),
      title: title.trim(), eventDate, location: location.trim() || undefined,
      category, reflection: reflection.trim() || undefined, visibility,
      serviceId: sourceType === "service" ? sourceId : undefined,
      meetingId: sourceType === "meeting" ? sourceId : undefined,
      coverMediaId: coverMediaId || media[0].id,
      media: media.map(item => ({ id: item.id, caption: item.caption?.trim() || undefined })),
    });
    saving = false;
    if (result.error) {
      error = result.error.message || "This album could not be saved.";
      return;
    }
    media.filter(item => item.isNew).forEach(revoke);
    onsaved?.(result.data);
  }
</script>

<form class="space-y-5" onsubmit={submit}>
  {#if error}<div class="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</div>{/if}

  <div class="grid gap-4 sm:grid-cols-2">
    <label class="sm:col-span-2"><span>Album title</span><input bind:value={title} maxlength="120" required placeholder="e.g. Summer fellowship outing" /></label>
    <label><span>Date</span><input bind:value={eventDate} type="date" required /></label>
    <label><span>Category</span><select bind:value={category}>{#each categoryOptions as option}<option value={option[0]}>{option[1]}</option>{/each}</select></label>
    <label><span>Location <small>optional</small></span><input bind:value={location} maxlength="160" placeholder="Where it happened" /></label>
    <label><span>Who can see it</span><select bind:value={visibility}><option value="church">Church leadership team</option><option value="leaders">Leaders and administrators</option><option value="private">Owners and administrators</option></select></label>
    <label class="sm:col-span-2"><span>Related gathering <small>optional</small></span><select bind:value={gathering}><option value="">No linked record</option>{#if services.length}<optgroup label="Sunday services">{#each services as service}<option value={`service:${service.id}`}>{service.service_date} · {service.sermon_topic || "Sunday Service"}</option>{/each}</optgroup>{/if}{#if meetings.length}<optgroup label="Meetings and events">{#each meetings as meeting}<option value={`meeting:${meeting.id}`}>{meeting.meeting_date} · {meeting.title || meeting.meeting_type?.replaceAll("_", " ")}</option>{/each}</optgroup>{/if}</select></label>
    <label class="sm:col-span-2"><span>Remembering the day <small>optional</small></span><textarea bind:value={reflection} maxlength="4000" rows="4" placeholder="What made this day meaningful?"></textarea></label>
  </div>

  <section class="rounded-xl border border-border bg-secondary/15 p-4" aria-labelledby="album-media-title">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div><h3 id="album-media-title" class="text-sm font-semibold">Photos and videos</h3><p class="mt-1 text-xs text-muted-foreground">JPEG, PNG or WebP up to 10 MB · MP4, WebM or MOV up to 50 MB</p></div>
      <label class="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border bg-secondary px-3 text-xs font-medium hover:bg-secondary/70" class:opacity-50={uploading}>{uploading ? `Uploading ${uploadProgress}%…` : "Add media"}<input class="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onchange={addFiles} disabled={uploading || saving} /></label>
    </div>

    {#if media.length}
      <div class="mt-4 space-y-3">
        {#each media as item, index (item.id)}
          <div class="grid gap-3 rounded-lg border border-border bg-background p-2 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:items-center">
            <div class="aspect-video overflow-hidden rounded-md bg-black">{#if item.type === "video"}<video src={item.url} class="h-full w-full object-cover" muted preload="metadata"></video>{:else}<img src={item.url} alt="" class="h-full w-full object-cover" />{/if}</div>
            <div class="min-w-0"><div class="flex items-center gap-2"><input type="radio" name="album-cover" value={item.id} bind:group={coverMediaId} aria-label={`Use ${item.filename || `item ${index + 1}`} as album cover`} /><span class="truncate text-xs font-medium">{item.filename || `Memory ${index + 1}`}</span><span class="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{item.type}</span></div><input class="mt-2" bind:value={item.caption} maxlength="280" aria-label={`Caption for ${item.filename || `item ${index + 1}`}`} placeholder="Add a short caption (optional)" /></div>
            <div class="flex justify-end gap-1"><button type="button" class="media-action" onclick={() => move(index, -1)} disabled={index === 0} aria-label="Move earlier">↑</button><button type="button" class="media-action" onclick={() => move(index, 1)} disabled={index === media.length - 1} aria-label="Move later">↓</button><button type="button" class="media-action text-destructive" onclick={() => removeItem(index)} aria-label="Remove media">×</button></div>
          </div>
        {/each}
      </div>
      <p class="mt-3 text-xs text-muted-foreground">Select the circle beside an item to make it the album cover. Use the arrows to arrange the story.</p>
    {/if}
  </section>

  <div class="flex justify-end gap-2 border-t border-border pt-4"><Button variant="secondary" onclick={cancel} disabled={saving || uploading}>Cancel</Button><Button type="submit" loading={saving} disabled={uploading}>{album ? "Save changes" : "Create album"}</Button></div>
</form>

<style>
  label>span{display:block;margin-bottom:.4rem;font-size:.75rem;font-weight:600;color:hsl(var(--foreground))}label small{font-weight:400;color:hsl(var(--muted-foreground))}input:not([type="radio"]),select,textarea{width:100%;border:1px solid hsl(var(--border));border-radius:.5rem;background:hsl(var(--background));padding:.62rem .75rem;font-size:.875rem;color:hsl(var(--foreground));outline:none}input:focus,select:focus,textarea:focus{border-color:hsl(var(--primary));box-shadow:0 0 0 2px hsl(var(--primary)/.15)}textarea{resize:vertical}.media-action{display:grid;height:2rem;width:2rem;place-items:center;border-radius:.4rem;background:hsl(var(--secondary));font-size:.85rem}.media-action:disabled{opacity:.35}
</style>
