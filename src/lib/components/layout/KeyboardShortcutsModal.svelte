<!--
  KeyboardShortcutsModal.svelte
  Modal displaying all keyboard shortcuts available in Church Tracker.
-->
<script>
  import Modal from "$lib/components/ui/Modal.svelte";
  import Button from "$lib/components/ui/Button.svelte";

  let { isOpen = $bindable(false), onclose } = $props();

  const shortcutGroups = [
    {
      title: "Global Navigation & Controls",
      shortcuts: [
        { keys: ["⌘ / Ctrl", "K"], description: "Open Global Search" },
        { keys: ["⌘ / Ctrl", "B"], description: "Toggle Left Sidebar" },
        { keys: ["Esc"], description: "Close any open modal or dropdown" },
      ],
    },
    {
      title: "Module Shortcuts",
      shortcuts: [
        { keys: ["Alt", "1"], description: "Jump to Dashboard" },
        { keys: ["Alt", "2"], description: "Jump to Evangelism Outreach" },
        { keys: ["Alt", "3"], description: "Jump to Sunday Services" },
        { keys: ["Alt", "4"], description: "Jump to Meetings & Attendance" },
        { keys: ["Alt", "5"], description: "Jump to People Directory" },
        { keys: ["Alt", "6"], description: "Jump to Pastoral Care" },
        { keys: ["Alt", "7"], description: "Jump to Reports & Trends" },
      ],
    },
  ];
</script>

<Modal bind:isOpen title="Keyboard Shortcuts" size="md" {onclose}>
  <div class="space-y-6">
    {#each shortcutGroups as group}
      <div>
        <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {group.title}
        </h4>
        <div class="space-y-2">
          {#each group.shortcuts as shortcut}
            <div class="flex items-center justify-between py-1.5 px-2 rounded-lg bg-secondary/30 border border-border/40">
              <span class="text-sm text-foreground font-medium">{shortcut.description}</span>
              <div class="flex items-center space-x-1">
                {#each shortcut.keys as key}
                  <kbd class="px-2 py-1 text-xs font-mono font-semibold text-foreground bg-secondary border border-border rounded shadow-sm">
                    {key}
                  </kbd>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  {#snippet footer()}
    <div class="w-full flex justify-end">
      <Button variant="secondary" size="sm" onclick={() => { isOpen = false; onclose?.(); }}>
        Got it
      </Button>
    </div>
  {/snippet}
</Modal>
