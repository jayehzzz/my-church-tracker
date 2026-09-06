<script>
  import { Modal, Button, Input, Select, SearchableSelect } from "$lib/components/ui";
  import { fullName, localDate, recordId } from "$lib/utils/pastoralCare.js";

  let {
    isOpen = $bindable(false),
    visitation = null,
    task = null,
    people = [],
    initialPersonId = "",
    onsave = null,
    ...restProps
  } = $props();

  let saving = $state(false);
  let requestId = $state(crypto.randomUUID());
  let errors = $state({});
  let formData = $state({
    person_id: "",
    visited_by_id: "",
    visit_date: "",
    interaction_type: "home_visit",
    purpose: "general_care",
    outcome: "welcomed_encouraged",
    follow_up_required: false,
    follow_up_date: "",
    notes: "",
  });

  const mode = $derived(visitation?.id || visitation?._id ? "edit" : "create");
  const modalTitle = $derived(
    mode === "edit" ? "Edit Care Interaction" : task ? "Complete Care Task" : "Log Pastoral Care",
  );

  const personOptions = $derived(
    people
      .filter((person) => person.member_status !== "archived")
      .slice()
      .sort((a, b) => fullName(a).localeCompare(fullName(b)))
      .map((person) => ({ value: recordId(person), label: fullName(person) })),
  );

  const leaderOptions = $derived(
    people
      .filter((person) => person.member_status === "leader")
      .slice()
      .sort((a, b) => fullName(a).localeCompare(fullName(b)))
      .map((person) => ({ value: recordId(person), label: fullName(person) })),
  );

  const selectedPerson = $derived(
    people.find((person) => String(recordId(person)) === String(formData.person_id)) || task?.person || null,
  );

  const interactionOptions = [
    { value: "home_visit", label: "Home visit" },
    { value: "hospital_visit", label: "Hospital visit" },
    { value: "church_meeting", label: "Church conversation" },
    { value: "phone_call", label: "Phone call" },
    { value: "message", label: "Message" },
    { value: "practical_support", label: "Practical support" },
    { value: "other", label: "Other" },
  ];

  const purposeOptions = [
    { value: "new_guest", label: "New guest care" },
    { value: "attendance_concern", label: "Attendance concern" },
    { value: "welfare", label: "Welfare" },
    { value: "prayer", label: "Prayer" },
    { value: "bereavement", label: "Bereavement" },
    { value: "membership", label: "Membership" },
    { value: "general_care", label: "General care" },
    { value: "other", label: "Other" },
  ];

  const outcomeOptions = [
    { value: "welcomed_encouraged", label: "Welcomed & encouraged" },
    { value: "prayer_request_received", label: "Prayer request received" },
    { value: "invited_to_service", label: "Invited to service" },
    { value: "concerns_shared", label: "Concerns shared" },
    { value: "follow_up_needed", label: "Follow-up needed" },
    { value: "not_home", label: "Not home / no contact" },
    { value: "declined", label: "Declined care" },
  ];

  $effect(() => {
    if (!isOpen) return;
    requestId = crypto.randomUUID();
    const existing = visitation;
    formData = {
      person_id: existing?.person_id || task?.person_id || initialPersonId || "",
      visited_by_id: existing?.visited_by_id || task?.assigned_leader_id || "",
      visit_date: existing?.visit_date || localDate(),
      interaction_type: existing?.interaction_type || "home_visit",
      purpose: existing?.purpose
        || (task?.task_type === "member_care" ? "general_care" : "attendance_concern"),
      outcome: existing?.outcome || "welcomed_encouraged",
      follow_up_required: Boolean(existing?.follow_up_required),
      follow_up_date: existing?.follow_up_date || "",
      notes: existing?.notes || "",
    };
    errors = {};
  });

  function validate() {
    const nextErrors = {};
    if (!formData.person_id) nextErrors.person_id = "Choose the person who received care";
    if (!formData.visited_by_id) nextErrors.visited_by_id = "Choose the care leader";
    if (!formData.visit_date) nextErrors.visit_date = "Choose the interaction date";
    if (!formData.outcome) nextErrors.outcome = "Choose an outcome";
    if (formData.follow_up_required && !formData.follow_up_date) {
      nextErrors.follow_up_date = "Choose when the next action is due";
    }
    errors = nextErrors;
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (saving) return;
    if (!validate()) return;
    saving = true;
    errors = {};
    try {
      const service = await import("$lib/services/visitationsService.js");
      const person = people.find((candidate) => String(recordId(candidate)) === String(formData.person_id));
      const visitor = people.find((candidate) => String(recordId(candidate)) === String(formData.visited_by_id));
      const payload = {
        ...(mode === "create" ? { request_id: requestId } : {}),
        person_id: formData.person_id,
        person_visited_name: fullName(person || selectedPerson),
        visited_by_id: formData.visited_by_id,
        visited_by_name: fullName(visitor),
        visit_date: formData.visit_date,
        interaction_type: formData.interaction_type,
        purpose: formData.purpose,
        outcome: formData.outcome,
        follow_up_required: formData.follow_up_required,
        follow_up_date: formData.follow_up_required ? formData.follow_up_date : undefined,
        notes: formData.notes.trim(),
        ...(mode === "create" && task ? { source_task_id: task._id || task.id } : {}),
      };
      const result = mode === "edit"
        ? await service.update(visitation.id || visitation._id, payload)
        : await service.create(payload);
      if (result.error) throw result.error;
      onsave?.(result.data);
      isOpen = false;
    } catch (error) {
      errors.submit = error?.message || "Unable to save this care interaction";
    } finally {
      saving = false;
    }
  }
</script>

<Modal bind:isOpen title={modalTitle} size="lg" {...restProps}>
  <form
    class="space-y-6"
    onsubmit={(event) => {
      event.preventDefault();
      handleSubmit();
    }}
  >
    {#if errors.submit}
      <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
        {errors.submit}
      </div>
    {/if}

    {#if task}
      <div class="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p class="text-sm font-medium text-foreground">Completing a shared care task</p>
        <p class="mt-1 text-xs text-muted-foreground">
          Saving this interaction closes the task in Pastoral Care and Follow-Up CRM.
        </p>
      </div>
    {/if}

    <SearchableSelect
      label="Person who received care"
      options={personOptions}
      bind:value={formData.person_id}
      placeholder="Search people…"
      error={errors.person_id}
      required
      disabled={saving || Boolean(task)}
    />

    {#if selectedPerson}
      <div class="grid grid-cols-1 gap-3 rounded-xl border border-border bg-secondary/20 p-4 text-sm sm:grid-cols-3">
        <div>
          <span class="block text-xs text-muted-foreground">Status</span>
          <span class="font-medium capitalize text-foreground">{selectedPerson.member_status || "Unknown"}</span>
        </div>
        <div>
          <span class="block text-xs text-muted-foreground">Phone</span>
          <span class="font-medium text-foreground">{selectedPerson.phone || "Not recorded"}</span>
        </div>
        <div>
          <span class="block text-xs text-muted-foreground">Address</span>
          <span class="font-medium text-foreground">{selectedPerson.address || "Not recorded"}</span>
        </div>
      </div>
    {/if}

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <SearchableSelect
        label="Care leader"
        options={leaderOptions}
        bind:value={formData.visited_by_id}
        placeholder="Search leaders…"
        error={errors.visited_by_id}
        required
        disabled={saving}
      />
      <Input
        label="Interaction date"
        type="date"
        bind:value={formData.visit_date}
        error={errors.visit_date}
        required
        disabled={saving}
      />
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Select
        label="Care method"
        options={interactionOptions}
        bind:value={formData.interaction_type}
        disabled={saving}
      />
      <Select
        label="Purpose"
        options={purposeOptions}
        bind:value={formData.purpose}
        disabled={saving}
      />
    </div>

    <Select
      label="Outcome"
      options={outcomeOptions}
      bind:value={formData.outcome}
      error={errors.outcome}
      disabled={saving}
    />

    <div class="rounded-xl border border-border bg-secondary/20 p-4">
      <div class="grid grid-cols-1 items-end gap-4 md:grid-cols-2">
        <label class="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            bind:checked={formData.follow_up_required}
            disabled={saving || (mode === "edit" && visitation?.next_task?.status && visitation.next_task.status !== "open")}
            class="h-4 w-4 rounded border-border bg-input text-primary focus:ring-primary"
          />
          <span>
            <span class="block text-sm font-medium text-foreground">Create a next action</span>
            <span class="block text-xs text-muted-foreground">The new task will be visible across the care and CRM workspaces.</span>
          </span>
        </label>
        {#if formData.follow_up_required}
          <Input
            label="Next action due"
            type="date"
            bind:value={formData.follow_up_date}
            error={errors.follow_up_date}
            disabled={saving || (mode === "edit" && visitation?.next_task?.status && visitation.next_task.status !== "open")}
          />
        {/if}
      </div>
      {#if mode === "edit"}
        <p class="mt-3 text-xs text-muted-foreground">
          Corrections update open next actions. Completed or cancelled tasks stay closed; use a new care task for additional work.
        </p>
      {/if}
    </div>

    <div>
      <label for="care-notes" class="mb-2 block text-sm font-medium text-muted-foreground">Care notes</label>
      <textarea
        id="care-notes"
        rows="4"
        bind:value={formData.notes}
        disabled={saving}
        class="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder="Record the essential outcome, concerns and agreed next step."
      ></textarea>
      <p class="mt-1.5 text-xs text-muted-foreground">
        Care notes are restricted to accounts with confidential care access.
      </p>
    </div>
  </form>

  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isOpen = false)} disabled={saving}>Cancel</Button>
    <Button onclick={handleSubmit} disabled={saving} loading={saving}>
      {saving ? "Saving…" : mode === "edit" ? "Save changes" : task ? "Complete care task" : "Log care"}
    </Button>
  {/snippet}
</Modal>
