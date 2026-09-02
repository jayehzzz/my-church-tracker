<!--
  FollowUpForm.svelte
  A modal form for logging a new follow-up interaction for a contact.
  
  Props:
  - isOpen: $bindable(false) - boolean to control modal visibility
  - contact: Object - contact details ({ first_name, last_name, _id })
  - leaders: Array - list of leader objects ({ _id, first_name, last_name })
  - onsubmit: Function - callback(data) when form is submitted
-->

<script>
  import { Modal, Button } from "$lib/components/ui";

  /**
   * @typedef {Object} Contact
   * @property {string} [_id]
   * @property {string} [id]
   * @property {string} [first_name]
   * @property {string} [last_name]
   * @property {string} [invited_by_id]
   */

  /**
   * @typedef {Object} Leader
   * @property {string} [_id]
   * @property {string} [id]
   * @property {string} first_name
   * @property {string} last_name
   */

  let {
    isOpen = $bindable(false),
    contact = null,
    leaders = [],
    onsubmit,
  } = $props();

  // Helper to get today's date formatted as YYYY-MM-DD
  function getTodayString() {
    return new Date().toISOString().split("T")[0];
  }

  // Form State
  let leaderId = $state("");
  let followUpDate = $state(getTodayString());
  let method = $state("call");
  let outcome = $state("positive_conversation");
  let promisedDate = $state("");
  let resumeDate = $state("");
  let notes = $state("");
  let errorMsg = $state("");

  // Pause outcomes list
  const PAUSE_OUTCOMES = ["on_holiday", "asked_to_pause", "busy_period"];

  // Method options
  const methodOptions = [
    { value: "call", label: "Call" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "in_person", label: "In Person" },
    { value: "sms", label: "SMS" },
    { value: "other", label: "Other" },
  ];

  // Outcome options
  const outcomeOptions = [
    { value: "promised_to_come", label: "Promised to Come" },
    { value: "positive_conversation", label: "Positive Conversation" },
    { value: "no_response", label: "No Response" },
    { value: "not_interested", label: "Not Interested" },
    { value: "rescheduled", label: "Rescheduled" },
    { value: "wrong_number", label: "Wrong Number" },
    { value: "came_to_church", label: "Came to Church" },
    { value: "on_holiday", label: "On Holiday" },
    { value: "asked_to_pause", label: "Asked to Pause" },
    { value: "busy_period", label: "Busy Period" },
  ];

  // Contact full name
  const contactName = $derived(
    contact
      ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim()
      : ""
  );

  const modalTitle = $derived(
    contactName ? `Log Follow-Up — ${contactName}` : "Log Follow-Up"
  );

  // Derived conditions for dynamic fields
  const showPromisedDate = $derived(outcome === "promised_to_come");
  const showResumeDate = $derived(PAUSE_OUTCOMES.includes(outcome));

  // Reset/populate form when modal opens
  $effect(() => {
    if (isOpen) {
      errorMsg = "";
      followUpDate = getTodayString();
      method = "call";
      outcome = "positive_conversation";
      promisedDate = "";
      resumeDate = "";
      notes = "";

      // Default leader to contact's assigned leader if available, otherwise first leader
      if (contact?.invited_by_id) {
        leaderId = contact.invited_by_id;
      } else if (leaders && leaders.length > 0) {
        leaderId = leaders[0]._id || leaders[0].id || "";
      } else {
        leaderId = "";
      }
    }
  });

  function handleCancel() {
    isOpen = false;
  }

  function handleSubmit() {
    errorMsg = "";

    if (!leaderId && leaders && leaders.length > 0) {
      errorMsg = "Please select a leader.";
      return;
    }

    if (!followUpDate) {
      errorMsg = "Please select a follow-up date.";
      return;
    }

    if (showPromisedDate && !promisedDate) {
      errorMsg = "Please select the promised attendance date.";
      return;
    }

    if (showResumeDate && !resumeDate) {
      errorMsg = "Please select a resume date.";
      return;
    }

    const payload = {
      contact_id: contact?._id || contact?.id,
      leader_id: leaderId,
      follow_up_date: followUpDate,
      method,
      outcome,
      ...(showPromisedDate && promisedDate ? { promised_date: promisedDate } : {}),
      ...(showResumeDate && resumeDate ? { resume_date: resumeDate } : {}),
      notes: notes.trim() || undefined,
    };

    onsubmit?.(payload);
    isOpen = false;
  }
</script>

<Modal bind:isOpen title={modalTitle} size="lg">
  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleSubmit();
    }}
    class="space-y-4"
  >
    {#if errorMsg}
      <div
        class="p-3 bg-destructive/15 border border-destructive/30 rounded-lg text-destructive text-sm"
        role="alert"
      >
        {errorMsg}
      </div>
    {/if}

    <!-- Leader Field -->
    <div>
      <label for="followup-leader" class="text-sm font-medium text-foreground mb-1 block">
        Leader
      </label>
      <select
        id="followup-leader"
        bind:value={leaderId}
        class="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        required
      >
        {#if !leaderId}
          <option value="" disabled>Select Leader</option>
        {/if}
        {#each leaders as leader (leader._id || leader.id)}
          <option value={leader._id || leader.id}>
            {leader.first_name} {leader.last_name}
          </option>
        {/each}
      </select>
    </div>

    <!-- Date + Method Two-Column Layout -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="followup-date" class="text-sm font-medium text-foreground mb-1 block">
          Date
        </label>
        <input
          id="followup-date"
          type="date"
          bind:value={followUpDate}
          class="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          required
        />
      </div>

      <div>
        <label for="followup-method" class="text-sm font-medium text-foreground mb-1 block">
          Method
        </label>
        <select
          id="followup-method"
          bind:value={method}
          class="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          required
        >
          {#each methodOptions as opt (opt.value)}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Outcome Field -->
    <div>
      <label for="followup-outcome" class="text-sm font-medium text-foreground mb-1 block">
        Outcome
      </label>
      <select
        id="followup-outcome"
        bind:value={outcome}
        class="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        required
      >
        {#each outcomeOptions as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>

    <!-- Promised Date (only shown if outcome is promised_to_come) -->
    {#if showPromisedDate}
      <div>
        <label for="followup-promised-date" class="text-sm font-medium text-foreground mb-1 block">
          Promised Date
        </label>
        <input
          id="followup-promised-date"
          type="date"
          bind:value={promisedDate}
          class="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          required
        />
      </div>
    {/if}

    <!-- Resume Date (only shown if outcome is on_holiday, asked_to_pause, or busy_period) -->
    {#if showResumeDate}
      <div>
        <label for="followup-resume-date" class="text-sm font-medium text-foreground mb-1 block">
          Resume Date
        </label>
        <input
          id="followup-resume-date"
          type="date"
          bind:value={resumeDate}
          class="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          required
        />
      </div>
    {/if}

    <!-- Notes Field -->
    <div>
      <label for="followup-notes" class="text-sm font-medium text-foreground mb-1 block">
        Notes
      </label>
      <textarea
        id="followup-notes"
        bind:value={notes}
        placeholder="Add details about the conversation..."
        class="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none min-h-[80px] resize-none"
      ></textarea>
    </div>
  </form>

  {#snippet footer()}
    <Button variant="secondary" onclick={handleCancel}>
      Cancel
    </Button>
    <Button onclick={handleSubmit}>
      Log Follow-Up
    </Button>
  {/snippet}
</Modal>
