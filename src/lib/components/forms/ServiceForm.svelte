<!--
  ServiceForm.svelte
  A form component for adding/editing church service records.
  
  Features:
  - Add new service or edit existing
  - Full validation
  - All fields from the services schema
  - Uses Svelte 5 runes syntax
-->

<script>
    import { Modal, Button, Input, Select } from "$lib/components/ui";
    import * as peopleService from "$lib/services/peopleService"; // Indirect import via dynamic in loadData if needed, or keeping pattern

    let {
        isOpen = $bindable(false),
        service = null, // null for create, object for edit
        onsave,
        ...restProps
    } = $props();

    // Form state
    let formData = $state({
        service_date: "",
        service_type: "sunday_service",
        service_time: "",
        location: "",
        sermon_topic: "",
        sermon_speaker: "",
        total_attendance: "",
        guests_count: "",
        salvation_decisions: "",
        tithers_count: "",
        notes: "",
    });

    let saving = $state(false);
    let errors = $state({});

    // Attendance state
    let activeTab = $state("details");
    let people = $state([]);
    let selectedPersonIds = $state(new Set());
    // Metadata for each selected person: { [id]: { gave_tithe: bool, made_salvation_decision: bool, first_timer: bool } }
    let attendanceMetadata = $state({});
    let searchQuery = $state("");
    let loadingPeople = $state(false);

    // Smart filtering for attendance list
    let attendeeFilter = $state("members"); // 'members' | 'guests' | 'all'
    // Track who has attended before (for first-timer detection)
    let priorAttendance = $state({}); // { [personId]: boolean }

    // Quick Add First Timer state
    let showQuickAdd = $state(false);
    let quickAddData = $state({ first_name: "", last_name: "", phone: "" });
    let quickAddSaving = $state(false);
    let quickAddError = $state(null);

    // Photos state
    let photos = $state([]);
    let uploading = $state(false);
    let uploadError = $state(null);

    // Filtered people for attendance list with smart filtering
    const filteredPeople = $derived(() => {
        let result = people;

        // Apply category filter
        if (attendeeFilter === "members") {
            // Members and Leaders only
            result = result.filter(
                (p) =>
                    p.member_status === "member" ||
                    p.member_status === "leader",
            );
        } else if (attendeeFilter === "guests") {
            // Guests and evangelism contacts
            result = result.filter(
                (p) => p.member_status === "guest" || p.contact_date,
            );
        }
        // 'all' shows everyone

        // Apply search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((p) =>
                `${p.first_name} ${p.last_name}`.toLowerCase().includes(q),
            );
        }

        return result;
    });

    // Mode: 'create' or 'edit'
    const mode = $derived(service?.id ? "edit" : "create");
    const modalTitle = $derived(
        mode === "edit" ? "Edit Service" : "Add New Service",
    );

    // Service type options
    const serviceTypeOptions = [
        { value: "sunday_service", label: "Sunday Service" },
        { value: "midweek_service", label: "Midweek Service" },
        { value: "special_service", label: "Special Service" },
        { value: "easter_service", label: "Easter Service" },
        { value: "christmas_service", label: "Christmas Service" },
    ];

    // Initialize/reset form when service changes or modal opens
    $effect(() => {
        if (isOpen) {
            // Reset tab
            activeTab = "details";

            // Load people and attendance
            loadData();

            if (service) {
                formData = {
                    service_date: service.service_date || "",
                    service_type: service.service_type || "sunday_service",
                    service_time: service.service_time || "",
                    location: service.location || "",
                    sermon_topic: service.sermon_topic || "",
                    sermon_speaker: service.sermon_speaker || "",
                    total_attendance:
                        service.total_attendance?.toString() || "",
                    guests_count: service.guests_count?.toString() || "",
                    salvation_decisions:
                        service.salvation_decisions?.toString() || "",
                    tithers_count: service.tithers_count?.toString() || "",
                    notes: service.notes || "",
                };
                photos = service.photos || [];
            } else {
                // Default to today's date for new services
                const today = new Date().toISOString().split("T")[0];
                formData = {
                    service_date: today,
                    service_type: "sunday_service",
                    service_time: "09:00",
                    location: "",
                    sermon_topic: "",
                    sermon_speaker: "",
                    total_attendance: "",
                    guests_count: "",
                    salvation_decisions: "",
                    tithers_count: "",
                    notes: "",
                };
                photos = [];
            }

            errors = {};
        }
    });

    async function loadData() {
        loadingPeople = true;
        try {
            const peopleService = await import("$lib/services/peopleService");
            const { data } = await peopleService.getAll();
            people = data || [];

            // Load attendance history for first-timer detection
            if (people.length > 0) {
                try {
                    const attendanceService =
                        await import("$lib/services/attendanceService");
                    const personIds = people.map((p) => p.id);
                    const { data: history } =
                        await attendanceService.getAttendanceHistory(personIds);
                    priorAttendance = history || {};
                } catch (e) {
                    console.warn("Could not load attendance history", e);
                    priorAttendance = {};
                }
            }

            if (mode === "edit" && service?.id) {
                const attendanceService =
                    await import("$lib/services/attendanceService");
                const { data: attendance } =
                    await attendanceService.getByService(service.id);
                if (attendance) {
                    selectedPersonIds = new Set(
                        attendance.map((a) => a.person_id),
                    );
                    // Populate metadata
                    const meta = {};
                    attendance.forEach((a) => {
                        if (
                            a.gave_tithe ||
                            a.made_salvation_decision ||
                            a.first_timer
                        ) {
                            meta[a.person_id] = {
                                gave_tithe: a.gave_tithe,
                                made_salvation_decision:
                                    a.made_salvation_decision,
                                first_timer: a.first_timer,
                            };
                        }
                    });
                    attendanceMetadata = meta;
                } else {
                    selectedPersonIds = new Set();
                    attendanceMetadata = {};
                }
            } else {
                selectedPersonIds = new Set();
            }
        } catch (e) {
            console.error("Failed to load data", e);
        } finally {
            loadingPeople = false;
        }
    }

    // Quick Add First Timer - creates new guest and auto-selects them
    async function handleQuickAdd() {
        if (!quickAddData.first_name.trim() || !quickAddData.last_name.trim()) {
            quickAddError = "First and last name are required";
            return;
        }

        quickAddSaving = true;
        quickAddError = null;

        try {
            const peopleService = await import("$lib/services/peopleService");
            const result = await peopleService.create({
                first_name: quickAddData.first_name.trim(),
                last_name: quickAddData.last_name.trim(),
                phone: quickAddData.phone.trim() || undefined,
                member_status: "guest",
                first_visit_date:
                    formData.service_date ||
                    new Date().toISOString().split("T")[0],
            });

            if (result.error) {
                throw result.error;
            }

            // Add to people list
            const newPerson = result.data;
            people = [...people, newPerson];

            // Auto-select and mark as first timer
            const newSet = new Set(selectedPersonIds);
            newSet.add(newPerson.id);
            selectedPersonIds = newSet;

            attendanceMetadata = {
                ...attendanceMetadata,
                [newPerson.id]: {
                    first_timer: true,
                    gave_tithe: false,
                    made_salvation_decision: false,
                },
            };

            // Reset quick add form
            quickAddData = { first_name: "", last_name: "", phone: "" };
            showQuickAdd = false;

            // Switch to "all" filter to see the new person
            attendeeFilter = "all";
        } catch (e) {
            quickAddError = e.message || "Failed to add person";
        } finally {
            quickAddSaving = false;
        }
    }

    function togglePerson(id) {
        const newSet = new Set(selectedPersonIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        selectedPersonIds = newSet;

        // Auto-update total attendance if it matches selected count (optional convenience)
        selectedPersonIds = newSet;
    }

    function toggleMetadata(personId, field) {
        if (!selectedPersonIds.has(personId)) return; // Should not happen given UI

        const currentMeta = attendanceMetadata[personId] || {};
        attendanceMetadata = {
            ...attendanceMetadata,
            [personId]: {
                ...currentMeta,
                [field]: !currentMeta[field],
            },
        };
    }

    // Handle file upload
    async function handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        uploading = true;
        uploadError = null;

        try {
            const storageService = await import("$lib/services/storageService");

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                // basic validation
                if (!file.type.startsWith("image/")) continue;

                const result = await storageService.uploadImage(file);

                if (result.error) {
                    // If table/bucket doesn't exist, we might fail here.
                    // Fallback for mock/demo: create a temporary object URL
                    console.warn(
                        "Upload failed, using local blob for demo:",
                        result.error,
                    );
                    const localUrl = URL.createObjectURL(file);
                    photos = [...photos, localUrl];
                } else {
                    photos = [...photos, result.url];
                }
            }
        } catch (e) {
            console.error("Upload error:", e);
            uploadError = "Failed to upload photos. Please try again.";
        } finally {
            uploading = false;
            // Reset input
            event.target.value = "";
        }
    }

    function removePhoto(index) {
        photos = photos.filter((_, i) => i !== index);
    }

    // Validate form
    function validate() {
        const newErrors = {};

        if (!formData.service_date) {
            newErrors.service_date = "Service date is required";
        }

        if (!formData.service_type) {
            newErrors.service_type = "Service type is required";
        }

        // Validate numeric fields
        if (
            formData.total_attendance &&
            isNaN(parseInt(formData.total_attendance))
        ) {
            newErrors.total_attendance = "Must be a number";
        }

        if (formData.guests_count && isNaN(parseInt(formData.guests_count))) {
            newErrors.guests_count = "Must be a number";
        }

        if (
            formData.salvation_decisions &&
            isNaN(parseInt(formData.salvation_decisions))
        ) {
            newErrors.salvation_decisions = "Must be a number";
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
            const servicesService =
                await import("$lib/services/servicesService");

            // Clean up data - convert numbers, empty strings to null
            const cleanData = {
                service_date: formData.service_date,
                service_type: formData.service_type,
                service_time: formData.service_time || null,
                location: formData.location || null,
                sermon_topic: formData.sermon_topic || null,
                sermon_speaker: formData.sermon_speaker || null,
                total_attendance:
                    formData.total_attendance !== "" &&
                    formData.total_attendance !== null
                        ? parseInt(formData.total_attendance)
                        : null,
                guests_count:
                    formData.guests_count !== "" &&
                    formData.guests_count !== null
                        ? parseInt(formData.guests_count)
                        : null,
                salvation_decisions:
                    formData.salvation_decisions !== "" &&
                    formData.salvation_decisions !== null
                        ? parseInt(formData.salvation_decisions)
                        : null,
                tithers_count:
                    formData.tithers_count !== "" &&
                    formData.tithers_count !== null
                        ? parseInt(formData.tithers_count)
                        : null,

                notes: formData.notes || null,
                photos: photos, // Include photos in the payload
            };

            let result;
            if (mode === "edit") {
                result = await servicesService.update(service.id, cleanData);
            } else {
                result = await servicesService.create(cleanData);
            }

            if (result.error) {
                errors.submit =
                    result.error.message || "Failed to save service";
                return;
            }

            // Save attendance
            const serviceId = result.data.id;
            if (serviceId && selectedPersonIds.size > 0) {
                const attendanceService =
                    await import("$lib/services/attendanceService");
                // Prepare rich attendance data
                const attendanceData = Array.from(selectedPersonIds).map(
                    (personId) => {
                        const meta = attendanceMetadata[personId] || {};
                        return {
                            person_id: personId,
                            gave_tithe: meta.gave_tithe || false,
                            made_salvation_decision:
                                meta.made_salvation_decision || false,
                            first_timer: meta.first_timer || false,
                        };
                    },
                );

                await attendanceService.syncAttendance(
                    serviceId,
                    attendanceData,
                );
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
        <!-- Tab Navigation -->
        <!-- Tab Navigation -->
        <div
            class="relative grid grid-cols-3 border-b border-border/50 mb-6 sticky top-0 bg-background z-20 pt-2 isolate"
        >
            <!-- Sliding Underline -->
            <div
                class="absolute bottom-0 h-0.5 bg-primary transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                style="
                    width: calc(100% / 3);
                    left: {activeTab === 'details'
                    ? '0'
                    : activeTab === 'attendance'
                      ? '33.333%'
                      : '66.666%'};
                "
            ></div>

            <button
                type="button"
                class="px-4 py-3 text-sm font-medium transition-colors {activeTab ===
                'details'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'}"
                onclick={() => (activeTab = "details")}
            >
                Service Details
            </button>
            <button
                type="button"
                class="px-4 py-3 text-sm font-medium transition-colors {activeTab ===
                'attendance'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'}"
                onclick={() => (activeTab = "attendance")}
            >
                Individual Attendance
                <span
                    class="ml-2 bg-secondary text-xs py-0.5 px-2 rounded-full"
                >
                    {selectedPersonIds.size}
                </span>
            </button>
            <button
                type="button"
                class="px-4 py-3 text-sm font-medium transition-colors {activeTab ===
                'photos'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'}"
                onclick={() => (activeTab = "photos")}
            >
                Photos
                {#if photos.length > 0}
                    <span
                        class="ml-2 bg-secondary text-xs py-0.5 px-2 rounded-full"
                    >
                        {photos.length}
                    </span>
                {/if}
            </button>
        </div>

        <!-- Error message -->
        {#if errors.submit}
            <div
                class="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm"
            >
                {errors.submit}
            </div>
        {/if}

        {#if activeTab === "details"}
            <!-- Date and Type Section -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                    label="Service Date"
                    type="date"
                    bind:value={formData.service_date}
                    error={errors.service_date}
                    required
                    disabled={saving}
                />
                <Input
                    label="Service Time"
                    type="time"
                    bind:value={formData.service_time}
                    disabled={saving}
                />
                <Select
                    label="Service Type"
                    bind:value={formData.service_type}
                    options={serviceTypeOptions}
                    error={errors.service_type}
                    disabled={saving}
                />
            </div>

            <!-- Location -->
            <Input
                label="Location"
                bind:value={formData.location}
                disabled={saving}
            />

            <!-- Sermon Details -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    label="Sermon Topic"
                    bind:value={formData.sermon_topic}
                    disabled={saving}
                    placeholder="e.g., Walking in Faith"
                />
                <Input
                    label="Speaker"
                    bind:value={formData.sermon_speaker}
                    disabled={saving}
                    placeholder="e.g., Pastor John"
                />
            </div>

            <!-- Attendance Stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Input
                    label="Total Attendance"
                    type="number"
                    bind:value={formData.total_attendance}
                    error={errors.total_attendance}
                    disabled={saving}
                    min="0"
                />
                <Input
                    label="Guests"
                    type="number"
                    bind:value={formData.guests_count}
                    error={errors.guests_count}
                    disabled={saving}
                    min="0"
                />
                <Input
                    label="Salvation Decisions"
                    type="number"
                    bind:value={formData.salvation_decisions}
                    error={errors.salvation_decisions}
                    disabled={saving}
                    min="0"
                />
                <Input
                    label="Tithers"
                    type="number"
                    bind:value={formData.tithers_count}
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
                    placeholder="Add any notes about this service..."
                ></textarea>
            </div>
        {:else if activeTab === "attendance"}
            <!-- Attendance Selection -->
            <div class="space-y-4">
                <!-- Filter Tabs -->
                <!-- Filter Tabs -->
                <div
                    class="relative grid grid-cols-3 gap-1 p-1 bg-secondary/30 rounded-lg isolate"
                >
                    <!-- Sliding Pill -->
                    <div
                        class="absolute top-1 bottom-1 rounded-md bg-primary shadow-sm transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                        style="
                            width: calc((100% - 1rem) / 3);
                            left: calc(0.25rem + {attendeeFilter === 'members'
                            ? 0
                            : attendeeFilter === 'guests'
                              ? 1
                              : 2} * ((100% - 1rem) / 3 + 0.25rem));
                        "
                    ></div>

                    <button
                        type="button"
                        class="relative z-10 px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 {attendeeFilter ===
                        'members'
                            ? 'text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'}"
                        onclick={() => (attendeeFilter = "members")}
                    >
                        Members
                    </button>
                    <button
                        type="button"
                        class="relative z-10 px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 {attendeeFilter ===
                        'guests'
                            ? 'text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'}"
                        onclick={() => (attendeeFilter = "guests")}
                    >
                        Guests & Contacts
                    </button>
                    <button
                        type="button"
                        class="relative z-10 px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 {attendeeFilter ===
                        'all'
                            ? 'text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'}"
                        onclick={() => (attendeeFilter = "all")}
                    >
                        All
                    </button>
                </div>

                <!-- Search and Quick Add Row -->
                <div class="flex gap-2">
                    <div class="flex-1">
                        <Input
                            label=""
                            type="text"
                            bind:value={searchQuery}
                            placeholder="Search by name..."
                            disabled={saving}
                        />
                    </div>
                    <button
                        type="button"
                        class="px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                        onclick={() => (showQuickAdd = !showQuickAdd)}
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
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        Quick Add
                    </button>
                </div>

                <!-- Quick Add First Timer Form -->
                {#if showQuickAdd}
                    <div
                        class="p-3 bg-secondary/20 border border-border rounded-lg space-y-3"
                    >
                        <div
                            class="flex items-center gap-2 text-sm font-medium text-foreground"
                        >
                            <span>✨</span> Add First Timer
                        </div>

                        {#if quickAddError}
                            <div class="text-xs text-destructive">
                                {quickAddError}
                            </div>
                        {/if}

                        <div class="grid grid-cols-3 gap-2">
                            <input
                                type="text"
                                bind:value={quickAddData.first_name}
                                placeholder="First Name *"
                                disabled={quickAddSaving}
                                class="px-2 py-1.5 text-sm bg-input border border-border rounded-md focus:border-primary focus:outline-none"
                            />
                            <input
                                type="text"
                                bind:value={quickAddData.last_name}
                                placeholder="Last Name *"
                                disabled={quickAddSaving}
                                class="px-2 py-1.5 text-sm bg-input border border-border rounded-md focus:border-primary focus:outline-none"
                            />
                            <input
                                type="tel"
                                bind:value={quickAddData.phone}
                                placeholder="Phone (optional)"
                                disabled={quickAddSaving}
                                class="px-2 py-1.5 text-sm bg-input border border-border rounded-md focus:border-primary focus:outline-none"
                            />
                        </div>

                        <div class="flex gap-2">
                            <button
                                type="button"
                                onclick={handleQuickAdd}
                                disabled={quickAddSaving}
                                class="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 disabled:opacity-50"
                            >
                                {quickAddSaving ? "Adding..." : "Add & Select"}
                            </button>
                            <button
                                type="button"
                                onclick={() => {
                                    showQuickAdd = false;
                                    quickAddError = null;
                                }}
                                class="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-md hover:bg-secondary/80"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                {/if}

                <div
                    class="h-[350px] overflow-y-auto border border-border rounded-lg bg-card text-card-foreground p-2 scrollbar-thin"
                >
                    {#if loadingPeople}
                        <div
                            class="flex items-center justify-center h-full text-muted-foreground"
                        >
                            Loading directory...
                        </div>
                    {:else if people.length === 0}
                        <div
                            class="flex items-center justify-center h-full text-muted-foreground"
                        >
                            No people found in directory.
                        </div>
                    {:else if filteredPeople().length === 0}
                        <div
                            class="flex flex-col items-center justify-center h-full text-muted-foreground gap-2"
                        >
                            <span
                                >No matches found in "{attendeeFilter}" filter.</span
                            >
                            <button
                                type="button"
                                class="text-primary text-sm hover:underline"
                                onclick={() => (attendeeFilter = "all")}
                            >
                                Show all people
                            </button>
                        </div>
                    {:else}
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {#each filteredPeople() as person}
                                <div
                                    class="flex flex-col p-2 rounded hover:bg-secondary/50 transition-colors text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary
                                           {selectedPersonIds.has(person.id)
                                        ? 'bg-primary/10 border border-primary/20'
                                        : ''}"
                                    role="button"
                                    tabindex="0"
                                    onclick={() => togglePerson(person.id)}
                                    onkeydown={(e) =>
                                        (e.key === "Enter" || e.key === " ") &&
                                        togglePerson(person.id)}
                                >
                                    <div class="flex items-center w-full">
                                        <div class="mr-3 flex-shrink-0">
                                            {#if selectedPersonIds.has(person.id)}
                                                <div
                                                    class="w-5 h-5 bg-primary rounded flex items-center justify-center text-primary-foreground"
                                                >
                                                    <svg
                                                        class="w-3.5 h-3.5"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            stroke-width="3"
                                                            d="M5 13l4 4L19 7"
                                                        />
                                                    </svg>
                                                </div>
                                            {:else}
                                                <div
                                                    class="w-5 h-5 border border-muted-foreground rounded"
                                                ></div>
                                            {/if}
                                        </div>
                                        <div class="truncate flex-1">
                                            <div
                                                class="text-sm font-medium {selectedPersonIds.has(
                                                    person.id,
                                                )
                                                    ? 'text-primary'
                                                    : 'text-foreground'}"
                                            >
                                                {person.first_name}
                                                {person.last_name}
                                            </div>
                                            <div
                                                class="text-xs text-muted-foreground truncate flex items-center gap-1"
                                            >
                                                <span
                                                    >{person.member_status ||
                                                        "Guest"}</span
                                                >
                                                {#if person.contact_date}
                                                    <span class="text-amber-500"
                                                        >• Contact</span
                                                    >
                                                {/if}
                                            </div>
                                        </div>
                                    </div>

                                    {#if selectedPersonIds.has(person.id)}
                                        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
                                        <div
                                            class="mt-2 pl-8 flex flex-wrap gap-2"
                                            onclick={(e) => e.stopPropagation()}
                                            onkeydown={(e) =>
                                                e.stopPropagation()}
                                            role="group"
                                            aria-label="Attendance options for {person.first_name}"
                                        >
                                            <button
                                                type="button"
                                                class="px-2 py-1 text-xs rounded-full border transition-colors flex items-center gap-1
                                                    {attendanceMetadata[
                                                    person.id
                                                ]?.gave_tithe
                                                    ? 'bg-green-500/20 border-green-500 text-green-600'
                                                    : 'bg-background border-border text-muted-foreground hover:border-green-500 hover:text-green-600'}"
                                                onclick={() =>
                                                    toggleMetadata(
                                                        person.id,
                                                        "gave_tithe",
                                                    )}
                                            >
                                                <span>💰</span> Tithe
                                            </button>

                                            <button
                                                type="button"
                                                class="px-2 py-1 text-xs rounded-full border transition-colors flex items-center gap-1
                                                    {attendanceMetadata[
                                                    person.id
                                                ]?.made_salvation_decision
                                                    ? 'bg-red-500/20 border-red-500 text-red-600'
                                                    : 'bg-background border-border text-muted-foreground hover:border-red-500 hover:text-red-600'}"
                                                onclick={() =>
                                                    toggleMetadata(
                                                        person.id,
                                                        "made_salvation_decision",
                                                    )}
                                            >
                                                <span>❤️</span> Saved
                                            </button>

                                            <!-- Only show First Timer button if person has NOT attended before -->
                                            {#if !priorAttendance[person.id]}
                                                <button
                                                    type="button"
                                                    class="px-2 py-1 text-xs rounded-full border transition-colors flex items-center gap-1
                                                        {attendanceMetadata[
                                                        person.id
                                                    ]?.first_timer
                                                        ? 'bg-blue-500/20 border-blue-500 text-blue-600'
                                                        : 'bg-background border-border text-muted-foreground hover:border-blue-500 hover:text-blue-600'}"
                                                    onclick={() =>
                                                        toggleMetadata(
                                                            person.id,
                                                            "first_timer",
                                                        )}
                                                >
                                                    <span>✨</span> First Timer
                                                </button>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>

                <div class="text-xs text-muted-foreground text-center">
                    {selectedPersonIds.size} people selected as attended
                </div>
            </div>
        {:else if activeTab === "photos"}
            <!-- Photos Gallery Tab -->
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-medium text-foreground">
                        Event Photos
                    </h3>
                    <div class="relative">
                        <input
                            type="file"
                            id="photo-upload"
                            multiple
                            accept="image/*"
                            class="hidden"
                            onchange={handleFileUpload}
                            disabled={uploading || saving}
                        />
                        <label
                            for="photo-upload"
                            class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {#if uploading}
                                <svg
                                    class="animate-spin -ml-1 mr-2 h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    ><circle
                                        class="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        stroke-width="4"
                                    ></circle><path
                                        class="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path></svg
                                >
                                Uploading...
                            {:else}
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
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                                Add Photos
                            {/if}
                        </label>
                    </div>
                </div>

                {#if uploadError}
                    <div
                        class="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm"
                    >
                        {uploadError}
                    </div>
                {/if}

                {#if photos.length === 0}
                    <div
                        class="border-2 border-dashed border-border rounded-lg p-10 text-center"
                    >
                        <div
                            class="w-12 h-12 mx-auto mb-3 text-muted-foreground bg-secondary/50 rounded-full flex items-center justify-center"
                        >
                            <svg
                                class="w-6 h-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                        <p class="text-muted-foreground text-sm">
                            No photos added yet
                        </p>
                    </div>
                {:else}
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {#each photos as photo, i}
                            <div
                                class="group relative aspect-video bg-secondary rounded-lg overflow-hidden border border-border"
                            >
                                <img
                                    src={photo}
                                    alt="Service event {i + 1}"
                                    class="w-full h-full object-cover"
                                />
                                <div
                                    class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    <button
                                        type="button"
                                        class="p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                                        onclick={() => removePhoto(i)}
                                        aria-label="Remove photo"
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
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
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
                {mode === "edit" ? "Save Changes" : "Add Service"}
            {/if}
        </Button>
    {/snippet}
</Modal>
