<script>
  import { Modal, Button, Input, SearchableSelect, Badge } from "$lib/components/ui";
  import * as meetingsService from "$lib/services/meetingsService";
  import * as peopleService from "$lib/services/peopleService";

  let {
    isOpen = $bindable(false),
    meeting = null,
    programs = [],
    people = [],
    meetings = [],
    initialProgramId = null,
    initialOneOff = false,
    onsave,
  } = $props();

  const formatOptions = [
    { value: "in_person", label: "In person" },
    { value: "online", label: "Online" },
    { value: "hybrid", label: "Hybrid" },
  ];

  const oneOffTypeOptions = [
    { value: "evangelistic_event", label: "Evangelistic event" },
    { value: "special_event", label: "Special event" },
    { value: "training", label: "Training / workshop" },
    { value: "fellowship", label: "Fellowship / social" },
    { value: "other", label: "Other" },
  ];

  let activeTab = $state("details");
  let recordingMode = $state("programme");
  let formData = $state({
    program_id: "",
    title: "",
    meeting_type: "evangelistic_event",
    meeting_date: "",
    start_time: "",
    end_time: "",
    format: "in_person",
    location: "",
    online_url: "",
    unnamed_guests_count: 0,
    notes: "",
  });
  let selectedPersonIds = $state(new Set());
  let firstTimerIds = $state(new Set());
  let attendeeFilter = $state("roster");
  let searchQuery = $state("");
  let markComplete = $state(true);
  let saving = $state(false);
  let loadingAttendance = $state(false);
  let errors = $state({});
  let showQuickAdd = $state(false);
  let quickAddData = $state({ first_name: "", last_name: "", phone: "" });
  let quickAddSaving = $state(false);
  let initialisedFor = $state(null);

  const programOptions = $derived(
    programs
      .filter((program) => program.active !== false)
      .map((program) => ({ value: program.id, label: program.name })),
  );
  const selectedProgram = $derived(() =>
    programs.find((program) => String(program.id) === String(formData.program_id)),
  );
  const rosterIds = $derived(
    new Set((selectedProgram()?.member_ids || []).map(String)),
  );
  const selectedTotal = $derived(
    selectedPersonIds.size + Math.max(0, Number(formData.unnamed_guests_count) || 0),
  );
  const filteredPeople = $derived(() => {
    let result = people.filter((person) => person.member_status !== "archived");
    if (attendeeFilter === "roster" && rosterIds.size > 0) {
      result = result.filter((person) => rosterIds.has(String(person.id)));
    } else if (attendeeFilter === "members") {
      result = result.filter(
        (person) =>
          person.member_status === "member" || person.member_status === "leader",
      );
    } else if (attendeeFilter === "guests") {
      result = result.filter(
        (person) =>
          person.member_status === "guest" ||
          person.member_status === "visitor" ||
          (!person.member_status && person.contact_date),
      );
    }
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((person) =>
        `${person.first_name} ${person.last_name}`.toLowerCase().includes(query),
      );
    }
    return [...result].sort((a, b) => {
      const aSelected = selectedPersonIds.has(a.id) ? 0 : 1;
      const bSelected = selectedPersonIds.has(b.id) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      return `${a.first_name} ${a.last_name}`.localeCompare(
        `${b.first_name} ${b.last_name}`,
      );
    });
  });

  $effect(() => {
    if (!isOpen) {
      initialisedFor = null;
      return;
    }
    const key = `${meeting?.id || "new"}:${initialProgramId || ""}:${initialOneOff}:${programs.length}`;
    if (initialisedFor === key) return;
    initialisedFor = key;
    initialiseForm();
  });

  function defaultProgram() {
    return (
      programs.find((program) => String(program.id) === String(initialProgramId)) ||
      programs.find((program) => String(program.id) === String(meeting?.program_id)) ||
      programs.find((program) => program.meeting_type === meeting?.meeting_type) ||
      programs[0]
    );
  }

  function initialiseForm() {
    recordingMode = meeting
      ? meeting.program_id
        ? "programme"
        : "one_off"
      : initialOneOff
        ? "one_off"
        : "programme";
    const program = recordingMode === "programme" ? defaultProgram() : null;
    const today = new Date().toISOString().split("T")[0];
    formData = {
      program_id:
        recordingMode === "programme"
          ? meeting?.program_id || program?.id || ""
          : "",
      title: meeting?.title || "",
      meeting_type: meeting?.meeting_type || "evangelistic_event",
      meeting_date: meeting?.meeting_date || today,
      start_time: meeting?.start_time || program?.default_start_time || "",
      end_time: meeting?.end_time || program?.default_end_time || "",
      format: meeting?.format || program?.default_format || "in_person",
      location: meeting?.location || program?.default_location || "",
      online_url: meeting?.online_url || program?.online_url || "",
      unnamed_guests_count: meeting?.unnamed_guests_count || 0,
      notes: meeting?.notes || "",
    };
    selectedPersonIds = new Set(
      (meeting?.attendee_ids || meeting?.attendees || []).map((record) =>
        typeof record === "string" ? record : record.person_id,
      ),
    );
    firstTimerIds = new Set();
    activeTab = meeting ? "attendance" : "details";
    attendeeFilter =
      recordingMode === "programme" && (program?.member_ids || []).length
        ? "roster"
        : "members";
    markComplete = meeting?.status !== "attendance_needed";
    if (!meeting) markComplete = true;
    searchQuery = "";
    errors = {};
    showQuickAdd = false;
    quickAddData = { first_name: "", last_name: "", phone: "" };
    if (meeting?.id) loadAttendance(meeting.id);
  }

  async function loadAttendance(meetingId) {
    loadingAttendance = true;
    try {
      const result = await meetingsService.getAttendees(meetingId);
      if (result.data) {
        selectedPersonIds = new Set(
          result.data
            .filter((record) => !record.status || record.status === "present")
            .map((record) => record.person_id),
        );
        firstTimerIds = new Set(
          result.data
            .filter((record) => record.first_timer)
            .map((record) => record.person_id),
        );
      }
    } finally {
      loadingAttendance = false;
    }
  }

  function handleProgramChange(programId) {
    const program = programs.find((item) => String(item.id) === String(programId));
    formData.program_id = programId;
    if (!meeting && program) {
      formData.start_time = program.default_start_time || "";
      formData.end_time = program.default_end_time || "";
      formData.format = program.default_format || "in_person";
      formData.location = program.default_location || "";
      formData.online_url = program.online_url || "";
    }
    attendeeFilter = (program?.member_ids || []).length ? "roster" : "members";
  }

  function setRecordingMode(mode) {
    if (meeting || recordingMode === mode) return;
    recordingMode = mode;
    selectedPersonIds = new Set();
    firstTimerIds = new Set();
    if (mode === "programme") {
      const program = defaultProgram();
      formData.program_id = program?.id || "";
      formData.start_time = program?.default_start_time || "";
      formData.end_time = program?.default_end_time || "";
      formData.format = program?.default_format || "in_person";
      formData.location = program?.default_location || "";
      formData.online_url = program?.online_url || "";
      attendeeFilter = (program?.member_ids || []).length ? "roster" : "members";
    } else {
      formData.program_id = "";
      formData.start_time = "";
      formData.end_time = "";
      formData.format = "in_person";
      formData.location = "";
      formData.online_url = "";
      attendeeFilter = "members";
    }
  }

  function toggleAttendee(personId) {
    const next = new Set(selectedPersonIds);
    if (next.has(personId)) {
      next.delete(personId);
      const nextFirstTimers = new Set(firstTimerIds);
      nextFirstTimers.delete(personId);
      firstTimerIds = nextFirstTimers;
    } else {
      next.add(personId);
    }
    selectedPersonIds = next;
  }

  function toggleFirstTimer(personId) {
    if (!selectedPersonIds.has(personId)) return;
    const next = new Set(firstTimerIds);
    next.has(personId) ? next.delete(personId) : next.add(personId);
    firstTimerIds = next;
  }

  function isGuest(person) {
    return (
      person.member_status === "guest" || person.member_status === "visitor"
    );
  }

  function hasPriorProgrammeAttendance(personId) {
    if (recordingMode !== "programme" || !formData.program_id) return false;
    return meetings.some((item) => {
      if (String(item.id) === String(meeting?.id)) return false;
      if (String(item.program_id) !== String(formData.program_id)) return false;
      if (!item.meeting_date || item.meeting_date >= formData.meeting_date) {
        return false;
      }
      return (item.attendee_ids || item.attendees || []).some((attendee) =>
        String(
          typeof attendee === "string" ? attendee : attendee.person_id,
        ) === String(personId),
      );
    });
  }

  function isFirstProgrammeAttendance(personId) {
    return (
      recordingMode === "programme" &&
      selectedPersonIds.has(personId) &&
      !firstTimerIds.has(personId) &&
      !hasPriorProgrammeAttendance(personId)
    );
  }

  function firstProgrammeLabel() {
    return `First ${selectedProgram()?.name || "programme"}`;
  }

  function selectVisible() {
    const next = new Set(selectedPersonIds);
    filteredPeople().forEach((person) => next.add(person.id));
    selectedPersonIds = next;
  }

  function clearAttendance() {
    selectedPersonIds = new Set();
    firstTimerIds = new Set();
  }

  async function quickAddPerson() {
    if (!quickAddData.first_name.trim() || !quickAddData.last_name.trim()) {
      errors = { ...errors, quickAdd: "First and last name are required" };
      return;
    }
    quickAddSaving = true;
    try {
      const result = await peopleService.create({
        first_name: quickAddData.first_name.trim(),
        last_name: quickAddData.last_name.trim(),
        phone: quickAddData.phone || undefined,
        member_status: "guest",
        first_visit_date:
          formData.meeting_date || new Date().toISOString().split("T")[0],
        entry_point:
          recordingMode === "programme" &&
          selectedProgram()?.meeting_type === "bacenta"
            ? "bacenta_meeting"
            : recordingMode === "one_off" &&
                formData.meeting_type === "evangelistic_event"
              ? "evangelism"
              : "other",
      });
      if (result.error) throw result.error;
      people = [...people, result.data];
      selectedPersonIds = new Set([...selectedPersonIds, result.data.id]);
      firstTimerIds = new Set([...firstTimerIds, result.data.id]);
      quickAddData = { first_name: "", last_name: "", phone: "" };
      showQuickAdd = false;
      errors = { ...errors, quickAdd: null };
    } catch (error) {
      errors = { ...errors, quickAdd: error.message || "Could not add this person" };
    } finally {
      quickAddSaving = false;
    }
  }

  function validate() {
    const nextErrors = {};
    if (recordingMode === "programme" && !formData.program_id) {
      nextErrors.program_id = "Choose a meeting programme";
    }
    if (recordingMode === "one_off" && !formData.title.trim()) {
      nextErrors.title = "Event name is required";
    }
    if (!formData.meeting_date) nextErrors.meeting_date = "Meeting date is required";
    errors = nextErrors;
    return Object.keys(nextErrors).length === 0;
  }

  function durationMinutes() {
    if (!formData.start_time || !formData.end_time) return undefined;
    const [startHour, startMinute] = formData.start_time.split(":").map(Number);
    const [endHour, endMinute] = formData.end_time.split(":").map(Number);
    let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    if (minutes < 0) minutes += 24 * 60;
    return minutes;
  }

  async function handleSubmit() {
    if (!validate()) {
      activeTab = "details";
      return;
    }
    const program = selectedProgram();
    saving = true;
    try {
      const payload = {
        program_id:
          recordingMode === "programme" ? formData.program_id : undefined,
        title:
          recordingMode === "one_off" ? formData.title.trim() : undefined,
        meeting_type:
          recordingMode === "programme"
            ? program?.meeting_type || "other"
            : formData.meeting_type,
        meeting_date: formData.meeting_date,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        duration_minutes: durationMinutes() || null,
        format: formData.format,
        location: formData.location || null,
        online_url: formData.online_url || null,
        unnamed_guests_count: Math.max(
          0,
          Number(formData.unnamed_guests_count) || 0,
        ),
        status: markComplete ? "completed" : "attendance_needed",
        notes: formData.notes || null,
      };
      const meetingResult = meeting?.id
        ? await meetingsService.update(meeting.id, payload)
        : await meetingsService.create(payload);
      if (meetingResult.error) throw meetingResult.error;
      const meetingId = meetingResult.data.id;
      const attendanceData = Array.from(selectedPersonIds).map((personId) => ({
        person_id: personId,
        status: "present",
        first_timer: firstTimerIds.has(personId),
      }));
      const attendanceResult = await meetingsService.syncAttendance(
        meetingId,
        attendanceData,
        payload.unnamed_guests_count,
        markComplete,
      );
      if (attendanceResult.error) throw attendanceResult.error;
      const freshResult = await meetingsService.getById(meetingId);
      await onsave?.(freshResult.data || { ...meetingResult.data, ...payload });
      isOpen = false;
    } catch (error) {
      errors = { submit: error.message || "Could not save attendance" };
    } finally {
      saving = false;
    }
  }
</script>

<Modal
  bind:isOpen
  title={meeting ? "Edit meeting attendance" : "Record meeting attendance"}
  size="xl"
>
  <form
    class="space-y-5"
    onsubmit={(event) => {
      event.preventDefault();
      handleSubmit();
    }}
  >
    {#if errors.submit}
      <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        {errors.submit}
      </div>
    {/if}

    <div class="grid grid-cols-2 gap-1 rounded-xl bg-secondary/40 p-1">
      <button
        type="button"
        onclick={() => (activeTab = "details")}
        class="rounded-lg px-4 py-2.5 text-sm font-medium transition-colors {activeTab === 'details' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}"
      >
        1. Meeting details
      </button>
      <button
        type="button"
        onclick={() => (activeTab = "attendance")}
        class="rounded-lg px-4 py-2.5 text-sm font-medium transition-colors {activeTab === 'attendance' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}"
      >
        2. Attendance <span class="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">{selectedTotal}</span>
      </button>
    </div>

    {#if activeTab === "details"}
      <div class="space-y-5">
        {#if !meeting}
          <fieldset>
            <legend class="mb-2 text-sm font-medium text-foreground">What are you recording?</legend>
            <div class="grid grid-cols-2 gap-1 rounded-xl bg-secondary/40 p-1">
              <button
                type="button"
                aria-pressed={recordingMode === "programme"}
                onclick={() => setRecordingMode("programme")}
                class="rounded-lg px-3 py-2.5 text-sm font-medium transition-colors {recordingMode === 'programme' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
              >
                Regular programme
              </button>
              <button
                type="button"
                aria-pressed={recordingMode === "one_off"}
                onclick={() => setRecordingMode("one_off")}
                class="rounded-lg px-3 py-2.5 text-sm font-medium transition-colors {recordingMode === 'one_off' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
              >
                One-off / special event
              </button>
            </div>
          </fieldset>
        {/if}

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          {#if recordingMode === "programme"}
            <SearchableSelect
              label="Meeting programme"
              value={formData.program_id}
              options={programOptions}
              error={errors.program_id}
              onchange={({ value }) => handleProgramChange(value)}
              required
            />
          {:else}
            <Input
              label="Event name"
              bind:value={formData.title}
              error={errors.title}
              placeholder="e.g. Community Evangelistic Day"
              required
            />
            <SearchableSelect
              label="Event type"
              bind:value={formData.meeting_type}
              options={oneOffTypeOptions}
            />
          {/if}
          <Input
            label="Meeting date"
            type="date"
            bind:value={formData.meeting_date}
            error={errors.meeting_date}
            required
          />
          <Input label="Start time" type="time" bind:value={formData.start_time} />
          <Input label="End time" type="time" bind:value={formData.end_time} />
          <SearchableSelect
            label="Format"
            bind:value={formData.format}
            options={formatOptions}
          />
          <Input
            label="Location"
            bind:value={formData.location}
            placeholder={formData.format === "online" ? "e.g. YouTube" : "Where did you meet?"}
          />
          {#if formData.format !== "in_person"}
            <div class="md:col-span-2">
              <Input
                label="Online link"
                type="url"
                bind:value={formData.online_url}
                placeholder="https://..."
              />
            </div>
          {/if}
        </div>
        {#if recordingMode === "one_off"}
          <div class="rounded-xl border border-info/25 bg-info/10 p-3 text-sm text-foreground">
            Record the normal Sunday service in <strong>Sunday Services</strong>, even when it has an evangelistic focus. Use this one-off option for a separate event with its own attendance.
          </div>
        {/if}
        <div>
          <label for="meeting-notes" class="mb-1.5 block text-sm font-medium text-foreground">
            Notes
          </label>
          <textarea
            id="meeting-notes"
            bind:value={formData.notes}
            rows="3"
            class="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Optional notes about this meeting..."
          ></textarea>
        </div>
        <div class="flex justify-end">
          <Button onclick={() => (activeTab = "attendance")}>Continue to attendance</Button>
        </div>
      </div>
    {:else}
      <div class="space-y-4">
        {#if selectedProgram()?.meeting_type === "flow_service"}
          <div class="rounded-xl border border-primary/25 bg-primary/10 p-3 text-sm text-foreground">
            Mark members only when their participation was confirmed. YouTube views are not counted as individual attendance.
          </div>
        {/if}

        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-wrap gap-2">
            {#if recordingMode === "programme" && rosterIds.size > 0}
              <button
                type="button"
                onclick={() => (attendeeFilter = "roster")}
                class="rounded-full px-3 py-1.5 text-xs font-medium {attendeeFilter === 'roster' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}"
              >Roster ({rosterIds.size})</button>
            {/if}
            <button
              type="button"
              onclick={() => (attendeeFilter = "members")}
              class="rounded-full px-3 py-1.5 text-xs font-medium {attendeeFilter === 'members' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}"
            >Members</button>
            <button
              type="button"
              onclick={() => (attendeeFilter = "guests")}
              class="rounded-full px-3 py-1.5 text-xs font-medium {attendeeFilter === 'guests' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}"
            >Guests</button>
            <button
              type="button"
              onclick={() => (attendeeFilter = "all")}
              class="rounded-full px-3 py-1.5 text-xs font-medium {attendeeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}"
            >All people</button>
          </div>
          <div class="w-full lg:w-60">
            <Input label="" bind:value={searchQuery} placeholder="Search by name..." />
          </div>
        </div>

        {#if recordingMode === "programme" && rosterIds.size > 0 && attendeeFilter === "roster"}
          <p class="rounded-lg bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
            The roster is the expected group for {selectedProgram()?.name}. Only the people you check below are counted as present.
          </p>
        {/if}

        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div class="flex gap-2">
            <button type="button" class="font-medium text-primary hover:underline" onclick={selectVisible}>
              Select visible
            </button>
            <span class="text-border">•</span>
            <button type="button" class="font-medium text-muted-foreground hover:text-foreground" onclick={clearAttendance}>
              Clear attendance
            </button>
          </div>
          <button
            type="button"
            class="rounded-lg bg-secondary px-3 py-1.5 font-medium text-foreground hover:bg-secondary/80"
            onclick={() => (showQuickAdd = !showQuickAdd)}
          >
            + Add a new guest
          </button>
        </div>

        {#if showQuickAdd}
          <div class="rounded-xl border border-border bg-secondary/20 p-4">
            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input label="First name" bind:value={quickAddData.first_name} />
              <Input label="Last name" bind:value={quickAddData.last_name} />
              <Input label="Phone" type="tel" bind:value={quickAddData.phone} />
            </div>
            {#if errors.quickAdd}
              <p class="mt-2 text-xs text-destructive">{errors.quickAdd}</p>
            {/if}
            <div class="mt-3 flex justify-end">
              <Button size="sm" loading={quickAddSaving} onclick={quickAddPerson}>
                Add and mark present
              </Button>
            </div>
          </div>
        {/if}

        <div class="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border p-2">
          {#if loadingAttendance}
            <div class="p-8 text-center text-sm text-muted-foreground">Loading attendance…</div>
          {:else if filteredPeople().length === 0}
            <div class="p-8 text-center text-sm text-muted-foreground">No people match this filter.</div>
          {:else}
            {#each filteredPeople() as person}
              <div class="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors {selectedPersonIds.has(person.id) ? 'border-primary/40 bg-primary/10' : 'border-transparent hover:bg-secondary/30'}">
                <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedPersonIds.has(person.id)}
                    onchange={() => toggleAttendee(person.id)}
                    class="h-4 w-4 rounded border-border accent-primary"
                  />
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-foreground">
                      {person.first_name} {person.last_name}
                    </p>
                    <p class="text-xs capitalize text-muted-foreground">
                      {isGuest(person) ? "Guest" : person.member_status || "Guest"}
                      {#if recordingMode === "programme" && rosterIds.has(String(person.id))} · Programme roster{/if}
                    </p>
                  </div>
                </label>
                <div class="flex flex-shrink-0 items-center gap-2">
                  {#if selectedPersonIds.has(person.id) && isGuest(person)}
                    <button
                      type="button"
                      aria-pressed={firstTimerIds.has(person.id)}
                      aria-label="Mark {person.first_name} {person.last_name} as a first timer"
                      onclick={() => toggleFirstTimer(person.id)}
                      class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {firstTimerIds.has(person.id) ? 'border-info/30 bg-info/15 text-info' : 'border-border bg-card text-muted-foreground hover:text-foreground'}"
                    >
                      {firstTimerIds.has(person.id) ? "First timer ✓" : "Mark first timer"}
                    </button>
                  {:else if firstTimerIds.has(person.id)}
                    <Badge variant="info" size="sm">First timer</Badge>
                  {/if}
                  {#if isFirstProgrammeAttendance(person.id)}
                    <Badge variant="success" size="sm">{firstProgrammeLabel()}</Badge>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
        </div>

        <div class="grid grid-cols-1 gap-4 rounded-xl bg-secondary/25 p-4 sm:grid-cols-[1fr_180px] sm:items-center">
          <div>
            <p class="font-semibold text-foreground">{selectedTotal} total attendance</p>
            <p class="text-xs text-muted-foreground">
              {selectedPersonIds.size} named people + {Math.max(0, Number(formData.unnamed_guests_count) || 0)} unnamed guests
            </p>
          </div>
          <Input
            label="Unnamed guests"
            type="number"
            min="0"
            bind:value={formData.unnamed_guests_count}
          />
        </div>

        <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
          <input
            type="checkbox"
            bind:checked={markComplete}
            class="mt-0.5 h-4 w-4 rounded border-border accent-primary"
          />
          <span>
            <span class="block text-sm font-medium text-foreground">Attendance is complete</span>
            <span class="block text-xs text-muted-foreground">
              Turn this off if you need to return and finish the list later.
            </span>
          </span>
        </label>
      </div>
    {/if}

    <div class="flex justify-end gap-3 border-t border-border pt-4">
      <Button variant="secondary" onclick={() => (isOpen = false)} disabled={saving}>Cancel</Button>
      <Button type="submit" loading={saving}>
        {markComplete ? "Save attendance" : "Save for later"}
      </Button>
    </div>
  </form>
</Modal>
