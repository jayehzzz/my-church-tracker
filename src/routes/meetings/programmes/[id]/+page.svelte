<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { session } from "$lib/auth/session.js";
  import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import MeetingForm from "$lib/components/forms/MeetingForm.svelte";
  import MeetingProgramForm from "$lib/components/forms/MeetingProgramForm.svelte";
  import { Button, Badge, Input } from "$lib/components/ui";
  import * as meetingProgramsService from "$lib/services/meetingProgramsService";
  import * as meetingsService from "$lib/services/meetingsService";
  import * as meetingFollowUpsService from "$lib/services/meetingFollowUpsService";
  import * as peopleService from "$lib/services/peopleService";

  let loading = $state(true);
  let error = $state("");
  let actionError = $state("");
  let program = $state(null);
  let programs = $state([]);
  let meetings = $state([]);
  let people = $state([]);
  let followUps = $state({ meetings: [], rows: [], tasks: [], openTasks: [] });
  let activeTab = $state("overview");
  let showAllHistory = $state(false);
  let isMeetingFormOpen = $state(false);
  let selectedMeeting = $state(null);
  let isProgramFormOpen = $state(false);
  let reasonDraft = $state({});
  let taskDueDates = $state({});
  let taskOwners = $state({});
  let savingKey = $state("");

  const programmeMeetings = $derived(meetings.filter(meeting => String(meeting.program_id) === String(program?.id)).sort((a, b) => b.meeting_date.localeCompare(a.meeting_date)));
  const completed = $derived(programmeMeetings.filter(meeting => meeting.status === "completed"));
  const recentMeetings = $derived(showAllHistory ? completed : completed.slice(0, 4));
  const recentIds = $derived(new Set(recentMeetings.map(meeting => String(meeting.id))));
  const recentRows = $derived(followUps.rows.filter(row => recentIds.has(String(row.meeting_id))));
  const absentRows = $derived(recentRows.filter(row => row.expected_regular && row.status === "absent"));
  const newcomerRows = $derived(recentRows.filter(row => row.status === "present" && (row.first_timer || row.first_program_attendance)));
  const regulars = $derived(people.filter(person => (program?.member_ids || []).map(String).includes(String(person.id))));
  const peopleById = $derived(new Map(people.map(person => [String(person.id), person])));
  const meetingsById = $derived(new Map(programmeMeetings.map(meeting => [String(meeting.id), meeting])));
  const isAdmin = $derived(["owner", "admin", "demo"].includes($session.user?.role));

  function name(personId) {
    const person = peopleById.get(String(personId));
    return person ? `${person.first_name} ${person.last_name}`.trim() : "Person unavailable";
  }
  function shortDate(value) {
    return value ? new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  }
  function rowKey(row) { return `${row.meeting_id}:${row.person_id}`; }
  function openTask(row) {
    return followUps.openTasks.find(task => String(task.person_id) === String(row.person_id) && task.status === "open");
  }
  function followUpAllowed(personId) {
    const person = peopleById.get(String(personId));
    return person && person.member_status !== "archived" && person.contact_category !== "do_not_contact" && !person.is_paused;
  }
  function firstLabel(row) { return row.first_timer ? "First church visit" : "First visit to this programme"; }
  function defaultDue() {
    const next = new Date();
    next.setDate(next.getDate() + 2);
    return next.toISOString().slice(0, 10);
  }
  async function load() {
    loading = true;
    error = "";
    const id = $page.params.id;
    const [programResult, meetingResult, peopleResult, followUpResult] = await Promise.all([
      meetingProgramsService.getAll(), meetingsService.getAll(), peopleService.getAll(), meetingFollowUpsService.getForProgram(id),
    ]);
    const failed = [programResult, meetingResult, peopleResult, followUpResult].find(result => result.error);
    if (failed) error = failed.error?.message || "Could not load this programme";
    else {
      programs = programResult.data || [];
      program = programs.find(item => String(item.id) === String(id)) || null;
      meetings = meetingResult.data || [];
      people = peopleResult.data || [];
      followUps = followUpResult.data || { meetings: [], rows: [], tasks: [], openTasks: [] };
      if (!program) error = "This programme is unavailable or you do not have access to it.";
    }
    loading = false;
  }
  onMount(() => { void load(); });

  function recordMeeting(meeting = null) {
    selectedMeeting = meeting;
    isMeetingFormOpen = true;
  }
  async function saveReason(row) {
    const key = rowKey(row);
    savingKey = key;
    actionError = "";
    const value = reasonDraft[key] ?? row.absence_reason ?? "";
    const result = await meetingFollowUpsService.setAbsenceReason(row.meeting_id, row.person_id, value);
    if (result.error) actionError = result.error.message || "Could not save the reason";
    else await load();
    savingKey = "";
  }
  async function createTask(row) {
    const key = rowKey(row);
    const owner = taskOwners[key] || (isAdmin ? program.leader_ids?.[0] : $session.user?.personId);
    if (!owner) { actionError = "Assign a leader to this programme first."; return; }
    savingKey = key;
    actionError = "";
    const result = await meetingFollowUpsService.createTask(row.meeting_id, row.person_id, owner, taskDueDates[key] || defaultDue());
    if (result.error) actionError = result.error.message || "Could not create the task";
    else await load();
    savingKey = "";
  }
</script>

<DashboardLayout>
  <div class="pb-12">
    <a href="/meetings" class="text-sm font-medium text-primary hover:underline">← All meetings</a>
    {#if loading}
      <p class="mt-6 text-sm text-muted-foreground">Loading programme…</p>
    {:else if error}
      <div class="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      <Button variant="secondary" onclick={load}>Retry</Button>
    {:else if program}
      <div class="mt-4 flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={program.name} subtitle={`${program.meeting_type === "bacenta" ? "Bacenta" : "Meeting programme"} · ${program.default_day || "Day not set"}${program.default_start_time ? ` at ${program.default_start_time}` : ""}`} />
        <div class="flex flex-wrap gap-2">
          <Button variant="secondary" onclick={() => (isProgramFormOpen = true)}>Edit programme</Button>
          <Button onclick={() => recordMeeting()}>Record this meeting</Button>
        </div>
      </div>
      <div class="mt-5 flex flex-wrap gap-1 rounded-xl border border-border bg-secondary/30 p-1" role="tablist" aria-label="Programme sections">
        {#each [{ id: "overview", label: "Overview" }, { id: "attendance", label: "Attendance" }, { id: "people", label: "People" }, { id: "followup", label: "Follow-up" }] as tab}
          <button type="button" role="tab" aria-selected={activeTab === tab.id} onclick={() => (activeTab = tab.id)} class="rounded-lg px-4 py-2 text-sm font-medium {activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}">{tab.label}</button>
        {/each}
      </div>
      {#if actionError}<p class="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{actionError}</p>{/if}

      {#if activeTab === "overview"}
        <div class="mt-6 grid gap-4 sm:grid-cols-3">
          <div class="rounded-xl border border-border bg-card p-4"><p class="text-xs text-muted-foreground">Completed gatherings</p><p class="mt-1 text-2xl font-semibold">{completed.length}</p></div>
          <div class="rounded-xl border border-border bg-card p-4"><p class="text-xs text-muted-foreground">Regular people</p><p class="mt-1 text-2xl font-semibold">{regulars.length}</p></div>
          <div class="rounded-xl border border-border bg-card p-4"><p class="text-xs text-muted-foreground">Average attendance · last 4</p><p class="mt-1 text-2xl font-semibold">{completed.length ? Math.round(completed.slice(0, 4).reduce((sum, meeting) => sum + Number(meeting.total_attendance || 0), 0) / Math.min(completed.length, 4)) : "—"}</p></div>
        </div>
        {#if completed.length > 0}
          <section class="mt-6 rounded-xl border border-border bg-card p-5">
            <h2 class="font-semibold">Attendance trend</h2>
            <p class="mt-1 text-sm text-muted-foreground">Last eight completed gatherings</p>
            <div class="mt-5 flex h-36 items-end gap-2" role="img" aria-label={`Attendance over the last ${Math.min(completed.length, 8)} completed gatherings`}>
              {#each [...completed.slice(0, 8)].reverse() as meeting}
                <div class="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${shortDate(meeting.meeting_date)}: ${meeting.total_attendance || 0} attended`}>
                  <span class="text-xs font-medium">{meeting.total_attendance || 0}</span>
                  <div class="w-full max-w-12 rounded-t bg-primary" style={`height: ${Math.max(4, Math.round(100 * Number(meeting.total_attendance || 0) / Math.max(1, ...completed.slice(0, 8).map(item => Number(item.total_attendance || 0)))))}px`}></div>
                  <span class="w-full truncate text-center text-[10px] text-muted-foreground">{new Date(`${meeting.meeting_date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                </div>
              {/each}
            </div>
          </section>
        {/if}
        <section class="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 class="font-semibold">Recent gatherings</h2>
          {#if completed.length === 0}<p class="mt-3 text-sm text-muted-foreground">No completed attendance yet.</p>{/if}
          {#each completed.slice(0, 4) as meeting}
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3 last:border-0"><span>{shortDate(meeting.meeting_date)}</span><span class="text-sm">{meeting.total_attendance || 0} attended · {followUps.rows.filter(row => String(row.meeting_id) === String(meeting.id) && row.expected_regular && row.status === "absent").length} regulars absent</span></div>
          {/each}
        </section>
        <button type="button" class="mt-4 text-sm font-medium text-primary hover:underline" onclick={() => (activeTab = "followup")}>Review people needing follow-up →</button>
      {:else if activeTab === "attendance"}
        <section class="mt-6 space-y-3">
          {#if programmeMeetings.length === 0}<p class="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">No meetings recorded yet.</p>{/if}
          {#each programmeMeetings as meeting}
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"><div><p class="font-medium">{shortDate(meeting.meeting_date)}</p><p class="text-sm text-muted-foreground">{meeting.total_attendance || 0} attended · {meeting.status || "Pending"}</p></div><Button variant="secondary" size="sm" onclick={() => recordMeeting(meeting)}>{meeting.status === "completed" ? "Correct attendance" : "Take attendance"}</Button></div>
          {/each}
        </section>
      {:else if activeTab === "people"}
        <section class="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 class="font-semibold">Regular people ({regulars.length})</h2>
          <p class="mt-1 text-sm text-muted-foreground">This list belongs to {program.name} and does not change church membership.</p>
          {#if regulars.length === 0}<p class="mt-4 text-sm text-muted-foreground">No regular people selected yet.</p>{/if}
          {#each regulars as person}
            {@const expected = recentRows.filter(row => String(row.person_id) === String(person.id) && row.expected_regular)}
            <div class="flex flex-wrap justify-between gap-2 border-b border-border py-3 text-sm last:border-0"><span>{person.first_name} {person.last_name}</span><span class="text-muted-foreground">{expected.length ? `${expected.filter(row => row.status === "present").length}/${expected.length} attended` : "No tracked expectation yet"}</span></div>
          {/each}
          <div class="mt-4"><Button variant="secondary" onclick={() => (isProgramFormOpen = true)}>Manage regular people</Button></div>
        </section>
      {:else}
        <div class="mt-6 flex flex-wrap items-center justify-between gap-3"><div><h2 class="font-semibold">People to follow up</h2><p class="text-sm text-muted-foreground">Confirmed absences and named newcomers from completed meetings.</p></div><button type="button" class="text-sm font-medium text-primary hover:underline" onclick={() => (showAllHistory = !showAllHistory)}>{showAllHistory ? "Show latest four" : "Show all history"}</button></div>
        {#if absentRows.length === 0 && newcomerRows.length === 0}<p class="mt-4 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">No follow-up suggestions in this period.</p>{/if}
        {#each [{ title: "Regular people absent", rows: absentRows }, { title: "Newcomers", rows: newcomerRows }] as group}
          {#if group.rows.length > 0}
            <section class="mt-5 space-y-3"><h3 class="font-semibold">{group.title}</h3>
              {#each group.rows as row}
                {@const key = rowKey(row)}
                {@const existingTask = openTask(row)}
                <div class="rounded-xl border border-border bg-card p-4">
                  <div class="flex flex-wrap items-start justify-between gap-2"><div><p class="font-medium">{name(row.person_id)}</p><p class="text-sm text-muted-foreground">{shortDate(meetingsById.get(String(row.meeting_id))?.meeting_date)} · {row.status === "absent" ? "Absent" : firstLabel(row)}{row.status === "absent" && absentRows.filter(item => String(item.person_id) === String(row.person_id)).length > 1 ? " · Repeated absence" : ""}</p></div>{#if existingTask}<div class="flex flex-col items-end gap-1"><Badge variant="info" size="sm">Open task · {shortDate(existingTask.due_date)}</Badge><a href="/pipeline" class="text-xs font-medium text-primary hover:underline">Open Follow-Up →</a></div>{/if}</div>
                  {#if row.status === "absent"}
                    <div class="mt-3 flex flex-wrap items-end gap-2"><div class="min-w-48 flex-1"><Input label="Attendance reason (optional)" value={reasonDraft[key] ?? row.absence_reason ?? ""} oninput={event => (reasonDraft[key] = event.currentTarget.value)} maxlength="500" /></div><Button variant="secondary" size="sm" loading={savingKey === key} onclick={() => saveReason(row)}>Save reason</Button></div>
                  {/if}
                  {#if !followUpAllowed(row.person_id)}<p class="mt-3 text-sm text-muted-foreground">Follow-up is unavailable for this person.</p>{/if}
                  {#if !existingTask && followUpAllowed(row.person_id)}
                    <div class="mt-3 flex flex-wrap items-end gap-2"><div><Input label="Follow-up due" type="date" value={taskDueDates[key] || defaultDue()} onchange={event => (taskDueDates[key] = event.currentTarget.value)} /></div>{#if isAdmin && (program.leaders || []).length > 1}<label class="text-sm">Owner<select class="ml-2 rounded-md border border-border bg-card p-2" value={taskOwners[key] || program.leader_ids?.[0]} onchange={event => (taskOwners[key] = event.currentTarget.value)}>{#each program.leaders as leader}<option value={leader._id || leader.id}>{leader.first_name} {leader.last_name}</option>{/each}</select></label>{/if}<Button size="sm" loading={savingKey === key} onclick={() => createTask(row)}>Create follow-up task</Button></div>
                  {/if}
                </div>
              {/each}
            </section>
          {/if}
        {/each}
        {#if followUps.tasks.length > 0}
          <section class="mt-8 rounded-xl border border-border bg-card p-5"><h3 class="font-semibold">Task history</h3><p class="mt-1 text-sm text-muted-foreground">Tasks stay in the history when attendance is corrected.</p>
            {#each [...followUps.tasks].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))) as task}
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3 text-sm last:border-0"><span>{name(task.person_id)} · {shortDate(meetingsById.get(String(task.meeting_id))?.meeting_date)}</span><span class="capitalize text-muted-foreground">{task.status}</span></div>
            {/each}
          </section>
        {/if}
      {/if}
    {/if}
  </div>
</DashboardLayout>

{#if isMeetingFormOpen && program}
  <MeetingForm bind:isOpen={isMeetingFormOpen} meeting={selectedMeeting} {programs} {people} {meetings} initialProgramId={program.id} canRecordNotes={$session.user?.canViewConfidential || isAdmin} canRecordOneOff={false} onsave={load} />
{/if}
{#if isProgramFormOpen && program}
  <MeetingProgramForm bind:isOpen={isProgramFormOpen} {program} {people} canManageLeaders={isAdmin} onsave={load} />
{/if}
