<script>
  import { Modal, Button, Input, Select } from "$lib/components/ui";
  import {
    buildAttendanceData,
    resolveServiceCounts,
    summarizeNamedAttendance,
    validateServiceCounts,
    validateServiceSetup,
  } from "$lib/utils/serviceRecording.js";

  let { isOpen = $bindable(false), service = null, onsave, ...restProps } = $props();

  let activeStep = $state(1);
  let formData = $state(emptyForm());
  let saving = $state(false);
  let requestId = $state(crypto.randomUUID());
  let errors = $state({});

  let people = $state([]);
  let selectedPersonIds = $state(new Set());
  let attendanceMetadata = $state({});
  let priorAttendance = $state({});
  let loadingPeople = $state(false);
  let attendanceDataLoaded = $state(false);
  let attendeeFilter = $state("members");
  let searchQuery = $state("");

  let showQuickAdd = $state(false);
  let quickAddData = $state({ first_name: "", last_name: "", phone: "" });
  let quickAddSaving = $state(false);
  let quickAddError = $state(null);

  let photos = $state([]);
  let uploading = $state(false);
  let uploadProgress = $state(0);
  let uploadError = $state(null);
  let initialFormSnapshot = $state("");

  const mode = $derived(service?.id || service?._id ? "edit" : "create");
  const modalTitle = $derived(mode === "edit" ? "Update service record" : "Record service");
  const namedSummary = $derived(summarizeNamedAttendance(selectedPersonIds, attendanceMetadata, people));
  const resolvedCounts = $derived(resolveServiceCounts(formData, namedSummary));
  const unlistedAttendance = $derived(Math.max(0, resolvedCounts.total_attendance - namedSummary.named));

  const serviceTypeOptions = [
    { value: "sunday_service", label: "Sunday Service" },
    { value: "midweek_service", label: "Midweek Service" },
    { value: "special_service", label: "Special Service" },
    { value: "easter_service", label: "Easter Service" },
    { value: "christmas_service", label: "Christmas Service" },
  ];

  const steps = [
    { number: 1, label: "Setup", description: "When and where" },
    { number: 2, label: "Attendance", description: "Who was there" },
    { number: 3, label: "Review & save", description: "Totals and outcomes" },
  ];

  const filteredPeople = $derived(() => {
    let result = people;
    if (attendeeFilter === "members") {
      result = result.filter((person) => ["member", "leader"].includes(person.member_status));
    } else if (attendeeFilter === "guests") {
      result = result.filter((person) => ["guest", "visitor"].includes(person.member_status) || (!person.member_status && person.contact_date));
    }
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((person) => personName(person).toLowerCase().includes(query));
    }
    return result;
  });

  $effect(() => {
    if (!isOpen) return;
    const nextFormData = service ? {
      ...emptyForm(),
      service_date: service.service_date || "",
      service_type: service.service_type || "sunday_service",
      service_time: service.service_time || "",
      location: service.location || "",
      sermon_topic: service.sermon_topic || "",
      sermon_speaker: service.sermon_speaker || "",
      total_attendance: valueString(service.total_attendance),
      guests_count: valueString(service.guests_count),
      salvation_decisions: valueString(service.salvation_decisions),
      tithers_count: valueString(service.tithers_count),
      notes: service.notes || "",
    } : emptyForm();

    requestId = crypto.randomUUID();
    activeStep = 1;
    errors = {};
    attendeeFilter = "members";
    searchQuery = "";
    showQuickAdd = false;
    quickAddData = { first_name: "", last_name: "", phone: "" };
    quickAddError = null;
    uploadError = null;
    formData = nextFormData;
    photos = (service?.photos || []).map((url, index) => ({
      id: service?.photo_ids?.[index] || null,
      url,
      isNew: false,
    }));
    initialFormSnapshot = JSON.stringify(nextFormData);
    attendanceDataLoaded = false;
  });

  function emptyForm() {
    return {
      service_date: new Date().toISOString().slice(0, 10),
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
  }

  function valueString(value) {
    return value === null || value === undefined ? "" : String(value);
  }

  function personId(person) {
    return person?.id || person?._id;
  }

  function personName(person) {
    return [person?.first_name, person?.last_name].filter(Boolean).join(" ") || "Unknown person";
  }

  function readable(value) {
    if (!value) return "Guest";
    return String(value).replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  async function loadData() {
    loadingPeople = true;
    try {
      const peopleService = await import("$lib/services/peopleService");
      const peopleResult = await peopleService.getAll();
      people = peopleResult.data || [];
      const ids = people.map(personId).filter(Boolean);

      if (ids.length) {
        const attendanceService = await import("$lib/services/attendanceService");
        const historyResult = await attendanceService.getAttendanceHistory(ids, formData.service_date);
        priorAttendance = historyResult.data || {};

        if (mode === "edit" && (service?.id || service?._id)) {
          const attendanceResult = await attendanceService.getByService(service.id || service._id);
          const records = attendanceResult.data || [];
          selectedPersonIds = new Set(records.map((record) => record.person_id));
          attendanceMetadata = Object.fromEntries(records.map((record) => [record.person_id, {
            gave_tithe: Boolean(record.gave_tithe),
            made_salvation_decision: Boolean(record.made_salvation_decision),
            first_timer: Boolean(record.first_timer),
          }]));
        } else {
          selectedPersonIds = new Set();
          attendanceMetadata = {};
        }
      } else {
        selectedPersonIds = new Set();
        attendanceMetadata = {};
        priorAttendance = {};
      }
    } catch (loadError) {
      console.error("Failed to load attendance directory", loadError);
      errors = { ...errors, attendance: "The people directory could not be loaded." };
    } finally {
      loadingPeople = false;
      attendanceDataLoaded = true;
    }
  }

  function togglePerson(id) {
    const next = new Set(selectedPersonIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedPersonIds = next;
  }

  function toggleMetadata(id, field) {
    if (!selectedPersonIds.has(id)) return;
    const current = attendanceMetadata[id] || {};
    attendanceMetadata = {
      ...attendanceMetadata,
      [id]: { ...current, [field]: !current[field] },
    };
  }

  async function goToStep(step) {
    if (step > 1) {
      const setupErrors = validateServiceSetup(formData);
      if (Object.keys(setupErrors).length) {
        errors = setupErrors;
        activeStep = 1;
        return;
      }
    }
    errors = {};
    activeStep = step;
    if (step > 1 && !attendanceDataLoaded && !loadingPeople) {
      await loadData();
    }
  }

  function applyNamedTotals() {
    formData.total_attendance = String(namedSummary.named);
    formData.guests_count = String(namedSummary.guests);
    formData.salvation_decisions = String(namedSummary.salvationDecisions);
    formData.tithers_count = String(namedSummary.tithers);
  }

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
        entry_point: "sunday_service",
      });
      if (result.error) throw result.error;
      const newPerson = result.data;
      const id = personId(newPerson);
      people = [...people, { ...newPerson, id }];
      selectedPersonIds = new Set([...selectedPersonIds, id]);
      attendanceMetadata = {
        ...attendanceMetadata,
        [id]: { first_timer: true, gave_tithe: false, made_salvation_decision: false },
      };
      priorAttendance = { ...priorAttendance, [id]: false };
      quickAddData = { first_name: "", last_name: "", phone: "" };
      showQuickAdd = false;
      attendeeFilter = "guests";
    } catch (quickAddFailure) {
      quickAddError = quickAddFailure?.message || "The guest could not be added";
    } finally {
      quickAddSaving = false;
    }
  }

  async function handleFileUpload(event) {
    const input = event.currentTarget;
    const files = [...(input.files || [])];
    if (!files.length) return;
    uploading = true;
    uploadProgress = 0;
    uploadError = null;
    try {
      const storageService = await import("$lib/services/storageService");
      for (const file of files) {
        const result = await storageService.uploadImage(file, { onProgress: (value) => (uploadProgress = value) });
        if (result.error) throw result.error;
        photos = [...photos, { id: result.data.id, url: result.data.previewUrl, isNew: true }];
      }
    } catch (uploadFailure) {
      uploadError = uploadFailure?.message || "Photos could not be uploaded";
    } finally {
      uploading = false;
      input.value = "";
    }
  }

  async function removePhoto(index) {
    const photo = photos[index];
    photos = photos.filter((_, photoIndex) => photoIndex !== index);
    if (!photo?.isNew) return;
    URL.revokeObjectURL(photo.url);
    const storageService = await import("$lib/services/storageService");
    const result = await storageService.deleteImage(photo.id);
    if (result.error) uploadError = "The removed upload could not be cleaned up. Try saving or contact an administrator.";
  }

  async function handleCancel() {
    const hasUnsavedChanges = JSON.stringify(formData) !== initialFormSnapshot || photos.some((photo) => photo.isNew);
    if (hasUnsavedChanges && !window.confirm("Discard unsaved service changes?")) return;
    const pendingPhotos = photos.filter((photo) => photo.isNew);
    if (pendingPhotos.length) {
      const storageService = await import("$lib/services/storageService");
      const outcomes = await Promise.all(pendingPhotos.map((photo) => storageService.deleteImage(photo.id)));
      if (outcomes.some((outcome) => outcome.error)) {
        uploadError = "Some pending uploads could not be cleaned up. Please try again before closing.";
        return;
      }
      pendingPhotos.forEach((photo) => URL.revokeObjectURL(photo.url));
    }
    isOpen = false;
  }

  async function handleSubmit() {
    if (saving) return;
    const setupErrors = validateServiceSetup(formData);
    if (Object.keys(setupErrors).length) {
      errors = setupErrors;
      activeStep = 1;
      return;
    }

    const countErrors = validateServiceCounts(resolvedCounts, namedSummary);
    if (Object.keys(countErrors).length) {
      errors = countErrors;
      activeStep = 3;
      return;
    }

    saving = true;
    errors = {};
    try {
      const servicesService = await import("$lib/services/servicesService");
      const result = await servicesService.record({
        id: service?.id || service?._id,
        request_id: requestId,
        service_date: formData.service_date,
        service_type: formData.service_type,
        service_time: formData.service_time || undefined,
        location: formData.location.trim() || undefined,
        sermon_topic: formData.sermon_topic.trim() || undefined,
        sermon_speaker: formData.sermon_speaker.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        photoIds: photos.map((photo) => photo.id).filter(Boolean),
        ...resolvedCounts,
        attendanceData: buildAttendanceData(selectedPersonIds, attendanceMetadata),
      });
      if (result.error) throw result.error;
      photos.filter((photo) => photo.isNew).forEach((photo) => URL.revokeObjectURL(photo.url));
      onsave?.(result.data);
      isOpen = false;
    } catch (saveError) {
      errors = { submit: saveError?.message || "The service record could not be saved" };
    } finally {
      saving = false;
    }
  }
</script>

<Modal bind:isOpen title={modalTitle} size="2xl" closable={false} closeOnBackdrop={false} closeOnEscape={false} {...restProps}>
  <form class="space-y-5" onsubmit={(event) => { event.preventDefault(); handleSubmit(); }}>
    <nav class="grid grid-cols-3 gap-2 rounded-xl border border-border bg-secondary/15 p-2" aria-label="Service recording steps">
      {#each steps as step (step.number)}
        <button
          type="button"
          class="flex min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors {activeStep === step.number ? 'bg-card shadow-sm ring-1 ring-border' : 'hover:bg-secondary/40'}"
          aria-current={activeStep === step.number ? "step" : undefined}
          onclick={() => goToStep(step.number)}
        >
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold {activeStep === step.number ? 'bg-primary text-primary-foreground' : activeStep > step.number ? 'bg-success/15 text-success' : 'bg-secondary text-muted-foreground'}">
            {activeStep > step.number ? "✓" : step.number}
          </span>
          <span class="min-w-0"><span class="block truncate text-sm font-medium text-foreground">{step.label}</span><span class="hidden truncate text-xs text-muted-foreground sm:block">{step.description}</span></span>
        </button>
      {/each}
    </nav>

    {#if errors.submit}
      <div class="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{errors.submit}</div>
    {/if}

    {#if activeStep === 1}
      <section class="space-y-5" aria-labelledby="service-setup-title">
        <div><h3 id="service-setup-title" class="text-base font-semibold text-foreground">Set up the service</h3><p class="mt-1 text-sm text-muted-foreground">Start with the essentials. Attendance and outcomes come next.</p></div>

        <div class="rounded-xl border border-border bg-card p-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input label="Service Date" type="date" bind:value={formData.service_date} error={errors.service_date} required disabled={saving} />
            <Input label="Start Time" type="time" bind:value={formData.service_time} disabled={saving} />
            <Select label="Service Type" bind:value={formData.service_type} options={serviceTypeOptions} error={errors.service_type} disabled={saving} />
          </div>
          <div class="mt-4"><Input label="Location" bind:value={formData.location} disabled={saving} placeholder="Main auditorium, hall, or venue" /></div>
        </div>

        <div class="rounded-xl border border-border bg-card p-4">
          <div class="mb-4"><h4 class="text-sm font-semibold text-foreground">Message</h4><p class="mt-1 text-xs text-muted-foreground">Optional details that make the service easy to identify later.</p></div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Sermon Topic" bind:value={formData.sermon_topic} disabled={saving} placeholder="e.g., Walking in Faith" />
            <Input label="Speaker" bind:value={formData.sermon_speaker} disabled={saving} placeholder="e.g., Pastor John" />
          </div>
        </div>
      </section>
    {:else if activeStep === 2}
      <section class="space-y-4" aria-labelledby="service-attendance-title">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h3 id="service-attendance-title" class="text-base font-semibold text-foreground">Record named attendance</h3><p class="mt-1 text-sm text-muted-foreground">Check in the people you know. The final headcount can include unnamed attendees.</p></div>
          <div class="flex gap-4 rounded-lg bg-secondary/25 px-4 py-2 text-center">
            <div><p class="text-lg font-semibold text-foreground">{namedSummary.named}</p><p class="text-[11px] text-muted-foreground">Checked in</p></div>
            <div><p class="text-lg font-semibold text-info">{namedSummary.guests}</p><p class="text-[11px] text-muted-foreground">Guests</p></div>
            <div><p class="text-lg font-semibold text-success">{namedSummary.firstTimers}</p><p class="text-[11px] text-muted-foreground">First timers</p></div>
          </div>
        </div>

        {#if errors.attendance}<div class="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">{errors.attendance}</div>{/if}

        <div class="grid grid-cols-3 gap-1 rounded-lg bg-secondary/30 p-1" aria-label="Attendance directory filters">
          {#each [["members", "Members"], ["guests", "Guests & contacts"], ["all", "Everyone"]] as option}
            <button type="button" class="rounded-md px-3 py-2 text-xs font-medium transition-colors {attendeeFilter === option[0] ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}" onclick={() => attendeeFilter = option[0]}>{option[1]}</button>
          {/each}
        </div>

        <div class="flex flex-col gap-2 sm:flex-row">
          <div class="min-w-0 flex-1"><Input label="" bind:value={searchQuery} placeholder="Search by name..." disabled={saving} /></div>
          <Button variant="secondary" onclick={() => showQuickAdd = !showQuickAdd} disabled={saving}>+ Add first timer</Button>
        </div>

        {#if showQuickAdd}
          <div class="rounded-xl border border-primary/25 bg-primary/5 p-4">
            <div><h4 class="text-sm font-semibold text-foreground">Add a first timer</h4><p class="mt-1 text-xs text-muted-foreground">They will be added to the People Directory and checked into this service.</p></div>
            {#if quickAddError}<p class="mt-3 text-xs text-destructive" role="alert">{quickAddError}</p>{/if}
            <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input label="First Name" bind:value={quickAddData.first_name} required disabled={quickAddSaving} />
              <Input label="Last Name" bind:value={quickAddData.last_name} required disabled={quickAddSaving} />
              <Input label="Phone" type="tel" bind:value={quickAddData.phone} disabled={quickAddSaving} />
            </div>
            <div class="mt-3 flex gap-2"><Button size="sm" onclick={handleQuickAdd} loading={quickAddSaving}>Add and check in</Button><Button size="sm" variant="ghost" onclick={() => { showQuickAdd = false; quickAddError = null; }}>Cancel</Button></div>
          </div>
        {/if}

        <div class="max-h-[390px] overflow-y-auto rounded-xl border border-border bg-card p-2">
          {#if loadingPeople}
            <div class="flex min-h-52 items-center justify-center text-sm text-muted-foreground">Loading people…</div>
          {:else if filteredPeople().length === 0}
            <div class="flex min-h-52 flex-col items-center justify-center gap-2 text-sm text-muted-foreground"><p>No people match this view.</p><button type="button" class="text-primary hover:underline" onclick={() => attendeeFilter = "all"}>Show everyone</button></div>
          {:else}
            <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
              {#each filteredPeople() as person (personId(person))}
                {@const id = personId(person)}
                <article class="rounded-lg border p-2 transition-colors {selectedPersonIds.has(id) ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:bg-secondary/25'}">
                  <button type="button" class="flex w-full items-center gap-3 rounded-md p-1 text-left" onclick={() => togglePerson(id)} aria-pressed={selectedPersonIds.has(id)}>
                    <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded border {selectedPersonIds.has(id) ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/60'}">{#if selectedPersonIds.has(id)}<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>{/if}</span>
                    <span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium text-foreground">{personName(person)}</span><span class="block truncate text-xs text-muted-foreground">{readable(person.member_status)}{#if person.contact_date} · Outreach contact{/if}</span></span>
                  </button>
                  {#if selectedPersonIds.has(id)}
                    <div class="mt-2 flex flex-wrap gap-1.5 border-t border-border/60 pl-9 pt-2" aria-label={`Attendance outcomes for ${personName(person)}`}>
                      <button type="button" class="rounded-full border px-2.5 py-1 text-[11px] font-medium {attendanceMetadata[id]?.gave_tithe ? 'border-success/40 bg-success/10 text-success' : 'border-border text-muted-foreground hover:text-foreground'}" aria-pressed={Boolean(attendanceMetadata[id]?.gave_tithe)} onclick={() => toggleMetadata(id, "gave_tithe")}>Tither</button>
                      <button type="button" class="rounded-full border px-2.5 py-1 text-[11px] font-medium {attendanceMetadata[id]?.made_salvation_decision ? 'border-warning/40 bg-warning/10 text-warning' : 'border-border text-muted-foreground hover:text-foreground'}" aria-pressed={Boolean(attendanceMetadata[id]?.made_salvation_decision)} onclick={() => toggleMetadata(id, "made_salvation_decision")}>Salvation decision</button>
                      {#if !priorAttendance[id]}<button type="button" class="rounded-full border px-2.5 py-1 text-[11px] font-medium {attendanceMetadata[id]?.first_timer ? 'border-info/40 bg-info/10 text-info' : 'border-border text-muted-foreground hover:text-foreground'}" aria-pressed={Boolean(attendanceMetadata[id]?.first_timer)} onclick={() => toggleMetadata(id, "first_timer")}>First timer</button>{/if}
                    </div>
                  {/if}
                </article>
              {/each}
            </div>
          {/if}
        </div>
      </section>
    {:else}
      <section class="space-y-5" aria-labelledby="service-review-title">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h3 id="service-review-title" class="text-base font-semibold text-foreground">Review and record outcomes</h3><p class="mt-1 text-sm text-muted-foreground">Confirm the complete headcount, including anyone who was not checked in by name.</p></div>
          <Button size="sm" variant="ghost" onclick={applyNamedTotals}>Use named totals</Button>
        </div>

        <div class="rounded-xl border border-border bg-secondary/15 p-4">
          <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"><span class="font-medium text-foreground">{formData.service_date}</span><span class="text-muted-foreground">{serviceTypeOptions.find((option) => option.value === formData.service_type)?.label}</span>{#if formData.sermon_topic}<span class="text-muted-foreground">{formData.sermon_topic}</span>{/if}</div>
        </div>

        <div class="rounded-xl border border-border bg-card p-4">
          <div class="mb-4"><h4 class="text-sm font-semibold text-foreground">Service totals</h4><p class="mt-1 text-xs text-muted-foreground">Blank fields use the named records as their starting value.</p></div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Total Attendance" type="number" min="0" bind:value={formData.total_attendance} error={errors.total_attendance} placeholder={String(namedSummary.named)} disabled={saving} />
            <Input label="Guest Headcount" type="number" min="0" bind:value={formData.guests_count} error={errors.guests_count} placeholder={String(namedSummary.guests)} disabled={saving} />
            <Input label="Salvation Decisions" type="number" min="0" bind:value={formData.salvation_decisions} error={errors.salvation_decisions} placeholder={String(namedSummary.salvationDecisions)} disabled={saving} />
            <Input label="Tithers" type="number" min="0" bind:value={formData.tithers_count} error={errors.tithers_count} placeholder={String(namedSummary.tithers)} disabled={saving} />
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-secondary/25 p-3 text-center sm:grid-cols-4">
            <div><p class="text-lg font-semibold text-foreground">{namedSummary.named}</p><p class="text-[11px] text-muted-foreground">Named</p></div>
            <div><p class="text-lg font-semibold text-foreground">{unlistedAttendance}</p><p class="text-[11px] text-muted-foreground">Unlisted</p></div>
            <div><p class="text-lg font-semibold text-info">{resolvedCounts.guests_count}</p><p class="text-[11px] text-muted-foreground">Guests</p></div>
            <div><p class="text-lg font-semibold text-success">{namedSummary.firstTimers}</p><p class="text-[11px] text-muted-foreground">Named first timers</p></div>
          </div>
        </div>

        <details class="rounded-xl border border-border bg-card">
          <summary class="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-foreground"><span>Notes and photos</span><span class="text-xs text-muted-foreground">Optional · {photos.length} photos</span></summary>
          <div class="space-y-4 border-t border-border p-4">
            <div><label for="service-notes" class="mb-1.5 block text-sm font-medium text-foreground">Reflection from the day</label><p class="mb-2 text-xs text-muted-foreground">Capture the atmosphere, testimonies and moments you will want to remember later.</p><textarea id="service-notes" bind:value={formData.notes} rows="4" disabled={saving} class="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary" placeholder="What made this service memorable? What happened, and how did the day feel?"></textarea></div>
            <div class="flex flex-wrap items-center justify-between gap-3"><div><p class="text-sm font-medium text-foreground">Service photos</p><p class="mt-1 text-xs text-muted-foreground">JPEG, PNG or WebP · maximum 10 MB each. Uploads are saved securely with this service.</p></div><label for="service-photo-upload" class="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border bg-secondary px-3 text-xs font-medium text-foreground hover:bg-secondary/70">{uploading ? `Uploading ${uploadProgress}%…` : "Add photos"}</label><input id="service-photo-upload" class="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" onchange={handleFileUpload} disabled={uploading || saving} /></div>
            {#if uploadError}<p class="text-xs text-destructive">{uploadError}</p>{/if}
            {#if photos.length}<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">{#each photos as photo, index}<div class="group relative aspect-video overflow-hidden rounded-lg border border-border bg-secondary"><img src={photo.url} alt={`Service ${index + 1}`} class="h-full w-full object-cover" /><button type="button" class="absolute right-1.5 top-1.5 rounded-full bg-background/85 p-1 text-destructive opacity-0 shadow-sm transition-opacity group-hover:opacity-100" aria-label="Remove photo" onclick={() => removePhoto(index)}><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>{/each}</div>{/if}
          </div>
        </details>
      </section>
    {/if}
  </form>

  {#snippet footer()}
    <div class="flex w-full items-center justify-between gap-3">
      <Button variant="ghost" onclick={handleCancel} disabled={saving || uploading}>Cancel</Button>
      <div class="flex gap-2">
        {#if activeStep > 1}<Button variant="secondary" onclick={() => goToStep(activeStep - 1)} disabled={saving}>Back</Button>{/if}
        {#if activeStep < 3}
          <Button onclick={() => goToStep(activeStep + 1)} disabled={saving}>{activeStep === 1 ? "Continue to attendance" : "Review service"}</Button>
        {:else}
          <Button onclick={handleSubmit} loading={saving}>{mode === "edit" ? "Save service record" : "Record service"}</Button>
        {/if}
      </div>
    </div>
  {/snippet}
</Modal>
