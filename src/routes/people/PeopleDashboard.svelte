<script>
  import LeafletMap from "$lib/components/map/LeafletMap.svelte";
  import { hasMapLocation, personAddress } from "$lib/utils/peopleView.js";
  import { isDemoMode } from "$lib/convex.js";

  let { people = [], loading = false } = $props();
  let mapComponent = $state();
  let query = $state("");
  let locationFilter = $state("all");
  let focusedId = $state(null);
  let routeEstimate = $state(null);
  let routeRequest = null;
  const churchLocation = isDemoMode() ? { lat: 51.8787, lng: -0.42, name: "Demo church" } : null;
  let mapped = $derived(people.filter(hasMapLocation));
  let missing = $derived(people.length - mapped.length);
  let results = $derived(people.filter((person) => {
    const matchesLocation = locationFilter !== "missing" || !hasMapLocation(person);
    return matchesLocation && `${person.first_name || ""} ${person.last_name || ""} ${personAddress(person)}`
      .toLowerCase().includes(query.trim().toLowerCase());
  }));
  let visibleMapped = $derived(results.filter(hasMapLocation));

  function formatDuration(seconds) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    return minutes >= 60 ? `${Math.floor(minutes / 60)} hr ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim() : `${minutes} min`;
  }

  async function focusPerson(person) {
    const personId = person.id || person._id;
    focusedId = personId;
    if (routeEstimate?.personId === personId && routeEstimate.status !== "error") {
      mapComponent?.flyTo(person.lat, person.lng, personId);
      return;
    }
    routeRequest?.abort();
    const controller = new AbortController();
    routeRequest = controller;
    routeEstimate = churchLocation ? { personId, status: "loading" } : null;
    mapComponent?.flyTo(person.lat, person.lng, personId);
    if (!churchLocation) return;
    try {
      const start = `${churchLocation.lng},${churchLocation.lat}`;
      const end = `${person.lng},${person.lat}`;
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=false`, { signal: controller.signal });
      if (!response.ok) throw new Error("Route request failed");
      const route = (await response.json()).routes?.[0];
      if (!route || controller.signal.aborted) throw new Error("Route unavailable");
      routeEstimate = {
        personId,
        status: "ready",
        distanceLabel: route.distance >= 1609 ? `${(route.distance / 1609.344).toFixed(1)} miles` : `${Math.round(route.distance)} m`,
        durationLabel: formatDuration(route.duration),
      };
      mapComponent?.flyTo(person.lat, person.lng, personId);
    } catch (error) {
      if (!controller.signal.aborted) {
        routeEstimate = { personId, status: "error" };
        mapComponent?.flyTo(person.lat, person.lng, personId);
      }
    }
  }
</script>

<section class="people-map" aria-label="People locations">
  <header class="map-heading">
    <div>
      <h2>People locations</h2>
      <p>Find someone nearby or open their profile to arrange care.</p>
    </div>
    <p class="coverage" aria-live="polite">{loading ? "Loading locations…" : `${mapped.length} of ${people.length} have a saved location`}</p>
  </header>
  {#if loading}
    <div class="empty" role="status">Loading people…</div>
  {:else}
    <div class="map-layout">
      <div class="map-canvas">
        {#if visibleMapped.length}
          <LeafletMap bind:this={mapComponent} people={visibleMapped} {churchLocation} {routeEstimate} onPersonSelected={focusPerson} scrollWheelZoom={false} />
        {:else}
          <div class="empty">
            <span class="empty-icon" aria-hidden="true">⌖</span>
            <h3>{mapped.length ? "No locations match this view" : "No recorded map locations"}</h3>
            <p>{mapped.length ? "Change your search or choose All people to see locations again." : "People appear here when their profile has saved coordinates. An address alone does not place a pin."}</p>
          </div>
        {/if}
      </div>
      <aside class="location-list" aria-label="Find a person">
        <div class="list-controls">
          <label for="map-search">Find a person or area</label>
          <input id="map-search" type="search" placeholder="Name, town or postcode" bind:value={query} />
          <div class="location-tabs" aria-label="Location filter">
            <button type="button" aria-pressed={locationFilter === "all"} onclick={() => locationFilter = "all"}>All people</button>
            <button type="button" aria-pressed={locationFilter === "missing"} onclick={() => locationFilter = "missing"}>Without a pin ({missing})</button>
          </div>
          <p class="result-count" aria-live="polite">{results.length} {results.length === 1 ? "person" : "people"}</p>
        </div>
        <ul>
          {#each results as person (person.id || person._id)}
            <li class:focused={focusedId === (person.id || person._id)}>
              <a class="person-name" href="/people/{encodeURIComponent(person.id || person._id)}">{person.first_name} {person.last_name}</a>
              <p>{personAddress(person) || "No address recorded"}</p>
              <div class="person-actions">
                {#if hasMapLocation(person)}
                  <button type="button" onclick={() => focusPerson(person)} aria-label="Show {person.first_name} {person.last_name} on map">Show on map</button>
                {:else}
                  <span>No map location</span>
                {/if}
                <a href="/people/{encodeURIComponent(person.id || person._id)}">View profile →</a>
              </div>
              {#if routeEstimate?.personId === (person.id || person._id)}
                <p class="route-estimate" aria-live="polite">
                  {routeEstimate.status === "loading" ? "Calculating car journey from church…" : routeEstimate.status === "ready" ? `By car from church: ${routeEstimate.distanceLabel} · about ${routeEstimate.durationLabel}` : "Car journey estimate is unavailable right now."}
                </p>
              {/if}
            </li>
          {:else}
            <li class="no-results">No people match. Try another name or area.</li>
          {/each}
        </ul>
      </aside>
    </div>
    <footer aria-label="Map legend">
      <span><i class="leader"></i>Leader</span><span><i class="member"></i>Member</span><span><i class="guest"></i>Guest</span><span><i class="archived"></i>Archived</span>
      {#if churchLocation}<span><i class="church"></i>{churchLocation.name}</span>{/if}<span class="map-hint">Select a pin to view a profile. Use + / − to zoom.</span>
    </footer>
  {/if}
</section>

<style>
  .people-map { border: 1px solid hsl(var(--border)); border-radius: 16px; background: hsl(var(--card)); overflow: hidden; }
  .map-heading { padding: 20px 24px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 1px solid hsl(var(--border)); }
  h2 { font-size: 18px; font-weight: 600; } p { color: hsl(var(--muted-foreground)); font-size: 13px; line-height: 1.6; }
  .coverage { font-size: 12px; padding: 6px 10px; border-radius: 8px; background: hsl(var(--secondary)); }
  .map-layout { display: grid; grid-template-columns: minmax(0, 1fr) 310px; }
  .map-canvas { height: 540px; min-width: 0; background: hsl(var(--background)); }
  .location-list { min-width: 0; border-left: 1px solid hsl(var(--border)); display: flex; flex-direction: column; height: 540px; }
  .list-controls { padding: 16px; border-bottom: 1px solid hsl(var(--border)); }
  label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 8px; }
  input { width: 100%; border: 1px solid hsl(var(--border)); border-radius: 8px; background: hsl(var(--background)); padding: 10px 12px; font-size: 13px; }
  .location-tabs { display: flex; gap: 8px; margin-top: 12px; } .location-tabs button { padding: 6px 8px; border-radius: 6px; font-size: 12px; color: hsl(var(--muted-foreground)); }
  .location-tabs button[aria-pressed="true"] { background: hsl(var(--primary) / .12); color: hsl(var(--primary)); }
  .result-count { margin-top: 10px; font-size: 12px; }
  ul { overflow-y: auto; flex: 1; } li { padding: 16px; border-bottom: 1px solid hsl(var(--border)); } li.focused { background: hsl(var(--primary) / .06); }
  .person-name { font-size: 14px; font-weight: 600; } li p { font-size: 12px; margin-top: 4px; overflow-wrap: anywhere; }
  .person-actions { display: flex; justify-content: space-between; gap: 8px; margin-top: 10px; font-size: 12px; } .person-actions a, .person-actions button { color: hsl(var(--primary)); } .person-actions span { color: hsl(var(--muted-foreground)); }
  .route-estimate { margin-top: 10px; color: hsl(var(--primary)); font-size: 12px; font-weight: 500; }
  a:hover, .person-actions button:hover { text-decoration: underline; }
  .empty { height: 100%; min-height: 240px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 32px; gap: 8px; } .empty p { max-width: 340px; } .empty h3 { font-weight: 600; } .empty-icon { color: hsl(var(--primary)); font-size: 32px; }
  .no-results { font-size: 13px; color: hsl(var(--muted-foreground)); }
  footer { display: flex; flex-wrap: wrap; gap: 12px 20px; padding: 14px 24px; border-top: 1px solid hsl(var(--border)); font-size: 12px; color: hsl(var(--muted-foreground)); } footer span { display: inline-flex; align-items: center; gap: 6px; } i { width: 8px; height: 8px; border-radius: 50%; } .leader { background: #10b981; } .member { background: #3b82f6; } .guest { background: #f59e0b; } .archived { background: #64748b; } .church { background: #0f172a; border-radius: 2px; } .map-hint { margin-left: auto; }
  @media(max-width: 1000px) { .map-layout { display: flex; flex-direction: column; } .map-canvas { height: 340px; flex-shrink: 0; } .location-list { display: contents; } .list-controls { order: -1; } .location-list ul { max-height: 300px; flex: auto; border-top: 1px solid hsl(var(--border)); } .map-hint { margin-left: 0; } }
</style>
