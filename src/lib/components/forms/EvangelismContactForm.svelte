<!--
  EvangelismContactForm.svelte
  A form component for adding/editing evangelism contacts.
  
  Features:
  - Add new contact or edit existing
  - Full validation
  - All fields from the evangelism_contacts schema
  - Mark as converted functionality
  - Uses Svelte 5 runes syntax
-->

<script>
    import {
        Modal,
        Button,
        Input,
        Select,
        SearchableSelect,
    } from "$lib/components/ui";
    import { browser } from "$app/environment";
    import { onMount } from "svelte";

    let {
        isOpen = $bindable(false),
        contact = null, // null for create, object for edit
        onsave,
        ...restProps
    } = $props();

    // People list for "Invited By" dropdown
    let people = $state([]);
    let loadingPeople = $state(true);

    // Form state
    let formData = $state({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        address: "",
        contact_date: "",
        contact_method: "",
        response: "responsive",
        follow_up_date: "",
        converted: false,
        conversion_date: "",
        notes: "",
        invited_by_id: "",
        salvation_decision: false, // Made a salvation decision during evangelism
    });

    let saving = $state(false);
    let errors = $state({});

    // Mode: 'create' or 'edit'
    const mode = $derived(contact?.id ? "edit" : "create");
    const modalTitle = $derived(
        mode === "edit" ? "Edit Contact" : "Add New Contact",
    );

    // People options for "Invited By" dropdown
    const peopleOptions = $derived(() => {
        const options = [{ value: "", label: "Select inviter..." }];
        people.forEach((p) => {
            options.push({
                value: p.id,
                label: `${p.first_name} ${p.last_name || ""}`.trim(),
            });
        });
        return options;
    });

    // Response/category options (from schema)
    const responseOptions = [
        { value: "responsive", label: "Responsive" },
        { value: "non_responsive", label: "Non-Responsive" },
        { value: "has_church", label: "Has Church" },
        { value: "events_only", label: "Events Only" },
        { value: "big_events_only", label: "Big Events Only" },
        { value: "bacenta_mainly", label: "Bacenta Mainly" },
        { value: "do_not_contact", label: "Do Not Contact" },
    ];

    // Contact method options
    const contactMethodOptions = [
        { value: "", label: "Select..." },
        { value: "in_person", label: "In Person" },
        { value: "phone", label: "Phone Call" },
        { value: "text", label: "Text Message" },
        { value: "social_media", label: "Social Media" },
        { value: "email", label: "Email" },
        { value: "event", label: "Church Event" },
        { value: "other", label: "Other" },
    ];

    // Load people for the inviter dropdown
    onMount(async () => {
        await loadPeople();
    });

    async function loadPeople() {
        if (!browser) return;
        loadingPeople = true;
        try {
            const peopleService = await import("$lib/services/peopleService");
            const result = await peopleService.getAll();
            if (!result.error) {
                people = result.data || [];
            }
        } catch (e) {
            console.warn("Failed to load people:", e.message);
            // Mock data for demo
            people = [
                { id: "p1", first_name: "John", last_name: "Smith" },
                { id: "p2", first_name: "Mary", last_name: "Johnson" },
                { id: "p3", first_name: "Peter", last_name: "Williams" },
            ];
        } finally {
            loadingPeople = false;
        }
    }

    // Initialize/reset form when contact changes or modal opens
    $effect(() => {
        if (isOpen) {
            if (contact) {
                formData = {
                    first_name: contact.first_name || "",
                    last_name: contact.last_name || "",
                    email: contact.email || "",
                    phone: contact.phone || "",
                    address: contact.address || "",
                    contact_date: contact.contact_date || "",
                    contact_method: contact.contact_method || "",
                    response: contact.response || "responsive",
                    follow_up_date: contact.follow_up_date || "",
                    converted: contact.converted || false,
                    conversion_date: contact.conversion_date || "",
                    notes: contact.notes || "",
                    invited_by_id: contact.invited_by_id || "",
                    salvation_decision: contact.salvation_decision || false,
                };
            } else {
                // Default to today's date for new contacts
                const today = new Date().toISOString().split("T")[0];
                formData = {
                    first_name: "",
                    last_name: "",
                    email: "",
                    phone: "",
                    address: "",
                    contact_date: today,
                    contact_method: "",
                    response: "responsive",
                    follow_up_date: "",
                    converted: false,
                    conversion_date: "",
                    notes: "",
                    invited_by_id: "",
                    salvation_decision: false,
                };
            }
            errors = {};
        }
    });

    // Validate form
    function validate() {
        const newErrors = {};

        if (!formData.first_name.trim()) {
            newErrors.first_name = "First name is required";
        }

        if (!formData.contact_date) {
            newErrors.contact_date = "Contact date is required";
        }

        if (
            formData.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
        ) {
            newErrors.email = "Invalid email format";
        }

        // If converted is true, conversion_date should be set
        if (formData.converted && !formData.conversion_date) {
            formData.conversion_date = new Date().toISOString().split("T")[0];
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
            const evangelismService =
                await import("$lib/services/evangelismService");

            // Clean up empty strings to null
            const cleanData = { ...formData };
            // Clean up empty strings to undefined (remove key) so Convex accepts it
            // Clean up empty strings to undefined (remove key) so Convex accepts it
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === "" || cleanData[key] === null) {
                    delete cleanData[key];
                }
            });

            let result;
            if (mode === "edit") {
                result = await evangelismService.update(contact.id, cleanData);
            } else {
                result = await evangelismService.create(cleanData);
            }

            if (result.error) {
                errors.submit =
                    result.error.message || "Failed to save contact";
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
                {mode === "edit" ? "Save Changes" : "Add Contact"}
            {/if}
        </Button>
    {/snippet}

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

        <!-- Name Section -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
                label="First Name"
                bind:value={formData.first_name}
                error={errors.first_name}
                required
                disabled={saving}
            />
            <Input
                label="Last Name"
                bind:value={formData.last_name}
                disabled={saving}
            />
        </div>

        <!-- Contact Info Section -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
                label="Phone"
                type="tel"
                bind:value={formData.phone}
                disabled={saving}
            />
            <Input
                label="Email"
                type="email"
                bind:value={formData.email}
                error={errors.email}
                disabled={saving}
            />
        </div>

        <!-- Address -->
        <Input
            label="Address"
            bind:value={formData.address}
            disabled={saving}
        />

        <!-- Contact Details Section -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
                label="Contact Date"
                type="date"
                bind:value={formData.contact_date}
                error={errors.contact_date}
                required
                disabled={saving}
            />
            <SearchableSelect
                label="Response Category"
                bind:value={formData.response}
                options={responseOptions}
                disabled={saving}
            />
        </div>

        <!-- Contact Method -->
        <SearchableSelect
            label="Contact Method"
            bind:value={formData.contact_method}
            options={contactMethodOptions}
            disabled={saving}
        />

        <!-- Invited By Section -->
        <SearchableSelect
            label="Invited By"
            bind:value={formData.invited_by_id}
            options={peopleOptions()}
            disabled={saving || loadingPeople}
            placeholder="Search for inviter..."
        />

        <!-- Spiritual Progress Section -->
        <div class="p-4 bg-secondary/20 rounded-lg border border-border">
            <h4 class="text-sm font-medium text-foreground mb-3">
                Spiritual Progress
            </h4>
            <label class="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    bind:checked={formData.salvation_decision}
                    disabled={saving}
                    class="w-4 h-4 rounded border-border bg-input text-success focus:ring-success"
                />
                <span class="text-sm text-foreground">
                    Made Salvation Decision (during evangelism)
                </span>
            </label>
        </div>

        <!-- Follow-up Section -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
                label="Follow-up Date"
                type="date"
                bind:value={formData.follow_up_date}
                disabled={saving}
            />
            <div class="flex items-end gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        bind:checked={formData.converted}
                        disabled={saving}
                        class="w-4 h-4 rounded border-border bg-input text-primary focus:ring-primary"
                    />
                    <span class="text-sm text-foreground"
                        >Promote to Member</span
                    >
                </label>
                {#if formData.converted}
                    <div class="flex-1">
                        <Input
                            label="Conversion Date"
                            type="date"
                            bind:value={formData.conversion_date}
                            disabled={saving}
                        />
                    </div>
                {/if}
            </div>
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
                placeholder="Add any notes about this contact..."
            ></textarea>
        </div>
    </form>
</Modal>
