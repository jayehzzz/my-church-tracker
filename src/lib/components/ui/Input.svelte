<!--
  Input.svelte
  A styled input component for the church tracker dashboard.
  
  Features:
  - Multiple input types: text, email, password, number, tel, date
  - Floating label animation
  - Error state styling
  - Icon prefix/suffix snippets
  - Disabled and required states
  - Accessible with proper ARIA attributes
  - Uses Svelte 5 runes syntax with bindable value
-->

<script>
  /**
   * @typedef {'text' | 'email' | 'password' | 'number' | 'tel' | 'date'} InputType
   */
  
  let { 
    type = 'text',
    value = $bindable(''),
    label = '',
    placeholder = '',
    error = '',
    disabled = false,
    required = false,
    id = `input-${Math.random().toString(36).slice(2, 9)}`,
    name = '',
    prefix,
    suffix,
    oninput,
    onchange,
    onfocus,
    onblur,
    ...restProps
  } = $props();
  
  // Track focus state for floating label
  let isFocused = $state(false);
  
  // Determine if label should float (focused or has value)
  const shouldFloat = $derived(isFocused || value !== '' || placeholder !== '');
  
  // Check if prefix/suffix snippets are provided
  const hasPrefix = $derived(!!prefix);
  const hasSuffix = $derived(!!suffix);
  
  // Compute input wrapper classes
  const wrapperClasses = $derived(() => {
    let classes = 'relative flex items-center rounded-lg border transition-premium';
    
    if (error) {
      classes += ' border-destructive focus-within:border-destructive focus-within:ring-1 focus-within:ring-destructive';
    } else if (disabled) {
      classes += ' border-border bg-secondary/30 cursor-not-allowed';
    } else {
      classes += ' border-border hover:border-border-hover focus-within:border-primary focus-within:ring-1 focus-within:ring-primary';
    }
    
    return classes;
  });
  
  // Compute label classes
  const labelClasses = $derived(() => {
    let classes = 'absolute transition-all duration-200 pointer-events-none';
    
    if (hasPrefix) {
      classes += ' left-10';
    } else {
      classes += ' left-3';
    }
    
    if (shouldFloat) {
      classes += ' -top-2.5 text-xs px-1 bg-background';
      if (error) {
        classes += ' text-destructive';
      } else if (isFocused) {
        classes += ' text-primary';
      } else {
        classes += ' text-muted-foreground';
      }
    } else {
      classes += ' top-1/2 -translate-y-1/2 text-sm text-muted-foreground';
    }
    
    return classes;
  });
  
  // Compute input classes
  const inputClasses = $derived(
    `flex-1 h-10 px-3 bg-transparent text-foreground placeholder:text-muted-foreground/50
     focus:outline-none disabled:cursor-not-allowed disabled:opacity-50
     ${hasPrefix ? 'pl-0' : ''} ${hasSuffix ? 'pr-0' : ''}`
  );
  
  // Handle focus
  function handleFocus(e) {
    isFocused = true;
    onfocus?.(e);
  }
  
  // Handle blur
  function handleBlur(e) {
    isFocused = false;
    onblur?.(e);
  }
</script>

<div class="w-full">
  <div class={wrapperClasses()}>
    {#if prefix}
      <span class="flex items-center justify-center w-10 h-10 text-muted-foreground flex-shrink-0" aria-hidden="true">
        {@render prefix()}
      </span>
    {/if}
    
    {#if label}
      <label 
        for={id}
        class={labelClasses()}
      >
        {label}
        {#if required}
          <span class="text-destructive ml-0.5" aria-hidden="true">*</span>
        {/if}
      </label>
    {/if}
    
    <input
      {id}
      {type}
      {name}
      bind:value
      {placeholder}
      {disabled}
      {required}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      class={inputClasses}
      onfocus={handleFocus}
      onblur={handleBlur}
      {oninput}
      {onchange}
      {...restProps}
    />
    
    {#if suffix}
      <span class="flex items-center justify-center w-10 h-10 text-muted-foreground flex-shrink-0" aria-hidden="true">
        {@render suffix()}
      </span>
    {/if}
  </div>
  
  {#if error}
    <p 
      id="{id}-error"
      class="mt-1.5 text-xs text-destructive"
      role="alert"
    >
      {error}
    </p>
  {/if}
</div>

<style>
  input {
    /* Remove default browser styling */
    -webkit-appearance: none;
    appearance: none;
  }
  
  /* Remove spinner for number inputs */
  input[type='number']::-webkit-inner-spin-button,
  input[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  input[type='number'] {
    -moz-appearance: textfield;
  }
  
  /* Style date input */
  input[type='date']::-webkit-calendar-picker-indicator {
    filter: invert(0.6);
    cursor: pointer;
  }
</style>
