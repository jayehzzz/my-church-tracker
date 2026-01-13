<script>
    import { onMount, onDestroy } from "svelte";
    import { browser } from "$app/environment";

    let {
        people = [],
        center = [51.505, -0.09],
        selectedIds = [],
        visitationQueueIds = [],
        showStructure = false,
        onMarkerClick,
        scrollWheelZoom = true,
    } = $props();

    let mapElement;
    let map;
    let L; // Leaflet instance
    let markersLayer;
    let structureLayer;
    let churchMarkerLayer;

    // Map State (Default to Light Mode for better legibility)
    let isDarkTheme = $state(false);

    // Initialize map
    onMount(async () => {
        if (browser) {
            L = (await import("leaflet")).default;
            initMap();
        }
    });

    // Re-render layers when props change
    $effect(() => {
        if (map && people && L) {
            updateLayers();
        }
    });

    // Handle theme toggle
    $effect(() => {
        if (map && L) {
            updateTileLayer();
        }
    });

    function initMap() {
        if (!mapElement) return;

        // Cleanup if exists
        if (map) map.remove();

        map = L.map(mapElement, {
            zoomControl: false, // We will build custom controls
            scrollWheelZoom: scrollWheelZoom,
            doubleClickZoom: true,
            attributionControl: false,
        }).setView(center, 13);

        updateTileLayer();

        // Add Attribution manually in a cleaner way if needed, or skip for internal dash
        L.control.attribution({ position: "bottomright" }).addTo(map);

        updateLayers();
    }

    function updateTileLayer() {
        // Remove existing tile layers
        map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                map.removeLayer(layer);
            }
        });

        // Voyager (Light & Detailed) vs Dark Matter (Dark & Minimal)
        const url = isDarkTheme
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

        L.tileLayer(url, {
            subdomains: "abcd",
            maxZoom: 19,
        }).addTo(map);
    }

    async function updateLayers() {
        if (!map || !L) return;

        // 1. Clear existing layers
        if (markersLayer) map.removeLayer(markersLayer);
        if (structureLayer) map.removeLayer(structureLayer);
        if (churchMarkerLayer) map.removeLayer(churchMarkerLayer);

        // 2. Church Marker (Always distinct)
        const churchIcon = L.divIcon({
            className: "custom-div-icon",
            html: `
                <div class="relative flex items-center justify-center w-12 h-12">
                    <div class="absolute w-full h-full bg-primary/20 rounded-full animate-ping"></div>
                    <div class="relative w-10 h-10 bg-primary rounded-full shadow-lg border-2 border-white flex items-center justify-center text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22v-8l9-7 9 7v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="8 22 8 15 16 15 16 22"></polyline><polyline points="12 4 12 7"></polyline></svg>
                    </div>
                </div>
            `,
            iconSize: [48, 48],
            iconAnchor: [24, 24],
        });

        churchMarkerLayer = L.marker(center, {
            icon: churchIcon,
            zIndexOffset: 1000,
        })
            .bindPopup(`<div class="font-bold text-sm">Church Location</div>`)
            .addTo(map);

        // 3. Structure Lines (If enabled)
        if (showStructure) {
            structureLayer = L.layerGroup();
            people.forEach((person) => {
                if (person.leader_id) {
                    const leader = people.find(
                        (p) => p.id === person.leader_id,
                    );
                    if (leader && person.lat && leader.lat) {
                        const line = L.polyline(
                            [
                                [person.lat, person.lng],
                                [leader.lat, leader.lng],
                            ],
                            {
                                color: "#6366f1",
                                weight: 1,
                                opacity: 0.4,
                                dashArray: "4, 4",
                            },
                        );
                        structureLayer.addLayer(line);
                    }
                }
            });
            structureLayer.addTo(map);
        }

        // 4. Person Markers
        markersLayer = L.markerClusterGroup
            ? L.markerClusterGroup()
            : L.featureGroup();

        people.forEach((person) => {
            if (!person.lat || !person.lng) return;

            const isSelected = selectedIds.includes(person.id);
            const isPriority = visitationQueueIds.includes(person.id);
            const isDimmed = visitationQueueIds.length > 0 && !isPriority;

            // Determine Color
            let colorClass = "bg-gray-500";
            if (person.member_status === "leader")
                colorClass = "bg-emerald-500";
            else if (person.member_status === "member")
                colorClass = "bg-blue-500";
            else if (person.member_status === "visitor")
                colorClass = "bg-amber-500";

            // Determine Border/Glow
            let containerClass = "relative w-6 h-6 transition-all duration-300";
            if (isSelected) containerClass += " scale-125 z-50";
            if (isPriority)
                containerClass +=
                    " scale-125 z-50 ring-4 ring-rose-500/50 rounded-full";
            if (isDimmed) containerClass += " opacity-20 grayscale";

            // Determine Inner HTML
            const initials = (
                person.first_name[0] + person.last_name[0]
            ).toUpperCase();

            const html = `
                <div class="${containerClass}">
                    ${isSelected || isPriority ? `<div class="absolute -inset-1 rounded-full ${colorClass} opacity-30 animate-pulse"></div>` : ""}
                    <div class="relative w-full h-full rounded-full border-2 border-white shadow-md ${colorClass} text-[10px] text-white font-bold flex items-center justify-center">
                        ${initials}
                    </div>
                </div>
            `;

            const icon = L.divIcon({
                className: "custom-person-icon",
                html: html,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            });

            const marker = L.marker([person.lat, person.lng], { icon: icon });

            // Popup
            const popupContent = `
                <div class="p-1 min-w-[200px]">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-xs text-white font-bold">
                            ${initials}
                        </div>
                        <div>
                            <h3 class="font-bold text-sm leading-none">${person.first_name} ${person.last_name}</h3>
                            <span class="text-[10px] uppercase tracking-wider opacity-70">${person.member_status}</span>
                        </div>
                    </div>
                    
                    <div class="space-y-1 text-xs text-muted-foreground mb-3">
                        <div class="flex items-start gap-1">
                            <svg class="w-3 h-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            <span>${person.address}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                            <span>${person.role !== "no_role" ? person.role.replace("_", " ") : "No Role"}</span>
                        </div>
                    </div>

                    <button class="w-full py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors" 
                        onclick="document.dispatchEvent(new CustomEvent('map-select', {detail: '${person.id}'}))">
                        ${isSelected ? "Remove from Route" : "Add to Route"}
                    </button>
                </div>
            `;

            marker.bindPopup(popupContent, {
                closeButton: false,
                className: "custom-popup",
            });

            marker.on("click", () => {
                if (onMarkerClick) onMarkerClick(person);
            });

            markersLayer.addLayer(marker);
        });

        markersLayer.addTo(map);
    }

    export function flyTo(lat, lng) {
        if (map) map.flyTo([lat, lng], 16, { duration: 1.5 });
    }

    export function toggleTheme() {
        isDarkTheme = !isDarkTheme;
        updateTileLayer();
    }

    export function zoomIn() {
        if (map) map.zoomIn();
    }

    export function zoomOut() {
        if (map) map.zoomOut();
    }

    export function recenter() {
        if (map) map.flyTo(center, 14, { duration: 1.5 });
    }

    function handleMapSelect(e) {
        const personId = e.detail;
        const person = people.find((p) => p.id === personId);
        if (person && onMarkerClick) {
            onMarkerClick(person);
        }
    }

    onMount(() => {
        document.addEventListener("map-select", handleMapSelect);
    });

    onDestroy(() => {
        if (map) map.remove();
        if (browser) {
            document.removeEventListener("map-select", handleMapSelect);
        }
    });
</script>

<svelte:head>
    <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossorigin=""
    />
</svelte:head>

<div class="relative w-full h-full group">
    <div bind:this={mapElement} class="w-full h-full z-0 bg-muted/20"></div>

    <!-- Controls (Bottom Right) -->
    <div
        class="absolute bottom-6 right-6 z-[400] flex flex-col gap-2 pointer-events-auto"
    >
        <button
            onclick={recenter}
            class="w-10 h-10 bg-background/95 backdrop-blur border border-border/50 rounded-lg shadow-lg flex items-center justify-center text-foreground hover:bg-accent transition-colors"
            title="Recenter on Church"
        >
            <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                /></svg
            >
        </button>

        <button
            onclick={toggleTheme}
            class="w-10 h-10 bg-background/95 backdrop-blur border border-border/50 rounded-lg shadow-lg flex items-center justify-center text-foreground hover:bg-accent transition-colors"
            title="Toggle Theme"
        >
            {#if isDarkTheme}
                <svg
                    class="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    /></svg
                >
            {:else}
                <svg
                    class="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    /></svg
                >
            {/if}
        </button>

        <div
            class="flex flex-col rounded-lg shadow-lg overflow-hidden border border-border/50"
        >
            <button
                onclick={zoomIn}
                class="w-10 h-10 bg-background/95 backdrop-blur flex items-center justify-center text-foreground hover:bg-accent transition-colors border-b border-border/50"
                aria-label="Zoom in"
            >
                <svg
                    class="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4v16m8-8H4"
                    /></svg
                >
            </button>
            <button
                onclick={zoomOut}
                class="w-10 h-10 bg-background/95 backdrop-blur flex items-center justify-center text-foreground hover:bg-accent transition-colors"
                aria-label="Zoom out"
            >
                <svg
                    class="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M20 12H4"
                    /></svg
                >
            </button>
        </div>
    </div>
</div>

<style>
    :global(.custom-div-icon),
    :global(.custom-person-icon) {
        background: transparent;
        border: none;
    }
    :global(.leaflet-popup-content-wrapper) {
        background: hsl(var(--card));
        color: hsl(var(--card-foreground));
        border-radius: 0.75rem;
        border: 1px solid hsl(var(--border));
        padding: 0;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    :global(.leaflet-popup-content) {
        margin: 0;
        line-height: 1.5;
    }
    :global(.leaflet-popup-tip) {
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
    }
    :global(.leaflet-container) {
        font-family: inherit;
    }
    :global(.leaflet-control-zoom) {
        display: none;
    }
</style>
