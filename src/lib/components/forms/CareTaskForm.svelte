<script>
  import { Modal, Button, Input, Select, SearchableSelect } from "$lib/components/ui";
  import { createTask } from "$lib/services/followUpCrmService.js";
  import { fullName, localDate, recordId } from "$lib/utils/pastoralCare.js";

  let {
    isOpen = $bindable(false),
    people = [],
    initialCandidate = null,
    initialPersonId = "",
    onsave = null,
  } = $props();

  let saving = $state(false);
  let errors = $state({});
  let formData = $state({
    person_id: "",
    assigned_leader_id: "",
    due_date: "",
    priority: "normal",
    reason: "Pastoral care visit",
  });

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

  const priorityOptions = [
    { value: "urgent", label: "Urgent" },
    { value: "high", label: "High" },
    { value: "normal", label: "Normal" },
    { value: "low", label: "Low" },
  ];

  function addDays(value, amount) {
    const date = new Date(`${value}T00:00:00`);
    date.setDate(date.getDate() + amount);
    return localDate(date);
  }

  $effect(() => {
    if (!isOpen) return;
    formData = {
      person_id: initialCandidate?.person_id || initialPersonId || "",
      assigned_leader_id: initialCandidate?.assigned_leader_id || "",
      due_date: addDays(localDate(), 2),
      priority: initialCandidate?.priority || "normal",
      reason: initialCandidate?.reason || "Pastoral care visit",
    };
    errors = {};
  });

  function validate() {
    const nextErrors = {};
    if (!formData.person_id) nextErrors.person_id = "Choose the person who needs care";
    if (!formData.assigned_leader_id) nextErrors.assigned_leader_id = "Assign a care leader";
    if (!formData.due_date) nextErrors.due_date = "Choose when this should happen";
    errors = nextErrors;
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    saving = true;
    errors = {};
    try {
      const result = await createTask({
        personId: formData.person_id,
        assignedLeaderId: formData.assigned_leader_id,
        dueDate: formData.due_date,
        taskType: "visitation",
        priority: formData.priority,
        reason: formData.reason.trim() || "Pastoral care visit",
      });
      if (result.error) throw result.error;
      onsave?.(result.data);
      isOpen = false;
    } catch (error) {
      errors.submit = error?.message || "Unable to schedule this care visit";
    } finally {
      saving = false;
    }
  }
</script>

<Modal bind:isOpen title="Schedule Pastoral Care" size="lg">
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

    <div class="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p class="text-sm font-medium text-foreground">Create one shared care task</p>
      <p class="mt-1 text-xs text-muted-foreground">
        It will appear here, in Follow-Up CRM, and on the person’s profile.
      </p>
    </div>

    <SearchableSelect
      label="Person needing care"
      options={personOptions}
      bind:value={formData.person_id}
      placeholder="Search people…"
      error={errors.person_id}
      required
      disabled={saving}
    />

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <SearchableSelect
        label="Assigned care leader"
        options={leaderOptions}
        bind:value={formData.assigned_leader_id}
        placeholder="Search leaders…"
        error={errors.assigned_leader_id}
        required
        disabled={saving}
      />
      <Input
        label="Due date"
        type="date"
        bind:value={formData.due_date}
        error={errors.due_date}
        required
        disabled={saving}
      />
    </div>

    <Select
      label="Priority"
      options={priorityOptions}
      bind:value={formData.priority}
      disabled={saving}
    />

    <div>
      <label for="care-task-reason" class="mb-2 block text-sm font-medium text-muted-foreground">
        Reason for care
      </label>
      <textarea
        id="care-task-reason"
        rows="3"
        bind:value={formData.reason}
        disabled={saving}
        class="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder="Why is this person being scheduled for care?"
      ></textarea>
    </div>
  </form>

  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isOpen = false)} disabled={saving}>Cancel</Button>
    <Button onclick={handleSubmit} disabled={saving} loading={saving}>
      {saving ? "Scheduling…" : "Schedule care"}
    </Button>
  {/snippet}
</Modal>
