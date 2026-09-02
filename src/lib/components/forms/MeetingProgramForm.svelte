<script>
  import { Modal, Button, Input, SearchableSelect } from "$lib/components/ui";
  import * as meetingProgramsService from "$lib/services/meetingProgramsService";

  let {
    isOpen = $bindable(false),
    program = null,
    people = [],
    onsave,
  } = $props();

  const typeOptions = [
    { value: "bacenta", label: "Bacenta" },
    { value: "flow_service", label: "Flow Service" },
    { value: "acts_prayer", label: "Acts Prayer" },
    { value: "shemen_prayer", label: "Shemen Prayer" },
    { value: "workers_meeting", label: "Workers Meeting" },
    { value: "other", label: "Other meeting" },
  ];
  const dayOptions = [
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
    { value: "sunday", label: "Sunday" },
  ];
  const formatOptions = [
    { value: "in_person", label: "In person" },
    { value: "online", label: "Online" },
    { value: "hybrid", label: "Hybrid" },
  ];

  let formData = $state({
    name: "",
    meeting_type: "bacenta",
    category: "bacenta",
    description: "",
    default_day: "",
    default_start_time: "",
    default_end_time: "",
    default_format: "in_person",
    default_location: "",
    online_url: "",
    active: true,
  });
  let leaderIds = $state(new Set());
  let memberIds = $state(new Set());
  let peopleSearch = $state("");
  let saving = $state(false);
  let errors = $state({});

  const activePeople = $derived(
    people.filter((person) => person.member_status !== "archived"),
  );
  const leaderChoices = $derived(
    activePeople.filter(
      (person) =>
        person.member_status === "leader" ||
        person.role?.includes("leader") ||
        leaderIds.has(person.id),
    ),
  );
  const filteredPeople = $derived(() => {
    const query = peopleSearch.trim().toLowerCase();
    if (!query) return activePeople;
    return activePeople.filter((person) =>
      `${person.first_name} ${person.last_name}`.toLowerCase().includes(query),
    );
  });
  const showRoster = $derived(
    formData.category === "bacenta" || formData.category === "workers",
  );

  $effect(() => {
    if (!isOpen) return;
    formData = {
      name: program?.name || "",
      meeting_type: program?.meeting_type || "bacenta",
      category: program?.category || "bacenta",
      description: program?.description || "",
      default_day: program?.default_day || "",
      default_start_time: program?.default_start_time || "",
      default_end_time: program?.default_end_time || "",
      default_format: program?.default_format || "in_person",
      default_location: program?.default_location || "",
      online_url: program?.online_url || "",
      active: program?.active ?? true,
    };
    leaderIds = new Set(program?.leader_ids || []);
    memberIds = new Set(program?.member_ids || []);
    peopleSearch = "";
    errors = {};
  });

  function setType(value) {
    formData.meeting_type = value;
    formData.category =
      value === "bacenta"
        ? "bacenta"
        : value === "workers_meeting"
          ? "workers"
          : value === "other"
            ? "other"
            : "prayer";
  }

  function toggleLeader(personId) {
    const next = new Set(leaderIds);
    next.has(personId) ? next.delete(personId) : next.add(personId);
    leaderIds = next;
  }

  function toggleMember(personId) {
    const next = new Set(memberIds);
    next.has(personId) ? next.delete(personId) : next.add(personId);
    memberIds = next;
  }

  async function handleSubmit() {
    const nextErrors = {};
    if (!formData.name?.trim()) nextErrors.name = "Programme name is required";
    if (!formData.meeting_type) nextErrors.meeting_type = "Meeting type is required";
    errors = nextErrors;
    if (Object.keys(nextErrors).length) return;

    saving = true;
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        leader_ids: Array.from(leaderIds),
        member_ids: showRoster ? Array.from(memberIds) : [],
      };
      const result = program?.id
        ? await meetingProgramsService.update(program.id, payload)
        : await meetingProgramsService.create(payload);
      if (result.error) throw result.error;
      await onsave?.(result.data);
      isOpen = false;
    } catch (error) {
      errors = { submit: error.message || "Could not save this programme" };
    } finally {
      saving = false;
    }
  }
</script>

<Modal
  bind:isOpen
  title={program?.id ? "Edit meeting programme" : "Add meeting programme"}
  size="xl"
>
  <form
    class="space-y-6"
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

    <div class="rounded-xl border border-border bg-secondary/15 p-4">
      <h3 class="font-semibold text-foreground">Programme details</h3>
      <p class="mt-1 text-sm text-muted-foreground">
        These defaults are reused whenever attendance is recorded.
      </p>
      <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          label="Programme name"
          bind:value={formData.name}
          error={errors.name}
          required
        />
        <SearchableSelect
          label="Meeting type"
          value={formData.meeting_type}
          options={typeOptions}
          error={errors.meeting_type}
          onchange={({ value }) => setType(value)}
        />
        <SearchableSelect
          label="Usual day"
          bind:value={formData.default_day}
          options={dayOptions}
          placeholder="No fixed day"
        />
        <SearchableSelect
          label="Format"
          bind:value={formData.default_format}
          options={formatOptions}
        />
        <Input
          label="Usual start time"
          type="time"
          bind:value={formData.default_start_time}
        />
        <Input
          label="Usual end time"
          type="time"
          bind:value={formData.default_end_time}
        />
        <Input
          label="Location"
          bind:value={formData.default_location}
          placeholder={formData.default_format === "online" ? "e.g. YouTube" : "e.g. Coffee shop"}
        />
        {#if formData.default_format !== "in_person"}
          <Input
            label="Online link"
            type="url"
            bind:value={formData.online_url}
            placeholder="https://..."
          />
        {/if}
      </div>
      <div class="mt-4">
        <label for="program-description" class="mb-1.5 block text-sm font-medium text-foreground">
          Description
        </label>
        <textarea
          id="program-description"
          bind:value={formData.description}
          rows="2"
          class="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="What is this meeting for?"
        ></textarea>
      </div>
    </div>

    <div class="rounded-xl border border-border p-4">
      <h3 class="font-semibold text-foreground">Leaders</h3>
      <p class="mt-1 text-sm text-muted-foreground">
        Select one or more leaders. The first selected leader is treated as primary.
      </p>
      {#if leaderChoices.length === 0}
        <p class="mt-4 rounded-lg bg-secondary/40 p-3 text-sm text-muted-foreground">
          No people are currently marked as leaders in the directory.
        </p>
      {:else}
        <div class="mt-4 grid max-h-44 grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
          {#each leaderChoices as person}
            <label class="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-secondary/30">
              <input
                type="checkbox"
                checked={leaderIds.has(person.id)}
                onchange={() => toggleLeader(person.id)}
                class="h-4 w-4 rounded border-border accent-primary"
              />
              <span class="text-sm font-medium text-foreground">
                {person.first_name} {person.last_name}
              </span>
            </label>
          {/each}
        </div>
      {/if}
    </div>

    {#if showRoster}
      <div class="rounded-xl border border-border p-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="font-semibold text-foreground">Usual roster</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              A roster is the expected group for this programme. Members appear first when taking attendance, but are only counted when marked present.
            </p>
          </div>
          <div class="w-full sm:w-56">
            <Input label="" bind:value={peopleSearch} placeholder="Search people..." />
          </div>
        </div>
        <div class="mt-4 grid max-h-64 grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
          {#each filteredPeople() as person}
            <label class="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-secondary/30">
              <input
                type="checkbox"
                checked={memberIds.has(person.id)}
                onchange={() => toggleMember(person.id)}
                class="h-4 w-4 rounded border-border accent-primary"
              />
              <span class="min-w-0 text-sm text-foreground">
                <span class="block truncate font-medium">{person.first_name} {person.last_name}</span>
                <span class="text-xs capitalize text-muted-foreground">{person.member_status}</span>
              </span>
            </label>
          {/each}
        </div>
        <p class="mt-3 text-xs text-muted-foreground">{memberIds.size} people on this roster</p>
      </div>
    {/if}

    <div class="flex justify-end gap-3 border-t border-border pt-4">
      <Button variant="secondary" onclick={() => (isOpen = false)} disabled={saving}>
        Cancel
      </Button>
      <Button type="submit" loading={saving}>
        {program?.id ? "Save changes" : "Create programme"}
      </Button>
    </div>
  </form>
</Modal>
