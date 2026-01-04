<script>
    import { onMount, onDestroy } from "svelte";
    import { browser } from "$app/environment";

    let {
        people = [],
        center = [51.505, -0.09],
        selectedIds = [],
        onMarkerClick,
        onHeatmapToggle,
        scrollWheelZoom = false,
    } = $props();

    let mapElement;
    let map;
    let markersLayer;
    let heatLayer;
    let isHeatmapMode = $state(false);

    // Initialize map
    onMount(async () => {
        if (browser) {
            const L = (await import("leaflet")).default;

            // Fix marker icons
            // See: https://github.com/Leaflet/Leaflet/issues/4968
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl:
                    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
                iconUrl:
                    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
                shadowUrl:
                    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
            });

            map = L.map(mapElement, {
                scrollWheelZoom: scrollWheelZoom,
            }).setView(center, 13);

            // Dark Matter Tiles
            L.tileLayer(
                "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
                {
                    attribution:
                        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    subdomains: "abcd",
                    maxZoom: 19,
                },
            ).addTo(map);

            updateLayers();
        }
    });

    // Re-render layers when people or mode changes
    $effect(() => {
        if (map && people) {
            updateLayers();
        }
    });

    async function updateLayers() {
        if (!map) return;
        const L = (await import("leaflet")).default;

        // Clear existing
        if (markersLayer) map.removeLayer(markersLayer);
        if (heatLayer) map.removeLayer(heatLayer);

        if (isHeatmapMode) {
            // Heatmap Approximation using CircleMarkers with blur/opacity
            const group = L.featureGroup();
            people.forEach((person) => {
                if (person.lat && person.lng) {
                    const intensity =
                        person.member_status === "leader" ? 1.0 : 0.6;
                    const radius = person.member_status === "leader" ? 25 : 20;

                    L.circleMarker([person.lat, person.lng], {
                        radius: radius,
                        fillColor: getStatusColor(person.member_status),
                        color: "transparent",
                        weight: 0,
                        opacity: 0,
                        fillOpacity: 0.4, // Semi-transparent for stacking effect
                    }).addTo(group);
                }
            });
            heatLayer = group.addTo(map);
        } else {
            // Standard Markers
            const group = L.featureGroup();
            people.forEach((person) => {
                if (person.lat && person.lng) {
                    const isSelected = selectedIds.includes(person.id);
                    const marker = L.marker([person.lat, person.lng], {
                        opacity: isSelected ? 1 : 0.8,
                    }).bindPopup(`
                      <div class="p-2">
                          <h3 class="font-bold text-sm">${person.first_name} ${person.last_name}</h3>
                          <p class="text-xs text-gray-500">${person.member_status}</p>
                          <p class="text-xs mt-1">${person.address}</p>
                          <button class="mt-2 text-xs text-blue-500 underline" onclick="document.dispatchEvent(new CustomEvent('map-select', {detail: '${person.id}'}))">
                              ${isSelected ? "Selected" : "Select for Route"}
                          </button>
                      </div>
                  `);

                    marker.on("click", () => {
                        if (onMarkerClick) onMarkerClick(person);
                    });

                    // Listen for popup button click via global event delegate hack (Leaflet popup isolation)
                    // Cleaner way: bindPopup content but logic handled by marker click for simplicity in this MVP

                    group.addLayer(marker);
                }
            });
            markersLayer = group.addTo(map);
        }
    }

    function getStatusColor(status) {
        switch (status) {
            case "leader":
                return "#10b981"; // emerald-500
            case "member":
                return "#3b82f6"; // blue-500
            case "visitor":
                return "#f59e0b"; // amber-500
            default:
                return "#6b7280";
        }
    }

    export function toggleHeatmap() {
        isHeatmapMode = !isHeatmapMode;
        updateLayers();
        return isHeatmapMode;
    }

    export function flyTo(lat, lng) {
        if (map) map.flyTo([lat, lng], 15);
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

<div
    class="relative w-full h-full rounded-xl overflow-hidden border border-border shadow-lg z-0"
>
    <div bind:this={mapElement} class="w-full h-full z-0"></div>
</div>

<style>
    :global(.leaflet-popup-content-wrapper) {
        background: hsl(var(--card));
        color: hsl(var(--card-foreground));
        border-radius: 0.5rem;
        border: 1px solid hsl(var(--border));
    }
    :global(.leaflet-popup-tip) {
        background: hsl(var(--card));
    }
</style>
