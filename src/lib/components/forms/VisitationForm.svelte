<!--
  VisitationForm.svelte
  A form component for adding/editing visitation records.
  
  Features:
  - Add new visitation or edit existing
  - Person visited and visitor selection
  - Outcome tracking
  - Follow-up required toggle
  - Uses Svelte 5 runes syntax
-->

<script>
    import { Modal, Button, Input, Select } from "$lib/components/ui";

    let {
        isOpen = $bindable(false),
        visitation = null, // null for create, object for edit
        onsave,
        ...restProps
    } = $props();

    // Form state
    let formData = $state({
        person_visited_name: "",
        person_visited_id: "",
        visited_by_name: "",
        visited_by_id: "",
        visit_date: "",
        outcome: "welcomed_encouraged",
        follow_up_required: false,
        follow_up_date: "",
        notes: "",
    });

    let saving = $state(false);
    let errors = $state({});

    // Mode: 'create' or 'edit'
    const mode = $derived(visitation?.id ? "edit" : "create");
    const modalTitle = $derived(
        mode === "edit" ? "Edit Visitation" : "Log New Visitation",
    );

    // Outcome options (from spec)
    const outcomeOptions = [
        { value: "welcomed_encouraged", label: "Welcomed & Encouraged" },
        { value: "prayer_request_received", label: "Prayer Request Received" },
        { value: "invited_to_service", label: "Invited to Service" },
        { value: "concerns_shared", label: "Concerns Shared" },
        { value: "follow_up_needed", label: "Follow-up Needed" },
        { value: "not_home", label: "Not Home" },
        { value: "declined", label: "Declined Visit" },
    ];

    // Initialize/reset form when visitation changes or modal opens
    $effect(() => {
        if (isOpen) {
            if (visitation) {
                formData = {
                    person_visited_name:
                        visitation.person_visited_name ||
                        (visitation.people
                            ? `${visitation.people.first_name} ${visitation.people.last_name || ""}`.trim()
                            : ""),
                    person_visited_id:
                        visitation.person_visited_id ||
                        visitation.person_id ||
                        "",
                    visited_by_name: visitation.visited_by_name || "",
                    visited_by_id: visitation.visited_by_id || "",
                    visit_date: visitation.visit_date || "",
                    outcome: visitation.outcome || "welcomed_encouraged",
                    follow_up_required: visitation.follow_up_required || false,
                    follow_up_date: visitation.follow_up_date || "",
                    notes: visitation.notes || "",
                };
            } else {
                // Default to today's date for new visitations
                const today = new Date().toISOString().split("T")[0];
                formData = {
                    person_visited_name: "",
                    person_visited_id: "",
                    visited_by_name: "",
                    visited_by_id: "",
                    visit_date: today,
                    outcome: "welcomed_encouraged",
                    follow_up_required: false,
                    follow_up_date: "",
                    notes: "",
                };
            }
            errors = {};
        }
    });

    // Validate form
    function validate() {
        const newErrors = {};

        if (!formData.person_visited_name.trim()) {
            newErrors.person_visited_name = "Person visited is required";
        }

        if (!formData.visit_date) {
            newErrors.visit_date = "Visit date is required";
        }

        if (!formData.outcome) {
            newErrors.outcome = "Outcome is required";
        }

        // If follow-up required but no date
        if (formData.follow_up_required && !formData.follow_up_date) {
            formData.follow_up_date = "";
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
            const visitationsService =
                await import("$lib/services/visitationsService");

            // Clean up data - use person_id as expected by backend
            // The service layer's cleanData will remove undefined/null values
            const cleanData = {
                person_id: formData.person_visited_id || undefined, // Backend expects person_id
                person_visited_name: formData.person_visited_name,
                visited_by_name: formData.visited_by_name || undefined,
                visited_by_id: formData.visited_by_id || undefined,
                visit_date: formData.visit_date,
                outcome: formData.outcome,
                follow_up_required: formData.follow_up_required,
                follow_up_date: formData.follow_up_date || undefined,
                notes: formData.notes || undefined,
            };

            let result;
            if (mode === "edit") {
                result = await visitationsService.update(
                    visitation.id,
                    cleanData,
                );
            } else {
                result = await visitationsService.create(cleanData);
            }

            if (result.error) {
                errors.submit =
                    result.error.message || "Failed to save visitation";
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

        <!-- Person Visited -->
        <Input
            label="Person Visited"
            bind:value={formData.person_visited_name}
            error={errors.person_visited_name}
            required
            disabled={saving}
            placeholder="Enter the name of the person visited"
        />

        <!-- Visited By and Date -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
                label="Visited By"
                bind:value={formData.visited_by_name}
                disabled={saving}
                placeholder="Who made the visit"
            />
            <Input
                label="Visit Date"
                type="date"
                bind:value={formData.visit_date}
                error={errors.visit_date}
                required
                disabled={saving}
            />
        </div>

        <!-- Outcome -->
        <Select
            label="Visit Outcome"
            bind:value={formData.outcome}
            options={outcomeOptions}
            error={errors.outcome}
            disabled={saving}
        />

        <!-- Follow-up Section -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <label class="flex items-center gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    bind:checked={formData.follow_up_required}
                    disabled={saving}
                    class="w-4 h-4 rounded border-border bg-input text-primary focus:ring-primary"
                />
                <span class="text-sm text-foreground">Follow-up Required</span>
            </label>
            {#if formData.follow_up_required}
                <Input
                    label="Follow-up Date"
                    type="date"
                    bind:value={formData.follow_up_date}
                    disabled={saving}
                />
            {/if}
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
                rows="4"
                disabled={saving}
                class="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground
               placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary
               focus:ring-1 focus:ring-primary transition-premium resize-none"
                placeholder="Add details about the visit, prayer requests, concerns shared, etc..."
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
                {mode === "edit" ? "Save Changes" : "Log Visitation"}
            {/if}
        </Button>
    {/snippet}
</Modal>
