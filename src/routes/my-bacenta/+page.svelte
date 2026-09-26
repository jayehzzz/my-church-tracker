<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { session } from '$lib/auth/session.js';
  import { api } from '../../../convex/_generated/api.js';
  import { getConvexHttpClient } from '$lib/convex.js';
  import DashboardLayout from '$lib/components/layout/DashboardLayout.svelte';
  import MeetingForm from '$lib/components/forms/MeetingForm.svelte';
  import MeetingProgramForm from '$lib/components/forms/MeetingProgramForm.svelte';
  import VisitationForm from '$lib/components/forms/VisitationForm.svelte';
  import CareTaskForm from '$lib/components/forms/CareTaskForm.svelte';
  import ContactDrawer from '$lib/components/crm/ContactDrawer.svelte';
  import SundayReliabilitySummary from '$lib/components/shared/SundayReliabilitySummary.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import * as followUp from '$lib/services/followUpCrmService.js';
  import * as meetingProgramsService from '$lib/services/meetingProgramsService.js';
  import { summarizeSundayCommitments } from '$lib/utils/sundayReliability.js';
  import { saveDomainReturn, takeDomainReturn } from '$lib/components/drilldown/domainReturnState.js';

  const tabs = [
    { id: 'week', label: 'This week' },
    { id: 'people', label: 'People' },
    { id: 'meetings', label: 'Meetings' },
    { id: 'sunday', label: 'Sunday' },
  ];
  const outcomes = [
    ['positive_conversation', 'Good conversation'],
    ['rescheduled', 'Agreed to speak again'],
    ['no_response', 'No answer'],
    ['not_serious_now', 'Not serious right now'],
    ['not_interested', 'Not interested'],
    ['wrong_number', 'Wrong number'],
  ];
  let activeTab = $state('week');
  let programId = $state('all');
  let search = $state('');
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');
  let notice = $state('');
  let workspace = $state(null);
  let selectedPersonId = $state('');
  let drawerOpen = $state(false);
  let callOpen = $state(false);
  let careOpen = $state(false);
  let careTask = $state(null);
  let scheduleOpen = $state(false);
  let meetingOpen = $state(false);
  let programmeOpen = $state(false);
  let newcomerOpen = $state(false);
  let newcomerProgramId = $state('');
  let newcomerFirstName = $state('');
  let newcomerLastName = $state('');
  let newcomerPhone = $state('');
  let selectedProgramme = $state(null);
  let selectedMeeting = $state(null);
  let sundayOpen = $state(false);
  let sundayPersonId = $state('');
  let sundayDate = $state('');
  let sundayNote = $state('');
  let callOutcome = $state('positive_conversation');
  let callMethod = $state('call');
  let callNote = $state('');
  let nextDate = $state('');
  let loadedFor = '';
  let pendingFrame = null;

  const id = row => String(row?._id || row?.id || '');
  const name = person => [person?.preferred_name || person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Person unavailable';
  const today = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  function addDays(day, count) {
    const date = new Date(`${day}T12:00:00`);
    date.setDate(date.getDate() + count);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function nextSunday() {
    const current = today();
    const weekday = new Date(`${current}T12:00:00`).getDay();
    return addDays(current, (7 - weekday) % 7);
  }
  const shortDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Date not set';
  const programmes = $derived((workspace?.programs || []).map(row => ({ ...row, id: id(row), members: row.members || [], leaders: row.leaders || [] })));
  const people = $derived((workspace?.people || []).map(row => ({ ...row, id: id(row) })));
  const meetings = $derived((workspace?.meetings || []).map(row => ({ ...row, id: id(row) })));
  const peopleById = $derived(new Map(people.map(person => [id(person), person])));
  const selectedPerson = $derived(peopleById.get(String(selectedPersonId)) || null);
  const assignedIds = $derived(new Set((workspace?.assignments || []).map(row => String(row.person_id))));
  const activeProgramme = $derived(programmes.find(row => id(row) === programId) || null);
  const visiblePeople = $derived.by(() => {
    const memberIds = activeProgramme ? new Set((activeProgramme.member_ids || []).map(String)) : null;
    const term = search.trim().toLowerCase();
    return people.filter(person => (id(person) !== String(workspace?.leaderId) || assignedIds.has(id(person)) || programmes.some(program => (program.member_ids || []).map(String).includes(id(person))))
      && (!memberIds || memberIds.has(id(person)) || assignedIds.has(id(person)))
      && (!term || name(person).toLowerCase().includes(term)))
      .sort((a, b) => name(a).localeCompare(name(b)));
  });
  const commitmentsFor = personId => (workspace?.commitments || []).filter(row => String(row.person_id) === String(personId));
  const reliabilityFor = personId => summarizeSundayCommitments(commitmentsFor(personId));
  const tasksFor = personId => (workspace?.tasks || []).filter(row => String(row.person_id) === String(personId));
  const isCallTask = task => !['member_care', 'visitation'].includes(task.task_type);
  const ownCallTaskFor = personId => tasksFor(personId).find(row => isCallTask(row) && String(row.assigned_leader_id) === String(workspace?.leaderId));
  const ownCareTaskFor = personId => tasksFor(personId).find(row => !isCallTask(row) && String(row.assigned_leader_id) === String(workspace?.leaderId));
  const anotherWorkerHasCallTask = personId => tasksFor(personId).some(row => isCallTask(row) && String(row.assigned_leader_id) !== String(workspace?.leaderId));
  const visibleProgramIds = $derived(new Set((activeProgramme ? [activeProgramme] : programmes).map(id)));
  const visibleMeetings = $derived(meetings.filter(row => visibleProgramIds.has(String(row.program_id))));
  const workGroups = $derived.by(() => {
    const rows = new Map();
    const add = (personId, item) => {
      const person = peopleById.get(String(personId));
      if (!person) return;
      if (activeProgramme && !(activeProgramme.member_ids || []).map(String).includes(String(personId)) && !assignedIds.has(String(personId))) return;
      const group = rows.get(String(personId)) || { person, items: [] };
      group.items.push(item);
      rows.set(String(personId), group);
    };
    const until = addDays(today(), 7);
    for (const task of workspace?.tasks || []) {
      if (task.due_date && task.due_date > until) continue;
      add(task.person_id, { id: id(task), type: 'task', label: String(task.task_type || 'Follow-up').replaceAll('_', ' '), due: task.due_date, task });
    }
    const recent = visibleMeetings.filter(row => row.status === 'completed').slice(0, 4);
    const recentIds = new Set(recent.map(id));
    for (const row of workspace?.meetingRows || []) {
      if (!recentIds.has(String(row.meeting_id)) || tasksFor(row.person_id).length) continue;
      if (row.expected_regular && row.status === 'absent') add(row.person_id, { id: id(row), type: 'meeting', label: 'Missed bacenta meeting', due: today() });
      else if (row.status === 'present' && (row.first_timer || row.first_program_attendance)) add(row.person_id, { id: id(row), type: 'meeting', label: 'New at bacenta', due: today() });
    }
    for (const visit of workspace?.visits || []) {
      if (visit.follow_up_required && (!visit.follow_up_date || visit.follow_up_date <= until) && !tasksFor(visit.person_id).length) {
        add(visit.person_id, { id: id(visit), type: 'care', label: 'Care follow-up', due: visit.follow_up_date });
      }
    }
    const missedSince = addDays(today(), -28);
    const missedPeople = new Set();
    for (const commitment of workspace?.commitments || []) {
      if (commitment.response !== 'yes' || commitment.resolution !== 'no_show'
        || commitment.gathering_date < missedSince || commitment.gathering_date > today()
        || tasksFor(commitment.person_id).length || missedPeople.has(String(commitment.person_id))) continue;
      missedPeople.add(String(commitment.person_id));
      add(commitment.person_id, { id: id(commitment), type: 'sunday', label: 'Missed Sunday after saying yes', due: today() });
    }
    return [...rows.values()].sort((a, b) => {
      const rank = group => group.items.some(item => item.task?.priority === 'urgent') ? 0
        : group.items.some(item => item.due && item.due < today()) ? 1 : 2;
      return rank(a) - rank(b) || String(a.items[0]?.due || '').localeCompare(String(b.items[0]?.due || '')) || name(a.person).localeCompare(name(b.person));
    });
  });

  function authKey() {
    return JSON.stringify([$session.user?.id, $session.user?.role, $session.user?.personId, $session.user?.canViewConfidential, $session.user?.canViewGiving]);
  }
  export const snapshot = {
    capture: () => {
      const token = `bacenta-${crypto.randomUUID()}`;
      saveDomainReturn(token, { auth: authKey(), activeTab, programId, search, selectedPersonId, scrollY: window.scrollY });
      return { token };
    },
    restore: value => { pendingFrame = value?.token ? takeDomainReturn(value.token) : null; if (workspace) restoreFrame(); },
  };
  function restoreFrame() {
    const frame = pendingFrame;
    pendingFrame = null;
    if (!frame || frame.auth !== authKey()) return;
    activeTab = frame.activeTab;
    programId = frame.programId;
    search = frame.search;
    selectedPersonId = frame.selectedPersonId;
    drawerOpen = Boolean(frame.selectedPersonId && peopleById.has(String(frame.selectedPersonId)));
    requestAnimationFrame(() => window.scrollTo(0, frame.scrollY || 0));
  }
  async function load() {
    loading = !workspace;
    error = '';
    try {
      const client = getConvexHttpClient();
      if (!client) throw new Error('The church database is unavailable.');
      workspace = await client.query(api.meetingPrograms.getLeaderWorkspace, {});
      if (selectedPersonId && !workspace.people.some(person => id(person) === selectedPersonId)) {
        selectedPersonId = '';
        drawerOpen = false;
      }
      if (programId !== 'all' && !workspace.programs.some(program => id(program) === programId)) programId = 'all';
      if (pendingFrame) restoreFrame();
    } catch (cause) {
      error = cause?.message || 'Unable to load My Bacenta.';
    } finally {
      loading = false;
    }
  }
  async function refreshPerson() {
    await load();
    if (selectedPersonId && workspace?.people.some(person => id(person) === selectedPersonId)) drawerOpen = true;
  }
  onMount(() => {
    const unsubscribe = session.subscribe(value => {
      const key = `${value.user?.id || ''}:${value.user?.role || ''}:${value.user?.canViewConfidential}:${value.user?.canViewGiving}`;
      if (value.status === 'authenticated' && value.user?.role === 'leader' && key !== loadedFor) {
        loadedFor = key;
        workspace = null;
        void load();
      }
    });
    return unsubscribe;
  });
  function openPerson(person) { selectedPersonId = id(person); drawerOpen = true; }
  function startCall(person) {
    selectedPersonId = id(person);
    if (anotherWorkerHasCallTask(selectedPersonId) && !ownCallTaskFor(selectedPersonId)) {
      drawerOpen = false;
      error = 'This follow-up task belongs to another worker. Ask them to hand it over before logging their task.';
      return;
    }
    callOutcome = 'positive_conversation'; callMethod = 'call'; callNote = ''; nextDate = '';
    drawerOpen = false; callOpen = true; error = '';
  }
  async function saveCall() {
    if (!selectedPerson) return;
    saving = true; error = '';
    try {
      let task = ownCallTaskFor(selectedPersonId);
      if (!task) {
        const created = await followUp.createTask({ personId: selectedPersonId, assignedLeaderId: workspace.leaderId, dueDate: today(), taskType: 'follow_up' });
        if (created.error) throw created.error;
        task = created.data;
      }
      const result = await followUp.completeTask(id(task), {
        method: callMethod, outcome: callOutcome,
        ...($session.user?.canViewConfidential && callNote.trim() ? { notes: callNote.trim() } : {}),
        ...(nextDate ? { nextActionDate: nextDate, nextTaskType: 'follow_up' } : { skipAutomaticNextTask: true }),
      });
      if (result.error) throw result.error;
      callOpen = false; notice = 'Follow-up recorded.';
      await refreshPerson();
    } catch (cause) { error = cause?.message || 'Could not record the follow-up.'; }
    finally { saving = false; }
  }
  function startCare(person, task = null) {
    selectedPersonId = id(person); careTask = task;
    drawerOpen = false; careOpen = true; error = '';
  }
  function startSchedule(person) {
    selectedPersonId = id(person); scheduleOpen = true; drawerOpen = false;
  }
  function startMeeting(program, meeting = null) {
    programId = id(program); selectedMeeting = meeting; meetingOpen = true;
  }
  function startNewcomer(program) {
    newcomerProgramId = id(program);
    newcomerFirstName = ''; newcomerLastName = ''; newcomerPhone = '';
    newcomerOpen = true; error = '';
  }
  async function saveNewcomer() {
    saving = true; error = '';
    try {
      const result = await meetingProgramsService.addGuest(newcomerProgramId, {
        firstName: newcomerFirstName.trim(), lastName: newcomerLastName.trim(), phone: newcomerPhone.trim() || undefined,
      });
      if (result.error) throw result.error;
      newcomerOpen = false; notice = 'Newcomer added to your follow-up people.';
      selectedPersonId = id(result.data);
      await load();
      drawerOpen = Boolean(selectedPersonId);
    } catch (cause) { error = cause?.message || 'Could not add the newcomer.'; }
    finally { saving = false; }
  }
  async function saveSunday() {
    if (!sundayPersonId || !sundayDate) return;
    if (new Date(`${sundayDate}T12:00:00`).getDay() !== 0) {
      error = 'Choose a Sunday date for this confirmation.';
      return;
    }
    saving = true; error = '';
    try {
      await getConvexHttpClient().mutation(api.crm.recordCommitment, {
        personId: sundayPersonId, leaderId: workspace.leaderId,
        gatheringType: 'sunday_service', gatheringDate: sundayDate, response: 'yes',
        ...(sundayNote.trim() ? { note: sundayNote.trim() } : {}),
      });
      sundayOpen = false; notice = 'Sunday confirmation saved.';
      await load();
      selectedPersonId = sundayPersonId;
      drawerOpen = Boolean(selectedPersonId);
    } catch (cause) { error = cause?.message || 'Could not save the confirmation.'; }
    finally { saving = false; }
  }
  async function cancelSunday(commitment) {
    const note = window.prompt('Reason for cancelling this Sunday confirmation (optional)', '') ?? null;
    if (note === null) return;
    saving = true; error = '';
    try {
      await getConvexHttpClient().mutation(api.crm.resolveCommitment, {
        commitmentId: id(commitment), resolution: 'cancelled', leaderId: workspace.leaderId,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      notice = 'Sunday confirmation cancelled.';
      await load();
    } catch (cause) { error = cause?.message || 'Could not cancel the confirmation.'; }
    finally { saving = false; }
  }
</script>

<DashboardLayout>
  {#if $session.status === 'authenticated' && $session.user?.role !== 'leader'}
    <p class="rounded-xl border border-border bg-card p-5">My Bacenta is for linked bacenta leaders. <a class="font-medium text-primary underline" href="/">Open Dashboard</a></p>
  {:else}
    <div class="space-y-5 pb-12">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div><h1 class="text-2xl font-bold">My Bacenta</h1><p class="mt-1 text-sm text-muted-foreground">Your people, meetings and next actions in one place.</p></div>
        <Button variant="secondary" onclick={load} disabled={loading}>Refresh</Button>
      </div>
      {#if error}<p role="alert" class="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>{/if}
      {#if notice}<p role="status" class="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">{notice}</p>{/if}
      {#if loading && !workspace}<p role="status">Loading your bacenta…</p>
      {:else if !workspace}<div class="rounded-xl border border-border bg-card p-5"><p>My Bacenta could not be loaded.</p><Button variant="secondary" onclick={load}>Try again</Button></div>
      {:else}
        <div class="flex flex-wrap gap-3 items-center">
          {#if programmes.length > 1}<label class="text-sm">Bacenta <select class="ml-2 rounded-lg border border-border bg-card p-2" bind:value={programId}><option value="all">All my bacentas</option>{#each programmes as program}<option value={id(program)}>{program.name}</option>{/each}</select></label>{/if}
          {#if programmes.length === 0}<p class="text-sm text-muted-foreground">No bacenta is assigned yet. Your assigned contacts and tasks still appear below.</p>{/if}
        </div>
        <nav aria-label="My Bacenta sections" class="flex gap-1 overflow-x-auto rounded-xl border border-border bg-secondary/20 p-1">
          {#each tabs as tab}<button type="button" aria-current={activeTab === tab.id ? 'page' : undefined} class="shrink-0 rounded-lg px-4 py-2 text-sm font-medium {activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}" onclick={() => activeTab = tab.id}>{tab.label}</button>{/each}
        </nav>
        {#if activeTab === 'week'}
          <section aria-labelledby="week-heading" class="space-y-3">
            <div><h2 id="week-heading" class="text-lg font-semibold">This week · {workGroups.length} people</h2><p class="text-sm text-muted-foreground">Calls, care and bacenta meeting follow-up. Open a person to see their history.</p></div>
            {#if workGroups.length === 0}<p class="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">No work is due this week.</p>{/if}
            {#each workGroups as group (id(group.person))}
              {@const ownCareTask = ownCareTaskFor(id(group.person))}
              <article class="rounded-xl border border-border bg-card p-4">
                <div class="flex flex-wrap items-start justify-between gap-3"><div><h3 class="font-semibold">{name(group.person)}</h3><p class="text-xs text-muted-foreground">{reliabilityFor(id(group.person)).missed} missed after saying yes · {reliabilityFor(id(group.person)).attended} attended</p></div><Button size="sm" variant="secondary" onclick={() => openPerson(group.person)}>View person</Button></div>
                <ul class="mt-3 space-y-1 text-sm">{#each group.items as item (`${item.type}-${item.id}`)}<li class="flex flex-wrap justify-between gap-2"><span>{item.label}{item.task && String(item.task.assigned_leader_id) !== String(workspace.leaderId) ? ' · another worker owns this task' : ''}</span><span class="text-muted-foreground">{shortDate(item.due)}</span></li>{/each}</ul>
                <div class="mt-3 flex flex-wrap gap-2"><Button size="sm" onclick={() => startCall(group.person)}>Log follow-up</Button>{#if $session.user?.canViewConfidential}<Button size="sm" variant="secondary" onclick={() => startCare(group.person, ownCareTask)}>Log care / visit</Button>{#if !tasksFor(id(group.person)).length}<Button size="sm" variant="ghost" onclick={() => startSchedule(group.person)}>Plan visit</Button>{/if}{/if}</div>
              </article>
            {/each}
          </section>
        {:else if activeTab === 'people'}
          <section aria-labelledby="people-heading" class="space-y-4">
            <div><h2 id="people-heading" class="text-lg font-semibold">People · {visiblePeople.length}</h2><p class="text-sm text-muted-foreground">Your bacenta regulars and people assigned to you.</p></div>
            <label class="block max-w-md text-sm">Find a person<input class="mt-1 w-full rounded-lg border border-border bg-card p-2" type="search" bind:value={search} /></label>
            {#if visiblePeople.length === 0}<p class="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">No people match this view.</p>{/if}
            <div class="grid gap-3 lg:grid-cols-2">{#each visiblePeople as person (id(person))}{@const summary = reliabilityFor(id(person))}<article class="rounded-xl border border-border bg-card p-4"><div class="flex justify-between gap-2"><div><h3 class="font-semibold">{name(person)}</h3><p class="text-xs text-muted-foreground">{person.member_status || 'Person'} · {assignedIds.has(id(person)) ? 'Assigned follow-up' : 'Bacenta regular'}</p></div><Button size="sm" variant="secondary" onclick={() => openPerson(person)}>Open</Button></div><p class="mt-2 text-sm">Sunday promises: {summary.attended} attended · {summary.missed} missed · {summary.cancelled} cancelled · {summary.pending} awaiting result</p><p class="mt-1 text-xs text-muted-foreground">{tasksFor(id(person)).length ? `${tasksFor(id(person)).length} open action(s)` : 'No open action'}</p></article>{/each}</div>
          </section>
        {:else if activeTab === 'meetings'}
          <section aria-labelledby="meetings-heading" class="space-y-4">
            <h2 id="meetings-heading" class="text-lg font-semibold">My meetings</h2>
            {#if programmes.length === 0}<p class="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Ask the church owner to assign you to a bacenta programme.</p>{/if}
            {#each (activeProgramme ? [activeProgramme] : programmes) as program (id(program))}<article class="rounded-xl border border-border bg-card p-4"><div class="flex flex-wrap items-start justify-between gap-3"><div><h3 class="font-semibold">{program.name}</h3><p class="text-sm text-muted-foreground">{program.default_day || 'Day not set'} · {(program.member_ids || []).length} regulars</p></div><div class="flex flex-wrap gap-2"><Button size="sm" onclick={() => startMeeting(program)}>Record meeting</Button><Button size="sm" variant="secondary" onclick={() => startNewcomer(program)}>Add newcomer</Button><Button size="sm" variant="secondary" onclick={() => { selectedProgramme = program; programmeOpen = true; }}>Manage regulars</Button></div></div><div class="mt-3 border-t border-border pt-3"><p class="text-xs font-medium text-muted-foreground">Recent meetings</p>{#each meetings.filter(row => String(row.program_id) === id(program)).slice(0, 4) as meeting (id(meeting))}<div class="flex flex-wrap items-center justify-between gap-2 py-1 text-sm"><span>{shortDate(meeting.meeting_date)} · {meeting.total_attendance || 0} attended · {meeting.status || 'Open'}</span><Button size="sm" variant="ghost" onclick={() => startMeeting(program, meeting)}>Open attendance</Button></div>{/each}<a class="mt-2 inline-block text-sm font-medium text-primary underline" href={`/meetings/programmes/${encodeURIComponent(id(program))}`}>See absence follow-up and history</a></div></article>{/each}
          </section>
        {:else}
          <section aria-labelledby="sunday-heading" class="space-y-4"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 id="sunday-heading" class="text-lg font-semibold">Sunday follow-through</h2><p class="text-sm text-muted-foreground">Confirm plans and see actual results from the church register.</p></div><Button onclick={() => { sundayPersonId = ''; sundayDate = nextSunday(); sundayNote = ''; sundayOpen = true; }}>Record a yes</Button></div>
            {#if visiblePeople.length === 0}<p class="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">No people are in this view yet.</p>{/if}
            <div class="grid gap-3 lg:grid-cols-2">{#each visiblePeople as person (id(person))}{@const summary = reliabilityFor(id(person))}<article class="rounded-xl border border-border bg-card p-4"><div class="flex flex-wrap justify-between gap-2"><h3 class="font-semibold">{name(person)}</h3><Button size="sm" variant="secondary" onclick={() => { sundayPersonId = id(person); sundayDate = nextSunday(); sundayNote = ''; sundayOpen = true; }}>Said yes</Button></div><div class="mt-3"><SundayReliabilitySummary commitments={commitmentsFor(id(person))} compact showRate={false} /></div>{#each summary.entries.filter(row => row.resolution === 'pending') as commitment (commitment.id)}<div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs"><span>Awaiting result · {shortDate(commitment.gathering_date)}</span><button type="button" class="font-medium text-primary underline" onclick={() => cancelSunday(commitment)} disabled={saving}>Cancel confirmation</button></div>{/each}<Button size="sm" variant="ghost" onclick={() => openPerson(person)}>View reasons and history</Button></article>{/each}</div>
          </section>
        {/if}
      {/if}
    </div>
  {/if}
</DashboardLayout>

<ContactDrawer bind:isOpen={drawerOpen} person={selectedPerson} showSundayRate={false} onLogCall={() => selectedPerson && startCall(selectedPerson)} onEditProfile={() => selectedPerson && goto(`/people/${encodeURIComponent(selectedPersonId)}`)} onViewProfile={() => goto(`/people/${encodeURIComponent(selectedPersonId)}`)} />
<MeetingForm bind:isOpen={meetingOpen} meeting={selectedMeeting} programs={programmes} {people} {meetings} initialProgramId={programId === 'all' ? undefined : programId} canRecordNotes={$session.user?.canViewConfidential === true} canRecordOneOff={false} onsave={load} />
<MeetingProgramForm bind:isOpen={programmeOpen} program={selectedProgramme} {people} canManageLeaders={false} onsave={load} />
<VisitationForm bind:isOpen={careOpen} task={careTask} {people} initialPersonId={selectedPersonId} initialLeaderId={workspace?.leaderId || ''} onsave={refreshPerson} />
<CareTaskForm bind:isOpen={scheduleOpen} {people} initialCandidate={{ person_id: selectedPersonId, assigned_leader_id: workspace?.leaderId, reason: 'Arrange a visit' }} onsave={refreshPerson} />

<Modal bind:isOpen={newcomerOpen} title="Add bacenta newcomer" size="lg">
  <form class="space-y-4" onsubmit={event => { event.preventDefault(); void saveNewcomer(); }}>
    {#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
    <p class="text-sm text-muted-foreground">This adds a new guest and assigns their follow-up to you. If they already have a church profile, ask the owner to link them to your bacenta.</p>
    <label class="block text-sm">First name<input class="mt-1 w-full rounded-lg border border-border bg-card p-2" bind:value={newcomerFirstName} maxlength="100" required /></label>
    <label class="block text-sm">Last name<input class="mt-1 w-full rounded-lg border border-border bg-card p-2" bind:value={newcomerLastName} maxlength="100" required /></label>
    <label class="block text-sm">Phone (optional)<input class="mt-1 w-full rounded-lg border border-border bg-card p-2" type="tel" bind:value={newcomerPhone} maxlength="40" /></label>
    <div class="flex justify-end gap-2"><Button type="button" variant="secondary" onclick={() => newcomerOpen = false}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add newcomer'}</Button></div>
  </form>
</Modal>

<Modal bind:isOpen={callOpen} title={selectedPerson ? `Follow up · ${name(selectedPerson)}` : 'Follow up'} size="lg">
  <form class="space-y-4" onsubmit={event => { event.preventDefault(); void saveCall(); }}>
    {#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
    <label class="block text-sm">Method<select class="mt-1 w-full rounded-lg border border-border bg-card p-2" bind:value={callMethod}><option value="call">Phone call</option><option value="whatsapp">WhatsApp</option><option value="sms">Text message</option><option value="in_person">In person</option></select></label>
    <label class="block text-sm">Outcome<select class="mt-1 w-full rounded-lg border border-border bg-card p-2" bind:value={callOutcome}>{#each outcomes as [value, label]}<option {value}>{label}</option>{/each}</select></label>
    {#if $session.user?.canViewConfidential}<label class="block text-sm">What happened?<textarea class="mt-1 w-full rounded-lg border border-border bg-card p-2" rows="3" bind:value={callNote}></textarea></label>{/if}
    <label class="block text-sm">Next call date (optional)<input class="mt-1 w-full rounded-lg border border-border bg-card p-2" type="date" min={today()} bind:value={nextDate} /></label>
    <div class="flex justify-end gap-2"><Button type="button" variant="secondary" onclick={() => callOpen = false}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save follow-up'}</Button></div>
  </form>
</Modal>
<Modal bind:isOpen={sundayOpen} title="Sunday confirmation" size="lg">
  <form class="space-y-4" onsubmit={event => { event.preventDefault(); void saveSunday(); }}>
    {#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
    <label class="block text-sm">Person<select class="mt-1 w-full rounded-lg border border-border bg-card p-2" bind:value={sundayPersonId} required><option value="">Choose a person</option>{#each visiblePeople as person (id(person))}<option value={id(person)}>{name(person)}</option>{/each}</select></label>
    <label class="block text-sm">Sunday date<input class="mt-1 w-full rounded-lg border border-border bg-card p-2" type="date" bind:value={sundayDate} required /></label>
    <label class="block text-sm">What did they say? (optional)<textarea class="mt-1 w-full rounded-lg border border-border bg-card p-2" rows="2" bind:value={sundayNote}></textarea></label>
    <div class="flex justify-end gap-2"><Button type="button" variant="secondary" onclick={() => sundayOpen = false}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save confirmation'}</Button></div>
  </form>
</Modal>
