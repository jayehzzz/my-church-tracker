# 📝 Form Components

> **Complete guide to data entry forms - their fields, validation, and behavior.**

---

## Overview

Form components live in `src/lib/components/forms/` and handle all data entry in the application. Each form is designed for a specific entity type with appropriate fields and validation.

### Form Index

| Component | Purpose | Used For |
|-----------|---------|----------|
| `PersonForm.svelte` | Add/edit people | Members, guests, leaders |
| `ServiceForm.svelte` | Add/edit services | Church services |
| `EvangelismContactForm.svelte` | Add/edit contacts | Evangelism outreach |
| `MeetingForm.svelte` | Add/edit meetings | Prayer, cell groups |
| `VisitationForm.svelte` | Add/edit visitations | Home visits |

---

## 👤 PersonForm.svelte

**Location**: `src/lib/components/forms/PersonForm.svelte`

**Purpose**: Form for adding and editing people (members, guests, leaders).

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `person` | object | Existing person data (for edit mode) |
| `mode` | string | `'create'` or `'edit'` |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `on:submit` | `{ data }` | Form was successfully submitted |
| `on:cancel` | - | User cancelled |

### Form Fields

#### Identity Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| First Name | text | ✅ | Person's first/given name |
| Last Name | text | ✅ | Person's surname |
| Preferred Name | text | ❌ | Nickname if different |
| Email | email | ❌ | Contact email address |
| Phone | tel | ❌ | Contact phone number |
| Address | textarea | ❌ | Full address for mapping |
| Birthday | date | ❌ | Date of birth |

#### Status Section

| Field | Type | Required | Options |
|-------|------|----------|---------|
| Member Status | select | ✅ | Guest, Member, Leader, Archived |
| Role | select | ❌ | No Role, Basonta Leader, Bacenta Leader, Basonta Worker |
| Activity Status | select | ❌ | Regular, Irregular, Dormant |

#### Spiritual Journey Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| First Visit Date | date | ❌ | When they first attended |
| Membership Date | date | ❌ | When they became a member |
| Is Baptised | checkbox | ❌ | Have they been baptized? |
| Is Tither | checkbox | ❌ | Do they regularly tithe? |

### Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| First Name | Required, min 2 chars | "First name is required" |
| Last Name | Required, min 2 chars | "Last name is required" |
| Email | Valid email format | "Please enter a valid email" |
| Phone | Valid phone format | "Please enter a valid phone number" |
| Member Status | Required | "Please select a status" |
| Membership Date | Must be after First Visit | "Membership date must be after first visit" |

### Usage Example

```svelte
<script>
  import PersonForm from '$lib/components/forms/PersonForm.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import { create, update } from '$lib/services/peopleService';
  
  let showForm = false;
  let editingPerson = null;
  
  async function handleSubmit(event) {
    const { data } = event.detail;
    
    if (editingPerson) {
      await update(editingPerson.id, data);
    } else {
      await create(data);
    }
    
    showForm = false;
    refreshList();
  }
</script>

<Modal bind:open={showForm} title={editingPerson ? 'Edit Person' : 'Add Person'}>
  <PersonForm 
    person={editingPerson}
    mode={editingPerson ? 'edit' : 'create'}
    on:submit={handleSubmit}
    on:cancel={() => showForm = false}
  />
</Modal>
```

### Form Behavior

1. **Create Mode**: All fields empty, Member Status defaults to "Guest"
2. **Edit Mode**: Fields pre-populated with existing data
3. **Dependent Fields**: Role field only shows when Status is "Member" or "Leader"
4. **Date Validation**: System prevents illogical dates (e.g., membership before first visit)

---

## ⛪ ServiceForm.svelte

**Location**: `src/lib/components/forms/ServiceForm.svelte`

**Purpose**: Form for adding and editing church service records.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `service` | object | Existing service data (for edit mode) |
| `mode` | string | `'create'` or `'edit'` |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `on:submit` | `{ data }` | Form was successfully submitted |
| `on:cancel` | - | User cancelled |

### Form Fields

#### Service Details Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Service Date | date | ✅ | Date the service occurred |
| Service Type | select | ✅ | Sunday Service, Special Service |
| Service Time | time | ❌ | When the service started |
| Location | text | ❌ | Where service was held |

#### Sermon Details Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Sermon Topic | text | ❌ | Title of the sermon |
| Sermon Speaker | text | ❌ | Name of the preacher |

#### Attendance Metrics Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Total Attendance | number | ❌ | Number of people present |
| Guests Count | number | ❌ | Number of first-time visitors |
| Salvation Decisions | number | ❌ | Number of faith decisions |
| Tithers Count | number | ❌ | Number of people who gave |

#### Individual Attendees Section

| Field | Type | Description |
|-------|------|-------------|
| Attendees | multi-select | Select individuals who attended |

### Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Service Date | Required | "Service date is required" |
| Service Type | Required | "Please select a service type" |
| Total Attendance | Must be ≥ 0 | "Attendance cannot be negative" |
| Guests Count | Must be ≤ Total | "Guests cannot exceed total attendance" |

### Usage Example

```svelte
<script>
  import ServiceForm from '$lib/components/forms/ServiceForm.svelte';
  import { create } from '$lib/services/servicesService';
  
  async function handleSubmit(event) {
    const { data } = event.detail;
    await create(data);
    showSuccess('Service recorded!');
  }
</script>

<ServiceForm 
  mode="create"
  on:submit={handleSubmit}
  on:cancel={goBack}
/>
```

### Special Features

1. **Attendee Selector**: Searchable multi-select to pick individual attendees
2. **Auto-Calculate**: Can calculate totals from individual selections
3. **Date Default**: Defaults to last Sunday for new services
4. **Quick Templates**: Preset for regular Sunday service values

---

## 🌱 EvangelismContactForm.svelte

**Location**: `src/lib/components/forms/EvangelismContactForm.svelte`

**Purpose**: Form for adding and editing evangelism/outreach contacts.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `contact` | object | Existing contact data (for edit mode) |
| `mode` | string | `'create'` or `'edit'` |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `on:submit` | `{ data }` | Form was submitted |
| `on:cancel` | - | User cancelled |
| `on:convert` | `{ id }` | Convert to member requested |

### Form Fields

#### Contact Information Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| First Name | text | ✅ | Contact's first name |
| Last Name | text | ✅ | Contact's surname |
| Phone | tel | ❌ | Phone number |
| Email | email | ❌ | Email address |
| Address | textarea | ❌ | Home address |

#### Outreach Details Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Contact Date | date | ✅ | When they were first contacted |
| Invited By | select | ❌ | Who brought them (from people list) |
| Contact Category | select | ✅ | Response category |

**Contact Category Options**:
| Value | Label | Description |
|-------|-------|-------------|
| `responsive` | Responsive | Interested and engaging |
| `non_responsive` | Non-Responsive | Not interested |
| `events_only` | Events Only | Only interested in special events |
| `do_not_contact` | Do Not Contact | Asked not to be contacted |
| `has_church` | Has Church | Already attends another church |

#### Follow-up Section

| Field | Type | Description |
|-------|------|-------------|
| Follow-up Notes | textarea | Notes about follow-up needed |
| Follow-up Date | date | When to follow up |

### Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| First Name | Required | "First name is required" |
| Last Name | Required | "Last name is required" |
| Contact Date | Required | "Contact date is required" |
| Contact Category | Required | "Please select a response category" |

### Usage Example

```svelte
<script>
  import EvangelismContactForm from '$lib/components/forms/EvangelismContactForm.svelte';
  import { create } from '$lib/services/evangelismService';
  
  async function handleSubmit(event) {
    const { data } = event.detail;
    await create({
      ...data,
      member_status: 'guest'  // All contacts start as guests
    });
  }
</script>

<EvangelismContactForm 
  mode="create"
  on:submit={handleSubmit}
  on:cancel={close}
/>
```

### Special Features

1. **Inviter Lookup**: Searchable dropdown to find the person who invited them
2. **Quick Status**: One-click response category selection
3. **Follow-up Reminder**: Option to set follow-up date with reminder
4. **Convert Action**: Button to convert contact to member (changes member_status)

---

## 🙏 MeetingForm.svelte

**Location**: `src/lib/components/forms/MeetingForm.svelte`

**Purpose**: Form for adding and editing prayer meetings and group gatherings.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `meeting` | object | Existing meeting data (for edit mode) |
| `mode` | string | `'create'` or `'edit'` |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `on:submit` | `{ data }` | Form was submitted |
| `on:cancel` | - | User cancelled |

### Form Fields

#### Meeting Details Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Meeting Date | date | ✅ | When the meeting occurred |
| Meeting Type | select | ✅ | Type of meeting |
| Start Time | time | ❌ | When meeting started |
| End Time | time | ❌ | When meeting ended |
| Location | text | ❌ | Where meeting was held |

**Meeting Type Options**:
| Value | Label | Description |
|-------|-------|-------------|
| `bacenta` | Bacenta | Cell group / Home fellowship |
| `flow_prayer` | Flow Prayer | Regular prayer session |
| `all_night_prayer` | All-Night Prayer | Overnight prayer meeting |
| `basonta` | Basonta | Smaller unit meeting |
| `sat` | SAT Meeting | Saturday meeting |
| `farley_prayer` | Farley Prayer | Farley prayer meeting |

#### Attendance Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Attendance Count | number | ❌ | Total people present |
| Leaders Count | number | ❌ | Number of leaders present |
| Leader | select | ❌ | Who led the meeting |

#### Notes Section

| Field | Type | Description |
|-------|------|-------------|
| Notes | textarea | Meeting highlights, prayer points, etc. |

### Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Meeting Date | Required | "Meeting date is required" |
| Meeting Type | Required | "Please select a meeting type" |
| End Time | Must be after Start | "End time must be after start time" |
| Leaders Count | ≤ Attendance | "Leaders cannot exceed total attendance" |

### Usage Example

```svelte
<script>
  import MeetingForm from '$lib/components/forms/MeetingForm.svelte';
  import { create } from '$lib/services/meetingsService';
  
  async function handleSubmit(event) {
    const { data } = event.detail;
    
    // Calculate duration if times provided
    if (data.start_time && data.end_time) {
      data.duration_minutes = calculateDuration(data.start_time, data.end_time);
    }
    
    await create(data);
  }
</script>

<MeetingForm 
  mode="create"
  on:submit={handleSubmit}
/>
```

### Special Features

1. **Duration Calculator**: Automatically calculates duration from start/end times
2. **Leader Selector**: Dropdown filtered to only show leaders
3. **Notes Templates**: Quick templates for common meeting types
4. **Recurring Option**: Option to create recurring meetings

---

## 🏠 VisitationForm.svelte

**Location**: `src/lib/components/forms/VisitationForm.svelte`

**Purpose**: Form for adding and editing home visitation records.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `visitation` | object | Existing visitation data (for edit mode) |
| `mode` | string | `'create'` or `'edit'` |
| `preselectedPerson` | object | Pre-fill the visited person |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `on:submit` | `{ data }` | Form was submitted |
| `on:cancel` | - | User cancelled |

### Form Fields

#### Visit Details Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Person Visited | select | ✅ | Who was visited (from people list) |
| Visited By | select | ❌ | Who did the visiting |
| Visit Date | date | ✅ | When the visit occurred |

#### Outcome Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Outcome | select | ✅ | What happened during the visit |

**Outcome Options**:
| Value | Label | Description |
|-------|-------|-------------|
| `welcomed_encouraged` | Welcomed & Encouraged | Positive visit, encouragement shared |
| `prayer_request_received` | Prayer Request Received | Person shared prayer needs |
| `not_home` | Not Home | Person was not available |
| `concerns_shared` | Concerns Shared | Person shared problems/concerns |
| `invited_to_service` | Invited to Service | Invited to attend church |

#### Follow-up Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Follow-up Required | checkbox | ✅ | Is another visit needed? |
| Follow-up Date | date | Conditional | When to follow up (required if follow-up = yes) |

#### Notes Section

| Field | Type | Description |
|-------|------|-------------|
| Notes | textarea | Details about the visit, prayer requests, etc. |

### Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Person Visited | Required | "Please select who was visited" |
| Visit Date | Required | "Visit date is required" |
| Outcome | Required | "Please select a visit outcome" |
| Follow-up Date | Required if follow-up checked | "Please set a follow-up date" |

### Usage Example

```svelte
<script>
  import VisitationForm from '$lib/components/forms/VisitationForm.svelte';
  import { create } from '$lib/services/visitationsService';
  
  async function handleSubmit(event) {
    const { data } = event.detail;
    
    // Add cached names for display
    data.person_visited_name = selectedPerson.first_name + ' ' + selectedPerson.last_name;
    data.visited_by_name = visitor.first_name + ' ' + visitor.last_name;
    
    await create(data);
    showSuccess('Visitation recorded!');
  }
</script>

<VisitationForm 
  mode="create"
  on:submit={handleSubmit}
  on:cancel={close}
/>
```

### Special Features

1. **Person Search**: Searchable dropdown with member photos
2. **Quick Outcome**: One-click outcome selection with icons
3. **Follow-up Flow**: Conditional follow-up date field
4. **Pre-select**: Can pre-fill the visited person (from profile page)
5. **Recent Visitors**: Shows recently used visitors for quick selection

---

## 🔍 Common Form Patterns

### Conditional Fields

```svelte
{#if memberStatus === 'member' || memberStatus === 'leader'}
  <Select 
    label="Role"
    bind:value={role}
    options={roleOptions}
  />
{/if}
```

### Form Submission with Validation

```svelte
<script>
  let errors = {};
  
  function validate() {
    errors = {};
    
    if (!firstName) errors.firstName = 'First name is required';
    if (!lastName) errors.lastName = 'Last name is required';
    if (email && !isValidEmail(email)) errors.email = 'Invalid email format';
    
    return Object.keys(errors).length === 0;
  }
  
  async function handleSubmit() {
    if (!validate()) return;
    
    dispatch('submit', { data: formData });
  }
</script>

<Input 
  label="First Name"
  bind:value={firstName}
  error={errors.firstName}
  required
/>
```

### Person Selector Pattern

```svelte
<script>
  import { getAll } from '$lib/services/peopleService';
  
  let people = [];
  let searchTerm = '';
  
  onMount(async () => {
    const { data } = await getAll();
    people = data;
  });
  
  $: filteredPeople = people.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );
</script>

<div class="person-selector">
  <Input 
    placeholder="Search people..."
    bind:value={searchTerm}
  />
  
  <div class="options">
    {#each filteredPeople as person}
      <button on:click={() => selectPerson(person)}>
        {person.first_name} {person.last_name}
      </button>
    {/each}
  </div>
</div>
```
