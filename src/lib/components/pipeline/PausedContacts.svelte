<!--
  PausedContacts.svelte
  Shows contacts that are currently snoozed/paused with their resume dates.
  
  Features:
  - List of paused contacts with reason and resume date
  - Visual countdown to resume
  - Option to manually resume early
  - Uses Svelte 5 runes syntax
-->

<script>
  import { Badge } from '$lib/components/ui';

  /**
   * @param {Array} contacts - Paused contact objects
   * @param {Function} onResume - Callback(contactId) to manually resume a contact
   */
  let {
    contacts = [],
    onResume = () => {},
  } = $props();

  // Pause reason display mapping
  const pauseReasonMap = {
    on_holiday: { label: 'On Holiday', emoji: '🏖️' },
    asked_to_pause: { label: 'Asked to Pause', emoji: '✋' },
    busy_period: { label: 'Busy Period', emoji: '📅' },
  };

  function getResumeInfo(resumeDate) {
    if (!resumeDate) return { label: 'No resume date set', overdue: false };
    const now = new Date();
    const resume = new Date(resumeDate);
    const days = Math.ceil((resume.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (days < 0) return { label: `${Math.abs(days)} days overdue`, overdue: true };
    if (days === 0) return { label: 'Resuming today', overdue: false };
    if (days === 1) return { label: 'Resuming tomorrow', overdue: false };
    return { label: `Resuming in ${days} days`, overdue: false };
  }
</script>

<div class="space-y-4">
  <div class="flex items-center gap-2">
    <span class="text-lg">⏸️</span>
    <h3 class="text-base font-semibold text-foreground">
      Paused Contacts
    </h3>
    <Badge variant="default">{contacts.length}</Badge>
  </div>

  {#if contacts.length === 0}
    <div class="text-center py-8 text-muted-foreground">
      <p class="text-sm">No contacts are currently paused.</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each contacts as contact}
        {@const reason = pauseReasonMap[contact.pause_reason] || { label: 'Paused', emoji: '⏸️' }}
        {@const resumeInfo = getResumeInfo(contact.resume_date)}
        <div class="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
          <div class="flex items-center gap-3">
            <span class="text-lg">{reason.emoji}</span>
            <div>
              <p class="text-sm font-medium text-foreground">
                {contact.first_name} {contact.last_name}
              </p>
              <p class="text-xs text-muted-foreground">
                {reason.label}
                · <span class={resumeInfo.overdue ? 'text-destructive font-medium' : ''}>
                  {resumeInfo.label}
                </span>
              </p>
            </div>
          </div>
          <button
            onclick={() => onResume(contact._id)}
            class="text-xs text-primary hover:bg-primary/10 rounded px-2 py-1 transition-colors"
          >
            Resume
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
