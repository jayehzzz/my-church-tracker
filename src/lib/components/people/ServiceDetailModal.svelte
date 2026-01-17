<script>
    import { Modal, Button, Badge } from "$lib/components/ui";
    import { goto } from "$app/navigation";
    import * as attendanceService from "$lib/services/attendanceService";

    let {
        isOpen = $bindable(false),
        attendanceRecord = null, // The attendance record, which includes .services
        onEditAttendance = null, // Callback for edit attendance action
    } = $props();

    let service = $derived(attendanceRecord?.services);
    let attendees = $state([]);
    let loadingAttendees = $state(false);

    // Load attendees when service changes
    $effect(() => {
        if (service?._id && isOpen) {
            loadAttendees();
        } else {
            attendees = [];
        }
    });

    async function loadAttendees() {
        loadingAttendees = true;
        try {
            const result = await attendanceService.getByService(service._id);
            if (result.data) {
                // Each attendance record has a .people property with the person details
                attendees = result.data
                    .filter((r) => r.people)
                    .map((r) => ({
                        id: r.person_id,
                        name: r.people
                            ? `${r.people.first_name} ${r.people.last_name || ""}`.trim()
                            : "Unknown",
                        first_timer: r.first_timer,
                        gave_tithe: r.gave_tithe,
                    }));
            }
        } catch (e) {
            console.warn("Failed to load attendees:", e);
        } finally {
            loadingAttendees = false;
        }
    }

    function formatServiceType(type) {
        const map = {
            sunday_service: "Sunday Service",
            midweek_service: "Midweek Service",
            special_service: "Special Service",
            easter_service: "Easter Service",
            christmas_service: "Christmas Service",
            bacenta: "Bacenta",
            basonta: "Basonta",
            flow_prayer: "Flow Prayer",
            farley_prayer: "Farley Prayer",
            all_night_prayer: "All-Night Prayer",
            sat: "SAT",
        };
        return map[type] || type || "—";
    }

    function formatDate(dateStr) {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

    function handleViewFullService() {
        if (service?._id) {
            goto(`/services/${service._id}`);
            isOpen = false;
        }
    }

    function handleEditAttendance() {
        if (onEditAttendance) {
            onEditAttendance(service);
        }
    }

    function handleClose() {
        isOpen = false;
    }

    function navigateToProfile(personId) {
        goto(`/people/${personId}`);
        isOpen = false;
    }
</script>

<Modal bind:isOpen title="Service Details" size="md">
    {#if service}
        <div class="space-y-6">
            <!-- Service Header -->
            <div class="text-center pb-4 border-b border-border">
                <Badge variant="secondary" class="mb-2">
                    {formatServiceType(service.service_type)}
                </Badge>
                <h3 class="text-xl font-bold text-foreground">
                    {service.sermon_topic || "Untitled Service"}
                </h3>
                <p class="text-muted-foreground">
                    {formatDate(service.service_date)}
                    {#if service.service_time}
                        at {service.service_time}
                    {/if}
                </p>
            </div>

            <!-- Service Details Grid -->
            <div class="grid grid-cols-2 gap-4 text-sm">
                {#if service.sermon_speaker}
                    <div>
                        <span class="text-muted-foreground">Speaker</span>
                        <p class="font-medium text-foreground">
                            {service.sermon_speaker}
                        </p>
                    </div>
                {/if}
                {#if service.location}
                    <div>
                        <span class="text-muted-foreground">Location</span>
                        <p class="font-medium text-foreground">
                            {service.location}
                        </p>
                    </div>
                {/if}
                {#if service.total_attendance}
                    <div>
                        <span class="text-muted-foreground"
                            >Total Attendance</span
                        >
                        <p class="font-medium text-foreground">
                            {service.total_attendance}
                        </p>
                    </div>
                {/if}
                {#if service.guests_count}
                    <div>
                        <span class="text-muted-foreground">Guests</span>
                        <p class="font-medium text-foreground">
                            {service.guests_count}
                        </p>
                    </div>
                {/if}
            </div>

            <!-- Attendees List -->
            <div class="border-t border-border pt-4">
                <h4
                    class="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"
                >
                    <svg
                        class="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                    </svg>
                    Attendees ({attendees.length})
                </h4>

                {#if loadingAttendees}
                    <div class="flex items-center justify-center py-4">
                        <div
                            class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"
                        ></div>
                    </div>
                {:else if attendees.length === 0}
                    <p class="text-sm text-muted-foreground text-center py-4">
                        No attendees recorded for this service.
                    </p>
                {:else}
                    <div class="max-h-48 overflow-y-auto scrollbar-thin">
                        <div class="grid grid-cols-2 gap-2">
                            {#each attendees as attendee}
                                <button
                                    type="button"
                                    class="flex items-center gap-2 p-2 rounded-lg text-left hover:bg-secondary/50 transition-colors group"
                                    onclick={() =>
                                        navigateToProfile(attendee.id)}
                                >
                                    <div
                                        class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium flex-shrink-0"
                                    >
                                        {attendee.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <span
                                            class="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate block"
                                        >
                                            {attendee.name}
                                        </span>
                                        {#if attendee.first_timer}
                                            <span class="text-xs text-info"
                                                >First Timer</span
                                            >
                                        {/if}
                                    </div>
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Your Attendance Info -->
            {#if attendanceRecord}
                <div class="p-4 bg-secondary/30 rounded-lg">
                    <h4 class="text-sm font-medium text-muted-foreground mb-2">
                        Your Attendance
                    </h4>
                    <div class="flex flex-wrap gap-2">
                        <Badge
                            variant={attendanceRecord.gave_tithe
                                ? "success"
                                : "outline"}
                        >
                            {attendanceRecord.gave_tithe
                                ? "✓ Gave Tithe"
                                : "No Tithe"}
                        </Badge>
                        {#if attendanceRecord.first_timer}
                            <Badge variant="info">First Time</Badge>
                        {/if}
                        {#if attendanceRecord.made_salvation_decision}
                            <Badge variant="success">Salvation Decision</Badge>
                        {/if}
                    </div>
                </div>
            {/if}

            <!-- Notes -->
            {#if service.notes}
                <div>
                    <h4 class="text-sm font-medium text-muted-foreground mb-1">
                        Notes
                    </h4>
                    <p class="text-sm text-foreground/80">{service.notes}</p>
                </div>
            {/if}
        </div>
    {:else}
        <div class="text-center py-8 text-muted-foreground">
            No service details available.
        </div>
    {/if}

    {#snippet footer()}
        <Button variant="secondary" onclick={handleClose}>Close</Button>
        {#if onEditAttendance && service}
            <Button variant="outline" onclick={handleEditAttendance}>
                <svg
                    class="w-4 h-4 mr-1.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                </svg>
                Edit Attendance
            </Button>
        {/if}
        {#if service?._id}
            <Button onclick={handleViewFullService}>View Full Service →</Button>
        {/if}
    {/snippet}
</Modal>
