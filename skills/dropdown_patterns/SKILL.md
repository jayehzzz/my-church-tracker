---
description: How to implement dropdown selectors with consistent styling
---

# Dropdown Selector Patterns

This skill documents the standard dropdown/select styling used across the application. All dropdown implementations should follow these patterns for visual consistency.

## Core Components

### 1. MultiSelectFilter (Primary)
**Location**: `src/lib/components/filters/MultiSelectFilter.svelte`

Use for filter bars and multi-selection scenarios:
- Search input with icon
- "Select All" / "Clear All" buttons
- Checkbox items with labels
- Selected chips displayed below trigger

```svelte
<MultiSelectFilter
  label="Category"
  options={[
    { value: "responsive", label: "Responsive" },
    { value: "non_responsive", label: "Non-Responsive" }
  ]}
  bind:selected={selectedValues}
  placeholder="Search categories..."
/>
```

### 2. InlineSelectDropdown (Modal/Detail Views)
**Location**: `src/lib/components/ui/InlineSelectDropdown.svelte`

Use for inline editing within modals and detail views:
- Same visual styling as MultiSelectFilter
- Single-select behavior
- Optional search (auto-hidden for ≤4 options)
- Checkbox-style selection indicators

```svelte
{#if editingField === 'status'}
  <InlineSelectDropdown
    options={statusOptions}
    value={currentValue}
    showSearch={false}
    onSelect={(val) => handleUpdate('status', val)}
    bind:isOpen={dropdownOpen}
  />
{/if}
```

## Styling Requirements

All dropdowns MUST use these CSS variables:

```css
/* Panel */
background: hsl(var(--card));
color: hsl(var(--card-foreground));
border: 1px solid hsl(var(--border-hover));
border-radius: 0.5rem;
box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);

/* Search Input */
background: var(--input);
color: var(--foreground);
border-color: var(--primary); /* on focus */

/* Option Items */
.option-item:hover { background: var(--secondary); }
.option-item.selected { background: rgba(var(--primary-rgb), 0.1); }

/* Checkbox Indicator */
.selected .checkbox-indicator {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--primary-foreground);
}
```

## Animation

Use this standard dropdown animation:

```css
@keyframes dropdownIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

animation: dropdownIn 0.15s ease-out;
```

## Boolean Options Pattern

For Yes/No toggles, use standardized options:

```javascript
const booleanOptions = [
  { value: true, label: "Yes" },
  { value: false, label: "No" }
];
```

With `showSearch={false}` since there are only 2 options.

## Usage in Modals

When adding inline edit dropdowns to detail modals:

1. Add a hover-reveal arrow button next to the value
2. Track editing state with `editingField` variable
3. Position dropdown absolutely below the trigger
   - Use `placement="top"` for elements near the bottom of the modal to open upwards.
4. Close on selection or click outside

See `EvangelismDetailModal.svelte` for reference implementation.
