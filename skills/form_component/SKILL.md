---
description: Build form components with validation, loading states, and Convex integration.
---

# Form Component

This skill guides creation of form components with proper validation, state management, and backend integration.

---

## 1. Form Structure

```svelte
<!--
  [EntityName]Form.svelte
  Form for creating/editing [entity type]
  
  Props:
    - data: The entity data (bindable for two-way updates)
    - mode: 'create' | 'edit'
    - onsubmit: Callback when form is submitted
    - oncancel: Callback when cancelled
-->

<script>
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  
  let {
    data = $bindable({}),
    mode = 'create',
    onsubmit = null,
    oncancel = null,
    isValid = $bindable(false),
  } = $props();
  
  let isSubmitting = $state(false);
  let errors = $state({});
  
  // Form validation
  const validate = $derived(() => {
    const newErrors = {};
    
    if (!data.first_name?.trim()) {
      newErrors.first_name = 'First name is required';
    }
    
    if (data.email && !isValidEmail(data.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    isValid = Object.keys(newErrors).length === 0;
    return newErrors;
  });
  
  async function handleSubmit(e) {
    e.preventDefault();
    
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      errors = validationErrors;
      return;
    }
    
    isSubmitting = true;
    try {
      await onsubmit?.(data);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  <!-- Form fields -->
  
  <div class="flex justify-end gap-3 pt-4 border-t border-border">
    {#if oncancel}
      <Button type="button" variant="secondary" onclick={oncancel}>
        Cancel
      </Button>
    {/if}
    <Button type="submit" loading={isSubmitting} disabled={!isValid || isSubmitting}>
      {mode === 'create' ? 'Create' : 'Save Changes'}
    </Button>
  </div>
</form>
```

---

## 2. Input Components

### Text Input
```svelte
<div class="space-y-1.5">
  <label for="first_name" class="text-sm font-medium text-foreground">
    First Name <span class="text-destructive">*</span>
  </label>
  <Input
    id="first_name"
    bind:value={data.first_name}
    placeholder="Enter first name"
    error={errors.first_name}
  />
  {#if errors.first_name}
    <p class="text-xs text-destructive">{errors.first_name}</p>
  {/if}
</div>
```

### Select
```svelte
<div class="space-y-1.5">
  <label for="status" class="text-sm font-medium text-foreground">
    Status
  </label>
  <Select
    id="status"
    bind:value={data.member_status}
    options={[
      { value: 'guest', label: 'Guest' },
      { value: 'member', label: 'Member' },
      { value: 'leader', label: 'Leader' },
    ]}
  />
</div>
```

### Checkbox
```svelte
<label class="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    bind:checked={data.is_baptised}
    class="w-4 h-4 rounded border-border bg-input 
           checked:bg-primary checked:border-primary
           focus:ring-2 focus:ring-ring"
  />
  <span class="text-sm text-foreground">Is Baptised</span>
</label>
```

### Date Input
```svelte
<div class="space-y-1.5">
  <label for="visit_date" class="text-sm font-medium text-foreground">
    Visit Date
  </label>
  <Input
    id="visit_date"
    type="date"
    bind:value={data.visit_date}
  />
</div>
```

---

## 3. Form Grid Layout

```svelte
<!-- Two-column grid for larger screens -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div class="space-y-1.5">
    <label>First Name</label>
    <Input bind:value={data.first_name} />
  </div>
  <div class="space-y-1.5">
    <label>Last Name</label>
    <Input bind:value={data.last_name} />
  </div>
</div>

<!-- Full width field -->
<div class="space-y-1.5">
  <label>Address</label>
  <Input bind:value={data.address} />
</div>
```

---

## 4. Validation Helpers

```javascript
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[\d\s\-\+\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

function isValidDate(dateStr) {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function isFutureDate(dateStr) {
  return new Date(dateStr) > new Date();
}
```

---

## 5. Error Display

```svelte
<!-- Inline error -->
{#if errors.fieldName}
  <p class="text-xs text-destructive mt-1">{errors.fieldName}</p>
{/if}

<!-- Summary errors (top of form) -->
{#if Object.keys(errors).length > 0}
  <div class="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
    <p class="text-sm font-medium text-destructive">Please fix the following errors:</p>
    <ul class="text-xs text-destructive mt-1 list-disc list-inside">
      {#each Object.values(errors) as error}
        <li>{error}</li>
      {/each}
    </ul>
  </div>
{/if}
```

---

## 6. Convex Integration

```javascript
// In parent component or form
import { peopleService } from '$lib/services/peopleService';

async function handleCreate(formData) {
  try {
    const id = await peopleService.create(formData);
    // Success - close modal, show toast
  } catch (error) {
    // Show error toast
    console.error('Failed to create:', error);
  }
}

async function handleUpdate(formData) {
  try {
    await peopleService.update(formData._id, formData);
    // Success
  } catch (error) {
    // Handle error
  }
}
```

---

## 7. Optimistic Updates

```svelte
<script>
  async function handleSubmit(data) {
    // Optimistically update UI
    localData = { ...localData, ...data };
    
    try {
      await service.update(data._id, data);
      // Confirm success
    } catch (error) {
      // Revert on failure
      localData = originalData;
      showErrorToast('Failed to save');
    }
  }
</script>
```

---

## 8. Loading States

```svelte
<!-- Submit button with loading -->
<Button 
  type="submit" 
  loading={isSubmitting}
  disabled={!isValid || isSubmitting}
>
  {#if isSubmitting}
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
    Saving...
  {:else}
    Save
  {/if}
</Button>

<!-- Disable inputs while submitting -->
<Input 
  bind:value={data.name} 
  disabled={isSubmitting}
/>
```

---

## 9. Form Sections

For complex forms, group related fields:

```svelte
<form onsubmit={handleSubmit} class="space-y-6">
  <!-- Personal Information -->
  <section>
    <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
      Personal Information
    </h3>
    <div class="grid grid-cols-2 gap-4">
      <!-- fields -->
    </div>
  </section>
  
  <hr class="border-border" />
  
  <!-- Contact Details -->
  <section>
    <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
      Contact Details
    </h3>
    <div class="space-y-4">
      <!-- fields -->
    </div>
  </section>
  
  <!-- Actions -->
  <div class="flex justify-end gap-3 pt-4 border-t border-border">
    <!-- buttons -->
  </div>
</form>
```

---

## 10. Checklist

When creating a form:

- [ ] Uses `$bindable()` for data prop
- [ ] Has `mode` prop for create/edit
- [ ] Real-time validation with `$derived`
- [ ] Error messages below invalid fields
- [ ] Required fields marked with `*`
- [ ] Loading state on submit button
- [ ] Inputs disabled during submission
- [ ] Cancel button calls `oncancel`
- [ ] Form grid layout for multi-column
- [ ] Sections for complex forms
- [ ] Phone/email validation helpers
- [ ] Accessible labels with `for` attribute
