# 🧩 UI Components

> **Complete guide to core reusable UI elements - buttons, cards, tables, inputs, and more.**

---

## Overview

Core UI components live in `src/lib/components/ui/` and provide consistent styling and behavior throughout the application. These are building blocks used by all pages and features.

### Component Index

| Component | Purpose |
|-----------|---------|
| `Badge.svelte` | Status labels and tags |
| `Button.svelte` | Clickable actions |
| `Card.svelte` | Content containers |
| `DataTable.svelte` | Sortable, filterable tables |
| `Input.svelte` | Text input fields |
| `Select.svelte` | Dropdown selections |
| `Modal.svelte` | Popup dialogs |
| `Motion.svelte` | Animation wrapper |
| `InfoRow.svelte` | Label-value display |
| `CopyButton.svelte` | Copy to clipboard |
| `CopyDropdown.svelte` | Multi-format copy |
| `ColumnFilterDropdown.svelte` | Table column visibility |
| `FullscreenWrapper.svelte` | Fullscreen mode |

---

## 🏷️ Badge.svelte

**Location**: `src/lib/components/ui/Badge.svelte`

**Purpose**: Displays small colored labels for status indicators, categories, or tags.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `variant` | string | `'default'` | Color scheme: `'default'`, `'success'`, `'warning'`, `'danger'`, `'info'` |
| `size` | string | `'md'` | Size: `'sm'`, `'md'`, `'lg'` |
| `text` | string | required | Text to display |

### Usage Examples

```svelte
<!-- Member status badges -->
<Badge text="Member" variant="success" />
<Badge text="Guest" variant="info" />
<Badge text="Leader" variant="warning" />
<Badge text="Archived" variant="danger" />

<!-- Activity status -->
<Badge text="Regular" variant="success" size="sm" />
<Badge text="Irregular" variant="warning" size="sm" />
<Badge text="Dormant" variant="danger" size="sm" />
```

### Visual Appearance

| Variant | Color | Use For |
|---------|-------|---------|
| `default` | Gray | Neutral labels |
| `success` | Green | Positive status (member, active, completed) |
| `warning` | Yellow/Orange | Attention needed (pending, irregular) |
| `danger` | Red | Critical status (archived, dormant, error) |
| `info` | Blue | Informational (guest, new) |

---

## 🔘 Button.svelte

**Location**: `src/lib/components/ui/Button.svelte`

**Purpose**: Standard button component with multiple variants and states.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `variant` | string | `'primary'` | Style: `'primary'`, `'secondary'`, `'ghost'`, `'danger'`, `'success'` |
| `size` | string | `'md'` | Size: `'sm'`, `'md'`, `'lg'` |
| `disabled` | boolean | `false` | Disable the button |
| `loading` | boolean | `false` | Show loading spinner |
| `fullWidth` | boolean | `false` | Span full container width |
| `type` | string | `'button'` | HTML type: `'button'`, `'submit'`, `'reset'` |

### Events

| Event | Description |
|-------|-------------|
| `on:click` | Button was clicked |

### Usage Examples

```svelte
<script>
  import Button from '$lib/components/ui/Button.svelte';
  
  let saving = false;
  
  async function handleSave() {
    saving = true;
    await saveData();
    saving = false;
  }
</script>

<!-- Primary action -->
<Button on:click={handleSave} loading={saving}>
  Save Changes
</Button>

<!-- Secondary action -->
<Button variant="secondary" on:click={cancel}>
  Cancel
</Button>

<!-- Danger action -->
<Button variant="danger" on:click={confirmDelete}>
  Delete
</Button>

<!-- Ghost button (minimal style) -->
<Button variant="ghost" size="sm">
  View More
</Button>

<!-- Full width in forms -->
<Button fullWidth type="submit">
  Submit Form
</Button>
```

### Variant Guide

| Variant | Color | Use For |
|---------|-------|---------|
| `primary` | Brand color | Main actions (Save, Submit, Create) |
| `secondary` | Gray | Secondary actions (Cancel, Back) |
| `ghost` | Transparent | Tertiary actions, links |
| `danger` | Red | Destructive actions (Delete, Remove) |
| `success` | Green | Positive confirmations |

---

## 📦 Card.svelte

**Location**: `src/lib/components/ui/Card.svelte`

**Purpose**: Content container with consistent styling, padding, and optional header.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | string | `null` | Optional card header |
| `padding` | string | `'md'` | Padding: `'none'`, `'sm'`, `'md'`, `'lg'` |
| `shadow` | boolean | `true` | Show box shadow |
| `hoverable` | boolean | `false` | Add hover effect |

### Slots

| Slot | Description |
|------|-------------|
| default | Main content |
| `header` | Custom header content |
| `footer` | Footer content |

### Usage Examples

```svelte
<script>
  import Card from '$lib/components/ui/Card.svelte';
</script>

<!-- Simple card -->
<Card title="Recent Activity">
  <p>Content goes here...</p>
</Card>

<!-- Card with custom header -->
<Card>
  <svelte:fragment slot="header">
    <div class="flex justify-between">
      <h3>Services</h3>
      <Button size="sm">Add New</Button>
    </div>
  </svelte:fragment>
  
  <ServicesList />
  
  <svelte:fragment slot="footer">
    <a href="/services">View All</a>
  </svelte:fragment>
</Card>

<!-- Clickable card -->
<Card hoverable on:click={() => goto('/details')}>
  <p>Click me!</p>
</Card>
```

---

## 📊 DataTable.svelte

**Location**: `src/lib/components/ui/DataTable.svelte`

**Purpose**: Full-featured data table with sorting, filtering, pagination, row selection, and export capabilities.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `data` | array | `[]` | Array of row objects |
| `columns` | array | `[]` | Column definitions |
| `searchable` | boolean | `true` | Enable search |
| `sortable` | boolean | `true` | Enable column sorting |
| `paginated` | boolean | `true` | Enable pagination |
| `pageSize` | number | `10` | Rows per page |
| `selectable` | boolean | `false` | Enable row selection |
| `exportable` | boolean | `false` | Show export button |

### Column Definition

```javascript
const columns = [
  {
    key: 'first_name',      // Field from data
    label: 'First Name',    // Display header
    sortable: true,         // Can sort by this column
    searchable: true,       // Include in search
    width: '150px',         // Optional fixed width
    render: (value, row) => // Optional custom renderer
      `<a href="/people/${row.id}">${value}</a>`
  },
  {
    key: 'member_status',
    label: 'Status',
    sortable: true,
    render: (value) => {
      const colors = { member: 'green', guest: 'blue' };
      return `<span class="badge ${colors[value]}">${value}</span>`;
    }
  }
];
```

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `on:rowClick` | `{ row, index }` | Row was clicked |
| `on:selectionChange` | `{ selected }` | Selection changed |
| `on:sort` | `{ column, direction }` | Sort changed |

### Usage Example

```svelte
<script>
  import DataTable from '$lib/components/ui/DataTable.svelte';
  
  let people = [];
  
  const columns = [
    { key: 'first_name', label: 'First Name', sortable: true },
    { key: 'last_name', label: 'Last Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'member_status', label: 'Status', sortable: true },
  ];
  
  function handleRowClick(event) {
    const { row } = event.detail;
    goto(`/people/${row.id}`);
  }
</script>

<DataTable 
  {data}={people}
  {columns}
  searchable
  sortable
  paginated
  pageSize={20}
  exportable
  on:rowClick={handleRowClick}
/>
```

### Features

| Feature | Description |
|---------|-------------|
| **Search** | Filters rows by searching across searchable columns |
| **Sort** | Click column headers to sort ascending/descending |
| **Pagination** | Navigate through pages of data |
| **Selection** | Checkbox selection for bulk actions |
| **Export** | Download data as CSV |
| **Column Visibility** | Hide/show columns with dropdown |

---

## 📝 Input.svelte

**Location**: `src/lib/components/ui/Input.svelte`

**Purpose**: Styled text input with label, validation states, and helper text.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | string | `'text'` | Input type: `'text'`, `'email'`, `'password'`, `'number'`, `'date'`, `'tel'` |
| `value` | string | `''` | Current value (bindable) |
| `label` | string | `null` | Label text |
| `placeholder` | string | `''` | Placeholder text |
| `required` | boolean | `false` | Mark as required |
| `disabled` | boolean | `false` | Disable input |
| `error` | string | `null` | Error message to show |
| `helperText` | string | `null` | Helper text below input |

### Events

| Event | Description |
|-------|-------------|
| `on:input` | Value changed |
| `on:blur` | Input lost focus |
| `on:focus` | Input gained focus |

### Usage Examples

```svelte
<script>
  import Input from '$lib/components/ui/Input.svelte';
  
  let email = '';
  let emailError = '';
  
  function validateEmail() {
    if (!email.includes('@')) {
      emailError = 'Please enter a valid email';
    } else {
      emailError = '';
    }
  }
</script>

<!-- Basic input -->
<Input 
  label="First Name" 
  bind:value={firstName}
  required 
/>

<!-- Email with validation -->
<Input 
  type="email"
  label="Email Address"
  bind:value={email}
  error={emailError}
  on:blur={validateEmail}
  helperText="We'll never share your email"
/>

<!-- Date input -->
<Input 
  type="date"
  label="Birth Date"
  bind:value={birthday}
/>

<!-- Phone input -->
<Input 
  type="tel"
  label="Phone Number"
  placeholder="+1 (555) 000-0000"
  bind:value={phone}
/>
```

---

## 📋 Select.svelte

**Location**: `src/lib/components/ui/Select.svelte`

**Purpose**: Styled dropdown select with label and options.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `value` | string | `''` | Selected value (bindable) |
| `options` | array | `[]` | Array of `{ value, label }` objects |
| `label` | string | `null` | Label text |
| `placeholder` | string | `'Select...'` | Placeholder when no selection |
| `required` | boolean | `false` | Mark as required |
| `disabled` | boolean | `false` | Disable select |
| `error` | string | `null` | Error message |

### Usage Examples

```svelte
<script>
  import Select from '$lib/components/ui/Select.svelte';
  
  let memberStatus = '';
  
  const statusOptions = [
    { value: 'guest', label: 'Guest' },
    { value: 'member', label: 'Member' },
    { value: 'leader', label: 'Leader' },
    { value: 'archived', label: 'Archived' }
  ];
  
  const meetingTypes = [
    { value: 'bacenta', label: 'Bacenta' },
    { value: 'flow_prayer', label: 'Flow Prayer' },
    { value: 'all_night_prayer', label: 'All-Night Prayer' },
    { value: 'basonta', label: 'Basonta' }
  ];
</script>

<Select 
  label="Member Status"
  bind:value={memberStatus}
  options={statusOptions}
  required
/>

<Select 
  label="Meeting Type"
  bind:value={meetingType}
  options={meetingTypes}
  placeholder="Choose a meeting type..."
/>
```

---

## 💬 Modal.svelte

**Location**: `src/lib/components/ui/Modal.svelte`

**Purpose**: Popup dialog for forms, confirmations, and focused content.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `open` | boolean | `false` | Control visibility (bindable) |
| `title` | string | `null` | Modal header title |
| `size` | string | `'md'` | Size: `'sm'`, `'md'`, `'lg'`, `'xl'`, `'full'` |
| `closable` | boolean | `true` | Show close button |
| `closeOnClickOutside` | boolean | `true` | Close when clicking backdrop |

### Slots

| Slot | Description |
|------|-------------|
| default | Main modal content |
| `footer` | Footer with actions |

### Events

| Event | Description |
|-------|-------------|
| `on:close` | Modal close requested |

### Usage Examples

```svelte
<script>
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  
  let showAddPerson = false;
  let showConfirmDelete = false;
</script>

<!-- Form modal -->
<Button on:click={() => showAddPerson = true}>
  Add Person
</Button>

<Modal 
  bind:open={showAddPerson}
  title="Add New Person"
  size="lg"
>
  <PersonForm on:submit={() => showAddPerson = false} />
  
  <svelte:fragment slot="footer">
    <Button variant="secondary" on:click={() => showAddPerson = false}>
      Cancel
    </Button>
    <Button type="submit" form="person-form">
      Save
    </Button>
  </svelte:fragment>
</Modal>

<!-- Confirmation modal -->
<Modal 
  bind:open={showConfirmDelete}
  title="Confirm Delete"
  size="sm"
>
  <p>Are you sure you want to delete this person? This action cannot be undone.</p>
  
  <svelte:fragment slot="footer">
    <Button variant="secondary" on:click={() => showConfirmDelete = false}>
      Cancel
    </Button>
    <Button variant="danger" on:click={handleDelete}>
      Delete
    </Button>
  </svelte:fragment>
</Modal>
```

---

## ✨ Motion.svelte

**Location**: `src/lib/components/ui/Motion.svelte`

**Purpose**: Wrapper component that adds entrance/exit animations to content.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | string | `'fade'` | Animation: `'fade'`, `'slide'`, `'scale'` |
| `delay` | number | `0` | Delay before animation (ms) |
| `duration` | number | `200` | Animation duration (ms) |

### Usage Examples

```svelte
<script>
  import Motion from '$lib/components/ui/Motion.svelte';
</script>

<!-- Fade in content -->
<Motion type="fade">
  <Card>
    <p>This fades in</p>
  </Card>
</Motion>

<!-- Staggered list items -->
{#each items as item, i}
  <Motion type="slide" delay={i * 50}>
    <Card>{item.name}</Card>
  </Motion>
{/each}

<!-- Scale animation -->
<Motion type="scale" duration={300}>
  <img src={avatar} alt="Profile" />
</Motion>
```

---

## ℹ️ InfoRow.svelte

**Location**: `src/lib/components/ui/InfoRow.svelte`

**Purpose**: Displays a label-value pair in a consistent format.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `label` | string | Label text |
| `value` | string | Value to display |

### Usage Example

```svelte
<script>
  import InfoRow from '$lib/components/ui/InfoRow.svelte';
</script>

<div class="profile-details">
  <InfoRow label="Full Name" value="{person.first_name} {person.last_name}" />
  <InfoRow label="Email" value={person.email || 'Not provided'} />
  <InfoRow label="Phone" value={person.phone || 'Not provided'} />
  <InfoRow label="Status" value={person.member_status} />
  <InfoRow label="Member Since" value={person.membership_date} />
</div>
```

---

## 📋 CopyButton.svelte

**Location**: `src/lib/components/ui/CopyButton.svelte`

**Purpose**: Button that copies specified text to clipboard with visual feedback.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `text` | string | Text to copy |
| `label` | string | Button label (optional) |

### Usage Example

```svelte
<script>
  import CopyButton from '$lib/components/ui/CopyButton.svelte';
</script>

<div class="flex items-center gap-2">
  <span>{person.email}</span>
  <CopyButton text={person.email} />
</div>
```

---

## 📑 CopyDropdown.svelte

**Location**: `src/lib/components/ui/CopyDropdown.svelte`

**Purpose**: Dropdown with multiple copy format options.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `options` | array | Array of `{ label, value }` copy options |

### Usage Example

```svelte
<script>
  import CopyDropdown from '$lib/components/ui/CopyDropdown.svelte';
  
  const copyOptions = [
    { label: 'Copy Name', value: `${person.first_name} ${person.last_name}` },
    { label: 'Copy Email', value: person.email },
    { label: 'Copy Phone', value: person.phone },
    { label: 'Copy All', value: `${person.first_name} ${person.last_name}\n${person.email}\n${person.phone}` }
  ];
</script>

<CopyDropdown options={copyOptions} />
```

---

## 📊 ColumnFilterDropdown.svelte

**Location**: `src/lib/components/ui/ColumnFilterDropdown.svelte`

**Purpose**: Dropdown to control which columns are visible in a DataTable.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `columns` | array | Column definitions |
| `visibleColumns` | array | Currently visible column keys (bindable) |

### Usage Example

```svelte
<script>
  import ColumnFilterDropdown from '$lib/components/ui/ColumnFilterDropdown.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  
  let visibleColumns = ['first_name', 'last_name', 'status'];
  
  const allColumns = [
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status' }
  ];
  
  $: displayColumns = allColumns.filter(c => visibleColumns.includes(c.key));
</script>

<ColumnFilterDropdown 
  columns={allColumns}
  bind:visibleColumns
/>

<DataTable columns={displayColumns} data={people} />
```

---

## 🖥️ FullscreenWrapper.svelte

**Location**: `src/lib/components/ui/FullscreenWrapper.svelte`

**Purpose**: Wraps content with a toggle to enter fullscreen mode, useful for charts and visualizations.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `true` | Allow fullscreen toggle |

### Usage Example

```svelte
<script>
  import FullscreenWrapper from '$lib/components/ui/FullscreenWrapper.svelte';
  import AttendanceChart from '$lib/components/charts/AttendanceTrend.svelte';
</script>

<FullscreenWrapper>
  <AttendanceChart data={attendanceData} />
</FullscreenWrapper>
```

---

## ✨ Animation Standards

We are standardizing tab transitions with smooth, sliding animations to enhance the premium feel of the application.

### 1. Sliding Pill Tabs
**Use for**: Filter toggles, sub-navigation, and segmented controls.

- **Implementation**: Relative grid container with an absolute background div.
- **Animation**: `transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]`
- **Reference**: See `ServiceForm.svelte` (Individual Attendance tabs).

### 2. Sliding Underline Tabs
**Use for**: Main page navigation and primary module tabs.

- **Implementation**: Relative grid/flex container with an absolute bottom border div.
- **Animation**: `transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]`
- **Reference**: See `ServiceForm.svelte` (Main tabs: Details, Attendance, Photos).
