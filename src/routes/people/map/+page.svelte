<script>
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import LeafletMap from "$lib/components/map/LeafletMap.svelte";
    import {
        churchLocation,
        mockPeopleWithLocation,
    } from "$lib/data/mockPeopleWithLocation";
    import { Button } from "$lib/components/ui";

    // State
    let people = $state([]);
    let mapComponent;
    let selectedPeopleIds = $state([]);
    let isRoutePanelOpen = $state(false);
    let loading = $state(true);

    let peopleWithDistance = $derived.by(() => {
        if (people.length === 0) return [];

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

    onMount(async () => {
        // Simulate loading real data, but use our mock location data for now
        loading = false;
        people = mockPeopleWithLocation;
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
            if (!isRoutePanelOpen) isRoutePanelOpen = true; // Auto open sidebar when selecting
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

<div
    class="h-[calc(100vh-65px)] w-full relative overflow-hidden bg-background flex flex-col"
>
    <!-- Top Bar overlay -->
    <div
        class="absolute top-0 left-0 right-0 z-[400] p-4 pointer-events-none flex justify-between items-start bg-gradient-to-b from-background/80 to-transparent"
    >
        <div
            class="pointer-events-auto bg-background/80 backdrop-blur border border-border rounded-lg shadow-sm p-3 flex flex-col gap-1"
        >
            <h1 class="text-lg font-bold">People Map</h1>
            <p class="text-xs text-muted-foreground">
                {people.length} Members • {kpis().count} Selected
            </p>
            <a
                href="/people"
                class="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
            >
                <svg
                    class="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    /></svg
                >
                Back to Directory
            </a>
        </div>

        <!-- Toggle Route Panel Button -->
        <div class="pointer-events-auto">
            <Button
                variant={isRoutePanelOpen ? "secondary" : "default"}
                class="shadow-lg"
                onclick={() => (isRoutePanelOpen = !isRoutePanelOpen)}
                aria-label="Toggle Route Panel"
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
                {isRoutePanelOpen ? "Hide Route" : "Plan Route"}
                {#if kpis().count > 0}
                    <span
                        class="ml-2 bg-primary-foreground/20 text-primary-foreground px-1.5 py-0.5 rounded-full text-xs"
                        >{kpis().count}</span
                    >
                {/if}
            </Button>
        </div>
    </div>

    <!-- Map Area -->
    <div class="flex-1 w-full h-full z-0">
        <LeafletMap
            bind:this={mapComponent}
            people={peopleWithDistance}
            center={[churchLocation.lat, churchLocation.lng]}
            selectedIds={selectedPeopleIds}
            onMarkerClick={handleMarkerClick}
        />
    </div>

    <!-- Floating Route Panel (Right Side Drawer) -->
    <div
        class="absolute top-20 right-4 bottom-4 w-80 bg-background/95 backdrop-blur border border-border shadow-2xl rounded-xl z-[400] transition-transform duration-300 ease-in-out flex flex-col overflow-hidden {isRoutePanelOpen
            ? 'translate-x-0'
            : 'translate-x-[120%]'}"
    >
        <div
            class="p-4 border-b border-border flex justify-between items-center bg-muted/30"
        >
            <div>
                <h2 class="font-semibold text-sm">Pickup Route</h2>
                <p class="text-xs text-muted-foreground">
                    {kpis().avgDistance} mi avg distance
                </p>
            </div>
            {#if kpis().count > 0}
                <button
                    class="text-xs text-muted-foreground hover:text-destructive"
                    onclick={() => (selectedPeopleIds = [])}>Clear All</button
                >
            {/if}
        </div>

        <div class="flex-1 overflow-y-auto p-2 space-y-2">
            {#if kpis().count === 0}
                <div
                    class="flex flex-col items-center justify-center h-40 text-muted-foreground text-center p-4"
                >
                    <svg
                        class="w-8 h-8 opacity-20 mb-2"
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
                    <p class="text-sm">
                        Select members on the map to build a route.
                    </p>
                </div>
            {:else}
                {#each peopleWithDistance.filter( (p) => selectedPeopleIds.includes(p.id), ) as person}
                    <div
                        class="flex items-center justify-between p-2 rounded bg-accent/10 border border-border hover:border-primary/50 text-sm group"
                    >
                        <div class="truncate">
                            <div class="font-medium">
                                {person.first_name}
                                {person.last_name}
                            </div>
                            <div class="text-xs text-muted-foreground">
                                {person.distance} mi • {person.member_status}
                            </div>
                        </div>
                        <button
                            class="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive"
                            onclick={() => togglePersonSelection(person)}
                            aria-label="Remove"
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
                {/each}
            {/if}
        </div>

        <div class="p-4 border-t border-border bg-muted/30">
            <Button
                class="w-full"
                disabled={kpis().count === 0}
                onclick={openGoogleMapsRoute}
                aria-label="Open in Google Maps"
            >
                Open Google Maps
            </Button>
        </div>
    </div>
</div>
