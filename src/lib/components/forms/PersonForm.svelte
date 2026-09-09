<!--
  PersonForm.svelte
  A form component for adding/editing people in the church tracker.
  
  Features:
  - Add new person or edit existing
  - Full validation
  - All fields from the people schema
  - Uses Svelte 5 runes syntax
-->

<script>
  import { session } from "$lib/auth/session.js";
  const confidential = $derived($session.status === "demo" || $session.user?.canViewConfidential === true);
  import { untrack } from "svelte";
  import {
    Modal,
    Button,
    Input,
    SearchableSelect,
  } from "$lib/components/ui";
  import * as peopleService from "$lib/services/peopleService";
  import {
    CHURCH_ROLE_OPTIONS,
    CHURCH_SCHOOL_OPTIONS,
    DEGREE_STATUS_OPTIONS,
    normalizeCompletedSchools,
  } from "$lib/utils/personMetrics.js";

  let {
    isOpen = $bindable(false),
    person = null, // null for create, object for edit
    onsave,
    ...restProps
  } = $props();

  // Form state
  let formData = $state({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    notes: "",
    date_of_birth: "",
    gender: "",
    marital_status: "",
    employment_status: "",
    degree_status: "",
    basontas: [],
    member_status: "guest",
    membership_date: "",
    entry_point: "",
    church_role: "no_role",
    role: "no_role",
    is_baptised: false,
    is_tither: false,
    completed_schools: [],
  });

  let saving = $state(false);
  let errors = $state({});
  let duplicateCandidates = $state([]);
  let duplicateAcknowledged = $state(false);
  let checkingDuplicates = $state(false);
  let initialFormSnapshot = $state("");

  // Mode: 'create' or 'edit'
  const mode = $derived(person?.id || person?._id ? "edit" : "create");
  const modalTitle = $derived(
    mode === "edit" ? "Edit Person" : "Add New Person",
  );

  // Status options
  const statusOptions = [
    { value: "guest", label: "Guest" },
    { value: "member", label: "Member" },
    { value: "leader", label: "Leader" },
    { value: "archived", label: "Archived" },
  ];

  // Gender options
  const genderOptions = [
    { value: "", label: "Select..." },
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
  ];

  // Marital status options
  const maritalStatusOptions = [
    { value: "", label: "Select..." },
    { value: "single", label: "Single" },
    { value: "married", label: "Married" },
    { value: "beloved", label: "Beloved" },
  ];

  // Employment status options
  const employmentStatusOptions = [
    { value: "", label: "Select..." },
    { value: "employed", label: "Employed" },
    { value: "unemployed", label: "Unemployed" },
    { value: "student", label: "Student" },
    { value: "retired", label: "Retired" },
    { value: "other", label: "Other" },
  ];

  // Basontas (ministry groups) options
  const basontasOptions = [
    { value: "worship", label: "Worship Team" },
    { value: "ushering", label: "Ushering" },
    { value: "media", label: "Media/Tech" },
    { value: "childrens", label: "Children's Ministry" },
    { value: "choir", label: "Choir" },
    { value: "dancing_stars", label: "Dancing Stars" },
  ];

  // Entry point options (how Guests first entered)
  const entryPointOptions = [
    { value: "", label: "Select..." },
    { value: "sunday_service", label: "Sunday Service" },
    { value: "bacenta_meeting", label: "Bacenta (Cell Group)" },
    { value: "evangelism", label: "Evangelism Outreach" },
    { value: "other", label: "Other" },
  ];

  // Role options (for Leaders only)
  const roleOptions = [
    { value: "no_role", label: "No Role" },
    { value: "basonta_leader", label: "Basonta Leader" },
    { value: "bacenta_leader", label: "Bacenta Leader" },
  ];

  const churchRoleOptions = [
    { value: "", label: "Select..." },
    ...CHURCH_ROLE_OPTIONS,
  ];

  const degreeStatusOptions = [
    { value: "", label: "Select..." },
    ...DEGREE_STATUS_OPTIONS,
  ];

  // Legacy visitor records are treated as guests until they are saved again.
  const isGuestStatus = $derived(
    formData.member_status === "guest" || formData.member_status === "visitor",
  );

  // Check if status is leader
  const isLeaderStatus = $derived(formData.member_status === "leader");

  // Initialize/reset form when person changes or modal opens
  $effect(() => {
    if (isOpen) {
      if (person) {
        formData = {
          first_name: person.first_name || "",
          last_name: person.last_name || "",
          email: person.email || "",
          phone: person.phone || "",
          address: person.address || "",
          city: person.city || "",
          state: person.state || "",
          zip_code: person.zip_code || "",
          notes: person.notes || "",
          date_of_birth: person.date_of_birth || person.birthday || "",
          gender: person.gender || "",
          marital_status: person.marital_status || "",
          employment_status: person.employment_status || "",
          degree_status: person.degree_status || "",
          basontas: person.basontas || [],
          member_status:
            person.member_status === "visitor"
              ? "guest"
              : person.member_status || "guest",
          membership_date: person.membership_date || "",
          entry_point: person.entry_point || "",
          church_role: person.church_role || "no_role",
          role: person.role || "no_role",
          is_baptised: person.is_baptised ?? false,
          is_tither: person.is_tither ?? false,
          completed_schools: normalizeCompletedSchools(
            person.completed_schools || [],
          ),
        };
      } else {
        formData = {
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          state: "",
          zip_code: "",
          notes: "",
          date_of_birth: "",
          gender: "",
          marital_status: "",
          employment_status: "",
          degree_status: "",
          basontas: [],
          member_status: "guest",
          membership_date: "",
          entry_point: "",
          church_role: "no_role",
          role: "no_role",
          is_baptised: false,
          is_tither: false,
          completed_schools: [],
        };
      }
      errors = {};
      duplicateCandidates = [];
      duplicateAcknowledged = false;
      initialFormSnapshot = untrack(() => JSON.stringify(formData));
    }
  });

  // Validate form
  function validate() {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  // Handle form submission
  async function handleSubmit() {
    if (!validate()) return;
    errors = {};

    if (!duplicateAcknowledged) {
      checkingDuplicates = true;
      const duplicateResult = await peopleService.findDuplicates({
        email: formData.email,
        phone: formData.phone,
        excludeId: person?.id || person?._id,
      });
      checkingDuplicates = false;
      if (duplicateResult.error) {
        errors.submit = "We could not check for duplicate contact details. Please try again.";
        return;
      }
      if (duplicateResult.data?.length) {
        duplicateCandidates = duplicateResult.data;
        return;
      }
    }

    saving = true;

    try {
      let result;
      const payload = { ...formData, surname_status: formData.last_name.trim() ? "known" : "missing" };
      if (!confidential) { delete payload.is_tither; delete payload.notes; }
      if (mode === "edit") {
        result = await peopleService.update(person.id || person._id, payload);
      } else {
        result = await peopleService.create(payload);
      }

      if (result.error) {
        errors.submit = result.error.message || "Failed to save person";
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
    if (JSON.stringify(formData) !== initialFormSnapshot && !window.confirm("Discard unsaved person changes?")) return;
    isOpen = false;
  }
</script>

<Modal bind:isOpen title={modalTitle} size="lg" closable={false} closeOnBackdrop={false} closeOnEscape={false} {...restProps}>
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

    {#if duplicateCandidates.length > 0}
      <section
        class="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm"
        aria-live="polite"
      >
        <h3 class="font-semibold text-foreground">Possible duplicate record</h3>
        <p class="mt-1 text-muted-foreground">
          A matching email address or phone number already belongs to:
        </p>
        <ul class="mt-2 space-y-1 text-foreground">
          {#each duplicateCandidates as candidate}
            <li>
              <a class="underline hover:text-primary" href={`/people/${candidate.id}`}>
                {candidate.first_name} {candidate.last_name}
              </a>
              <span class="text-muted-foreground"> — matching {candidate.matching_fields.join(" and ")}</span>
            </li>
          {/each}
        </ul>
        <p class="mt-3 text-muted-foreground">
          Review the existing record before saving. Records are never merged automatically.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onclick={() => {
              duplicateCandidates = [];
              duplicateAcknowledged = false;
            }}
            disabled={saving}
          >
            Edit details
          </Button>
          <Button
            onclick={() => {
              duplicateAcknowledged = true;
              handleSubmit();
            }}
            disabled={saving}
          >
            Save as separate person
          </Button>
        </div>
      </section>
    {/if}

    <!-- Personal Information Section -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-foreground">Personal Information</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="First Name"
          bind:value={formData.first_name}
          error={errors.first_name}
          required
          disabled={saving}
        />
        <Input
          label="Last Name (if known)"
          bind:value={formData.last_name}
          error={errors.last_name}
          disabled={saving}
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Date of Birth"
          type="date"
          bind:value={formData.date_of_birth}
          disabled={saving}
        />
        <SearchableSelect
          label="Employment Status"
          bind:value={formData.employment_status}
          options={employmentStatusOptions}
          disabled={saving}
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableSelect
          label="Gender"
          bind:value={formData.gender}
          options={genderOptions}
          disabled={saving}
        />
        <SearchableSelect
          label="Marital Status"
          bind:value={formData.marital_status}
          options={maritalStatusOptions}
          disabled={saving}
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableSelect
          label="Degree Status"
          bind:value={formData.degree_status}
          options={degreeStatusOptions}
          disabled={saving}
        />
      </div>
    </div>

    <hr class="border-border" />

    <!-- Contact Details Section -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-foreground">Contact Details</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Email"
          type="email"
          bind:value={formData.email}
          error={errors.email}
          disabled={saving}
        />
        <Input
          label="Phone"
          type="tel"
          bind:value={formData.phone}
          disabled={saving}
        />
      </div>

      <div class="space-y-4">
        <Input
          label="Address"
          bind:value={formData.address}
          disabled={saving}
        />
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="col-span-2">
            <Input label="City" bind:value={formData.city} disabled={saving} />
          </div>
          <Input label="State" bind:value={formData.state} disabled={saving} />
          <Input
            label="Zip Code"
            bind:value={formData.zip_code}
            disabled={saving}
          />
        </div>
      </div>
    </div>

    <hr class="border-border" />

    <!-- Church Status Section -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-foreground">Church Status</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableSelect
          label="Member Status"
          bind:value={formData.member_status}
          options={statusOptions}
          disabled={saving}
        />
        <Input
          label="Membership Date"
          type="date"
          bind:value={formData.membership_date}
          disabled={saving}
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableSelect
          label="Church Role"
          bind:value={formData.church_role}
          options={churchRoleOptions}
          disabled={saving}
        />
        {#if isLeaderStatus}
          <SearchableSelect
            label="Leadership Role"
            bind:value={formData.role}
            options={roleOptions}
            disabled={saving}
          />
        {/if}
      </div>

      {#if isGuestStatus}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchableSelect
            label="Entry Point (How did they find us?)"
            bind:value={formData.entry_point}
            options={entryPointOptions}
            disabled={saving}
          />
        </div>
      {/if}

      <!-- Basontas (Ministry Groups) -->
      <fieldset class="space-y-2">
        <legend class="block text-sm font-medium text-muted-foreground">
          Basontas (Ministry Groups)
        </legend>
        <div class="flex flex-wrap gap-2">
          {#each basontasOptions as option}
            <button
              type="button"
              aria-pressed={formData.basontas.includes(option.value)}
              onclick={() => {
                if (formData.basontas.includes(option.value)) {
                  formData.basontas = formData.basontas.filter(
                    (b) => b !== option.value,
                  );
                } else {
                  formData.basontas = [...formData.basontas, option.value];
                }
              }}
              disabled={saving}
              class="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                     {formData.basontas.includes(option.value)
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/50'}
                     disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {option.label}
            </button>
          {/each}
        </div>
        {#if formData.basontas.length > 0}
          <p class="text-xs text-muted-foreground">
            {formData.basontas.length} selected
          </p>
        {/if}
      </fieldset>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label
          class="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border/60 bg-secondary/20 p-4"
        >
          <span>
            <span class="block text-sm font-medium text-foreground">Baptised</span>
            <span class="block text-xs text-muted-foreground">Has completed water baptism</span>
          </span>
          <input
            type="checkbox"
            bind:checked={formData.is_baptised}
            disabled={saving}
            class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
        </label>
        {#if confidential}
        <label
          class="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border/60 bg-secondary/20 p-4"
        >
          <span>
            <span class="block text-sm font-medium text-foreground">Tithe Payer</span>
            <span class="block text-xs text-muted-foreground">Restricted stewardship information</span>
          </span>
          <input
            type="checkbox"
            bind:checked={formData.is_tither}
            disabled={saving}
            class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
        </label>
        {/if}
      </div>
    </div>

    <hr class="border-border" />

    <fieldset class="space-y-4">
      <legend class="text-lg font-medium text-foreground">Church Schools Completed</legend>
      <p class="text-sm text-muted-foreground">
        Select each church class or exam this person has completed.
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        {#each CHURCH_SCHOOL_OPTIONS as school}
          <button
            type="button"
            aria-pressed={formData.completed_schools.includes(school.value)}
            onclick={() => {
              if (formData.completed_schools.includes(school.value)) {
                formData.completed_schools = formData.completed_schools.filter(
                  (value) => value !== school.value,
                );
              } else {
                formData.completed_schools = [
                  ...formData.completed_schools,
                  school.value,
                ];
              }
            }}
            disabled={saving}
            class="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors
                   {formData.completed_schools.includes(school.value)
              ? 'border-primary/60 bg-primary/10 text-foreground'
              : 'border-border/60 bg-card text-muted-foreground hover:bg-secondary/40 hover:text-foreground'}
                   disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span class="font-medium">{school.label}</span>
            <span
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border
                     {formData.completed_schools.includes(school.value)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border'}"
              aria-hidden="true"
            >
              {#if formData.completed_schools.includes(school.value)}✓{/if}
            </span>
          </button>
        {/each}
      </div>
      <p class="text-xs text-muted-foreground">
        {formData.completed_schools.length} of {CHURCH_SCHOOL_OPTIONS.length} completed
      </p>
    </fieldset>
    <hr class="border-border" />
    {#if confidential}<div class="space-y-2">
      <label for="person-notes" class="text-sm font-medium text-foreground">Notes</label>
      <textarea id="person-notes" bind:value={formData.notes} disabled={saving} rows="4" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" placeholder="Add useful background information"></textarea>
    </div>{/if}
  </form>

  {#snippet footer()}
    <Button variant="secondary" onclick={handleClose} disabled={saving}>
      Cancel
    </Button>
    <Button onclick={handleSubmit} disabled={saving || checkingDuplicates}>
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
      {:else if checkingDuplicates}
        Checking contact details...
      {:else}
        {mode === "edit" ? "Save Changes" : "Add Person"}
      {/if}
    </Button>
  {/snippet}
</Modal>
