<script>
  import { onMount } from "svelte";
  import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import MemoryAlbumForm from "$lib/components/memories/MemoryAlbumForm.svelte";
  import * as memoriesService from "$lib/services/memoriesService.js";
  import * as servicesService from "$lib/services/servicesService.js";
  import * as meetingsService from "$lib/services/meetingsService.js";
  import { session } from "$lib/auth/session.js";
  import { isDemoMode } from "$lib/convex.js";

  let albums = $state([]);
  let services = $state([]);
  let meetings = $state([]);
  let loading = $state(true);
  let error = $state("");
  let search = $state("");
  let category = $state("all");
  let year = $state("all");
  let selectedAlbum = $state(null);
  let mediaIndex = $state(0);
  let formOpen = $state(false);
  let editingAlbum = $state(null);
  let deletingAlbum = $state(null);
  let deleting = $state(false);

  const canManage = $derived(["owner", "admin"].includes($session.user?.role));
  const categories = $derived([...new Set(albums.map(album => album.category))].sort());
  const years = $derived([...new Set(albums.map(album => album.eventDate?.slice(0, 4)).filter(Boolean))].sort().reverse());
  const filteredAlbums = $derived(albums.filter(album => {
    const words = `${album.title} ${album.location || ""} ${album.reflection || ""}`.toLowerCase();
    return (!search.trim() || words.includes(search.trim().toLowerCase()))
      && (category === "all" || album.category === category)
      && (year === "all" || album.eventDate?.startsWith(year));
  }));
  const totalMedia = $derived(albums.reduce((sum, album) => sum + album.media.length, 0));

  onMount(load);

  async function load() {
    loading = true;
    error = "";
    const result = await memoriesService.getAll();
    if (result.error) error = result.error.message || "The memories library could not be loaded.";
    else albums = result.data;
    if (canManage && !isDemoMode()) {
      const [serviceResult, meetingResult] = await Promise.all([servicesService.getAll(), meetingsService.getAll()]);
      services = serviceResult.data || [];
      meetings = meetingResult.data || [];
    }
    loading = false;
  }

  function formatDate(value, short = false) {
    if (!value) return "Date not recorded";
    const [y, m, d] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("en-GB", short
      ? { day: "numeric", month: "short", year: "numeric" }
      : { weekday: "long", day: "numeric", month: "long", year: "numeric" }
    ).format(new Date(y, m - 1, d));
  }

  function categoryLabel(value) {
    const labels = { service: "Services", outreach: "Outreach", baptism: "Baptisms", youth: "Youth", fellowship: "Fellowship", trip: "Trips & outings", celebration: "Celebrations", conference: "Conferences", other: "Other" };
    return labels[value] || String(value || "Other").replaceAll("_", " ");
  }

  function cover(album) {
    return album.media.find(item => String(item.id) === String(album.coverMediaId)) || album.media[0];
  }

  function openAlbum(album, index = 0) {
    selectedAlbum = album;
    mediaIndex = index;
  }

  function stepMedia(direction) {
    const count = selectedAlbum?.media.length || 0;
    if (count) mediaIndex = (mediaIndex + direction + count) % count;
  }

  function openCreate() {
    editingAlbum = null;
    formOpen = true;
  }

  function openEdit(album) {
    selectedAlbum = null;
    editingAlbum = album;
    formOpen = true;
  }

  async function albumSaved() {
    formOpen = false;
    editingAlbum = null;
    await load();
  }

  async function confirmDelete() {
    if (!deletingAlbum) return;
    deleting = true;
    const result = await memoriesService.remove(deletingAlbum.id);
    deleting = false;
    if (result.error) {
      error = result.error.message || "The album could not be deleted.";
      deletingAlbum = null;
      return;
    }
    selectedAlbum = null;
    deletingAlbum = null;
    await load();
  }
</script>

<DashboardLayout>
  <div class="memories-page">
    <header class="hero">
      <div>
        <p class="eyebrow">Our shared story</p>
        <h1>Memories</h1>
        <p class="intro">Photos, videos and reflections from services, fellowship and every meaningful day together.</p>
      </div>
      {#if canManage}<Button onclick={openCreate}>Create album</Button>{/if}
    </header>

    {#if isDemoMode()}<p class="demo-note">Demo memories are drawn from sample Sunday services. Album creation and uploads become available with the live backend.</p>{/if}
    {#if error}<div class="error" role="alert"><span>{error}</span><button onclick={load}>Try again</button></div>{/if}

    {#if loading}
      <div class="loading" aria-live="polite"><span></span><p>Gathering church memories…</p></div>
    {:else if albums.length === 0}
      <section class="empty">
        <div class="empty-icon" aria-hidden="true">◇</div>
        <h2>Your church story starts here</h2>
        <p>Create an album for an outing, celebration or special event. Photos already attached to Sunday services will appear here automatically.</p>
        {#if canManage}<Button onclick={openCreate}>Create the first album</Button>{/if}
      </section>
    {:else}
      <section class="summary" aria-label="Memories summary">
        <div><strong>{albums.length}</strong><span>Albums</span></div>
        <div><strong>{totalMedia}</strong><span>Photos & videos</span></div>
        <div><strong>{years.length}</strong><span>Years remembered</span></div>
      </section>

      {@const featured = filteredAlbums[0]}
      {#if featured}
        {@const featuredCover = cover(featured)}
        <section class="featured">
          <button class="featured-media" onclick={() => openAlbum(featured)} aria-label={`Open ${featured.title}`}>
            {#if featuredCover?.type === "video"}<video src={featuredCover.url} muted preload="metadata"></video><span class="play" aria-hidden="true">▶</span>{:else}<img src={featuredCover?.url} alt="" />{/if}
            <span class="shade"></span>
            <span class="featured-copy"><small>Featured memory</small><strong>{featured.title}</strong><span>{formatDate(featured.eventDate)}{featured.location ? ` · ${featured.location}` : ""}</span></span>
          </button>
        </section>
      {/if}

      <div class="toolbar">
        <label class="search"><span class="sr-only">Search memories</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg><input bind:value={search} placeholder="Search memories…" /></label>
        <label><span class="sr-only">Filter by category</span><select bind:value={category}><option value="all">All moments</option>{#each categories as item}<option value={item}>{categoryLabel(item)}</option>{/each}</select></label>
        <label><span class="sr-only">Filter by year</span><select bind:value={year}><option value="all">All years</option>{#each years as item}<option value={item}>{item}</option>{/each}</select></label>
      </div>

      {#if filteredAlbums.length}
        <section class="album-grid" aria-label="Memory albums">
          {#each filteredAlbums as album}
            {@const albumCover = cover(album)}
            <article class="album-card">
              <button class="album-cover" onclick={() => openAlbum(album)} aria-label={`Open ${album.title}`}>
                {#if albumCover?.type === "video"}<video src={albumCover.url} muted preload="metadata"></video><span class="play small" aria-hidden="true">▶</span>{:else}<img src={albumCover?.url} alt="" loading="lazy" />{/if}
                <span class="count">{album.media.length} {album.media.length === 1 ? "item" : "items"}</span>
              </button>
              <div class="album-copy"><div class="meta"><span>{categoryLabel(album.category)}</span><time>{formatDate(album.eventDate, true)}</time></div><h2><button onclick={() => openAlbum(album)}>{album.title}</button></h2>{#if album.location}<p>{album.location}</p>{/if}</div>
            </article>
          {/each}
        </section>
      {:else}
        <section class="no-results"><h2>No memories match these filters</h2><p>Try another year, category or search phrase.</p><button onclick={() => { search = ""; category = "all"; year = "all"; }}>Clear filters</button></section>
      {/if}
    {/if}
  </div>
</DashboardLayout>

<Modal bind:isOpen={selectedAlbum} title={selectedAlbum?.title || "Memory"} size="2xl" onclose={() => selectedAlbum = null}>
  {#if selectedAlbum}
    {@const current = selectedAlbum.media[mediaIndex]}
    <div class="viewer">
      <div class="viewer-stage">
        {#if current?.type === "video"}<video src={current.url} controls playsinline preload="metadata"><track kind="captions" /></video>{:else}<img src={current?.url} alt={current?.caption || `${selectedAlbum.title}, item ${mediaIndex + 1}`} />{/if}
        {#if selectedAlbum.media.length > 1}<button class="viewer-arrow left" onclick={() => stepMedia(-1)} aria-label="Previous media">‹</button><button class="viewer-arrow right" onclick={() => stepMedia(1)} aria-label="Next media">›</button>{/if}
      </div>
      <div class="viewer-details">
        <div class="viewer-meta"><span>{categoryLabel(selectedAlbum.category)}</span><span>{formatDate(selectedAlbum.eventDate)}</span>{#if selectedAlbum.location}<span>{selectedAlbum.location}</span>{/if}</div>
        {#if current?.caption}<p class="caption">{current.caption}</p>{/if}
        {#if selectedAlbum.reflection}<div class="reflection"><h3>Remembering the day</h3><p>{selectedAlbum.reflection}</p></div>{/if}
        {#if selectedAlbum.media.length > 1}<div class="filmstrip">{#each selectedAlbum.media as item, index}<button class:active={index === mediaIndex} onclick={() => mediaIndex = index} aria-label={`Show item ${index + 1}`}>{#if item.type === "video"}<video src={item.url} muted preload="metadata"></video><span aria-hidden="true">▶</span>{:else}<img src={item.url} alt="" />{/if}</button>{/each}</div>{/if}
        <div class="viewer-actions">{#if selectedAlbum.recordHref}<a href={selectedAlbum.recordHref}>Open service record</a>{/if}{#if canManage && selectedAlbum.editable}<Button variant="secondary" size="sm" onclick={() => openEdit(selectedAlbum)}>Edit album</Button><Button variant="danger" size="sm" onclick={() => deletingAlbum = selectedAlbum}>Delete</Button>{/if}</div>
      </div>
    </div>
  {/if}
</Modal>

<Modal bind:isOpen={formOpen} title={editingAlbum ? "Edit memory album" : "Create memory album"} size="2xl" closable={false} closeOnBackdrop={false} closeOnEscape={false}>
  {#key editingAlbum?.id || "new"}<MemoryAlbumForm album={editingAlbum} {services} {meetings} onsaved={albumSaved} oncancel={() => { formOpen = false; editingAlbum = null; }} />{/key}
</Modal>

<Modal bind:isOpen={deletingAlbum} title="Delete this album?" size="sm" onclose={() => deletingAlbum = null}>
  <p class="text-sm leading-6 text-muted-foreground">This removes the album and its uploaded photos and videos. Service albums must be managed from their service record.</p>
  {#snippet footer()}<Button variant="secondary" onclick={() => deletingAlbum = null}>Keep album</Button><Button variant="danger" loading={deleting} onclick={confirmDelete}>Delete album</Button>{/snippet}
</Modal>

<style>
  .memories-page{max-width:1180px;margin:0 auto;padding-bottom:3rem}.hero{display:flex;align-items:end;justify-content:space-between;gap:1.5rem;padding:2.5rem 0 1.5rem}.eyebrow{font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:hsl(var(--primary))}.hero h1{margin-top:.35rem;font-size:clamp(2.2rem,5vw,3.6rem);font-weight:600;letter-spacing:-.045em}.intro{max-width:690px;margin-top:.55rem;color:hsl(var(--muted-foreground));line-height:1.7}.demo-note,.error{margin-bottom:1rem;border:1px solid hsl(var(--border));border-radius:.7rem;background:hsl(var(--card));padding:.8rem 1rem;font-size:.8rem;color:hsl(var(--muted-foreground))}.error{display:flex;justify-content:space-between;border-color:hsl(var(--destructive)/.4);color:hsl(var(--destructive))}.error button,.no-results button{font-weight:600;text-decoration:underline}.loading,.empty,.no-results{display:grid;min-height:330px;place-items:center;align-content:center;gap:.7rem;border:1px dashed hsl(var(--border));border-radius:1rem;text-align:center}.loading span{height:1.8rem;width:1.8rem;border:2px solid hsl(var(--border));border-top-color:hsl(var(--primary));border-radius:50%;animation:spin .8s linear infinite}.empty-icon{display:grid;height:3.4rem;width:3.4rem;place-items:center;border-radius:1rem;background:hsl(var(--primary)/.1);font-size:1.6rem;color:hsl(var(--primary))}.empty h2,.no-results h2{font-size:1.2rem;font-weight:600}.empty p,.no-results p{max-width:540px;color:hsl(var(--muted-foreground));font-size:.9rem;line-height:1.7}.summary{display:grid;grid-template-columns:repeat(3,1fr);margin-bottom:1rem;overflow:hidden;border:1px solid hsl(var(--border));border-radius:.85rem;background:hsl(var(--card))}.summary div{padding:1rem 1.2rem;border-right:1px solid hsl(var(--border))}.summary div:last-child{border:0}.summary strong{display:block;font-size:1.25rem}.summary span{font-size:.72rem;color:hsl(var(--muted-foreground))}.featured{margin-bottom:1.1rem}.featured-media{position:relative;display:block;width:100%;height:clamp(300px,47vw,520px);overflow:hidden;border-radius:1rem;background:#050505;text-align:left}.featured-media img,.featured-media video,.album-cover img,.album-cover video{height:100%;width:100%;object-fit:cover}.shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,rgba(0,0,0,.82))}.featured-copy{position:absolute;left:clamp(1.3rem,4vw,2.5rem);right:1.5rem;bottom:clamp(1.3rem,4vw,2.3rem);display:grid;gap:.25rem;color:white}.featured-copy small{font-size:.7rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:rgb(255 255 255/.7)}.featured-copy strong{font-size:clamp(1.5rem,4vw,2.5rem);letter-spacing:-.025em}.featured-copy span{font-size:.8rem;color:rgb(255 255 255/.75)}.play{position:absolute;left:50%;top:50%;display:grid;height:3.5rem;width:3.5rem;transform:translate(-50%,-50%);place-items:center;border-radius:50%;background:rgb(0 0 0/.55);color:white;backdrop-filter:blur(6px)}.play.small{height:2.5rem;width:2.5rem;font-size:.75rem}.toolbar{display:grid;grid-template-columns:minmax(220px,1fr) auto auto;gap:.7rem;margin:1.1rem 0}.toolbar input,.toolbar select{height:2.65rem;border:1px solid hsl(var(--border));border-radius:.65rem;background:hsl(var(--card));padding:0 .8rem;font-size:.8rem;color:hsl(var(--foreground));outline:none}.toolbar input:focus,.toolbar select:focus{border-color:hsl(var(--primary));box-shadow:0 0 0 2px hsl(var(--primary)/.12)}.search{position:relative}.search input{width:100%;padding-left:2.4rem}.search svg{position:absolute;left:.8rem;top:.8rem;height:1rem;width:1rem;fill:none;stroke:currentColor;color:hsl(var(--muted-foreground));stroke-width:1.7}.album-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.album-card{overflow:hidden;border:1px solid hsl(var(--border));border-radius:.85rem;background:hsl(var(--card));transition:transform .18s,border-color .18s}.album-card:hover{transform:translateY(-2px);border-color:hsl(var(--primary)/.4)}.album-cover{position:relative;display:block;width:100%;aspect-ratio:4/3;overflow:hidden;background:#050505}.count{position:absolute;right:.6rem;bottom:.6rem;border-radius:99px;background:rgb(0 0 0/.65);padding:.25rem .55rem;color:white;font-size:.66rem;backdrop-filter:blur(6px)}.album-copy{padding:1rem}.meta{display:flex;justify-content:space-between;gap:.6rem;font-size:.67rem;color:hsl(var(--muted-foreground))}.meta span{text-transform:uppercase;letter-spacing:.08em;color:hsl(var(--primary))}.album-copy h2{margin-top:.45rem;font-size:1rem;font-weight:600}.album-copy h2 button{text-align:left}.album-copy p{margin-top:.3rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.76rem;color:hsl(var(--muted-foreground))}.viewer{display:grid;gap:1rem}.viewer-stage{position:relative;display:grid;min-height:300px;max-height:62vh;place-items:center;overflow:hidden;border-radius:.75rem;background:#050505}.viewer-stage img,.viewer-stage video{max-height:62vh;max-width:100%;object-fit:contain}.viewer-arrow{position:absolute;top:50%;display:grid;height:2.7rem;width:2.7rem;transform:translateY(-50%);place-items:center;border-radius:50%;background:rgb(0 0 0/.6);font-size:1.7rem;color:white}.viewer-arrow.left{left:.7rem}.viewer-arrow.right{right:.7rem}.viewer-details{padding:.2rem}.viewer-meta{display:flex;flex-wrap:wrap;gap:.4rem 1rem;font-size:.75rem;color:hsl(var(--muted-foreground))}.caption{margin-top:.9rem;font-size:.9rem}.reflection{margin-top:1rem;border-left:2px solid hsl(var(--primary));padding-left:1rem}.reflection h3{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.reflection p{margin-top:.4rem;white-space:pre-line;font-size:.85rem;line-height:1.7;color:hsl(var(--muted-foreground))}.filmstrip{display:flex;gap:.45rem;margin-top:1rem;overflow-x:auto;padding-bottom:.25rem}.filmstrip button{position:relative;height:55px;width:78px;flex:none;overflow:hidden;border:2px solid transparent;border-radius:.4rem;background:#050505;opacity:.55}.filmstrip button.active{border-color:hsl(var(--primary));opacity:1}.filmstrip img,.filmstrip video{height:100%;width:100%;object-fit:cover}.filmstrip span{position:absolute;inset:0;display:grid;place-items:center;color:white;font-size:.7rem}.viewer-actions{display:flex;justify-content:flex-end;align-items:center;gap:.5rem;margin-top:1.2rem}.viewer-actions a{margin-right:auto;font-size:.78rem;color:hsl(var(--primary))}.no-results{min-height:240px}.no-results button{color:hsl(var(--primary));font-size:.8rem}@keyframes spin{to{transform:rotate(360deg)}}
  @media(max-width:820px){.album-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero{align-items:start}.toolbar{grid-template-columns:1fr 1fr}.toolbar .search{grid-column:1/-1}}
  @media(max-width:540px){.hero{align-items:stretch;flex-direction:column}.hero :global(button){align-self:start}.summary strong{font-size:1rem}.summary div{padding:.8rem}.summary span{font-size:.62rem}.album-grid{grid-template-columns:1fr}.featured-media{height:330px}.toolbar{grid-template-columns:1fr}.toolbar .search{grid-column:auto}.viewer-stage{min-height:240px}.viewer-actions{flex-wrap:wrap}}
  @media(prefers-reduced-motion:reduce){.album-card,.loading span{transition:none;animation:none}}
</style>
