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
  import {
    Modal,
    Button,
    Input,
    Select,
    SearchableSelect,
  } from "$lib/components/ui";
  import * as peopleService from "$lib/services/peopleService";

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
    date_of_birth: "",
    gender: "",
    marital_status: "",
    member_status: "visitor",
    membership_date: "",
    notes: "",
  });

  let saving = $state(false);
  let errors = $state({});

  // Mode: 'create' or 'edit'
  const mode = $derived(person?.id ? "edit" : "create");
  const modalTitle = $derived(
    mode === "edit" ? "Edit Person" : "Add New Person",
  );

  // Status options
  const statusOptions = [
    { value: "visitor", label: "Visitor" },
    { value: "member", label: "Member" },
    { value: "leader", label: "Leader" },
    { value: "archived", label: "Archived" },
  ];

  // Gender options
  const genderOptions = [
    { value: "", label: "Select..." },
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "prefer_not_to_say", label: "Prefer not to say" },
  ];

  // Marital status options
  const maritalStatusOptions = [
    { value: "", label: "Select..." },
    { value: "single", label: "Single" },
    { value: "married", label: "Married" },
    { value: "beloved", label: "Beloved" },
  ];

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
          date_of_birth: person.date_of_birth || "",
          gender: person.gender || "",
          marital_status: person.marital_status || "",
          member_status: person.member_status || "visitor",
          membership_date: person.membership_date || "",
          notes: person.notes || "",
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
          date_of_birth: "",
          gender: "",
          marital_status: "",
          member_status: "visitor",
          membership_date: "",
          notes: "",
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

    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
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

    saving = true;
    errors = {};

    try {
      // Clean up empty strings to null
      const cleanData = { ...formData };
      Object.keys(cleanData).forEach((key) => {
        if (cleanData[key] === "") {
          cleanData[key] = null;
        }
      });

      let result;
      if (mode === "edit") {
        result = await peopleService.update(person.id, cleanData);
      } else {
        result = await peopleService.create(cleanData);
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
          label="Last Name"
          bind:value={formData.last_name}
          error={errors.last_name}
          required
          disabled={saving}
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Date of Birth"
          type="date"
          bind:value={formData.date_of_birth}
          disabled={saving}
        />
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
    </div>

    <hr class="border-border" />

    <!-- Notes Section -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-foreground">Notes</h3>

      <div>
        <label
          for="notes"
          class="block text-sm font-medium text-muted-foreground mb-2"
        >
          Additional Information
        </label>
        <textarea
          id="notes"
          bind:value={formData.notes}
          rows="3"
          disabled={saving}
          class="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground
                 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary
                 focus:ring-1 focus:ring-primary transition-premium resize-none"
          placeholder="Add any notes about this person..."
        ></textarea>
      </div>
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
        {mode === "edit" ? "Save Changes" : "Add Person"}
      {/if}
    </Button>
  {/snippet}
</Modal>
