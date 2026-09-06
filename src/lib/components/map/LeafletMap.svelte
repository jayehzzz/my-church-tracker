<script>
    import { createPersonPopup, escapeMapText } from "$lib/utils/mapPopup.js";
    import { browser } from "$app/environment";
    import "leaflet/dist/leaflet.css";

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
    let tileLayer;
    let resizeObserver;
    let hasFittedInitialBounds = false;

    let mapLoading = $state(true);
    let mapStatus = $state("waiting");
    let mapError = $state("");

    // Map State (Default to Light Mode for better legibility)
    let isDarkTheme = $state(false);

    // This effect waits for bind:this to provide a real, visible container.
    // Leaflet touches browser globals while loading, so it remains a
    // client-only import.
    $effect(() => {
        const element = mapElement;
        if (!browser || !element) return;

        let cancelled = false;
        mapStatus = "loading-library";
        document.addEventListener("map-select", handleMapSelect);

        void import("leaflet")
            .then((module) => {
                if (cancelled) return;
                L = module.default;
                mapStatus = "initialising";
                initMap();
                mapStatus = "ready";

                if (typeof ResizeObserver !== "undefined") {
                    resizeObserver = new ResizeObserver(() => refreshSize());
                    resizeObserver.observe(element);
                }
            })
            .catch((error) => {
                console.error("Failed to initialise people map", error);
                mapError = "The map could not be prepared. Please try again.";
                mapLoading = false;
                mapStatus = "error";
            });

        return () => {
            cancelled = true;
            resizeObserver?.disconnect();
            document.removeEventListener("map-select", handleMapSelect);
            if (map) {
                map.remove();
                map = null;
            }
        };
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
        refreshSize();
    }

    function updateTileLayer() {
        if (!map || !L) return;
        mapLoading = true;

        if (tileLayer) map.removeLayer(tileLayer);

        // Standard OpenStreetMap tiles work without a project API key. The
        // optional dark treatment is applied locally to the tile pane below.
        const url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

        tileLayer = L.tileLayer(url, {
            subdomains: "abc",
            maxZoom: 19,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        });

        tileLayer.on("loading", () => {
            mapLoading = true;
        });

        tileLayer.on("load", () => {
            mapLoading = false;
            refreshSize();
        });

        tileLayer.addTo(map);
        map.getPane("tilePane")?.classList.toggle("map-dark-tiles", isDarkTheme);

        // Do not leave the interface blocked if a slow tile server only loads
        // part of the current viewport.
        setTimeout(() => {
            mapLoading = false;
        }, 2500);
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
            else if (
                person.member_status === "guest" ||
                person.member_status === "visitor"
            )
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
                (person.first_name?.[0] || "") + (person.last_name?.[0] || "")
            ).toUpperCase() || "?";

            const html = `
                <div class="${containerClass}">
                    ${isSelected || isPriority ? `<div class="absolute -inset-1 rounded-full ${colorClass} opacity-30 animate-pulse"></div>` : ""}
                    <div class="relative w-full h-full rounded-full border-2 border-white shadow-md ${colorClass} text-[10px] text-white font-bold flex items-center justify-center">
                        ${escapeMapText(initials)}
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
            const popupContent = createPersonPopup(person, {
                colorClass,
                isSelected,
                onSelect: (id) => document.dispatchEvent(new CustomEvent("map-select", { detail: id })),
            });

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

        if (!hasFittedInitialBounds) {
            hasFittedInitialBounds = true;
            setTimeout(() => fitEveryone(false), 0);
        }
    }

    export function refreshSize() {
        if (!map) return;
        requestAnimationFrame(() => {
            if (!map) return;
            map.invalidateSize({ pan: false });
        });
    }

    export function fitEveryone(animate = true) {
        if (!map || !L) return;
        const locations = people
            .filter((person) => Number.isFinite(person.lat) && Number.isFinite(person.lng))
            .map((person) => [person.lat, person.lng]);

        const bounds = L.latLngBounds([center, ...locations]);
        if (!bounds.isValid()) return;

        requestAnimationFrame(() => {
            if (!map) return;
            map.invalidateSize({ pan: false });
            map.fitBounds(bounds, {
                paddingTopLeft: [72, 92],
                paddingBottomRight: [96, 72],
                maxZoom: 14,
                animate,
            });

            // A final pass catches width changes caused by the dashboard
            // sidebar animation and fetches any newly exposed edge tiles.
            setTimeout(() => map?.invalidateSize({ pan: false }), 120);
        });
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

</script>

<div
    class="relative w-full h-full overflow-hidden bg-slate-100 group"
    data-map-state={mapStatus}
>
    <div bind:this={mapElement} class="w-full h-full z-0 bg-slate-100"></div>

    {#if mapLoading}
        <div
            class="absolute inset-0 z-[450] flex items-center justify-center bg-background/70 backdrop-blur-[2px] transition-opacity"
            aria-live="polite"
        >
            <div class="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-lg">
                <span class="h-5 w-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary"></span>
                <div>
                    <p class="text-sm font-semibold text-foreground">Preparing people map</p>
                    <p class="text-xs text-muted-foreground">Fitting locations into view…</p>
                </div>
            </div>
        </div>
    {/if}

    {#if mapError}
        <div class="absolute inset-0 z-[450] flex items-center justify-center bg-background/85 p-6">
            <div class="max-w-sm rounded-xl border border-destructive/25 bg-card p-5 text-center shadow-lg">
                <p class="font-semibold text-foreground">Map unavailable</p>
                <p class="mt-1 text-sm text-muted-foreground">{mapError}</p>
            </div>
        </div>
    {/if}

    <!-- Controls (Bottom Right) -->
    <div
        class="absolute bottom-6 right-6 z-[400] flex flex-col gap-2 pointer-events-auto"
    >
        <button
            onclick={() => fitEveryone(true)}
            class="w-10 h-10 bg-background/95 backdrop-blur border border-border/50 rounded-lg shadow-lg flex items-center justify-center text-foreground hover:bg-accent transition-colors"
            title="Fit everyone in view"
            aria-label="Fit everyone in view"
        >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
            </svg>
        </button>

        <button
            onclick={recenter}
            class="w-10 h-10 bg-background/95 backdrop-blur border border-border/50 rounded-lg shadow-lg flex items-center justify-center text-foreground hover:bg-accent transition-colors"
            title="Recenter on Church"
            aria-label="Recenter on church"
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
    :global(.leaflet-tile-pane) {
        transition: filter 180ms ease;
    }
    :global(.leaflet-tile-pane.map-dark-tiles) {
        filter: brightness(0.72) saturate(0.8) invert(0.86) hue-rotate(175deg);
    }
    :global(.leaflet-container) {
        font-family: inherit;
    }
    :global(.leaflet-control-zoom) {
        display: none;
    }
</style>
