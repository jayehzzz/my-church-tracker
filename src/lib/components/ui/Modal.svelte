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
  import { registerDialog } from "$lib/utils/dialogStack.js";
  import { onMount } from "svelte";

  /**
   * @typedef {'sm' | 'md' | 'lg' | 'xl' | '2xl'} ModalSize
   */

  let {
    isOpen = $bindable(false),
    title = "",
    size = "md",
    closable = true,
    closeOnBackdrop = true,
    closeOnEscape = true,
    tone = "primary",
    children,
    footer,
    onclose,
    zIndex = 50,
    ...restProps
  } = $props();

  // Portal container reference
  let portalTarget = $state(null);

  // Size class mappings
  const sizeClassMap = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-4xl",
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

  // Create portal target on mount
  onMount(() => {
    portalTarget = document.createElement("div");
    portalTarget.id = "modal-portal";
    document.body.appendChild(portalTarget);
  });

  // Portal action - moves the element to document.body
  function portal(node) {
    // Move node to the portal target
    if (portalTarget) {
      portalTarget.appendChild(node);
    } else {
      // Fallback: move directly to body
      document.body.appendChild(node);
    }

    return {
      destroy() {
        // Remove node from portal when destroyed
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      },
    };
  }

  function manageDialog(node) {
    return { destroy: registerDialog(node, () => { if (closeOnEscape && closable) handleClose(); }) };
  }
  $effect(() => () => { portalTarget?.remove(); });
  const titleId = $props.id();
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    use:portal
    use:manageDialog
    tabindex="-1"
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? titleId : undefined}
    onclick={handleBackdropClick}
    transition:fade={{ duration: 200 }}
    style="z-index: {zIndex};"
    {...restProps}
  >
    <div
      class="modal-content modal-tone-{tone} {sizeClasses}"
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <!-- Header -->
      {#if title || closable}
        <div class="modal-header">
          {#if title}
            <div class="modal-heading">
              <span class="modal-title-accent" aria-hidden="true"></span>
              <h2 id={titleId} class="modal-title">{title}</h2>
            </div>
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
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background:
      radial-gradient(circle at 50% 15%, hsl(var(--primary) / 0.07), transparent 34rem),
      rgba(0, 0, 0, 0.76);
    backdrop-filter: blur(7px) saturate(0.88);
  }

  .modal-content {
    --modal-accent: var(--primary);
    width: 100%;
    max-height: calc(100vh - 2rem);
    max-height: calc(100dvh - 2rem);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
    isolation: isolate;
    background:
      linear-gradient(145deg, hsl(var(--card-elevated)) 0%, hsl(var(--card)) 58%, hsl(var(--background)) 135%);
    border: 1px solid hsl(var(--modal-accent) / 0.22);
    border-radius: 1rem;
    box-shadow:
      0 34px 90px -30px rgba(0, 0, 0, 0.88),
      0 0 0 1px hsl(var(--modal-accent) / 0.045),
      0 0 44px -28px hsl(var(--modal-accent) / 0.55);
  }

  .modal-content::before {
    content: "";
    position: absolute;
    inset: 0 0 auto;
    height: 3px;
    z-index: 2;
    background: linear-gradient(90deg, transparent 4%, hsl(var(--modal-accent) / 0.42) 22%, hsl(var(--modal-accent)) 50%, hsl(var(--modal-accent) / 0.42) 78%, transparent 96%);
    pointer-events: none;
  }

  .modal-tone-success { --modal-accent: var(--success); }
  .modal-tone-info { --modal-accent: var(--info); }
  .modal-tone-warning { --modal-accent: var(--warning); }
  .modal-tone-destructive { --modal-accent: var(--destructive); }

  .modal-heading {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.75rem;
  }

  .modal-title-accent {
    width: 0.25rem;
    height: 1.8rem;
    flex: 0 0 auto;
    border-radius: 999px;
    background: hsl(var(--modal-accent));
    box-shadow: 0 0 18px hsl(var(--modal-accent) / 0.28);
  }

  .modal-title {
    min-width: 0;
    color: hsl(var(--foreground));
    font-size: 1.18rem;
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -0.018em;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.05rem 1.25rem;
    border-bottom: 1px solid hsl(var(--modal-accent) / 0.14);
    background: linear-gradient(90deg, hsl(var(--modal-accent) / 0.085), hsl(var(--card) / 0.45) 48%, transparent 100%);
  }

  .modal-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.15rem;
    height: 2.15rem;
    flex: 0 0 auto;
    border: 1px solid hsl(var(--modal-accent) / 0.14);
    border-radius: 0.65rem;
    background: hsl(var(--background) / 0.34);
    color: hsl(var(--muted-foreground));
    transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 150ms ease;
  }

  .modal-close:hover {
    border-color: hsl(var(--modal-accent) / 0.34);
    background-color: hsl(var(--modal-accent) / 0.11);
    color: hsl(var(--modal-accent));
    transform: translateY(-1px);
  }

  .modal-close:focus-visible {
    outline: 2px solid hsl(var(--modal-accent));
    outline-offset: 2px;
  }

  .modal-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    padding: 1.25rem;
    background: radial-gradient(circle at 12% 0%, hsl(var(--modal-accent) / 0.035), transparent 22rem);
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid hsl(var(--border));
    background: hsl(var(--background) / 0.28);
  }

  @media (max-width: 640px) {
    .modal-backdrop {
      align-items: flex-end;
      padding-top: max(0.5rem, env(safe-area-inset-top));
      padding-right: max(0.5rem, env(safe-area-inset-right));
      padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
      padding-left: max(0.5rem, env(safe-area-inset-left));
    }

    .modal-content {
      max-height: calc(100dvh - 1rem - env(safe-area-inset-top) - env(safe-area-inset-bottom));
      border-radius: 1rem;
    }

    .modal-header,
    .modal-body,
    .modal-footer {
      padding-left: 1rem;
      padding-right: 1rem;
    }

    .modal-header {
      padding-top: 0.875rem;
      padding-bottom: 0.875rem;
    }

    .modal-body {
      padding-top: 1rem;
      padding-bottom: 1rem;
    }

    .modal-footer {
      flex-wrap: wrap;
      padding-top: 0.875rem;
      padding-bottom: 0.875rem;
    }
  }
</style>
