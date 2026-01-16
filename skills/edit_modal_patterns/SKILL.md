---
description: Implement "Edit Anywhere" modals with consistent patterns for viewing/editing entities.
---

# Edit Modal Patterns

This skill guides implementation of detail/edit modals following the "Edit Anywhere" design philosophy.

---

## 1. Core Principles

- Every detail view must have an **Edit** button
- Modals use **smooth animations** (scale + fade)
- Related entities are **clickable links**
- Forms show **loading states** during save
- Use **optimistic updates** where possible

---

## 2. Modal Component Usage

```svelte
<script>
  import Modal from '$lib/components/ui/Modal.svelte';
  
  let isOpen = $state(false);
  let isEditing = $state(false);
</script>

<Modal 
  bind:isOpen 
  title="Person Details" 
  size="lg"
  onclose={() => isEditing = false}
>
  {#snippet children()}
    <!-- Body content -->
  {/snippet}
  
  {#snippet footer()}
    <!-- Footer buttons -->
  {/snippet}
</Modal>
```

### Size Options

| Size | Max Width | Use Case |
|------|-----------|----------|
| `sm` | 384px | Confirmations, simple forms |
| `md` | 448px | Standard detail views |
| `lg` | 512px | Complex forms, multi-section |
| `xl` | 576px | Large tables, dashboards |

---

## 3. View/Edit Toggle Pattern

```svelte
<script>
  let isEditing = $state(false);
  let isSaving = $state(false);
  
  async function handleSave() {
    isSaving = true;
    try {
      await service.update(data);
      isEditing = false;
      // Show success toast
    } catch (error) {
      // Show error toast
    } finally {
      isSaving = false;
    }
  }
</script>

<Modal bind:isOpen title={isEditing ? "Edit Person" : "Person Details"}>
  {#snippet children()}
    {#if isEditing}
      <PersonForm bind:data onsubmit={handleSave} />
    {:else}
      <PersonDetails {data} />
    {/if}
  {/snippet}
  
  {#snippet footer()}
    {#if isEditing}
      <Button variant="secondary" onclick={() => isEditing = false}>
        Cancel
      </Button>
      <Button onclick={handleSave} loading={isSaving}>
        Save Changes
      </Button>
    {:else}
      <Button variant="secondary" onclick={() => isOpen = false}>
        Close
      </Button>
      <Button onclick={() => isEditing = true}>
        Edit
      </Button>
    {/if}
  {/snippet}
</Modal>
```

---

## 4. Detail View Structure

```svelte
<!-- Inside modal body -->
<div class="space-y-4">
  <!-- Header with avatar/status -->
  <div class="flex items-center gap-4">
    <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
      <span class="text-lg font-semibold text-primary">JD</span>
    </div>
    <div>
      <h3 class="text-lg font-semibold text-foreground">John Doe</h3>
      <span class="text-sm text-muted-foreground">Member since 2024</span>
    </div>
  </div>
  
  <!-- Info rows -->
  <div class="grid grid-cols-2 gap-4 pt-4 border-t border-border">
    <InfoRow label="Email" value={data.email} />
    <InfoRow label="Phone" value={data.phone} />
  </div>
  
  <!-- Linked entity (clickable!) -->
  <div class="pt-4 border-t border-border">
    <span class="text-label text-muted-foreground">INVITED BY</span>
    <button 
      class="text-primary hover:underline cursor-pointer"
      onclick={() => navigateToProfile(data.invited_by_id)}
    >
      {data.inviter_name}
    </button>
  </div>
</div>
```

---

## 5. Linked Entity Navigation

When an entity references another entity, make it a clickable link:

```svelte
<!-- In a modal, open another modal -->
<button
  class="text-primary hover:underline cursor-pointer text-left"
  onclick={() => openPersonModal(personId)}
>
  {personName}
</button>

<!-- Navigate to a different page -->
<a 
  href="/people/{personId}"
  class="text-primary hover:underline"
  onclick={() => isOpen = false}
>
  View Profile →
</a>
```

---

## 6. Form Integration

When embedding a form in a modal:

```svelte
<script>
  import PersonForm from '$lib/components/forms/PersonForm.svelte';
  
  let formData = $state({...initialData});
  let formValid = $state(false);
</script>

<Modal bind:isOpen title="Edit Person">
  {#snippet children()}
    <PersonForm 
      bind:data={formData}
      bind:isValid={formValid}
      mode="edit"
    />
  {/snippet}
  
  {#snippet footer()}
    <Button 
      onclick={handleSave} 
      disabled={!formValid || isSaving}
      loading={isSaving}
    >
      Save
    </Button>
  {/snippet}
</Modal>
```

---

## 7. Loading States

### Initial Load
```svelte
{#if isLoading}
  <div class="space-y-3">
    <div class="h-4 bg-muted/50 rounded animate-pulse w-3/4"></div>
    <div class="h-4 bg-muted/50 rounded animate-pulse w-1/2"></div>
  </div>
{:else}
  <!-- Content -->
{/if}
```

### Save Button
```svelte
<Button loading={isSaving} disabled={isSaving}>
  {isSaving ? 'Saving...' : 'Save'}
</Button>
```

---

## 8. Status Badge Dropdown

For inline status editing without full edit mode:

```svelte
<script>
  let showStatusDropdown = $state(false);
  
  const statusOptions = [
    { value: 'guest', label: 'Guest', color: 'blue' },
    { value: 'member', label: 'Member', color: 'green' },
    { value: 'leader', label: 'Leader', color: 'purple' },
  ];
</script>

<div class="relative">
  <button
    class="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary 
           hover:bg-primary/20 cursor-pointer transition-all"
    onclick={() => showStatusDropdown = !showStatusDropdown}
  >
    {currentStatus}
  </button>
  
  {#if showStatusDropdown}
    <div class="absolute top-full mt-1 bg-card border border-border rounded-lg 
                shadow-lg py-1 min-w-[120px] z-50 animate-in fade-in">
      {#each statusOptions as option}
        <button
          class="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-all"
          onclick={() => updateStatus(option.value)}
        >
          {option.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
```

---

## 9. Animation Timing

| Transition | Duration | Easing |
|------------|----------|--------|
| Modal open/close | 200ms | `ease-out` |
| Content fade | 150ms | `ease` |
| Dropdown expand | 150ms | `ease-out` |
| Button hover | 150ms | `ease` |

---

## 10. Checklist

When creating a new detail/edit modal:

- [ ] Uses `Modal.svelte` component
- [ ] Has "Edit" button in footer (when in view mode)
- [ ] Has "Cancel" and "Save" in footer (when editing)
- [ ] Shows loading state on save button
- [ ] Entity links are clickable (navigable)
- [ ] Status badges trigger dropdowns
- [ ] Form validates before enabling save
- [ ] Closes gracefully with animation
- [ ] Handles escape key and backdrop click
