<script>
  import { Modal, Button, Badge } from "$lib/components/ui";
  import { goto } from "$app/navigation";

  let {
    isOpen = $bindable(false), contact = null, profile = null, profileLoading = false,
    leaders = [], onEdit = null, onDelete = null, onConvert = null,
    onQuickUpdate = null, onAssign = null, onOpenCrm = null,
  } = $props();

  let activeTab = $state("overview");
  let ownerId = $state("");
  let assigning = $state(false);
  let assignmentError = $state("");
  let updatingResponse = $state(false);

  const responseOptions = [
    ["not_assessed", "Not assessed"], ["responsive", "Open to follow-up"], ["non_responsive", "Not responding"],
    ["events_only", "Events only"], ["big_events_only", "Big events only"],
    ["bacenta_mainly", "Bacenta mainly"], ["has_church", "Has another church"],
    ["do_not_contact", "Do not contact"],
  ];

  const owner = $derived(profile?.active_assignment?.assigned_leader || contact?.assigned_leader || contact?.crm_assignment?.assigned_leader || null);
  const openTasks = $derived((profile?.tasks || []).filter((task) => task.status === "open"));
  const nextTask = $derived(contact?.crm_next_task || openTasks[0] || null);
  const latestSunday = $derived(contact?.crm_sunday_commitment || (profile?.commitments || []).find((item) => item.gathering_type === "sunday_service") || null);
  const tabs = $derived([
    { id: "overview", label: "Overview" },
    { id: "activity", label: "Follow-up activity", count: (profile?.follow_ups?.length || 0) + (profile?.tasks?.length || 0) },
    {
      id: "attendance",
      label: "Gatherings & visits",
      count: (profile?.commitments?.length || 0)
        + (profile?.meeting_attendance?.length || 0)
        + (profile?.visitations?.length || 0),
    },
  ]);
  const activityItems = $derived(() => [
    ...(profile?.follow_ups || []).map((item) => ({
      id: item._id, date: item.created_at || item.follow_up_date, type: "interaction",
      title: `${readable(item.method, "Contact")} · ${readable(item.outcome, "Outcome recorded")}`,
      detail: item.notes || `Recorded by ${personName(item.leader)}`,
    })),
    ...(profile?.tasks || []).map((item) => ({
      id: item._id, date: item.completed_at || item.created_at || item.due_date, type: "task",
      title: `${readable(item.task_type, "Follow-up task")} · ${readable(item.status, "Open")}`,
      detail: item.reason || `Due ${formatShortDate(item.due_date)}`,
    })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date))));

  $effect(() => {
    if (!isOpen) return;
    activeTab = "overview";
    ownerId = owner?._id || owner?.id || "";
    assignmentError = "";
  });

  function personName(person) {
    return [person?.first_name, person?.last_name].filter(Boolean).join(" ") || "Unassigned";
  }

  function formatShortDate(value) {
    if (!value) return "—";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function readable(value, fallback = "—") {
    if (!value) return fallback;
    return String(value).replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function responseLabel(value) {
    return responseOptions.find((option) => option[0] === value)?.[1] || readable(value, "Not assessed");
  }

  function meetingName(meeting) {
    return meeting?.title || meeting?.topic || readable(meeting?.meeting_type, "Meeting");
  }

  function responseVariant(value) {
    if (value === "responsive") return "success";
    if (["do_not_contact", "non_responsive"].includes(value)) return "danger";
    if (["events_only", "big_events_only", "bacenta_mainly"].includes(value)) return "warning";
    return "default";
  }

  function freshnessLabel() {
    if (contact?.freshness_label) return contact.freshness_label;
    if (!contact?.contact_date) return "Date unknown";
    const captured = new Date(`${contact.contact_date}T00:00:00`);
    const today = new Date();
    const days = Math.max(0, Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - captured) / 86400000));
    return days <= 14 ? `Fresh · ${days}d` : `Older · ${Math.floor(days / 7)}w`;
  }

  function safePhone(value) {
    return value ? String(value).replace(/[^\d+]/g, "") : "";
  }

  async function updateResponse(event) {
    if (!onQuickUpdate || !contact) return;
    updatingResponse = true;
    await onQuickUpdate(contact.id || contact._id, { response: event.currentTarget.value });
    updatingResponse = false;
  }

  async function assignOwner() {
    if (!ownerId || !onAssign) return;
    assigning = true;
    assignmentError = "";
    try {
      const result = await onAssign(contact, ownerId);
      if (result?.error) assignmentError = result.error.message || "The contact could not be assigned.";
    } catch (error) {
      assignmentError = error?.message || "The contact could not be assigned.";
    } finally {
      assigning = false;
    }
  }

  function openPerson(personId) {
    if (!personId) return;
    isOpen = false;
    goto(`/people/${personId}`);
  }
</script>

<Modal bind:isOpen title="Evangelism contact profile" size="xl">
  {#if contact}
    <div class="space-y-5">
      <header class="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{contact.first_name?.[0] || ""}{contact.last_name?.[0] || ""}</div>
          <div>
            <div class="flex flex-wrap items-center gap-2"><h3 class="text-xl font-semibold text-foreground">{contact.first_name} {contact.last_name || ""}</h3><Badge variant="default">{responseLabel(contact.response || contact.contact_category)}</Badge>{#if contact.converted || contact.member_status === "member"}<Badge variant="default">Member</Badge>{/if}</div>
            <p class="mt-1 text-sm text-muted-foreground">{freshnessLabel()} · Met {formatShortDate(contact.contact_date)}</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          {#if contact.phone}<a href={`tel:${safePhone(contact.phone)}`} class="inline-flex h-9 items-center rounded-lg border border-border bg-secondary px-3 text-xs font-medium text-foreground hover:bg-secondary/70">Call</a><a href={`https://wa.me/${safePhone(contact.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" class="inline-flex h-9 items-center rounded-lg border border-border bg-secondary px-3 text-xs font-medium text-foreground hover:bg-secondary/70">WhatsApp</a>{/if}
          <Button size="sm" onclick={() => onOpenCrm?.(contact)}>Open in CRM</Button>
        </div>
      </header>

      <nav class="flex gap-1 overflow-x-auto rounded-lg bg-secondary/30 p-1" aria-label="Contact profile sections">
        {#each tabs as tab (tab.id)}
          <button type="button" onclick={() => activeTab = tab.id} class="min-w-fit flex-1 rounded-md px-3 py-2 text-xs font-medium {activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}">{tab.label}{#if tab.count} <span class="ml-1 opacity-70">{tab.count}</span>{/if}</button>
        {/each}
      </nav>

      {#if profileLoading}
        <div class="rounded-xl border border-border py-12 text-center text-sm text-muted-foreground">Loading CRM history…</div>
      {:else if activeTab === "overview"}
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div class="space-y-4">
            <section class="rounded-xl border border-border bg-card p-4">
              <h4 class="text-sm font-semibold text-foreground">Contact and outreach</h4>
              <dl class="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div><dt class="text-xs text-muted-foreground">Phone</dt><dd class="mt-1 font-medium text-foreground">{contact.phone || "Not recorded"}</dd></div>
                <div><dt class="text-xs text-muted-foreground">Email</dt><dd class="mt-1 break-all font-medium text-foreground">{contact.email || "Not recorded"}</dd></div>
                <div><dt class="text-xs text-muted-foreground">Invited by</dt><dd class="mt-1 font-medium text-foreground">{contact.invited_by_name || "Not recorded"}</dd></div>
                <div><dt class="text-xs text-muted-foreground">Follow-up posture</dt><dd class="mt-1 font-medium text-foreground">{responseLabel(contact.response || contact.contact_category)}</dd></div>
              </dl>
              {#if onQuickUpdate}<div class="mt-4 border-t border-border pt-4"><label for="profile-response" class="mb-1.5 block text-xs text-muted-foreground">Update follow-up posture</label><select id="profile-response" value={contact.response} onchange={updateResponse} disabled={updatingResponse} class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">{#each responseOptions as option}<option value={option[0]}>{option[1]}</option>{/each}</select></div>{/if}
            </section>
            {#if contact.notes}<section class="rounded-xl border border-border bg-card p-4"><h4 class="text-sm font-semibold text-foreground">Context</h4><p class="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{contact.notes}</p></section>{/if}
          </div>

          <div class="space-y-4">
            <section class="rounded-xl border border-border bg-card p-4">
              <h4 class="text-sm font-semibold text-foreground">Follow-up ownership</h4>
              <div class="mt-3"><p class="text-xs text-muted-foreground">Current owner</p><p class="mt-1 font-medium text-foreground">{personName(owner)}</p></div>
              <div class="mt-4 flex gap-2"><select aria-label="Assign follow-up owner" bind:value={ownerId} class="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"><option value="">Choose leader…</option>{#each leaders as leader (leader._id || leader.id)}<option value={leader._id || leader.id}>{personName(leader)}</option>{/each}</select><Button size="sm" loading={assigning} disabled={!ownerId} onclick={assignOwner}>{owner ? "Reassign" : "Assign"}</Button></div>
              {#if assignmentError}<p class="mt-2 text-xs text-destructive">{assignmentError}</p>{/if}
            </section>
            <section class="rounded-xl border border-border bg-card p-4"><h4 class="text-sm font-semibold text-foreground">Next action</h4>{#if nextTask}<p class="mt-3 font-medium text-foreground">{readable(nextTask.task_type)}</p><p class="mt-1 text-sm text-muted-foreground">Due {formatShortDate(nextTask.due_date)}{#if nextTask.reason} · {nextTask.reason}{/if}</p>{:else}<p class="mt-3 text-sm text-muted-foreground">No open task. Assign the contact or create the next action in the CRM.</p>{/if}</section>
            <section class="rounded-xl border border-border bg-card p-4"><h4 class="text-sm font-semibold text-foreground">This Sunday</h4>{#if latestSunday}<div class="mt-3 flex items-center justify-between gap-3"><div><p class="font-medium text-foreground">{readable(latestSunday.response)}</p><p class="text-sm text-muted-foreground">{formatShortDate(latestSunday.gathering_date)}</p></div><Badge variant={latestSunday.response === "yes" ? "success" : "default"}>{readable(latestSunday.resolution)}</Badge></div>{:else}<p class="mt-3 text-sm text-muted-foreground">No Sunday response recorded.</p>{/if}</section>
          </div>
        </div>
      {:else if activeTab === "activity"}
        <section class="rounded-xl border border-border bg-card"><div class="border-b border-border px-4 py-3"><h4 class="text-sm font-semibold text-foreground">Follow-up history</h4><p class="mt-1 text-xs text-muted-foreground">Interactions and tasks are kept as factual history.</p></div>{#if activityItems().length}<div class="divide-y divide-border">{#each activityItems() as item (item.id)}<div class="flex gap-3 px-4 py-3"><span class="mt-1 h-2 w-2 rounded-full {item.type === 'interaction' ? 'bg-primary' : 'bg-warning'}"></span><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center justify-between gap-2"><p class="text-sm font-medium text-foreground">{item.title}</p><time class="text-xs text-muted-foreground">{formatShortDate(item.date)}</time></div><p class="mt-1 text-xs text-muted-foreground">{item.detail}</p></div></div>{/each}</div>{:else}<div class="px-4 py-12 text-center text-sm text-muted-foreground">No follow-up activity has been recorded yet.</div>{/if}</section>
      {:else}
        <div class="space-y-4">
          <section class="rounded-xl border border-border bg-card">
            <div class="border-b border-border px-4 py-3"><h4 class="text-sm font-semibold text-foreground">Planned gatherings</h4><p class="mt-1 text-xs text-muted-foreground">Sunday, Bacenta and special-event responses recorded by follow-up leaders.</p></div>
            {#if profile?.commitments?.length}
              <div class="divide-y divide-border">{#each profile.commitments as commitment (commitment._id)}<div class="flex items-center justify-between gap-3 px-4 py-3"><div><p class="text-sm font-medium text-foreground">{readable(commitment.gathering_type)}</p><p class="mt-1 text-xs text-muted-foreground">{formatShortDate(commitment.gathering_date)} · recorded by {personName(commitment.leader)}</p></div><div class="flex gap-2"><Badge variant="default">{readable(commitment.response)}</Badge><Badge variant="default">{readable(commitment.resolution)}</Badge></div></div>{/each}</div>
            {:else}<div class="px-4 py-8 text-center text-sm text-muted-foreground">No gathering plans recorded.</div>{/if}
          </section>

          <section class="rounded-xl border border-border bg-card">
            <div class="border-b border-border px-4 py-3"><h4 class="text-sm font-semibold text-foreground">Recorded attendance</h4><p class="mt-1 text-xs text-muted-foreground">Meeting attendance connects back to this CRM profile automatically.</p></div>
            {#if profile?.meeting_attendance?.length}
              <div class="divide-y divide-border">{#each profile.meeting_attendance.slice(0, 12) as attendance (attendance._id || attendance.id)}<div class="px-4 py-3"><p class="text-sm font-medium text-foreground">{meetingName(attendance.meeting)}</p><p class="mt-1 text-xs text-muted-foreground">{formatShortDate(attendance.meeting?.meeting_date)} · {readable(attendance.status || (attendance.attended ? 'present' : 'recorded'))}</p></div>{/each}</div>
            {:else}<div class="px-4 py-8 text-center text-sm text-muted-foreground">No linked meeting attendance yet.</div>{/if}
          </section>

          <section class="rounded-xl border border-border bg-card">
            <div class="border-b border-border px-4 py-3"><h4 class="text-sm font-semibold text-foreground">Visitations</h4><p class="mt-1 text-xs text-muted-foreground">Pastoral visits and any required follow-up.</p></div>
            {#if profile?.visitations?.length}
              <div class="divide-y divide-border">{#each profile.visitations.slice(0, 12) as visitation (visitation._id || visitation.id)}<div class="px-4 py-3"><div class="flex items-center justify-between gap-3"><p class="text-sm font-medium text-foreground">{readable(visitation.outcome, 'Visitation')}</p><span class="text-xs text-muted-foreground">{formatShortDate(visitation.visit_date)}</span></div><p class="mt-1 text-xs text-muted-foreground">Visited by {visitation.visited_by_name || 'leader'}{#if visitation.follow_up_required} · follow-up {formatShortDate(visitation.follow_up_date)}{/if}</p></div>{/each}</div>
            {:else}<div class="px-4 py-8 text-center text-sm text-muted-foreground">No linked visitations yet.</div>{/if}
          </section>
        </div>
      {/if}
    </div>
  {:else}
    <div class="py-12 text-center text-sm text-muted-foreground">No contact selected.</div>
  {/if}

  {#snippet footer()}
    <div class="flex w-full items-center justify-between gap-3">
      <div>{#if onDelete && contact}<Button variant="ghost" class="text-destructive" onclick={() => { isOpen = false; onDelete(contact); }}>Delete</Button>{/if}</div>
      <div class="flex gap-2"><Button variant="secondary" onclick={() => isOpen = false}>Close</Button>{#if onConvert && contact && !contact.converted && contact.member_status !== "member"}<Button variant="success" onclick={() => { isOpen = false; onConvert(contact); }}>Promote to member</Button>{/if}{#if onEdit && contact}<Button onclick={() => { isOpen = false; onEdit(contact); }}>Edit details</Button>{/if}</div>
    </div>
  {/snippet}
</Modal>
