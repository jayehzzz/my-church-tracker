<script>
  import MetricComparison from "$lib/components/charts/MetricComparison.svelte";
  import FullscreenWrapper from "$lib/components/ui/FullscreenWrapper.svelte";
  import { onDestroy } from "svelte";
  import LeafletMap from "$lib/components/map/LeafletMap.svelte";
  import { hasMapLocation, personAddress } from "$lib/utils/peopleView.js";
  import { externalMapLookupUrl, geocodeAddress, normalizeGeocodingAddress } from "$lib/services/geocodingService.js";
  import * as peopleService from "$lib/services/peopleService.js";
  import { isDemoMode } from "$lib/convex.js";

  let { people = [], loading = false, onEditPerson = null } = $props();
  let mapComponent = $state();
  let query = $state("");
  let locationFilter = $state("all");
  let focusedId = $state(null);
  let routeEstimate = $state(null);
  let routeRequest = null;
  let churchSettings = $state(null);
  let hasLoadedChurchSettings = $state(false);
  let churchLocation = $state(isDemoMode() ? { lat: 51.8787, lng: -0.42, name: "Demo church" } : null);
  let geocodedPeople = $state({});
  let geocodingCount = $state(0);
  let geocodingMessage = $state("");
  let destroyed = false;
  let mapPeople = $derived(people.map((person) => {
    const personId = String(person.id || person._id || "");
    const cached = geocodedPeople[personId];
    return cached?.addressKey === normalizeGeocodingAddress(personAddress(person)).toLowerCase()
      ? { ...person, lat: cached.lat, lng: cached.lng }
      : person;
  }));
  let mapped = $derived(mapPeople.filter(hasMapLocation));
  let addressed = $derived(people.filter((person) => Boolean(personAddress(person))));
  let missing = $derived(people.length - mapped.length);
  let locatableMissing = $derived(mapPeople.filter((person) => Boolean(personAddress(person)) && !hasMapLocation(person)));
  let results = $derived(mapPeople.filter((person) => {
    const matchesLocation = locationFilter !== "missing" || !hasMapLocation(person);
    return matchesLocation && `${person.first_name || ""} ${person.last_name || ""} ${personAddress(person)}`
      .toLowerCase().includes(query.trim().toLowerCase());
  }));
  let visibleMapped = $derived(results.filter(hasMapLocation));

  function mapLookupQuery(person) {
    return personAddress(person) || (hasMapLocation(person) ? `${person.lat},${person.lng}` : "");
  }

  function lookupUrl(provider, person) {
    return externalMapLookupUrl(provider, mapLookupQuery(person));
  }

  function previewPerson(person) {
    focusedId = person.id || person._id;
    void loadRouteEstimate(person, false);
  }

  onDestroy(() => {
    destroyed = true;
    routeRequest?.abort();
  });

  async function geocodeMissingPeople() {
    const snapshot = [...locatableMissing];
    if (!snapshot.length || geocodingCount) return;
    geocodingMessage = "";
    let located = 0;
    let saved = 0;
    for (const person of snapshot) {
      if (destroyed || hasMapLocation(person)) continue;
      const personId = String(person.id || person._id || "");
      const address = normalizeGeocodingAddress(personAddress(person));
      if (!personId || !address) continue;
      geocodingCount += 1;
      try {
        const location = await geocodeAddress(address);
        if (location && !destroyed) {
          located += 1;
          geocodedPeople = {
            ...geocodedPeople,
            [personId]: { ...location, addressKey: address.toLowerCase() },
          };
          const saveResult = await peopleService.update(personId, location);
          if (!saveResult.error) saved += 1;
        }
      } catch {
        // A failed lookup leaves the written address available in the list.
      } finally {
        if (!destroyed) geocodingCount = Math.max(0, geocodingCount - 1);
      }
    }
    if (!destroyed) {
      geocodingMessage = located
        ? `${located} ${located === 1 ? "address" : "addresses"} located${saved < located ? ` · ${saved} coordinates saved` : " and saved"}.`
        : "No additional addresses could be located. Check that they include a town or postcode.";
    }
  }

  $effect(() => {
    if (isDemoMode() || hasLoadedChurchSettings) return;
    hasLoadedChurchSettings = true;
    void (async () => {
      const service = await import("$lib/services/churchSettingsService.js");
      const result = await service.get();
      if (result.error || destroyed) return;
      churchSettings = result.data;
      const address = normalizeGeocodingAddress(result.data?.address);
      if (!address) return;
      geocodingCount += 1;
      try {
        const location = await geocodeAddress(address);
        if (location && !destroyed) {
          churchLocation = {
            ...location,
            name: result.data?.church_name || "Church",
          };
        }
      } catch {
        // The address remains visible even if an external geocoder is unavailable.
      } finally {
        if (!destroyed) geocodingCount = Math.max(0, geocodingCount - 1);
      }
    })();
  });

  function formatDuration(seconds) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    return minutes >= 60 ? `${Math.floor(minutes / 60)} hr ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim() : `${minutes} min`;
  }

  async function loadRouteEstimate(person, moveMap = true) {
    const personId = person.id || person._id;
    focusedId = personId;
    if (moveMap) mapComponent?.flyTo(person.lat, person.lng, personId);
    if (routeEstimate?.personId === personId && routeEstimate.status !== "error") {
      return;
    }
    routeRequest?.abort();
    const controller = new AbortController();
    routeRequest = controller;
    routeEstimate = churchLocation ? { personId, status: "loading" } : null;
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
    } catch (error) {
      if (!controller.signal.aborted) {
        routeEstimate = { personId, status: "error" };
      }
    }
  }

  function focusPerson(person) {
    void loadRouteEstimate(person, true);
  }
</script>

<FullscreenWrapper title="People comparison">
  <section class="card-base p-5 mb-5"><h2 class="mb-4 pr-12 text-base font-semibold">People comparison</h2>
    <MetricComparison metrics={[{key:'all',label:'People in this view',total:people.length},{key:'mapped',label:'People with a map pin',total:mapped.length},{key:'missing',label:'People without a map pin',total:missing},{key:'address',label:'People with an address',total:addressed.length}]} periodLabel="Current people snapshot" />
    <p class="mt-3 text-xs text-muted-foreground">These are current person counts; a time average does not apply.</p>
  </section>
</FullscreenWrapper>
<FullscreenWrapper title="People locations">
<section class="people-map" aria-label="People locations">
  <header class="map-heading pr-12">
    <div>
      <h2>People locations</h2>
      <p>Find someone nearby or open their profile to arrange care.</p>
      {#if churchSettings?.address}<p class="church-address"><strong>Church:</strong> {churchSettings.address}</p>{/if}
      {#if !isDemoMode() && locatableMissing.length}
        <div class="geocode-actions">
          <button type="button" onclick={geocodeMissingPeople} disabled={geocodingCount > 0}>
            {geocodingCount ? "Locating addresses…" : `Locate & save addresses (${locatableMissing.length})`}
          </button>
          <span>Uses OpenStreetMap geocoding to turn saved addresses into map coordinates.</span>
        </div>
      {/if}
      {#if geocodingMessage}<p class="geocode-message" aria-live="polite">{geocodingMessage}</p>{/if}
    </div>
    <p class="coverage" aria-live="polite">{loading ? "Loading locations…" : `${addressed.length} with an address · ${mapped.length} mapped${geocodingCount ? " · locating…" : ""}`}</p>
  </header>
  {#if loading}
    <div class="empty" role="status">Loading people…</div>
  {:else}
    <div class="map-layout">
      <div class="map-canvas">
        {#if visibleMapped.length || churchLocation}
          <LeafletMap bind:this={mapComponent} people={visibleMapped} {churchLocation} {routeEstimate} onPersonSelected={focusPerson} onPersonHovered={previewPerson} scrollWheelZoom={false} />
        {:else}
          <div class="empty">
            <span class="empty-icon" aria-hidden="true">⌖</span>
            <h3>{mapped.length ? "No locations match this view" : addressed.length ? "Addresses recorded, map pins not set" : "No recorded addresses"}</h3>
            <p>{mapped.length ? "Change your search or choose All people to see locations again." : addressed.length ? `${addressed.length} people have recorded addresses. Map pins need coordinates as well as the written address.` : "Add an address to a person’s profile to show it here."}</p>
          </div>
        {/if}
      </div>
      <aside class="location-list" aria-label="Find a person">
        <div class="list-controls">
          <label for="map-search">Find a person or area</label>
          <input id="map-search" type="search" placeholder="Name, town or postcode" bind:value={query} />
          <div class="location-tabs" aria-label="Location filter">
            <button type="button" aria-pressed={locationFilter === "all"} onclick={() => locationFilter = "all"}>All people</button>
            <button type="button" aria-pressed={locationFilter === "missing"} onclick={() => locationFilter = "missing"}>People without a pin ({missing})</button>
          </div>
          <p class="result-count" aria-live="polite">{results.length} {results.length === 1 ? "person" : "people"}</p>
        </div>
        <ul>
          {#each results as person (person.id || person._id)}
            <li class:focused={focusedId === (person.id || person._id)}>
              <a class="person-name" href="/people/{encodeURIComponent(person.id || person._id)}">{person.first_name} {person.last_name}</a>
              <p class="journey-status">{peopleService.formatJourneyStatus(person.member_status)}</p>
              <p>{personAddress(person) || "No address recorded"}</p>
              <div class="person-actions">
                {#if hasMapLocation(person)}
                  <button type="button" onclick={() => focusPerson(person)} aria-label="Show {person.first_name} {person.last_name} on map">Show on map</button>
                {:else}
                  <button type="button" onclick={() => onEditPerson?.(person)}>Edit address</button>
                {/if}
                <a href="/people/{encodeURIComponent(person.id || person._id)}">View profile →</a>
              </div>
              <div class="lookup-actions">
                {#if mapLookupQuery(person)}
                  <span>{hasMapLocation(person) ? "Directions:" : "Need help finding the right address?"}</span>
                  <a href={lookupUrl("google", person)} target="_blank" rel="noopener noreferrer">Google Maps</a>
                  <a href={lookupUrl("waze", person)} target="_blank" rel="noopener noreferrer">Waze</a>
                {:else}
                  <span>Add an address, town and postcode to create a map pin.</span>
                {/if}
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
      <span><i class="leader"></i>Leader</span><span><i class="member"></i>Member</span><span><i class="contact"></i>Outreach Contact</span><span><i class="guest"></i>Non-member</span><span><i class="archived"></i>Archived</span>
      {#if churchLocation}<span><i class="church"></i>{churchLocation.name}</span>{/if}<span class="map-hint">Select a pin to view a profile. Use + / − to zoom.</span>
    </footer>
  {/if}
</section>
</FullscreenWrapper>

<style>
  .people-map { border: 1px solid hsl(var(--border)); border-radius: 16px; background: hsl(var(--card)); overflow: hidden; }
  .map-heading { padding: 20px 24px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 1px solid hsl(var(--border)); }
  h2 { font-size: 18px; font-weight: 600; } p { color: hsl(var(--muted-foreground)); font-size: 13px; line-height: 1.6; }
  .coverage { font-size: 12px; padding: 6px 10px; border-radius: 8px; background: hsl(var(--secondary)); }
  .church-address { margin-top: 5px; font-size: 12px; }
  .geocode-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; }
  .geocode-actions button { padding: 7px 10px; border-radius: 7px; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); font-size: 12px; font-weight: 600; }
  .geocode-actions button:disabled { opacity: .55; cursor: wait; }
  .geocode-actions span, .geocode-message { font-size: 11px; color: hsl(var(--muted-foreground)); }
  .geocode-message { margin-top: 6px; }
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
  .person-name { font-size: 14px; font-weight: 600; } li p { font-size: 12px; margin-top: 4px; overflow-wrap: anywhere; } .journey-status { font-weight: 600; color: hsl(var(--foreground)); }
  .person-actions { display: flex; justify-content: space-between; gap: 8px; margin-top: 10px; font-size: 12px; } .person-actions a, .person-actions button { color: hsl(var(--primary)); }
  .lookup-actions { display: flex; flex-wrap: wrap; gap: 6px 10px; margin-top: 9px; font-size: 11px; color: hsl(var(--muted-foreground)); }
  .lookup-actions a { color: hsl(var(--primary)); font-weight: 500; }
  .route-estimate { margin-top: 10px; color: hsl(var(--primary)); font-size: 12px; font-weight: 500; }
  a:hover, .person-actions button:hover { text-decoration: underline; }
  .empty { height: 100%; min-height: 240px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 32px; gap: 8px; } .empty p { max-width: 340px; } .empty h3 { font-weight: 600; } .empty-icon { color: hsl(var(--primary)); font-size: 32px; }
  .no-results { font-size: 13px; color: hsl(var(--muted-foreground)); }
  footer { display: flex; flex-wrap: wrap; gap: 12px 20px; padding: 14px 24px; border-top: 1px solid hsl(var(--border)); font-size: 12px; color: hsl(var(--muted-foreground)); } footer span { display: inline-flex; align-items: center; gap: 6px; } i { width: 8px; height: 8px; border-radius: 50%; } .leader { background: #10b981; } .member { background: #3b82f6; } .contact, .guest { background: #f59e0b; } .archived { background: #64748b; } .church { background: #0f172a; border-radius: 2px; } .map-hint { margin-left: auto; }
  @media(max-width: 1000px) { .map-layout { display: flex; flex-direction: column; } .map-canvas { height: 340px; flex-shrink: 0; } .location-list { display: contents; } .list-controls { order: -1; } .location-list ul { max-height: 300px; flex: auto; border-top: 1px solid hsl(var(--border)); } .map-hint { margin-left: 0; } }
</style>
