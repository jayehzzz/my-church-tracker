<!--
  Select.svelte
  A styled select dropdown component for the church tracker dashboard.
  
  Features:
  - Single and multi-select modes
  - Custom dropdown styling
  - Error state styling
  - Floating label
  - Disabled state
  - Accessible with proper ARIA attributes
  - Uses Svelte 5 runes syntax with bindable value
-->

<script>
  /**
   * @typedef {Object} Option
   * @property {string} value - Option value
   * @property {string} label - Option display label
   */

  let {
    options = [],
    value = $bindable(""),
    label = "",
    placeholder = "Select an option",
    error = "",
    disabled = false,
    multiple = false,
    required = false,
    id = `select-${Math.random().toString(36).slice(2, 9)}`,
    name = "",
    onchange,
    ...restProps
  } = $props();

  // Compute wrapper classes
  const wrapperClasses = $derived(() => {
    let classes =
      "relative flex items-center rounded-lg border transition-premium";

    if (error) {
      classes +=
        " border-destructive focus-within:border-destructive focus-within:ring-1 focus-within:ring-destructive";
    } else if (disabled) {
      classes += " border-border bg-secondary/30 cursor-not-allowed";
    } else {
      classes +=
        " border-border hover:border-border-hover focus-within:border-primary focus-within:ring-1 focus-within:ring-primary";
    }

    return classes;
  });

  // Compute select classes
  const selectClasses = $derived(
    `flex-1 h-10 px-3 pr-10 bg-transparent text-foreground
     focus:outline-none disabled:cursor-not-allowed disabled:opacity-50
     appearance-none cursor-pointer
     ${multiple ? "h-auto min-h-[2.5rem] py-2" : ""}`,
  );

  // Handle focus
  function handleFocus() {
  }

  // Handle blur
  function handleBlur() {
  }

  // Handle change for multi-select
  function handleChange(e) {
    if (multiple) {
      const selectedOptions = Array.from(e.target.selectedOptions);
      value = selectedOptions.map((opt) => opt.value);
    } else {
      value = e.target.value;
    }
    onchange?.({ value });
  }

  // Check if an option is selected
  function isSelected(optionValue) {
    if (multiple) {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  }
</script>

<div class="w-full space-y-1.5">
  {#if label}
    <label for={id} class="block text-xs font-medium text-foreground">
      {label}
      {#if required}<span class="ml-0.5 text-destructive" aria-hidden="true">*</span>{/if}
    </label>
  {/if}
  <div class={wrapperClasses()}>
    <select
      {id}
      {name}
      {disabled}
      {required}
      {multiple}
      aria-invalid={error ? "true" : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      class={selectClasses}
      onfocus={handleFocus}
      onblur={handleBlur}
      onchange={handleChange}
      {...restProps}
    >
      {#if placeholder && !multiple}
        <option
          value=""
          disabled
          selected={!value}
          class="text-muted-foreground">{placeholder}</option
        >
      {/if}

      {#each options as option}
        <option value={option.value} selected={isSelected(option.value)}>
          {option.label}
        </option>
      {/each}
    </select>

    <!-- Dropdown arrow icon -->
    <span
      class="absolute right-3 pointer-events-none text-muted-foreground"
      aria-hidden="true"
    >
      <svg
        class="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </span>
  </div>

  {#if error}
    <p id="{id}-error" class="mt-1.5 text-xs text-destructive" role="alert">
      {error}
    </p>
  {/if}
</div>

<style>
  select {
    /* Remove default browser styling */
    -webkit-appearance: none;
    appearance: none;
    background-image: none;
  }

  /* Style the options dropdown */
  select option {
    background-color: hsl(var(--card));
    color: hsl(var(--foreground));
    padding: 0.5rem;
  }

  select option:hover,
  select option:focus {
    background-color: hsl(var(--secondary));
  }

  /* Multi-select styling */
  select[multiple] {
    padding-right: 0.75rem;
  }

  select[multiple] option {
    padding: 0.5rem 0.75rem;
    border-radius: 0.25rem;
    margin-bottom: 0.125rem;
  }

  select[multiple] option:checked {
    background-color: hsl(var(--primary) / 0.2);
    color: hsl(var(--primary));
  }
</style>
