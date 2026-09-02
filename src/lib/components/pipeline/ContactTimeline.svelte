<!--
  ContactTimeline.svelte
  A vertical timeline component displaying follow-up interactions for a contact.
  
  Props:
  - followUps: Array - list of follow-up objects
    ({ follow_up_date, method, outcome, notes, leader_name, promised_date, promise_fulfilled })
  - contactName: String - name of the contact (displayed in optional header)
-->

<script>
  import { Badge } from "$lib/components/ui";

  /**
   * @typedef {Object} FollowUp
   * @property {string} [_id]
   * @property {string} [id]
   * @property {string} follow_up_date
   * @property {string} method
   * @property {string} outcome
   * @property {string} [notes]
   * @property {string} [leader_name]
   * @property {string} [promised_date]
   * @property {boolean} [promise_fulfilled]
   */

  let {
    followUps = [],
    contactName = "",
  } = $props();

  /**
   * Configuration map for outcome badge variants, badge labels, and dot border classes.
   */
  const outcomeConfig = {
    promised_to_come: {
      variant: "info",
      text: "Promised to Come",
      borderClass: "border-primary",
    },
    positive_conversation: {
      variant: "success",
      text: "Positive",
      borderClass: "border-success",
    },
    no_response: {
      variant: "warning",
      text: "No Response",
      borderClass: "border-warning",
    },
    not_interested: {
      variant: "danger",
      text: "Not Interested",
      borderClass: "border-destructive",
    },
    came_to_church: {
      variant: "success",
      text: "Came to Church! ✅",
      borderClass: "border-success",
    },
    rescheduled: {
      variant: "info",
      text: "Rescheduled",
      borderClass: "border-primary",
    },
    wrong_number: {
      variant: "danger",
      text: "Wrong Number",
      borderClass: "border-destructive",
    },
    on_holiday: {
      variant: "default",
      text: "On Holiday 🏖️",
      borderClass: "border-border",
    },
    asked_to_pause: {
      variant: "default",
      text: "Paused",
      borderClass: "border-border",
    },
    busy_period: {
      variant: "default",
      text: "Busy Period",
      borderClass: "border-border",
    },
  };

  /**
   * Configuration map for follow-up methods.
   */
  const methodConfig = {
    call: { icon: "📞", label: "Call" },
    whatsapp: { icon: "💬", label: "WhatsApp" },
    in_person: { icon: "🤝", label: "In Person" },
    sms: { icon: "📱", label: "SMS" },
    other: { icon: "📋", label: "Other" },
  };

  /**
   * Helper to retrieve outcome display details.
   */
  function getOutcomeDetails(outcome) {
    if (outcome && outcomeConfig[outcome]) {
      return outcomeConfig[outcome];
    }
    return {
      variant: "default",
      text: outcome ? outcome.replace(/_/g, " ") : "Unknown",
      borderClass: "border-border",
    };
  }

  /**
   * Helper to retrieve method display details.
   */
  function getMethodDetails(method) {
    if (method && methodConfig[method]) {
      return methodConfig[method];
    }
    return {
      icon: "📋",
      label: method ? method.replace(/_/g, " ") : "Other",
    };
  }

  /**
   * Helper to format date strings to a readable format (e.g. Oct 24, 2024).
   */
  function formatDate(dateStr) {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("T")[0].split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts;
        const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  /**
   * Helper to get promised fulfillment status text and emoji.
   */
  function getFulfilledStatus(fulfilled) {
    if (fulfilled === true) {
      return "✅ Showed";
    }
    if (fulfilled === false) {
      return "❌ No Show";
    }
    return "⏳ Pending";
  }
</script>

<div class="contact-timeline w-full">
  {#if contactName}
    <div class="mb-4 pb-2 border-b border-border">
      <h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Timeline — {contactName}
      </h3>
    </div>
  {/if}

  {#if !followUps || followUps.length === 0}
    <div class="py-8 text-center">
      <p class="text-sm text-muted-foreground">No follow-ups recorded yet</p>
    </div>
  {:else}
    <div class="border-l-2 border-border ml-2.5 space-y-6">
      {#each followUps as item, index (item._id || item.id || index)}
        {@const outcome = getOutcomeDetails(item.outcome)}
        {@const method = getMethodDetails(item.method)}
        <div class="pl-6 relative">
          <!-- Timeline dot with outcome-based border color -->
          <span
            class="absolute left-[-9px] top-1 w-4 h-4 rounded-full border-2 bg-card {outcome.borderClass}"
            aria-hidden="true"
          ></span>

          <!-- Header: Date, Method, Outcome Badge -->
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-medium text-foreground">
              {formatDate(item.follow_up_date)}
            </span>

            <span class="text-xs text-muted-foreground flex items-center gap-1">
              <span>{method.icon}</span>
              <span>{method.label}</span>
            </span>

            <Badge variant={outcome.variant} size="sm">
              {outcome.text}
            </Badge>
          </div>

          <!-- Promised Date and Fulfillment Status -->
          {#if item.promised_date}
            <div class="text-xs text-foreground/90 mt-1 flex items-center gap-1.5 flex-wrap">
              <span class="text-muted-foreground">Promised for:</span>
              <span class="font-medium">{formatDate(item.promised_date)}</span>
              <span class="text-xs">({getFulfilledStatus(item.promise_fulfilled)})</span>
            </div>
          {/if}

          <!-- Leader attribution -->
          {#if item.leader_name}
            <p class="text-xs text-muted-foreground mt-0.5">
              by {item.leader_name}
            </p>
          {/if}

          <!-- Notes -->
          {#if item.notes}
            <p class="text-xs text-muted-foreground italic mt-1">
              {item.notes}
            </p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
