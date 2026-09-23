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
    buildGeocodingAddress,
    formatUkPostcode,
    geocodeAddress,
    isValidUkPostcode,
    searchAddressCandidates,
  } from "$lib/services/geocodingService.js";
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
    oncancel,
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
    is_tither: "",
    completed_schools: [],
  });

  let saving = $state(false);
  let errors = $state({});
  let duplicateCandidates = $state([]);
  let duplicateAcknowledged = $state(false);
  let checkingDuplicates = $state(false);
  let initialFormSnapshot = $state("");
  let initialAddressKey = $state("");
  let locatingAddress = $state(false);
  let locationMessage = $state("");
  let verifiedLocation = $state(null);
  let confirmingDiscard = $state(false);
  let showMoreDetails = $state(false);
  let addressSearchQuery = $state("");
  let addressSearchResults = $state([]);
  let searchingAddresses = $state(false);
  let addressSearchMessage = $state("");

  // Mode: 'create' or 'edit'
  const mode = $derived(person?.id || person?._id ? "edit" : "create");
  const modalTitle = $derived(
    mode === "edit" ? "Edit Person" : "Add New Person",
  );

  const currentAddressKey = $derived(buildGeocodingAddress(formData).toLowerCase());

  // Status options
  const statusOptions = [
    { value: "contact", label: "Outreach Contact" },
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

  // Entry point options (how pre-members first connected)
  const entryPointOptions = [
    { value: "", label: "Select..." },
    { value: "sunday_service", label: "Sunday Service" },
    { value: "bacenta_meeting", label: "Bacenta (Cell Group)" },
    { value: "evangelism", label: "Evangelism Outreach" },
    { value: "other", label: "Other" },
  ];

  // Leadership role options (for Leaders only)
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

  // Outreach contacts and guests both use the connection-source fields.
  const isPreMemberStatus = $derived(
    ["contact", "guest", "visitor"].includes(formData.member_status),
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
          is_tither: person.is_tither === true ? "yes" : person.is_tither === false ? "no" : "",
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
          is_tither: "",
          completed_schools: [],
        };
      }
      errors = {};
      showMoreDetails = Boolean(person);
      duplicateCandidates = [];
      duplicateAcknowledged = false;
      initialFormSnapshot = untrack(() => JSON.stringify(formData));
      initialAddressKey = untrack(() => buildGeocodingAddress(formData).toLowerCase());
      verifiedLocation = person && Number.isFinite(person.lat) && Number.isFinite(person.lng)
        ? { lat: person.lat, lng: person.lng, addressKey: initialAddressKey }
        : null;
      locatingAddress = false;
      locationMessage = "";
      confirmingDiscard = false;
      addressSearchQuery = untrack(() => buildGeocodingAddress(formData) || formData.address || "");
      addressSearchResults = [];
      searchingAddresses = false;
      addressSearchMessage = "";
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

    if (formData.zip_code && !isValidUkPostcode(formData.zip_code)) {
      newErrors.zip_code = "Enter a full UK postcode, for example LU3 1QQ";
    }

    errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  async function locateAddress() {
    errors = { ...errors, zip_code: undefined };
    locationMessage = "";
    verifiedLocation = null;
    if (!formData.address.trim()) {
      locationMessage = "Add the house number and street first.";
      return;
    }
    if (!formData.city.trim()) {
      locationMessage = "Add the town or city so the address can be identified.";
      return;
    }
    if (!isValidUkPostcode(formData.zip_code)) {
      errors = { ...errors, zip_code: "Enter a full UK postcode, for example LU3 1QQ" };
      locationMessage = "A full postcode gives the map a reliable location.";
      return;
    }

    formData.zip_code = formatUkPostcode(formData.zip_code);
    const addressKey = buildGeocodingAddress(formData).toLowerCase();
    locatingAddress = true;
    try {
      const location = await geocodeAddress(buildGeocodingAddress(formData));
      if (!location) {
        locationMessage = "That address could not be located. Check the street, town and postcode.";
        return;
      }
      verifiedLocation = { ...location, addressKey };
      locationMessage = `Map location found from ${formData.zip_code}. It will be saved with this person.`;
    } catch {
      locationMessage = "The map lookup is unavailable right now. You can still save the written address.";
    } finally {
      locatingAddress = false;
    }
  }

  async function searchAddresses() {
    const query = addressSearchQuery.trim();
    addressSearchResults = [];
    addressSearchMessage = "";
    if (query.length < 3) {
      addressSearchMessage = "Enter a street, town or postcode to search.";
      return;
    }

    searchingAddresses = true;
    try {
      addressSearchResults = await searchAddressCandidates(query);
      if (addressSearchResults.length) {
        const hasSuggestedCorrections = addressSearchResults.some((candidate) => candidate.source === "photon");
        addressSearchMessage = hasSuggestedCorrections
          ? `${addressSearchResults.length} possible ${addressSearchResults.length === 1 ? "address" : "addresses"} found, including close matches for possible spelling mistakes. Choose the correct one.`
          : `${addressSearchResults.length} possible ${addressSearchResults.length === 1 ? "address" : "addresses"} found. Choose the correct one.`;
      } else {
        addressSearchMessage = "No matching addresses were found. Try the street, town or postcode with less detail.";
      }
    } catch {
      addressSearchMessage = "Address search is unavailable right now. You can still enter the address manually.";
    } finally {
      searchingAddresses = false;
    }
  }

  function useAddressCandidate(candidate) {
    const searchedHouseNumber = addressSearchQuery.match(/^\s*(\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?)\b/)?.[1] || "";
    const candidateAddress = candidate.address || "";
    const shouldKeepSearchedHouseNumber = Boolean(
      searchedHouseNumber
      && candidate.matchType === "street"
      && !candidate.houseNumberVerified
      && candidateAddress
      && !new RegExp(`^${searchedHouseNumber}\\b`, "i").test(candidateAddress),
    );
    formData.address = shouldKeepSearchedHouseNumber
      ? `${searchedHouseNumber} ${candidateAddress}`
      : candidateAddress;
    formData.city = candidate.city || "";
    formData.state = candidate.state || "";
    formData.zip_code = formatUkPostcode(candidate.zip_code);
    const addressKey = buildGeocodingAddress(formData).toLowerCase();
    verifiedLocation = {
      lat: candidate.lat,
      lng: candidate.lng,
      addressKey,
      matchType: candidate.matchType,
      houseNumberVerified: candidate.houseNumberVerified,
    };
    locationMessage = candidate.houseNumberVerified
      ? "Address confirmed and map location verified. Save Changes to update this person."
      : candidate.matchType === "street"
        ? "Street location selected. The house number was kept from your search but was not verified by the map data. Save Changes if the written address is correct."
        : "Area location selected. The exact house was not verified by the map data. Check the written address before saving.";
    addressSearchQuery = buildGeocodingAddress(formData) || candidate.label;
    addressSearchResults = [];
    addressSearchMessage = candidate.source === "photon"
      ? "Suggested correction applied to the fields below. Check the house number before saving."
      : "Selected address applied to the fields below.";
    errors = { ...errors, zip_code: undefined };
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
      formData.zip_code = formatUkPostcode(formData.zip_code);
      const addressKey = buildGeocodingAddress(formData).toLowerCase();
      const addressChanged = addressKey !== initialAddressKey;
      const checkedCurrentAddress = verifiedLocation?.addressKey === addressKey;
      const payload = {
        ...formData,
        is_tither: formData.is_tither === "" ? null : formData.is_tither === "yes",
        surname_status: formData.last_name.trim() ? "known" : "missing",
        ...(checkedCurrentAddress
          ? { lat: verifiedLocation.lat, lng: verifiedLocation.lng }
          : addressChanged && mode === "edit"
            ? { lat: "", lng: "" }
            : {}),
      };
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
    if (JSON.stringify(formData) !== initialFormSnapshot) {
      confirmingDiscard = true;
      return;
    }
    isOpen = false;
    oncancel?.();
  }

  function discardChanges() {
    confirmingDiscard = false;
    isOpen = false;
    oncancel?.();
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

    {#if confirmingDiscard}
      <div class="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm" role="status">
        <strong class="text-foreground">Discard unsaved changes?</strong>
        <p class="mt-1 text-muted-foreground">Your edits to this person have not been saved.</p>
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

      {#if mode === "create"}
        <button
          type="button"
          class="text-sm font-medium text-primary hover:underline"
          aria-expanded={showMoreDetails}
          onclick={() => (showMoreDetails = !showMoreDetails)}
        >
          {showMoreDetails ? "Hide" : "Add"} optional profile details {showMoreDetails ? "↑" : "↓"}
        </button>
      {/if}

      {#if showMoreDetails}
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
      {/if}
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

      {#if showMoreDetails}<div class="space-y-4">
        <div class="rounded-lg border border-border/70 bg-secondary/20 p-4 space-y-3">
          <div>
            <label for="person-address-search" class="text-sm font-medium text-foreground">Search for the correct address</label>
            <p class="mt-1 text-xs text-muted-foreground">
              Search using whatever you know, such as a house number, street, town or postcode. Nothing is searched until you press Search addresses.
            </p>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row">
            <input
              id="person-address-search"
              class="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              type="search"
              bind:value={addressSearchQuery}
              placeholder="e.g. 86 St Catherines Ave Luton"
              disabled={saving || searchingAddresses}
              onkeydown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchAddresses();
                }
              }}
            />
            <Button type="button" variant="secondary" onclick={searchAddresses} disabled={saving || searchingAddresses}>
              {searchingAddresses ? "Searching…" : "Search addresses"}
            </Button>
          </div>
          {#if addressSearchMessage}
            <p class="text-xs text-muted-foreground" aria-live="polite">{addressSearchMessage}</p>
          {/if}
          {#if addressSearchResults.length}
            <div class="space-y-2" aria-label="Address search results">
              {#each addressSearchResults as candidate, index (`${candidate.label}-${index}`)}
                <div class="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-foreground">{candidate.label}</p>
                    <p class="mt-1 text-xs font-medium text-foreground/80">
                      {candidate.source === "photon" ? "Suggested correction · " : ""}{candidate.houseNumberVerified
                        ? "House number matched"
                        : candidate.matchType === "street"
                          ? "Street match — house number not verified"
                          : "Area match — exact house not verified"}
                    </p>
                    <p class="mt-1 text-xs text-muted-foreground">
                      {[candidate.address, candidate.city, candidate.zip_code].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Button type="button" size="sm" onclick={() => useAddressCandidate(candidate)} disabled={saving}>
                    Use this address
                  </Button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
        <Input
          label="House number & street"
          bind:value={formData.address}
          disabled={saving}
        />
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="col-span-2">
            <Input label="Town / City" bind:value={formData.city} disabled={saving} />
          </div>
          <Input label="County (optional)" bind:value={formData.state} disabled={saving} />
          <Input
            label="Postcode"
            bind:value={formData.zip_code}
            error={errors.zip_code}
            disabled={saving}
          />
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onclick={locateAddress} disabled={saving || locatingAddress}>
            {locatingAddress ? "Checking map location…" : "Check map location"}
          </Button>
          <p class="text-xs text-muted-foreground">
            Use a full postcode for reliable mapping. The lookup uses OpenStreetMap geocoding.
          </p>
        </div>
        {#if locationMessage}
          <p class="text-sm text-muted-foreground" aria-live="polite">{locationMessage}</p>
        {/if}
      </div>{/if}
    </div>

    <hr class="border-border" />

    <!-- Church journey and role section -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-foreground">Church status & roles</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableSelect
          label="Church status"
          bind:value={formData.member_status}
          options={statusOptions}
          disabled={saving}
        />
        {#if formData.member_status === "member" || formData.member_status === "leader"}
          <Input
            label="Membership Date"
            type="date"
            bind:value={formData.membership_date}
            disabled={saving}
          />
        {/if}
      </div>

      <p class="text-xs text-muted-foreground">
        Outreach Contact = collected through evangelism but has not attended yet. Guest = has attended but is not yet a member. Choose Member only when membership is confirmed. First timer is recorded on the person's first attendance, not as a permanent status.
      </p>

      {#if showMoreDetails}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableSelect
          label="Basonta Membership"
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

      <p class="text-xs text-muted-foreground">
        Basonta membership and group involvement are separate from leadership. Bacenta Leader and Basonta Leader are leadership roles.
      </p>

      {#if isPreMemberStatus}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchableSelect
            label="Connection Source (How did they find us?)"
            bind:value={formData.entry_point}
            options={entryPointOptions}
            disabled={saving}
          />
        </div>
      {/if}

      <!-- Basontas (Ministry Groups) -->
      <fieldset class="space-y-2">
        <legend class="block text-sm font-medium text-muted-foreground">
          Basonta / Ministry Groups
        </legend>
        <p class="text-xs text-muted-foreground">Groups this person belongs to. This does not change their church journey status or leadership role.</p>
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
        <div class="rounded-lg border border-border/60 bg-secondary/20 p-4">
          <label for="person-tither-status" class="block text-sm font-medium text-foreground">Manually recorded tither status</label>
          <p class="text-xs text-muted-foreground">A profile note, not evidence of giving. Dated records appear in Development.</p>
          <select id="person-tither-status" bind:value={formData.is_tither} disabled={saving} class="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="">Not recorded</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        {/if}
      </div>
      {/if}
    </div>

    {#if showMoreDetails}
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
    {/if}
  </form>

  {#snippet footer()}
    {#if confirmingDiscard}
      <Button variant="secondary" onclick={() => (confirmingDiscard = false)} disabled={saving}>
        Keep editing
      </Button>
      <Button variant="danger" onclick={discardChanges} disabled={saving}>
        Discard changes
      </Button>
    {:else}
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
    {/if}
  {/snippet}
</Modal>
