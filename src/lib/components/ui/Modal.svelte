<!--
  Modal.svelte
  A reusable modal/dialog component for the church tracker dashboard.
  
  Features:
  - Multiple sizes: sm, md, lg, xl
  - Backdrop overlay with blur
  - Close on Escape key
  - Close on backdrop click (optional)
  - Focus trap
  - Smooth enter/exit animations
  - Accessible with proper ARIA attributes
  - Uses Svelte 5 runes syntax with bindable isOpen
-->

<script>
  import { fade, scale } from "svelte/transition";
  import { onDestroy } from "svelte";

  /**
   * @typedef {'sm' | 'md' | 'lg' | 'xl'} ModalSize
   */

  let {
    isOpen = $bindable(false),
    title = "",
    size = "md",
    closable = true,
    closeOnBackdrop = true,
    closeOnEscape = true,
    children,
    footer,
    onclose,
    ...restProps
  } = $props();

  // Reference to modal element for focus trap
  let modalElement = $state(null);
  let previousActiveElement = $state(null);

  // Size class mappings
  const sizeClassMap = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  // Derived size classes
  const sizeClasses = $derived(sizeClassMap[size] || sizeClassMap.md);

  // Handle close
  function handleClose() {
    isOpen = false;
    onclose?.();
  }

  // Handle backdrop click
  function handleBackdropClick(e) {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      handleClose();
    }
  }

  // Handle keydown for Escape and focus trap
  function handleKeydown(e) {
    if (!isOpen) return;

    if (e.key === "Escape" && closeOnEscape) {
      handleClose();
      return;
    }

    // Focus trap
    if (e.key === "Tab" && modalElement) {
      const focusableElements = modalElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }

  // Watch for isOpen changes using $effect
  $effect(() => {
    if (typeof window === "undefined") return;

    if (isOpen) {
      // Store current active element
      previousActiveElement = document.activeElement;

      // Lock body scroll
      document.body.style.overflow = "hidden";

      // Focus the modal after a short delay for animation
      setTimeout(() => {
        if (modalElement) {
          const firstFocusable = modalElement.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          firstFocusable?.focus();
        }
      }, 50);
    } else {
      // Restore body scroll
      document.body.style.overflow = "";

      // Restore focus to previous element
      if (
        previousActiveElement &&
        typeof previousActiveElement.focus === "function"
      ) {
        previousActiveElement.focus();
      }
    }
  });

  // Cleanup on unmount
  onDestroy(() => {
    if (typeof window !== "undefined") {
      document.body.style.overflow = "";
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? "modal-title" : undefined}
    onclick={handleBackdropClick}
    transition:fade={{ duration: 200 }}
    {...restProps}
  >
    <div
      bind:this={modalElement}
      class="modal-content {sizeClasses}"
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <!-- Header -->
      {#if title || closable}
        <div class="modal-header">
          {#if title}
            <h2 id="modal-title" class="text-lg font-semibold text-foreground">
              {title}
            </h2>
          {:else}
            <div></div>
          {/if}

          {#if closable}
            <button
              type="button"
              class="modal-close"
              onclick={handleClose}
              aria-label="Close modal"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          {/if}
        </div>
      {/if}

      <!-- Body -->
      <div class="modal-body">
        {#if children}
          {@render children()}
        {/if}
      </div>

      <!-- Footer -->
      {#if footer}
        <div class="modal-footer">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background-color: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
  }

  .modal-content {
    width: 100%;
    max-height: calc(100vh - 2rem);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: linear-gradient(
      135deg,
      hsl(var(--card)) 0%,
      hsl(0 0% 10%) 100%
    );
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid hsl(var(--border));
  }

  .modal-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    color: hsl(var(--muted-foreground));
    transition: all 150ms ease;
  }

  .modal-close:hover {
    background-color: hsl(var(--secondary));
    color: hsl(var(--foreground));
  }

  .modal-close:focus-visible {
    outline: 2px solid hsl(var(--primary));
    outline-offset: 2px;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid hsl(var(--border));
  }
</style>
