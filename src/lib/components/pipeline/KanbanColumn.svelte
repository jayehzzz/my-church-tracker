<!--
  KanbanColumn.svelte
  A single column in the Kanban board displaying contacts at a particular pipeline stage.
  
  Features:
  - Column header with stage label, emoji, and count
  - Scrollable card list
  - Empty state messaging
  - Visual styling per stage
  - Uses Svelte 5 runes syntax
-->

<script>
  import KanbanCard from './KanbanCard.svelte';

  /**
   * @param {string} stage - Pipeline stage key
   * @param {string} label - Display label for the column
   * @param {string} emoji - Emoji icon for the column
   * @param {Array} contacts - Contacts in this stage
   * @param {string} colorClass - Tailwind color class for the header accent
   * @param {Function} onLogFollowUp - Callback when 'Log Follow-Up' is clicked on a card
   * @param {Function} onViewTimeline - Callback when a card is clicked
   */
  let {
    stage = '',
    label = '',
    emoji = '',
    contacts = [],
    colorClass = 'text-primary',
    onLogFollowUp = () => {},
    onViewTimeline = () => {},
  } = $props();

  const count = $derived(contacts.length);
</script>

<div class="kanban-column flex flex-col min-w-[280px] max-w-[320px] w-full">
  <!-- Column Header -->
  <div class="flex items-center justify-between px-3 py-2.5 rounded-t-xl border border-border bg-card">
    <div class="flex items-center gap-2">
      <span class="text-base">{emoji}</span>
      <span class="text-sm font-semibold {colorClass}">{label}</span>
    </div>
    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-xs font-medium text-muted-foreground">
      {count}
    </span>
  </div>

  <!-- Card List -->
  <div class="flex-1 overflow-y-auto p-2 space-y-2 rounded-b-xl border border-t-0 border-border bg-background/50 min-h-[200px] max-h-[calc(100vh-320px)]">
    {#if contacts.length > 0}
      {#each contacts as contact (contact._id)}
        <KanbanCard
          {contact}
          onLogFollowUp={() => onLogFollowUp(contact)}
          onViewTimeline={() => onViewTimeline(contact)}
        />
      {/each}
    {:else}
      <div class="flex items-center justify-center h-32 text-sm text-muted-foreground/50">
        No contacts here
      </div>
    {/if}
  </div>
</div>

<style>
  .kanban-column {
    flex-shrink: 0;
  }
</style>
