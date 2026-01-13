<script>
    import { onMount } from "svelte";
    import LeafletMap from "$lib/components/map/LeafletMap.svelte";
    import {
        churchLocation,
        mockPeople,
        mockPriorityQueue,
    } from "$lib/data/mockData";
    import { Button } from "$lib/components/ui";

    let { people } = $props();

    // Fallback if needed, though parent usually provides data
    let allPeople = $derived(people && people.length > 0 ? people : mockPeople);

    // State
    let mapComponent = $state();
    let selectedPeopleIds = $state([]);
    let isRoutePanelOpen = $state(false);
    let mapReady = $state(false);

    // Pro Features
    let searchQuery = $state("");
    let showStructure = $state(false);
    let visitationMode = $state(false);
    let searchResults = $state([]);

    // Derived: Visitation Queue IDs
    let visitationQueueIds = $derived(
        visitationMode ? mockPriorityQueue.map((item) => item.personId) : [],
    );

    // Calculate distances & Process Data
    let peopleWithDistance = $derived.by(() => {
        if (!allPeople || allPeople.length === 0) return [];

        return allPeople
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

    // Handle Search
    $effect(() => {
        if (!searchQuery) {
            searchResults = [];
            return;
        }
        const lower = searchQuery.toLowerCase();
        searchResults = allPeople
            .filter((p) =>
                (p.first_name + " " + p.last_name)
                    .toLowerCase()
                    .includes(lower),
            )
            .slice(0, 5);
    });

    function handleSearchSelect(person) {
        searchQuery = `${person.first_name} ${person.last_name}`;
        searchResults = [];
        if (mapComponent) {
            mapComponent.flyTo(person.lat, person.lng);
            // Auto open popup via marker click simulation if possible, or just fly
        }
    }

    // KPIs
    let kpis = $derived(() => {
        const targetIds = visitationMode
            ? visitationQueueIds
            : selectedPeopleIds;
        const selected = peopleWithDistance.filter((p) =>
            targetIds.includes(p.id),
        );

        const totalDistance = selected.reduce(
            (acc, p) => acc + (p.distance !== Infinity ? p.distance : 0),
            0,
        );
        const avgDistance =
            selected.length && totalDistance > 0
                ? (totalDistance / selected.length).toFixed(1)
                : 0;

        return { count: selected.length, avgDistance };
    });

    onMount(() => {
        setTimeout(() => {
            mapReady = true;
        }, 100);
    });

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
        if (visitationMode) return;
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
        if (visitationMode) return;
        togglePersonSelection(person);
        if (mapComponent) mapComponent.flyTo(person.lat, person.lng);
    }

    function openGoogleMapsRoute() {
        const targetIds = visitationMode
            ? visitationQueueIds
            : selectedPeopleIds;
        if (targetIds.length === 0) return;

        const selected = peopleWithDistance.filter((p) =>
            targetIds.includes(p.id),
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
    class="h-[700px] w-full relative overflow-hidden rounded-xl border border-border/50 shadow-sm bg-card group"
>
    <!-- Top Controls: Search & Modes -->
    <div
        class="absolute top-4 left-4 z-[400] flex flex-col gap-2 w-64 pointer-events-auto"
    >
        <!-- Map Search (FlyTo) -->
        <div class="relative group/search">
            <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
                <svg
                    class="h-4 w-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    /></svg
                >
            </div>
            <input
                type="text"
                placeholder="Find on map..."
                bind:value={searchQuery}
                class="block w-full pl-10 pr-3 py-2 border border-border/60 rounded-lg text-sm bg-background/95 backdrop-blur shadow-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />

            {#if searchResults.length > 0}
                <div
                    class="absolute mt-1 w-full bg-popover rounded-md shadow-lg py-1 ring-1 ring-black/5 overflow-auto max-h-60 z-50"
                >
                    {#each searchResults as result}
                        <button
                            class="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-sm"
                            onclick={() => handleSearchSelect(result)}
                        >
                            <span
                                class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0"
                            >
                                {(
                                    result.first_name[0] + result.last_name[0]
                                ).toUpperCase()}
                            </span>
                            <span class="truncate"
                                >{result.first_name} {result.last_name}</span
                            >
                        </button>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Mode Toggles -->
        <div class="flex gap-2">
            <button
                class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium border shadow-sm transition-all {visitationMode
                    ? 'bg-rose-500 text-white border-rose-600'
                    : 'bg-background/90 backdrop-blur border-border/60 hover:bg-background'}"
                onclick={() => {
                    visitationMode = !visitationMode;
                    if (visitationMode) isRoutePanelOpen = true;
                }}
            >
                Visitation
                {#if mockPriorityQueue.length > 0}
                    <span class="bg-white/20 px-1 rounded-full text-[9px]"
                        >{mockPriorityQueue.length}</span
                    >
                {/if}
            </button>

            <button
                class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium border shadow-sm transition-all {showStructure
                    ? 'bg-indigo-500 text-white border-indigo-600'
                    : 'bg-background/90 backdrop-blur border-border/60 hover:bg-background'}"
                onclick={() => (showStructure = !showStructure)}
            >
                Network
            </button>
        </div>
    </div>

    <!-- Top Right: Route Button -->
    <div class="absolute top-4 right-4 z-[400] pointer-events-auto">
        <Button
            variant="outline"
            size="sm"
            class="bg-background/95 backdrop-blur shadow-sm h-9 border-border/60 hover:bg-background"
            onclick={() => (isRoutePanelOpen = !isRoutePanelOpen)}
        >
            <svg
                class="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.553-.894L15 4m0 13V4m0 0L9 7"
                /></svg
            >
            Route
            {#if kpis().count > 0}
                <span
                    class="ml-2 bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full text-[10px] font-bold h-5 min-w-[20px] inline-flex items-center justify-center"
                >
                    {kpis().count}
                </span>
            {/if}
        </Button>
    </div>

    <!-- Static Legend (Visual Key Only, No Actions) -->
    <div class="absolute bottom-6 left-6 z-[400] pointer-events-none">
        <div
            class="bg-background/90 backdrop-blur border border-border/60 rounded-lg p-2.5 shadow-lg text-[11px] space-y-2 pointer-events-auto"
        >
            <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"
                ></span>
                <span class="font-medium opacity-80">Leader</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"
                ></span>
                <span class="font-medium opacity-80">Member</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm"
                ></span>
                <span class="font-medium opacity-80">Visitor</span>
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
                selectedIds={visitationMode
                    ? visitationQueueIds
                    : selectedPeopleIds}
                {visitationQueueIds}
                {showStructure}
                onMarkerClick={handleMarkerClick}
                scrollWheelZoom={true}
            />
        {/if}
    </div>

    <!-- Route Drawer (Right Side) -->
    <div
        class="absolute top-2 bottom-2 right-2 w-80 bg-background/95 backdrop-blur border border-border/60 shadow-2xl rounded-xl z-[400] transition-all duration-300 ease-out flex flex-col overflow-hidden text-sm {isRoutePanelOpen
            ? 'translate-x-0 opacity-100'
            : 'translate-x-full opacity-0 pointer-events-none'}"
    >
        <div
            class="p-3 border-b border-border/60 flex justify-between items-center bg-muted/40 shrink-0"
        >
            <div>
                <h2 class="font-semibold text-foreground">
                    {visitationMode ? "Visitation Queue" : "Route Planner"}
                </h2>
                <div
                    class="flex gap-2 text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5"
                >
                    <span>{kpis().count} Stops</span>
                    <span>•</span>
                    <span>{kpis().avgDistance} mi avg</span>
                </div>
            </div>
            <button
                class="text-muted-foreground hover:text-foreground p-1"
                onclick={() => (isRoutePanelOpen = false)}
                aria-label="Close route panel"
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

        <div class="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
            {#if kpis().count === 0}
                <div
                    class="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center"
                >
                    <p class="text-xs">No stops selected.</p>
                </div>
            {:else}
                {#each peopleWithDistance.filter( (p) => (visitationMode ? visitationQueueIds : selectedPeopleIds).includes(p.id), ) as person}
                    <div
                        class="flex items-center justify-between p-2 rounded-lg bg-card border border-border/50 shadow-sm"
                    >
                        <div class="min-w-0">
                            <div
                                class="font-medium truncate text-xs flex items-center gap-1.5"
                            >
                                {person.first_name}
                                {person.last_name}
                                {#if visitationMode}
                                    <span
                                        class="text-[9px] bg-rose-100 text-rose-600 px-1 rounded font-bold"
                                        >REQ</span
                                    >
                                {/if}
                            </div>
                            <div
                                class="text-[10px] text-muted-foreground flex items-center gap-1"
                            >
                                <span class="truncate max-w-[140px]"
                                    >{person.address}</span
                                >
                                <span class="w-0.5 h-0.5 rounded-full bg-border"
                                ></span>
                                <span>{person.distance} mi</span>
                            </div>
                        </div>
                        {#if !visitationMode}
                            <button
                                class="text-muted-foreground hover:text-destructive p-1"
                                onclick={() => togglePersonSelection(person)}
                                aria-label="Remove {person.first_name} {person.last_name} from route"
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
                        {/if}
                    </div>
                {/each}
            {/if}
        </div>

        <div
            class="p-3 border-t border-border/60 bg-muted/40 shrink-0 space-y-2"
        >
            {#if !visitationMode && kpis().count > 0}
                <button
                    class="w-full text-xs text-muted-foreground hover:text-destructive transition-colors text-center"
                    onclick={() => (selectedPeopleIds = [])}
                >
                    Clear Route
                </button>
            {/if}
            <Button
                size="sm"
                class="w-full font-semibold shadow-sm"
                disabled={kpis().count === 0}
                onclick={openGoogleMapsRoute}
            >
                Open in Google Maps
            </Button>
        </div>
    </div>
</div>
