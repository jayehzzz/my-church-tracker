<script>
    import { Modal, Button, Badge } from "$lib/components/ui";
    import { goto } from "$app/navigation";

    let {
        isOpen = $bindable(false),
        attendanceRecord = null, // The attendance record, which includes .services
    } = $props();

    let service = $derived(attendanceRecord?.services);

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
        if (service?.id) {
            goto(`/services/${service.id}`);
            isOpen = false;
        }
    }

    function handleClose() {
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
        {#if service?.id}
            <Button onclick={handleViewFullService}>View Full Service →</Button>
        {/if}
    {/snippet}
</Modal>
