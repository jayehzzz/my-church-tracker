<script>
  import { untrack } from "svelte";
  import { createPersonPopup, escapeMapText } from "$lib/utils/mapPopup.js";
  import { hasMapLocation } from "$lib/utils/peopleView.js";
  import "leaflet/dist/leaflet.css";

  let { people = [], churchLocation = null, routeEstimate = null, onPersonSelected = null, scrollWheelZoom = false } = $props();
  let mapElement = $state();
  let map;
  let L;
  let markersLayer;
  let markers = new Map();
  let ready = $state(false);
  let mapError = $state("");
  let tileError = $state(false);

  $effect(() => {
    const element = mapElement;
    if (!element) return;
    let cancelled = false;
    let observer;
    void import("leaflet").then((module) => {
      if (cancelled) return;
      L = module.default;
      map = L.map(element, { zoomControl: false, scrollWheelZoom }).setView([54, -2], 6);
      const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });
      tiles.on("tileerror", () => tileError = true);
      tiles.addTo(map);
      observer = new ResizeObserver(() => map?.invalidateSize({ pan: false }));
      observer.observe(element);
      ready = true;
    }).catch(() => mapError = "The map could not load. You can still use the people list to open profiles.");
    return () => {
      cancelled = true;
      observer?.disconnect();
      map?.remove();
      map = null;
      ready = false;
    };
  });

  $effect(() => {
    if (!ready) return;
    const locations = people.filter(hasMapLocation);
    untrack(() => {
      if (markersLayer) map.removeLayer(markersLayer);
      markers = new Map();
      markersLayer = L.layerGroup();
      if (churchLocation) {
        const churchIcon = L.divIcon({ className: "church-map-icon", html: '<div aria-hidden="true">⌂</div>', iconSize: [34, 34], iconAnchor: [17, 17] });
        L.marker([churchLocation.lat, churchLocation.lng], { icon: churchIcon, title: churchLocation.name, alt: churchLocation.name })
          .bindPopup(`<strong>${escapeMapText(churchLocation.name)}</strong><br>Church location`, { className: "person-map-popup", maxWidth: 220 })
          .addTo(markersLayer);
      }
      for (const person of locations) {
        const colorClass = person.member_status === "leader" ? "bg-emerald-500"
          : person.member_status === "member" ? "bg-blue-500"
          : person.member_status === "archived" ? "bg-slate-500" : "bg-amber-500";
        const initials = ((person.first_name?.[0] || "") + (person.last_name?.[0] || "")).toUpperCase() || "?";
        const name = `${person.first_name || ""} ${person.last_name || ""}`.trim();
        const icon = L.divIcon({
          className: "person-map-icon",
          html: `<div class="w-8 h-8 rounded-full border-2 border-white shadow-md ${colorClass} text-xs text-white font-bold flex items-center justify-center">${escapeMapText(initials)}</div>`,
          iconSize: [32, 32], iconAnchor: [16, 16],
        });
        const marker = L.marker([person.lat, person.lng], { icon, title: name, alt: name });
        const personId = person.id || person._id;
        marker.bindPopup(createPersonPopup(person, {
          colorClass,
          travelEstimate: routeEstimate?.personId === personId ? routeEstimate : null,
        }), { className: "person-map-popup", maxWidth: 280 });
        marker.on("popupopen", () => onPersonSelected?.(person));
        markersLayer.addLayer(marker);
        markers.set(personId, marker);
      }
      markersLayer.addTo(map);
      for (const person of locations) markers.get(person.id || person._id)?.getElement()?.setAttribute("aria-label", `${person.first_name || ""} ${person.last_name || ""}`.trim());
      fitEveryone(false);
    });
  });

  export function fitEveryone(animate = true) {
    const locations = people.filter(hasMapLocation).map(p => [p.lat, p.lng]);
    if (churchLocation) locations.push([churchLocation.lat, churchLocation.lng]);
    if (!map || !locations.length) return;
    map.invalidateSize({ pan: false });
    map.fitBounds(L.latLngBounds(locations), { padding: [48, 48], maxZoom: 14, animate });
  }

  export function flyTo(lat, lng, personId) {
    if (!map) return;
    map.setView([lat, lng], 16);
    markers.get(personId)?.openPopup();
  }
</script>

<div class="map-root" data-map-state={mapError ? "error" : ready ? "ready" : "loading"}>
  <div bind:this={mapElement} class="map-surface"></div>
  {#if !ready || mapError}
    <div class="map-message" role="status">{mapError || "Loading map…"}</div>
  {/if}
  {#if tileError && !mapError}
    <p class="tile-error" role="status">Some map tiles could not load. People are still available in the list.</p>
  {/if}
  {#if ready}
    <div class="map-controls">
      <button type="button" onclick={() => fitEveryone()} aria-label="Fit everyone in view" title="Fit everyone in view">⌖</button>
      <button type="button" onclick={() => map?.zoomIn()} aria-label="Zoom in">+</button>
      <button type="button" onclick={() => map?.zoomOut()} aria-label="Zoom out">−</button>
    </div>
  {/if}
</div>

<style>
  .map-root, .map-surface { width: 100%; height: 100%; position: relative; } .map-root { isolation: isolate; overflow: hidden; background: #e6e8e5; } .map-surface { z-index: 0; }
  .map-message { position: absolute; inset: 0; z-index: 450; display: grid; place-items: center; padding: 24px; background: hsl(var(--background) / .9); text-align: center; font-size: 14px; }
  .map-controls { position: absolute; right: 16px; top: 16px; z-index: 400; display: flex; flex-direction: column; gap: 6px; }
  .map-controls button { width: 40px; height: 40px; background: hsl(var(--card)); color: hsl(var(--foreground)); border: 1px solid hsl(var(--border)); border-radius: 8px; box-shadow: 0 2px 5px #0002; font-size: 22px; }
  .map-controls button:hover { background: hsl(var(--secondary)); }
  .tile-error { position: absolute; bottom: 32px; left: 16px; right: 16px; z-index: 400; background: hsl(var(--card)); border-radius: 8px; padding: 12px; font-size: 12px; }
  :global(.person-map-icon) { background: transparent; border: none; }
  :global(.church-map-icon) { background: transparent; border: none; } :global(.church-map-icon div) { width: 34px; height: 34px; display: grid; place-items: center; border: 2px solid white; border-radius: 9px; background: #0f172a; color: white; box-shadow: 0 2px 7px #0005; font-size: 20px; font-weight: 700; }
  :global(.person-map-popup .leaflet-popup-content-wrapper), :global(.person-map-popup .leaflet-popup-tip) { background: hsl(var(--card)); color: hsl(var(--foreground)); }
  :global(.person-map-popup .leaflet-popup-content) { margin: 20px; line-height: 1.6; }
  :global(.person-map-popup a.profile-link) { color: hsl(var(--primary)); display: inline-block; margin-top: 8px; font-weight: 600; }
  :global(.leaflet-container) { font-family: inherit; }
</style>
