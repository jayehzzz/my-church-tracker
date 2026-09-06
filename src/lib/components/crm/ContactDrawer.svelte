<!--
  ContactDrawer.svelte
  ====================
  A slide-over drawer displaying caller intelligence: contact information,
  1-click communication actions (Call, WhatsApp, SMS), past call history,
  and Sunday commitment records.
-->

<script>
  import { fade, fly } from 'svelte/transition';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { getContactProfile } from '$lib/services/followUpCrmService.js';

  let {
    isOpen = $bindable(false),
    person = null,
    onLogCall = () => {},
    onEditProfile = () => {},
    onClose = () => {},
  } = $props();

  let loadingProfile = $state(false);
  let profileData = $state(null);
  let drawerElement = $state(null);
  let previousActiveElement = $state(null);

  function personId(target) {
    return target?._id || target?.id;
  }

  function personName(target) {
    return (
      target?.name ||
      [target?.preferred_name || target?.first_name, target?.last_name]
        .filter(Boolean)
        .join(' ') ||
      'Unnamed person'
    );
  }

  function initials(target) {
    const name = personName(target);
    const parts = name.split(' ').filter(Boolean);
    return (
      (parts[0]?.[0] || '') + (parts.length > 1 ? parts.at(-1)[0] : '')
    ).toUpperCase() || '?';
  }

  function cleanPhoneNumber(phone) {
    if (!phone) return '';
    return String(phone).replace(/[^\d+]/g, '');
  }

  function whatsAppUrl(phone, name) {
    const clean = cleanPhoneNumber(phone).replace(/^\+/, '');
    if (!clean) return '';
    const firstName = name.split(' ')[0] || 'there';
    const message = encodeURIComponent(
      `Hi ${firstName}, hope you're having a blessed week! Reaching out from church to check in on you.`,
    );
    return `https://wa.me/${clean}?text=${message}`;
  }

  function formatDate(value) {
    if (!value) return '';
    try {
      const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return value;
    }
  }

  function outcomeLabel(outcome) {
    const map = {
      positive_conversation: 'Good conversation',
      rescheduled: 'Agreed to speak again',
      no_response: 'No answer',
      not_serious_now: 'Not serious right now',
      not_interested: 'Not interested',
      wrong_number: 'Wrong number',
    };
    return map[outcome] || String(outcome || '').replace(/_/g, ' ');
  }

  function handleKeydown(event) {
    if (!isOpen) return;
    if (event.key === 'Escape') {
      handleClose();
      return;
    }
    if (event.key === 'Tab' && drawerElement) {
      const focusable = drawerElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  function handleClose() {
    isOpen = false;
    onClose();
  }

  $effect(() => {
    if (typeof window === 'undefined') return;
    if (isOpen) {
      previousActiveElement = document.activeElement;
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => drawerElement?.querySelector('button, [href], input, select, textarea')?.focus(), 50);
      return () => clearTimeout(timer);
    }
    document.body.style.overflow = '';
    previousActiveElement?.focus?.();
  });

  $effect(() => () => {
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  });

  $effect(() => {
    const id = personId(person);
    if (isOpen && id) {
      loadingProfile = true;
      getContactProfile(id)
        .then((res) => {
          if (res?.data) {
            profileData = res.data;
          }
        })
        .finally(() => {
          loadingProfile = false;
        });
    } else if (!isOpen) {
      profileData = null;
    }
  });
  const touchpoints = $derived(profileData?.follow_ups?.length
    ? profileData.follow_ups
    : profileData?.completed_tasks || []);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && person}
  <div
    class="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity"
    transition:fade={{ duration: 150 }}
  >
    <button
      type="button"
      class="absolute inset-0 h-full w-full cursor-default"
      aria-label="Close contact drawer"
      onclick={handleClose}
    ></button>
    <div
      bind:this={drawerElement}
      class="flex h-full w-full max-w-lg flex-col border-l border-border bg-card text-foreground shadow-2xl"
      transition:fly={{ x: 300, duration: 200 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-drawer-title"
      tabindex="-1"
    >
      <!-- Drawer Header -->
      <div class="flex items-start justify-between border-b border-border p-5">
        <div class="flex items-center gap-3 min-w-0">
          <span
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary"
          >
            {initials(person)}
          </span>
          <div class="min-w-0">
            <h2 id="contact-drawer-title" class="truncate text-lg font-bold text-foreground">
              {personName(person)}
            </h2>
            <p class="truncate text-xs text-muted-foreground">
              {#if person.phone}
                <span class="font-mono">{person.phone}</span>
              {:else}
                <span>No phone number</span>
              {/if}
              {#if person.invited_by_name}
                · Invited by {person.invited_by_name}
              {/if}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          onclick={handleClose}
          aria-label="Close drawer"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Quick Communication Action Bar -->
      <div class="grid grid-cols-3 gap-2 border-b border-border bg-secondary/30 p-3">
        {#if person.phone}
          <a
            href="tel:{cleanPhoneNumber(person.phone)}"
            class="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-primary/10 transition-colors"
          >
            <svg class="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call
          </a>
          <a
            href={whatsAppUrl(person.phone, personName(person))}
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-xs font-semibold text-foreground hover:border-success/50 hover:bg-success/10 transition-colors"
          >
            <svg class="h-3.5 w-3.5 text-success" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.53 1.942.812 2.791.812 3.179 0 5.766-2.587 5.766-5.768 0-3.18-2.587-5.766-5.766-5.766zm9.969 5.766c0 5.517-4.484 9.999-10 9.999-1.748 0-3.385-.45-4.819-1.238l-5.181 1.357 1.385-5.048c-.86-1.488-1.385-3.224-1.385-5.07 0-5.516 4.484-10 10-10 5.516 0 10 4.484 10 10z"/>
            </svg>
            WhatsApp
          </a>
        {:else}
          <div class="col-span-2 flex items-center justify-center py-2 text-xs text-muted-foreground">
            No phone available
          </div>
        {/if}
        <Button
          size="sm"
          class="w-full"
          onclick={() => {
            handleClose();
            onLogCall();
          }}
        >
          Log Call
        </Button>
      </div>

      <!-- Drawer Body (Scrollable) -->
      <div class="flex-1 space-y-6 overflow-y-auto p-5">
        <!-- Overview Chips -->
        <div class="flex flex-wrap gap-2">
          <Badge variant="default" size="sm">
            {person.member_status === 'member' ? 'Regular Member' : 'Newcomer / Follow-Up'}
          </Badge>
          {#if person.assigned_leader}
            <Badge variant="info" size="sm">
              Worker: {person.assigned_leader.name || person.assigned_leader.first_name || 'Assigned'}
            </Badge>
          {/if}
          {#if (person.attended_meetings || person.promises_kept || 0) > 0}
            <Badge variant="success" size="sm">
              Attended {person.attended_meetings || person.promises_kept} {person.attended_meetings === 1 ? 'Sunday' : 'Sundays'}
            </Badge>
          {/if}
        </div>

        <!-- Contact Quick Information -->
        <section class="rounded-xl border border-border bg-secondary/20 p-4 space-y-2 text-xs">
          <h3 class="font-semibold uppercase tracking-wider text-muted-foreground">Details</h3>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-xs text-muted-foreground block">Email</span>
              <span class="font-medium">{person.email || 'Not provided'}</span>
            </div>
            <div>
              <span class="text-xs text-muted-foreground block">Location / City</span>
              <span class="font-medium">{person.city || person.address || 'Not recorded'}</span>
            </div>
            <div>
              <span class="text-xs text-muted-foreground block">Invited by</span>
              <span class="font-medium">{person.invited_by_name || 'Direct / Walk-in'}</span>
            </div>
            <div>
              <span class="text-xs text-muted-foreground block">Met on</span>
              <span class="font-medium">{formatDate(person.contact_date || person.created_at) || 'Unknown'}</span>
            </div>
          </div>
        </section>

        <!-- Sunday Commitment History -->
        <section class="space-y-2.5">
          <h3 class="text-sm font-semibold text-foreground flex items-center justify-between">
            <span>Sunday Commitments</span>
            {#if profileData?.commitments?.length}
              <span class="text-xs text-muted-foreground font-normal">
                {profileData.commitments.length} logged
              </span>
            {/if}
          </h3>

          {#if loadingProfile}
            <p class="text-xs text-muted-foreground">Loading commitments…</p>
          {:else if profileData?.commitments?.length}
            <div class="space-y-2">
              {#each profileData.commitments as commitment}
                <div class="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs">
                  <div>
                    <span class="font-medium text-foreground">
                      {formatDate(commitment.gathering_date || commitment.service_date)}
                    </span>
                    <p class="text-muted-foreground text-[11px]">
                      {commitment.gathering_type === 'sunday_service' ? 'Sunday Service' : (commitment.gathering_type || 'Gathering')}
                    </p>
                  </div>
                  <Badge
                    size="sm"
                    variant={commitment.resolution === 'attended' ? 'success' : commitment.resolution === 'no_show' ? 'danger' : 'info'}
                  >
                    {commitment.resolution === 'attended' ? 'Attended' : commitment.resolution === 'no_show' ? 'Didn’t attend' : 'Said yes'}
                  </Badge>
                </div>
              {/each}
            </div>
          {:else}
            <p class="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
              No Sunday attendance commitments recorded yet.
            </p>
          {/if}
        </section>

        <!-- Previous Touchpoints & Follow-Up Notes -->
        <section class="space-y-2.5">
          <h3 class="text-sm font-semibold text-foreground flex items-center justify-between">
            <span>Call History & Notes</span>
            {#if touchpoints.length}
              <span class="text-xs text-muted-foreground font-normal">
                {touchpoints.length} touchpoints
              </span>
            {/if}
          </h3>

          {#if loadingProfile}
            <p class="text-xs text-muted-foreground">Loading interaction timeline…</p>
          {:else if touchpoints.length > 0}
            <div class="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {#each touchpoints as item}
                <div class="relative text-xs space-y-1">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-semibold text-foreground">
                      {outcomeLabel(item.outcome)}{item.care_status === "cancelled" ? " (cancelled)" : ""}
                    </span>
                    <span class="text-[11px] text-muted-foreground">
                      {formatDate(item.completed_at || item.follow_up_date || item.updated_at)}
                    </span>
                  </div>
                  {#if item.notes}
                    <p class="rounded-md bg-secondary/50 p-2 text-xs text-foreground/90 italic">
                      "{item.notes}"
                    </p>
                  {/if}
                  <p class="text-[11px] text-muted-foreground">
                    Via {item.method || 'Phone call'}
                    {#if item.leader?.name || item.assigned_leader?.name}
                      · by {item.leader?.name || item.assigned_leader?.name}
                    {/if}
                  </p>
                </div>
              {/each}
            </div>
          {:else}
            <p class="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No previous call logs or touchpoints recorded yet.
            </p>
          {/if}
        </section>
      </div>

      <!-- Drawer Footer -->
      <div class="flex items-center justify-between border-t border-border p-4 bg-secondary/20">
        <a
          href="/people/{personId(person)}"
          class="text-xs font-semibold text-primary hover:underline"
        >
          View full directory profile →
        </a>
        <Button variant="ghost" size="sm" onclick={onEditProfile}>
          Edit Profile
        </Button>
      </div>
    </div>
  </div>
{/if}
