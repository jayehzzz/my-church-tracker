<script>
    import { onMount } from "svelte";
    import LeafletMap from "$lib/components/map/LeafletMap.svelte";
    import { churchLocation } from "$lib/data/mockPeopleWithLocation";
    import { Button } from "$lib/components/ui";

    let { people = [] } = $props();

    // State
    let mapComponent = $state();
    let selectedPeopleIds = $state([]);
    let isRoutePanelOpen = $state(false);
    let mapReady = $state(false);

    // Calculate distances
    let peopleWithDistance = $derived.by(() => {
        if (!people || people.length === 0) return [];
        return people
            .map((person) => {
                if (!person.lat || !person.lng)
                    return { ...person, distance: Infinity };

                const dist = calculateDistance(
                    churchLocation.lat,
                    churchLocation.lng,
                    person.lat,
                    person.lng,
                );
                return { ...person, distance: dist };
            })
            .sort((a, b) => a.distance - b.distance);
    });

    // KPIs
    let kpis = $derived(() => {
        const selected = peopleWithDistance.filter((p) =>
            selectedPeopleIds.includes(p.id),
        );
        const totalDistance = selected.reduce(
            (acc, p) => acc + (p.distance !== Infinity ? p.distance : 0),
            0,
        );
        const avgDistance = selected.length
            ? (totalDistance / selected.length).toFixed(1)
            : 0;

        return { count: selected.length, avgDistance };
    });

    onMount(() => {
        // Slight delay to ensure container size is calculated before map renders
        setTimeout(() => {
            mapReady = true;
        }, 100);
    });

    // Haversine formula
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3959;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) *
                Math.cos(toRad(lat2)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return parseFloat((R * c).toFixed(1));
    }
    function toRad(deg) {
        return deg * (Math.PI / 180);
    }

    function togglePersonSelection(person) {
        if (selectedPeopleIds.includes(person.id)) {
            selectedPeopleIds = selectedPeopleIds.filter(
                (id) => id !== person.id,
            );
        } else {
            selectedPeopleIds = [...selectedPeopleIds, person.id];
            if (!isRoutePanelOpen) isRoutePanelOpen = true;
        }
    }

    function handleMarkerClick(person) {
        togglePersonSelection(person);
        if (mapComponent) mapComponent.flyTo(person.lat, person.lng);
    }

    function openGoogleMapsRoute() {
        if (selectedPeopleIds.length === 0) return;
        const selected = peopleWithDistance.filter((p) =>
            selectedPeopleIds.includes(p.id),
        );
        const sortedWaypoints = [...selected].sort(
            (a, b) => a.distance - b.distance,
        );

        const origin = encodeURIComponent(churchLocation.address);
        const description = sortedWaypoints[sortedWaypoints.length - 1];
        const waypoints = sortedWaypoints
            .slice(0, -1)
            .map((p) => encodeURIComponent(p.address || `${p.lat},${p.lng}`))
            .join("|");

        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${encodeURIComponent(description.address || `${description.lat},${description.lng}`)}`;
        if (waypoints) url += `&waypoints=${waypoints}`;
        window.open(url, "_blank");
    }
</script>

<!-- Main Container: Fixed height, isolated stacking context -->
<div
    class="h-[600px] w-full relative overflow-hidden rounded-xl border border-border/50 shadow-sm bg-card group"
>
    <!-- Minimal Tools Overlay (Top Left) -->
    <div class="absolute top-4 left-4 z-[400] pointer-events-auto flex gap-2">
        <Button
            variant="outline"
            size="sm"
            class="bg-background/95 backdrop-blur shadow-sm h-9 border-border/60 hover:bg-background"
            onclick={() => (isRoutePanelOpen = !isRoutePanelOpen)}
            aria-label="Route Planner"
        >
            <svg
                class="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.553-.894L15 4m0 13V4m0 0L9 7"
                />
            </svg>
            Route
            {#if kpis().count > 0}
                <span
                    class="ml-2 bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full text-[10px] font-bold h-5 min-w-[20px] inline-flex items-center justify-center"
                    >{kpis().count}</span
                >
            {/if}
        </Button>
    </div>

    <!-- Minimal Legend (Bottom Left) -->
    <div class="absolute bottom-4 left-4 z-[400] pointer-events-none">
        <div
            class="bg-background/90 backdrop-blur border border-border/60 rounded-lg p-2.5 shadow-lg text-[11px] space-y-1.5 pointer-events-auto"
        >
            <div class="flex items-center gap-2">
                <span
                    class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                ></span>
                <span class="font-medium">Leader</span>
            </div>
            <div class="flex items-center gap-2">
                <span
                    class="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                ></span>
                <span class="font-medium">Member</span>
            </div>
            <div class="flex items-center gap-2">
                <span
                    class="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                ></span>
                <span class="font-medium">Visitor</span>
            </div>
        </div>
    </div>

    <!-- Map Area -->
    <div class="w-full h-full z-0 bg-muted/20">
        {#if mapReady}
            <LeafletMap
                bind:this={mapComponent}
                people={peopleWithDistance}
                center={[churchLocation.lat, churchLocation.lng]}
                selectedIds={selectedPeopleIds}
                onMarkerClick={handleMarkerClick}
                scrollWheelZoom={false}
            />
        {/if}
    </div>

    <!-- Sliding Right Drawer -->
    <div
        class="absolute top-2 bottom-2 right-2 w-72 bg-background/95 backdrop-blur border border-border/60 shadow-2xl rounded-xl z-[400] transition-all duration-300 ease-out flex flex-col overflow-hidden text-sm
        {isRoutePanelOpen
            ? 'translate-x-0 opacity-100'
            : 'translate-x-[110%] opacity-0 pointer-events-none'}"
    >
        <div
            class="p-3 border-b border-border/60 flex justify-between items-center bg-muted/40"
        >
            <div>
                <h2 class="font-semibold text-foreground">Pickup Route</h2>
                <p
                    class="text-[10px] text-muted-foreground uppercase tracking-wider"
                >
                    {kpis().avgDistance} mi avg
                </p>
            </div>
            <button
                class="text-muted-foreground hover:text-foreground transition-colors p-1"
                onclick={() => (isRoutePanelOpen = false)}
                aria-label="Close Route Panel"
            >
                <svg
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                    /></svg
                >
            </button>
        </div>

        <div class="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-hide">
            {#if kpis().count === 0}
                <div
                    class="flex flex-col items-center justify-center h-full text-muted-foreground text-center p-4"
                >
                    <div
                        class="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2"
                    >
                        <svg
                            class="w-5 h-5 opacity-50"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            /><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            /></svg
                        >
                    </div>
                    <p class="text-xs">Select pins on the map to add stops.</p>
                </div>
            {:else}
                {#each peopleWithDistance.filter( (p) => selectedPeopleIds.includes(p.id), ) as person}
                    <div
                        class="flex items-center justify-between p-2 rounded-lg bg-card border border-border/50 hover:border-primary/40 transition-all shadow-sm group"
                    >
                        <div class="min-w-0">
                            <div class="font-medium truncate">
                                {person.first_name}
                                {person.last_name}
                            </div>
                            <div
                                class="text-[10px] text-muted-foreground flex items-center gap-1"
                            >
                                <span class="truncate"
                                    >{person.address || "No address"}</span
                                >
                                <span class="w-0.5 h-0.5 rounded-full bg-border"
                                ></span>
                                <span>{person.distance} mi</span>
                            </div>
                        </div>
                        <button
                            class="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                            onclick={() => togglePersonSelection(person)}
                            aria-label="Remove"
                        >
                            <svg
                                class="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                ><path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12"
                                /></svg
                            >
                        </button>
                    </div>
                {/each}
            {/if}
        </div>

        <div class="p-3 border-t border-border/60 bg-muted/40">
            {#if kpis().count > 0}
                <div class="flex gap-2 mb-2">
                    <button
                        class="flex-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                        onclick={() => (selectedPeopleIds = [])}
                        >Clear All</button
                    >
                </div>
            {/if}
            <Button
                size="sm"
                class="w-full font-semibold shadow-md"
                disabled={kpis().count === 0}
                onclick={openGoogleMapsRoute}
                aria-label="Open in Google Maps"
            >
                Generate Route
            </Button>
        </div>
    </div>
</div>
