<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import DashboardLayout from '$lib/components/layout/DashboardLayout.svelte';
  import PageHeader from '$lib/components/shared/PageHeader.svelte';
  import { Badge, Button, Modal } from '$lib/components/ui';
  import {
    AttendanceForecast,
    ComingThisWeek,
    DelegationQueue,
    PeopleDirectory,
    SundayRoster,
    TaskQueue,
    TeamOverview,
    WeeklyAttention,
  } from '$lib/components/crm';
  import {
    assignContact,
    completeTask,
    getDashboard,
    reactivateContact,
    resolveCommitment,
    setAttendancePlan,
  } from '$lib/services/followUpCrmService.js';
  import { nextTaskPlanForOutcome } from '$lib/services/followUpCrmLogic.js';
  import { notificationStore } from '$lib/stores/notificationStore.js';

  let activeTab = $state('today');
  let selectedLeaderId = $state('all');
  let loading = $state(true);
  let hasStartedLoading = $state(false);
  let refreshing = $state(false);
  let showUpcoming = $state(false);
  let errorMessage = $state('');
  let successMessage = $state('');
  let workspace = $state({
    leaders: [],
    tasks: [],
    member_care_tasks: [],
    confirmed_commitments: [],
    upcoming_commitments: [],
    visitation_follow_ups: [],
    quarterly_backlog_count: 0,
    quarterly_active_limit: 10,
    unassigned_contacts: [],
    later_contacts: [],
    contacts: [],
    team_stats: [],
    attendance_forecast: null,
    attendance_roster: [],
    service_date: '',
    source: 'local',
  });

  let selectedTask = $state(null);
  let isCompleteModalOpen = $state(false);
  let savingTask = $state(false);
  let nextDateWasEdited = $state(false);
  let taskForm = $state({
    method: 'call',
    outcome: 'positive_conversation',
    attendanceResponse: 'not_discussed',
    gatheringType: 'sunday_service',
    gatheringDate: '',
    nextStep: 'schedule',
    nextActionDate: '',
    nextTaskType: 'follow_up',
    notes: '',
  });

  let attendanceSavingIds = $state([]);
  let reactivatingId = $state('');
  let delegatingId = $state('');
  let lastUpdatedAt = $state(null);

  const today = dateOnly(new Date());
  const followUpDueNow = $derived((workspace.tasks || []).filter(isDueNow));
  const memberCareDueNow = $derived((workspace.member_care_tasks || []).filter(isDueNow));
  const upcomingTasks = $derived(
    [...(workspace.tasks || []), ...(workspace.member_care_tasks || [])]
      .filter((task) => task.due_date && task.due_date > today)
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))),
  );
  const freshTasks = $derived(followUpDueNow.filter((task) => isFreshContact(task.person)));
  const olderTasks = $derived(followUpDueNow.filter((task) => !isFreshContact(task.person)));
  const todayCount = $derived(followUpDueNow.length + memberCareDueNow.length);
  const overdueCount = $derived(
    [...followUpDueNow, ...memberCareDueNow].filter((task) => task.due_date && task.due_date < today).length,
  );
  const quarterlyCount = $derived(
    olderTasks.filter((task) => task.automation_key === 'quarterly_reengagement' || String(task.reason || '').includes('90-day')).length,
  );
  const expectedCount = $derived(workspace.attendance_forecast?.expected_total || 0);
  const confirmedCount = $derived(workspace.attendance_forecast?.confirmed_total || 0);
  const otherGatherings = $derived(
    (workspace.upcoming_commitments || []).filter((commitment) => commitment.gathering_type !== 'sunday_service'),
  );
  const freshUnassignedCount = $derived(
    (workspace.unassigned_contacts || []).filter((contact) => isFreshContact(contact)).length,
  );
  const teamCount = $derived(workspace.team_stats?.length || 0);
  const peopleCount = $derived(workspace.contacts?.length || 0);

  function dateOnly(value) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function addDays(value, amount) {
    const [year, month, day] = value.split('-').map(Number);
    const result = new Date(year, month - 1, day);
    result.setDate(result.getDate() + amount);
    return dateOnly(result);
  }

  function personId(person) {
    return person?._id || person?.id;
  }

  function personName(person) {
    return [person?.preferred_name || person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Unknown person';
  }

  function isDueNow(task) {
    return !task?.due_date || task.due_date <= today;
  }

  function isFreshContact(person) {
    if (!person?.contact_date) return false;
    return person.contact_date >= addDays(today, -14) && person.contact_date <= today;
  }

  function currentLeaderId(fallback) {
    if (selectedLeaderId !== 'all') return selectedLeaderId;
    return fallback || workspace.leaders?.[0]?._id || workspace.leaders?.[0]?.id;
  }

  function formatCheckTime(value) {
    if (!value) return 'Not checked yet';
    return `Last checked ${value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  }

  function syncCrmAlerts(data) {
    if (selectedLeaderId !== 'all') return;
    const tasks = [...(data.tasks || []), ...(data.member_care_tasks || [])];
    const overdue = tasks.filter((task) => task.status === 'open' && task.due_date && task.due_date < today).length;
    const freshUnassigned = (data.unassigned_contacts || []).filter((contact) => isFreshContact(contact)).length;

    if (overdue) {
      notificationStore.upsertNotification({
        id: 'crm-overdue-work',
        type: 'followup',
        category: 'followup',
        priority: 'urgent',
        title: 'Follow-up work overdue',
        description: `${overdue} CRM task${overdue === 1 ? ' is' : 's are'} overdue.`,
        href: '/pipeline',
      });
    } else {
      notificationStore.removeNotification('crm-overdue-work');
    }
    if (freshUnassigned) {
      notificationStore.upsertNotification({
        id: 'crm-fresh-unassigned',
        type: 'followup',
        category: 'followup',
        priority: 'urgent',
        title: 'Fresh people need a leader',
        description: `${freshUnassigned} fresh evangelism contact${freshUnassigned === 1 ? '' : 's'} still need ownership.`,
        href: '/pipeline',
      });
    } else {
      notificationStore.removeNotification('crm-fresh-unassigned');
    }
  }

  async function loadWorkspace({ quiet = false } = {}) {
    if (quiet) refreshing = true;
    else loading = true;
    errorMessage = '';
    try {
      const result = await getDashboard({
        ...(selectedLeaderId !== 'all' ? { leaderId: selectedLeaderId } : {}),
        ...(workspace.service_date ? { serviceDate: workspace.service_date } : {}),
      });
      if (result.error) {
        errorMessage = result.error.message || 'The follow-up workspace could not be loaded.';
      } else if (result.data) {
        workspace = result.data;
        lastUpdatedAt = new Date();
        syncCrmAlerts(result.data);
      }
    } catch (error) {
      console.error('Follow-Up CRM failed to load', error);
      errorMessage = error?.message || 'The follow-up workspace could not be loaded.';
    } finally {
      loading = false;
      refreshing = false;
    }
  }

  function openCompleteTask(task) {
    const isMemberCare = task.task_type === 'member_care';
    const defaultPlan = nextTaskPlanForOutcome(isMemberCare ? 'care_check_in' : 'positive_conversation', today);
    selectedTask = task;
    nextDateWasEdited = false;
    taskForm = {
      method: 'call',
      outcome: isMemberCare ? 'care_check_in' : 'positive_conversation',
      attendanceResponse: 'not_discussed',
      gatheringType: 'sunday_service',
      gatheringDate: workspace.service_date || '',
      nextStep: 'schedule',
      nextActionDate: isMemberCare ? addDays(today, 7) : defaultPlan?.due_date || addDays(today, 2),
      nextTaskType: isMemberCare ? 'member_care' : defaultPlan?.task_type || 'follow_up',
      notes: '',
    };
    errorMessage = '';
    isCompleteModalOpen = true;
  }

  function handleOutcomeChange() {
    if (nextDateWasEdited) return;
    const plan = nextTaskPlanForOutcome(taskForm.outcome, today);
    if (!plan) {
      taskForm.nextStep = 'complete';
      taskForm.nextActionDate = '';
      return;
    }
    taskForm.nextStep = 'schedule';
    taskForm.nextActionDate = plan.due_date;
    taskForm.nextTaskType = plan.task_type;
  }

  function handleNextStepChange() {
    if (taskForm.nextStep !== 'schedule' || taskForm.nextActionDate) return;
    const plan = nextTaskPlanForOutcome(taskForm.outcome, today);
    taskForm.nextActionDate = plan?.due_date || addDays(today, 2);
    taskForm.nextTaskType = plan?.task_type || 'follow_up';
    nextDateWasEdited = false;
  }

  async function submitTask() {
    if (!selectedTask) return;
    if (taskForm.attendanceResponse !== 'not_discussed' && !taskForm.gatheringDate) {
      errorMessage = 'Choose the gathering date for the attendance response.';
      return;
    }
    if (taskForm.nextStep === 'schedule' && !taskForm.nextActionDate) {
      errorMessage = 'Choose a date for the next follow-up.';
      return;
    }

    savingTask = true;
    errorMessage = '';
    const result = await completeTask(selectedTask._id || selectedTask.id, {
      leaderId: selectedTask.assigned_leader_id || personId(selectedTask.assigned_leader),
      method: taskForm.method,
      outcome: taskForm.outcome,
      notes: taskForm.notes.trim() || undefined,
      ...(taskForm.attendanceResponse !== 'not_discussed' ? {
        attendanceResponse: taskForm.attendanceResponse,
        gatheringType: taskForm.gatheringType,
        gatheringDate: taskForm.gatheringDate,
      } : {}),
      ...(taskForm.nextStep === 'schedule' ? {
        nextActionDate: taskForm.nextActionDate,
        nextTaskType: taskForm.nextTaskType,
        nextReason: taskForm.nextTaskType === 'visitation'
          ? 'Arrange a pastoral visitation'
          : nextDateWasEdited
            ? 'Leader scheduled the next follow-up'
            : nextTaskPlanForOutcome(taskForm.outcome, today)?.reason || 'Planned from the previous follow-up',
      } : {}),
      skipAutomaticNextTask: taskForm.nextStep !== 'schedule',
    });
    savingTask = false;
    if (result.error) {
      errorMessage = result.error.message || 'The follow-up could not be saved.';
      return;
    }

    isCompleteModalOpen = false;
    successMessage = taskForm.nextStep === 'complete' && selectedTask.task_type !== 'member_care' && taskForm.outcome !== 'wrong_number'
      ? `${personName(selectedTask.person)} was updated and will return for a 90-day check-in.`
      : `${personName(selectedTask.person)} was updated.`;
    await loadWorkspace({ quiet: true });
  }

  async function handleCommitmentResolution(commitment, resolution) {
    const result = await resolveCommitment(commitment._id || commitment.id, resolution);
    if (result.error) {
      errorMessage = result.error.message || 'The Sunday outcome could not be saved.';
      return;
    }
    successMessage = `${personName(commitment.person)} marked as ${resolution === 'attended' ? 'attended' : resolution.replace('_', ' ')}.`;
    await loadWorkspace({ quiet: true });
  }

  async function handleAttendanceStatus(person, status) {
    const id = String(personId(person));
    const leaderId = currentLeaderId(person.attendance_plan?.leader_id || person.assigned_leader_id);
    if (!leaderId) {
      errorMessage = 'Add or select a leader before updating Sunday confirmations.';
      return;
    }

    attendanceSavingIds = [...attendanceSavingIds, id];
    const result = await setAttendancePlan(personId(person), leaderId, workspace.service_date, status);
    attendanceSavingIds = attendanceSavingIds.filter((savingId) => savingId !== id);
    if (result.error) {
      errorMessage = result.error.message || 'The Sunday confirmation could not be saved.';
      return;
    }
    successMessage = `${personName(person)} is now ${status === 'confirmed' ? 'confirmed' : status === 'away' ? 'marked away' : 'expected'}.`;
    await loadWorkspace({ quiet: true });
  }

  async function handleViewLeader(leaderId) {
    selectedLeaderId = String(leaderId);
    activeTab = 'today';
    await loadWorkspace({ quiet: true });
  }

  async function handleReactivate(contact) {
    const leaderId = currentLeaderId(contact.assigned_leader_id || personId(contact.assigned_leader));
    if (!leaderId) {
      errorMessage = 'Add or select a leader before adding this person to Today.';
      return;
    }
    reactivatingId = String(personId(contact));
    const result = await reactivateContact(personId(contact), leaderId, today);
    reactivatingId = '';
    if (result.error) {
      errorMessage = result.error.message || 'The contact could not be reactivated.';
      return;
    }
    successMessage = `${personName(contact)} was added to Today.`;
    await loadWorkspace({ quiet: true });
  }

  async function handleDelegateContact(contact, leaderId, dueDate) {
    const contactId = personId(contact);
    if (!contactId || !leaderId || !dueDate) {
      errorMessage = 'Choose a contact, leader, and first follow-up date.';
      return;
    }
    delegatingId = String(contactId);
    errorMessage = '';
    const result = await assignContact(contactId, leaderId, dueDate);
    delegatingId = '';
    if (result.error) {
      errorMessage = result.error.message || 'The contact could not be assigned.';
      return;
    }
    successMessage = `${personName(contact)} was assigned and given a first task.`;
    await loadWorkspace({ quiet: true });
  }

  function openPerson(person) {
    void goto(`/people/${personId(person)}`);
  }

  $effect(() => {
    if (hasStartedLoading) return;
    hasStartedLoading = true;
    void loadWorkspace();
  });

  onMount(() => {
    const checkForUpdates = () => {
      if (document.visibilityState === 'visible') void loadWorkspace({ quiet: true });
    };
    const interval = window.setInterval(checkForUpdates, 5 * 60 * 1000);
    window.addEventListener('focus', checkForUpdates);
    document.addEventListener('visibilitychange', checkForUpdates);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', checkForUpdates);
      document.removeEventListener('visibilitychange', checkForUpdates);
    };
  });
</script>

<DashboardLayout>
  <PageHeader
    title="Follow-Up CRM"
    subtitle="Know who needs attention today, who is expected on Sunday, and how your leaders are following up."
  />

  <div class="mb-5 flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
    <div class="flex flex-wrap items-center gap-2">
      <label for="leader-view" class="text-sm font-medium text-foreground">Showing work for</label>
      <select id="leader-view" bind:value={selectedLeaderId} onchange={() => loadWorkspace({ quiet: true })} class="min-w-48 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary">
        <option value="all">All leaders</option>
        {#each workspace.leaders || [] as leader (personId(leader))}
          <option value={personId(leader)}>{personName(leader)}</option>
        {/each}
      </select>
      <span class="text-xs text-muted-foreground" role="status">{refreshing ? 'Checking for updates…' : `${formatCheckTime(lastUpdatedAt)} · automatic`}</span>
    </div>
    <div class="flex items-center gap-2">
      <Badge variant="default" size="sm">
        {workspace.source === 'local' ? 'On this device' : 'Shared with leaders'}
      </Badge>
      <Button variant="secondary" size="sm" onclick={() => loadWorkspace({ quiet: true })}>Check now</Button>
    </div>
  </div>

  {#if errorMessage}
    <div class="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{errorMessage}</div>
  {/if}
  {#if successMessage}
    <div class="mb-5 flex items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success" role="status">
      <span>{successMessage}</span>
      <button class="text-xs font-medium hover:underline" onclick={() => successMessage = ''}>Dismiss</button>
    </div>
  {/if}

  <nav class="mb-6 flex gap-2 overflow-x-auto border-b border-border pb-3" aria-label="Follow-up CRM sections">
    <Button variant={activeTab === 'today' ? 'primary' : 'ghost'} size="sm" onclick={() => activeTab = 'today'} aria-current={activeTab === 'today' ? 'page' : undefined}>
      <span>Today</span>
      {#if todayCount > 0}<Badge size="sm" variant={activeTab === 'today' ? 'default' : 'info'}>{todayCount}</Badge>{/if}
    </Button>
    <Button variant={activeTab === 'sunday' ? 'primary' : 'ghost'} size="sm" onclick={() => activeTab = 'sunday'} aria-current={activeTab === 'sunday' ? 'page' : undefined}>
      <span>This Sunday</span>
      {#if expectedCount > 0}<Badge size="sm" variant={activeTab === 'sunday' ? 'default' : 'info'}>{expectedCount}</Badge>{/if}
    </Button>
    <Button variant={activeTab === 'team' ? 'primary' : 'ghost'} size="sm" onclick={() => activeTab = 'team'} aria-current={activeTab === 'team' ? 'page' : undefined}>
      <span>Team</span>
      {#if teamCount > 0}<Badge size="sm" variant={activeTab === 'team' ? 'default' : 'info'}>{teamCount}</Badge>{/if}
    </Button>
    <Button variant={activeTab === 'people' ? 'primary' : 'ghost'} size="sm" onclick={() => activeTab = 'people'} aria-current={activeTab === 'people' ? 'page' : undefined}>
      <span>People</span>
      {#if peopleCount > 0}<Badge size="sm" variant={activeTab === 'people' ? 'default' : 'info'}>{peopleCount}</Badge>{/if}
    </Button>
  </nav>

  {#if loading}
    <div class="rounded-xl border border-border bg-card py-20 text-center text-sm text-muted-foreground" role="status">Loading the follow-up workspace…</div>
  {:else if activeTab === 'today'}
    <div class="space-y-6">
      <WeeklyAttention
        dueCount={todayCount}
        {overdueCount}
        {freshUnassignedCount}
        {confirmedCount}
        {expectedCount}
        otherGatheringCount={otherGatherings.length}
        visitationCount={workspace.visitation_follow_ups?.length || 0}
        quarterlyBacklogCount={workspace.quarterly_backlog_count || 0}
        quarterlyActiveLimit={workspace.quarterly_active_limit || 10}
        onOpenTeam={() => activeTab = 'team'}
        onOpenSunday={() => activeTab = 'sunday'}
        onOpenVisitations={() => goto('/visitation')}
      />

      <TaskQueue
        tasks={freshTasks}
        title="Fresh people — first 14 days"
        description="Your highest priority. New evangelism contacts are most responsive while the connection is fresh."
        onComplete={openCompleteTask}
        onOpen={openPerson}
      />

      <TaskQueue
        tasks={olderTasks}
        title="Older people — over 14 days"
        description={`Due follow-ups and ${quarterlyCount} active 90-day check-in${quarterlyCount === 1 ? '' : 's'}. This section never hides fresh people.`}
        onComplete={openCompleteTask}
        onOpen={openPerson}
      />

      {#if memberCareDueNow.length}
        <TaskQueue
          tasks={memberCareDueNow}
          title="Member care"
          description="Regular-member conversations that need attention today."
          onComplete={openCompleteTask}
          onOpen={openPerson}
        />
      {/if}

      <section class="rounded-xl border border-border bg-card">
        <button type="button" class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" onclick={() => showUpcoming = !showUpcoming} aria-expanded={showUpcoming}>
          <span>
            <span class="block text-sm font-semibold text-foreground">Scheduled for later</span>
            <span class="mt-1 block text-xs text-muted-foreground">{upcomingTasks.length} task{upcomingTasks.length === 1 ? '' : 's'} will return here on the correct day.</span>
          </span>
          <span class="text-sm font-medium text-primary">{showUpcoming ? 'Hide' : 'Show'}</span>
        </button>
        {#if showUpcoming}
          <div class="border-t border-border p-4">
            <TaskQueue tasks={upcomingTasks} title="Upcoming tasks" description="Future work is visible here without crowding Today." onComplete={openCompleteTask} onOpen={openPerson} />
          </div>
        {/if}
      </section>
    </div>
  {:else if activeTab === 'sunday'}
    <div class="space-y-8">
      <AttendanceForecast forecast={workspace.attendance_forecast} />
      <SundayRoster roster={workspace.attendance_roster || []} savingIds={attendanceSavingIds} onStatusChange={handleAttendanceStatus} onOpen={openPerson} />
      <ComingThisWeek
        commitments={workspace.confirmed_commitments || []}
        title="Guests confirmed for Sunday"
        description="Only an explicit Yes appears here; Maybe stays in the person’s history."
        emptyMessage="No guests have said yes to Sunday yet."
        onResolve={handleCommitmentResolution}
        onOpen={openPerson}
      />
      <ComingThisWeek
        commitments={otherGatherings}
        title="Bacenta and special events"
        description="Confirmed plans for other gatherings in the next seven days."
        emptyMessage="No Bacenta or special-event confirmations in the next seven days."
        onResolve={handleCommitmentResolution}
        onOpen={openPerson}
      />
    </div>
  {:else if activeTab === 'team'}
    <div class="space-y-6">
      <DelegationQueue
        contacts={workspace.unassigned_contacts || []}
        leaders={workspace.leaders || []}
        {today}
        assigningId={delegatingId}
        onAssign={handleDelegateContact}
        onOpen={openPerson}
      />

      <TeamOverview stats={workspace.team_stats || []} onViewLeader={handleViewLeader} />
    </div>
  {:else if activeTab === 'people'}
    <div class="space-y-6">
      <PeopleDirectory contacts={workspace.contacts || []} onOpen={openPerson} />

      {#if workspace.later_contacts?.length}
        <section class="rounded-xl border border-border bg-card">
          <div class="border-b border-border px-5 py-4">
            <h2 class="text-base font-semibold text-foreground">People without a scheduled task</h2>
            <p class="mt-1 text-sm text-muted-foreground">Add someone to Today when you want a leader to actively work on them again.</p>
          </div>
          <div class="divide-y divide-border">
            {#each workspace.later_contacts.slice(0, 30) as contact (personId(contact))}
              <div class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0">
                  <button type="button" class="truncate text-left text-sm font-medium text-foreground hover:underline" onclick={() => openPerson(contact)}>{personName(contact)}</button>
                  <p class="mt-1 text-xs text-muted-foreground">{contact.phone || 'No phone number'}</p>
                </div>
                <Button variant="secondary" size="sm" loading={reactivatingId === String(personId(contact))} onclick={() => handleReactivate(contact)}>Add to Today</Button>
              </div>
            {/each}
          </div>
        </section>
      {/if}
    </div>
  {/if}

  <Modal bind:isOpen={isCompleteModalOpen} title={selectedTask ? `Log outcome — ${personName(selectedTask.person)}` : 'Log outcome'} size="lg">
    <form class="space-y-5" onsubmit={(event) => { event.preventDefault(); submitTask(); }}>
      <fieldset class="rounded-xl border border-border p-4">
        <legend class="px-2 text-sm font-semibold text-foreground">1. What happened?</legend>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="task-outcome" class="mb-1.5 block text-sm font-medium text-foreground">Outcome</label>
            <select id="task-outcome" bind:value={taskForm.outcome} onchange={handleOutcomeChange} class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">
              <option value="positive_conversation">Positive conversation</option>
              <option value="no_response">No response</option>
              <option value="rescheduled">Asked to speak later</option>
              <option value="not_serious_now">Not serious right now</option>
              <option value="not_interested">Not interested</option>
              <option value="wrong_number">Wrong number</option>
              <option value="care_check_in">Member care check-in</option>
            </select>
          </div>
          <div>
            <label for="task-method" class="mb-1.5 block text-sm font-medium text-foreground">Contact method</label>
            <select id="task-method" bind:value={taskForm.method} class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">
              <option value="call">Phone call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="in_person">In person</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </fieldset>

      {#if selectedTask?.task_type !== 'member_care'}
        <fieldset class="rounded-xl border border-border p-4">
          <legend class="px-2 text-sm font-semibold text-foreground">2. Did they say they were coming?</legend>
          <select aria-label="Attendance response" bind:value={taskForm.attendanceResponse} class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">
            <option value="not_discussed">Not discussed</option>
            <option value="yes">Yes</option>
            <option value="maybe">Maybe</option>
            <option value="no">No</option>
          </select>
          {#if taskForm.attendanceResponse !== 'not_discussed'}
            <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select aria-label="Gathering type" bind:value={taskForm.gatheringType} class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">
                <option value="sunday_service">Sunday service</option>
                <option value="bacenta">Bacenta</option>
                <option value="special_event">Special event</option>
              </select>
              <input aria-label="Gathering date" type="date" bind:value={taskForm.gatheringDate} class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground" />
            </div>
            <p class="mt-2 text-xs text-muted-foreground">Only a clear Yes counts toward Sunday. Maybe is kept in their history without bloating the expected list.</p>
          {/if}
        </fieldset>
      {/if}

      <fieldset class="rounded-xl border border-border p-4">
        <legend class="px-2 text-sm font-semibold text-foreground">{selectedTask?.task_type === 'member_care' ? '2' : '3'}. When should we contact them again?</legend>
        <select aria-label="Next step" bind:value={taskForm.nextStep} onchange={handleNextStepChange} class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">
          <option value="schedule">Schedule another task</option>
          <option value="complete">No immediate task — check again in 90 days</option>
        </select>
        {#if taskForm.nextStep === 'schedule'}
          <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input aria-label="Next task date" type="date" min={today} bind:value={taskForm.nextActionDate} onchange={() => nextDateWasEdited = true} class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground" />
            <select aria-label="Next task type" bind:value={taskForm.nextTaskType} class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">
              <option value="follow_up">Follow-up</option>
              <option value="sunday_confirmation">Sunday confirmation</option>
              <option value="member_care">Member care</option>
              <option value="visitation">Arrange a visitation</option>
              <option value="reengagement">Re-engagement</option>
            </select>
          </div>
          <p class="mt-2 text-xs {nextDateWasEdited ? 'text-primary' : 'text-muted-foreground'}">
            {nextDateWasEdited ? 'Your chosen date overrides the automatic suggestion.' : 'A sensible date is suggested from the outcome; you can change it.'}
          </p>
        {:else if selectedTask?.task_type !== 'member_care'}
          <p class="mt-2 text-xs text-muted-foreground">This closes the current task. Unless the person is closed, has another church, or has a wrong number, they become eligible for a batched 90-day check-in. They will not sit in Today until then.</p>
        {:else}
          <p class="mt-2 text-xs text-muted-foreground">This closes the current member-care task without scheduling another one.</p>
        {/if}
      </fieldset>

      <div>
        <label for="task-notes" class="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
        <textarea id="task-notes" bind:value={taskForm.notes} rows="3" placeholder="Useful context for the next conversation." class="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"></textarea>
      </div>
    </form>
    {#snippet footer()}
      <Button variant="secondary" onclick={() => isCompleteModalOpen = false}>Cancel</Button>
      <Button loading={savingTask} onclick={submitTask}>Save outcome</Button>
    {/snippet}
  </Modal>
</DashboardLayout>
