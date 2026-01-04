<!--
  MeetingForm.svelte
  A form component for adding/editing meeting records.
  
  Features:
  - Add new meeting or edit existing
  - All meeting types (bacenta, flow_prayer, farley_prayer, etc.)
  - Duration tracking
  - Uses Svelte 5 runes syntax
-->

<script>
    import { Modal, Button, Input, Select } from "$lib/components/ui";

    let {
        isOpen = $bindable(false),
        meeting = null, // null for create, object for edit
        onsave,
        ...restProps
    } = $props();

    // Form state
    let formData = $state({
        meeting_date: "",
        meeting_type: "bacenta",
        start_time: "",
        end_time: "",
        duration_minutes: "",
        location: "",
        attendance_count: "",
        leaders_count: "",
        notes: "",
    });

    let saving = $state(false);
    let errors = $state({});

    // Mode: 'create' or 'edit'
    const mode = $derived(meeting?.id ? "edit" : "create");
    const modalTitle = $derived(
        mode === "edit" ? "Edit Meeting" : "Add New Meeting",
    );

    // Meeting type options (from spec)
    const meetingTypeOptions = [
        { value: "bacenta", label: "Bacenta Service" },
        { value: "flow_prayer", label: "Flow Prayer" },
        { value: "farley_prayer", label: "Farley Prayer" },
        { value: "all_night_prayer", label: "All Night Prayer" },
        { value: "basonta", label: "Basonta Meeting" },
        { value: "sat", label: "SAT (Servants Armed & Trained)" },
    ];

    // Initialize/reset form when meeting changes or modal opens
    $effect(() => {
        if (isOpen) {
            if (meeting) {
                formData = {
                    meeting_date: meeting.meeting_date || "",
                    meeting_type: meeting.meeting_type || "bacenta",
                    start_time: meeting.start_time || "",
                    end_time: meeting.end_time || "",
                    duration_minutes:
                        meeting.duration_minutes?.toString() || "",
                    location: meeting.location || "",
                    attendance_count:
                        meeting.attendance_count?.toString() || "",
                    leaders_count: meeting.leaders_count?.toString() || "",
                    notes: meeting.notes || "",
                };
            } else {
                // Default to today's date for new meetings
                const today = new Date().toISOString().split("T")[0];
                formData = {
                    meeting_date: today,
                    meeting_type: "bacenta",
                    start_time: "18:00",
                    end_time: "",
                    duration_minutes: "",
                    location: "",
                    attendance_count: "",
                    leaders_count: "",
                    notes: "",
                };
            }
            errors = {};
        }
    });

    // Calculate duration from start/end times
    const calculatedDuration = $derived(() => {
        if (formData.start_time && formData.end_time) {
            const [startH, startM] = formData.start_time.split(":").map(Number);
            const [endH, endM] = formData.end_time.split(":").map(Number);
            let duration = endH * 60 + endM - (startH * 60 + startM);
            // Handle overnight meetings
            if (duration < 0) duration += 24 * 60;
            return duration;
        }
        return null;
    });

    // Validate form
    function validate() {
        const newErrors = {};

        if (!formData.meeting_date) {
            newErrors.meeting_date = "Meeting date is required";
        }

        if (!formData.meeting_type) {
            newErrors.meeting_type = "Meeting type is required";
        }

        // Validate numeric fields
        if (
            formData.attendance_count &&
            isNaN(parseInt(formData.attendance_count))
        ) {
            newErrors.attendance_count = "Must be a number";
        }

        if (formData.leaders_count && isNaN(parseInt(formData.leaders_count))) {
            newErrors.leaders_count = "Must be a number";
        }

        errors = newErrors;
        return Object.keys(newErrors).length === 0;
    }

    // Handle form submission
    async function handleSubmit() {
        if (!validate()) return;

        saving = true;
        errors = {};

        try {
            // Dynamically import to avoid SSR issues
            const meetingsService = await import(
                "$lib/services/meetingsService"
            );

            // Use calculated duration if available
            const durationValue = formData.duration_minutes
                ? parseInt(formData.duration_minutes)
                : calculatedDuration();

            // Clean up data
            const cleanData = {
                meeting_date: formData.meeting_date,
                meeting_type: formData.meeting_type,
                start_time: formData.start_time || null,
                end_time: formData.end_time || null,
                duration_minutes: durationValue || null,
                location: formData.location || null,
                attendance_count: formData.attendance_count
                    ? parseInt(formData.attendance_count)
                    : null,
                leaders_count: formData.leaders_count
                    ? parseInt(formData.leaders_count)
                    : null,
                notes: formData.notes || null,
            };

            let result;
            if (mode === "edit") {
                result = await meetingsService.update(meeting.id, cleanData);
            } else {
                result = await meetingsService.create(cleanData);
            }

            if (result.error) {
                errors.submit =
                    result.error.message || "Failed to save meeting";
                return;
            }

            onsave?.(result.data);
            isOpen = false;
        } catch (e) {
            errors.submit = e.message || "An unexpected error occurred";
        } finally {
            saving = false;
        }
    }

    // Handle close
    function handleClose() {
        isOpen = false;
    }
</script>

<Modal bind:isOpen title={modalTitle} size="lg" {...restProps}>
    <form
        onsubmit={(e) => {
            e.preventDefault();
            handleSubmit();
        }}
        class="space-y-6"
    >
        <!-- Error message -->
        {#if errors.submit}
            <div
                class="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm"
            >
                {errors.submit}
            </div>
        {/if}

        <!-- Date and Type Section -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
                label="Meeting Date"
                type="date"
                bind:value={formData.meeting_date}
                error={errors.meeting_date}
                required
                disabled={saving}
            />
            <Select
                label="Meeting Type"
                bind:value={formData.meeting_type}
                options={meetingTypeOptions}
                error={errors.meeting_type}
                disabled={saving}
            />
        </div>

        <!-- Time Section -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
                label="Start Time"
                type="time"
                bind:value={formData.start_time}
                disabled={saving}
            />
            <Input
                label="End Time"
                type="time"
                bind:value={formData.end_time}
                disabled={saving}
            />
            <div>
                <Input
                    label="Duration (minutes)"
                    type="number"
                    bind:value={formData.duration_minutes}
                    disabled={saving}
                    min="0"
                    placeholder={calculatedDuration()
                        ? `${calculatedDuration()} (auto)`
                        : ""}
                />
                {#if calculatedDuration() && !formData.duration_minutes}
                    <p class="text-xs text-muted-foreground mt-1">
                        Auto-calculated: {calculatedDuration()} mins ({Math.floor(
                            calculatedDuration() / 60,
                        )}h {calculatedDuration() % 60}m)
                    </p>
                {/if}
            </div>
        </div>

        <!-- Location -->
        <Input
            label="Location"
            bind:value={formData.location}
            disabled={saving}
        />

        <!-- Attendance Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
                label="Total Attendance"
                type="number"
                bind:value={formData.attendance_count}
                error={errors.attendance_count}
                disabled={saving}
                min="0"
            />
            <Input
                label="Leaders Present"
                type="number"
                bind:value={formData.leaders_count}
                error={errors.leaders_count}
                disabled={saving}
                min="0"
            />
        </div>

        <!-- Notes Section -->
        <div>
            <label
                for="notes"
                class="block text-sm font-medium text-muted-foreground mb-2"
            >
                Notes
            </label>
            <textarea
                id="notes"
                bind:value={formData.notes}
                rows="3"
                disabled={saving}
                class="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground
               placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary
               focus:ring-1 focus:ring-primary transition-premium resize-none"
                placeholder="Add any notes about this meeting..."
            ></textarea>
        </div>
    </form>

    {#snippet footer()}
        <Button variant="secondary" onclick={handleClose} disabled={saving}>
            Cancel
        </Button>
        <Button onclick={handleSubmit} disabled={saving}>
            {#if saving}
                <svg
                    class="animate-spin -ml-1 mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                    />
                    <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
                Saving...
            {:else}
                {mode === "edit" ? "Save Changes" : "Add Meeting"}
            {/if}
        </Button>
    {/snippet}
</Modal>
