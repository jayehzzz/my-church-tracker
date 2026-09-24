<script>
  import { session } from "$lib/auth/session.js";
  const confidential = $derived($session.status === "demo" || $session.user?.canViewConfidential === true);
  import GatheringAttendanceDialog from "$lib/components/crm/GatheringAttendanceDialog.svelte";
  import { onMount } from 'svelte';
  import { tick } from 'svelte';
  import DashboardLayout from '$lib/components/layout/DashboardLayout.svelte';
  import PageHeader from '$lib/components/shared/PageHeader.svelte';
  import { Button, Modal } from '$lib/components/ui';
  import PersonForm from '$lib/components/forms/PersonForm.svelte';
  import { ExpectedSunday, FollowUpBoard, WorkerAssessment, ContactDrawer } from '$lib/components/crm';
  import { assignContact, batchAssignContacts, completeTask, createTask, getContactProfile, getDashboard, quickLogNoAnswer, reactivateContact, resolveCommitment, setAttendancePlan, updateMissedSundayReason, watchDashboard } from '$lib/services/followUpCrmService.js';
  import { notificationStore, refreshLiveNotifications } from '$lib/stores/notificationStore.js';
  import { isDemoMode } from '$lib/convex.js';
  import { goto } from '$app/navigation';
  import { saveDomainReturn, takeDomainReturn } from '$lib/components/drilldown/domainReturnState.js';
  import { attentionRows, ATTENTION_LABELS } from '$lib/services/followUpAttention.js';
  import MissedSundayFollowUp from '$lib/components/crm/MissedSundayFollowUp.svelte';
  import { recentMissedSundayPeople } from '$lib/utils/missedSundayHistory.js';

  let actualAttendance = $state(null);
  let isActualAttendanceOpen = $state(false);
  let sundayNoteAction = $state(null);
  let sundayActionNote = $state("");
  let isSundayNoteOpen = $state(false);
  let savingSundayNote = $state(false);
  let missedReasonAction = $state(null);
  let missedReasonDraft = $state('');
  let isMissedReasonOpen = $state(false);
  let savingMissedReason = $state(false);
  let missedCallAction = $state(null);
  let missedCallDate = $state('');
  let isMissedCallOpen = $state(false);
  let savingMissedCall = $state(false);

  const TABS = [
    { id: 'week', label: 'This week' },
    { id: 'sunday', label: 'Sunday' },
    { id: 'missed', label: 'Missed after saying yes' },
    { id: 'later', label: 'Later' },
    { id: 'team', label: 'Workers' },
  ];
  const OUTCOMES = [
    { value: 'positive_conversation', label: 'Good conversation' },
    { value: 'rescheduled', label: 'Agreed to speak again' },
    { value: 'no_response', label: 'No answer' },
    { value: 'not_serious_now', label: 'Not serious right now' },
    { value: 'not_interested', label: 'Not interested' },
    { value: 'wrong_number', label: 'Wrong number' },
  ];
  const METHODS = [
    { value: 'call', label: 'Phone call' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'sms', label: 'SMS' },
    { value: 'in_person', label: 'In person' },
    { value: 'other', label: 'Other' },
  ];
  const NEXT_STEPS = [
    { id: 'schedule', title: 'Plan the next call', text: 'Stays in weekly follow-up' },
    { id: 'expected', title: 'Said yes to Sunday', text: 'Added to this Sunday’s newcomer list' },
    { id: 'later', title: 'Move to Later', text: 'Pause and review in 90 days' },
    { id: 'close', title: 'End follow-up', text: 'Settled, or not continuing' },
  ];
  const CLOSE_REASONS = [
    { value: 'settled', label: 'Now settled and attending regularly', positive: true },
    { value: 'not_interested', label: 'Not interested' },
    { value: 'wrong_number', label: 'Wrong number or details' },
    { value: 'attending_elsewhere', label: 'Attending another church' },
    { value: 'moved_away', label: 'Moved away' },
    { value: 'do_not_contact', label: 'Asked not to be contacted' },
    { value: 'other', label: 'Other' },
  ];

  let activeTab = $state('week');
  let boardView = $state('list');
  let assessmentPeriod = $state('week');
  let selectedLeaderId = $state('all');
  let attentionFilter = $state('');
  let workerMetric = $state(null);
  let detailRow = $state(null);
  let evidenceHeading = $state(null);
  let metricTrigger;
  let suspendedDrawerId = $state('');
  let loading = $state(true);
  let refreshing = $state(false);
  let errorMessage = $state('');
  let successMessage = $state('');
  let workspace = $state({ leaders: [], tasks: [], confirmed_commitments: [], sunday_commitments: [], recent_sunday_results: [], sunday_missed_history: [], attendance_roster: [], attendance_forecast: {}, unassigned_contacts: [], later_contacts: [], contacts: [], team_stats: [], service_date: '', source: 'local' });
  let selectedTask = $state(null);
  let isCompleteModalOpen = $state(false);
  let savingTask = $state(false);
  let reactivatingId = $state('');
  let delegatingId = $state('');
  let savingAttendanceIds = $state([]);
  let selectedPerson = $state(null);
  let isPersonFormOpen = $state(false);
  let isDrawerOpen = $state(false);
  let drawerPerson = $state(null);
  let quickLoggingTaskId = $state('');
  let laterSearch = $state('');
  let taskForm = $state(blankTaskForm());
  let stopDashboardWatch = () => {};
  let dashboardWatchKey = '';

  const today = dateOnly(new Date());
  const weekEnd = addDays(today, 7);
  const weekTasks = $derived((workspace.tasks || []).filter((task) => !task.due_date || task.due_date <= weekEnd));
  const overdueCount = $derived(weekTasks.filter((task) => task.due_date && task.due_date < today).length);
  const unassignedCount = $derived((workspace.unassigned_contacts || []).length);
  const sundayPending = $derived((workspace.sunday_commitments || workspace.confirmed_commitments || []).filter((item) => (item.resolution || 'pending') === 'pending').length);
  const laterContacts = $derived((workspace.later_contacts || []).filter((contact) => personName(contact).toLowerCase().includes(laterSearch.trim().toLowerCase())));
  const missedCount = $derived(recentMissedSundayPeople(workspace.sunday_missed_history || [], today).length);
  const tabCounts = $derived({ week: weekTasks.length + unassignedCount, sunday: sundayPending, missed: missedCount, later: (workspace.later_contacts || []).length, team: 0 });
  const attentionItems = $derived(attentionRows(workspace, attentionFilter, today));
  const attentionAvailable = $derived(attentionFilter !== 'expected-sunday'
    || (Array.isArray(workspace.attendance_forecast?.expected_person_ids)
      && attentionItems.length === Number(workspace.attendance_forecast?.expected_total || 0)));
  const workerStat = $derived((workspace.team_stats || []).find((stat) => String(stat.leader_id) === String(workerMetric?.leaderId)));
  const workerRows = $derived(workerMetric?.key === 'attention'
    ? [...(workerStat?.evidence?.overdue_tasks || []), ...(workerStat?.evidence?.people_without_next_action || [])]
    : workerStat?.evidence?.[workerMetric?.key] || []);
  const workerEvidenceAvailable = $derived(!workerMetric || (workerMetric.key === 'attention'
    ? Array.isArray(workerStat?.evidence?.overdue_tasks) && Array.isArray(workerStat?.evidence?.people_without_next_action)
    : Array.isArray(workerStat?.evidence?.[workerMetric.key])));
  const workerCount = $derived(workerMetric?.key === 'attention'
    ? Number(workerStat?.overdue_tasks || 0) + Number(workerStat?.people_without_next_action || 0)
    : Number(workerStat?.[workerMetric?.key] || 0));
  const workerLabels = { period_unique_contacts: 'People worked', meaningful_conversations: 'Real conversations', serious_candidates: 'Serious now', sunday_promises: 'Said yes to Sunday', promises_attended: 'Attended', promises_missed: 'Did not attend', overdue_tasks: 'Overdue calls', people_without_next_action: 'People with no next call', attention: 'Needs attention' };
  function authKey() {
    const user = $session.user;
    return JSON.stringify([$session.status, user?.id || user?.sub || user?.email || user?.externalAuthId, user?.role, user?.canViewConfidential]);
  }
  function returnFrame() { return { auth: authKey(), activeTab, boardView, assessmentPeriod, selectedLeaderId, attentionFilter, workerMetric, detailRowId: detailRow?.id || detailRow?._id, drawerPersonId: personId(drawerPerson), drawerOpen: isDrawerOpen, scrollY: window.scrollY }; }
  function restoreFrame(frame) {
    if (!frame || frame.auth !== authKey()) return;
    activeTab = frame.activeTab; boardView = frame.boardView; assessmentPeriod = frame.assessmentPeriod;
    selectedLeaderId = frame.selectedLeaderId; attentionFilter = frame.attentionFilter;
    workerMetric = frame.workerMetric;
    void loadWorkspace().then(() => {
      detailRow = [...attentionRows(workspace, frame.attentionFilter, today), ...(frame.workerMetric?.key === 'attention' ? [...(workerStat?.evidence?.overdue_tasks || []), ...(workerStat?.evidence?.people_without_next_action || [])] : workerStat?.evidence?.[frame.workerMetric?.key] || [])]
        .find((row) => String(row.id || row._id) === String(frame.detailRowId)) || null;
      if (frame.drawerOpen && frame.drawerPersonId) {
        const people = [...(workspace.contacts || []), ...(workspace.attendance_roster || []), ...(workspace.unassigned_contacts || [])];
        const person = people.find((row) => String(personId(row)) === String(frame.drawerPersonId));
        if (person) openPerson(person);
      }
      if (typeof window !== 'undefined') window.scrollTo(0, frame.scrollY || 0);
    });
  }
  export const snapshot = {
    capture: () => {
      const token = `pipeline-${crypto.randomUUID()}`;
      saveDomainReturn(token, returnFrame());
      return { token };
    },
    restore: (value) => restoreFrame(value?.token ? takeDomainReturn(value.token) : null),
  };

  function blankTaskForm() {
    return {
      method: 'call',
      outcome: 'positive_conversation',
      decision: 'schedule',
      nextActionDate: '',
      nextTaskType: 'follow_up',
      closeReason: 'settled',
      snoozePeriod: '90',
      snoozeDate: '',
      notes: '',
      confirmationNote: '',
    };
  }
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
  function startOfWeek() {
    const value = new Date(`${today}T00:00:00`);
    const offset = value.getDay() === 0 ? -6 : 1 - value.getDay();
    value.setDate(value.getDate() + offset);
    return dateOnly(value);
  }
  function periodRange() {
    return assessmentPeriod === 'month' ? { periodStart: `${today.slice(0, 7)}-01`, periodEnd: today } : { periodStart: startOfWeek(), periodEnd: today };
  }
  function personId(person) { return person?._id || person?.id; }
  function personName(person) { return [person?.preferred_name || person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Unknown person'; }
  function currentLeaderId(fallback) { return selectedLeaderId !== 'all' ? selectedLeaderId : fallback || workspace.leaders?.[0]?._id || workspace.leaders?.[0]?.id; }
  function formatDate(value) {
    if (!value) return 'Not set';
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function selectedLeaderName() {
    const leader = (workspace.leaders || []).find((item) => String(personId(item)) === String(selectedLeaderId));
    return leader ? personName(leader) : '';
  }

  function syncCrmAlerts(data) {
    if (!isDemoMode()) {
      void refreshLiveNotifications();
      return;
    }
    if (selectedLeaderId !== 'all') return;
    const overdue = (data.tasks || []).filter((task) => task.status === 'open' && task.due_date && task.due_date < today).length;
    const unassigned = (data.unassigned_contacts || []).length;
    if (overdue) notificationStore.upsertNotification({ id: 'crm-overdue-work', type: 'followup', category: 'followup', priority: 'urgent', title: 'Follow-up calls overdue', description: `${overdue} planned call${overdue === 1 ? ' is' : 's are'} overdue.`, href: '/pipeline' });
    else notificationStore.removeNotification('crm-overdue-work');
    if (unassigned) notificationStore.upsertNotification({ id: 'crm-fresh-unassigned', type: 'followup', category: 'followup', priority: 'urgent', title: 'People need a worker', description: `${unassigned} ${unassigned === 1 ? 'person needs' : 'people need'} a worker.`, href: '/pipeline' });
    else notificationStore.removeNotification('crm-fresh-unassigned');
  }

  function dashboardOptions() {
    return {
      ...(selectedLeaderId !== 'all' ? { leaderId: selectedLeaderId } : {}),
      ...(workspace.service_date ? { serviceDate: workspace.service_date } : {}),
      ...periodRange(),
    };
  }

  async function startDashboardWatch() {
    const options = dashboardOptions();
    const key = JSON.stringify(options);
    if (key === dashboardWatchKey) return;
    dashboardWatchKey = key;
    stopDashboardWatch();
    stopDashboardWatch = () => {};
    const unsubscribe = await watchDashboard(options, {
      onUpdate: (data) => {
        if (dashboardWatchKey !== key) return;
        workspace = data;
        syncCrmAlerts(data);
        loading = false;
        refreshing = false;
      },
      onError: (error) => {
        if (dashboardWatchKey === key) errorMessage = error?.message || 'Follow-up updates could not be received.';
      },
    });
    if (dashboardWatchKey === key) stopDashboardWatch = unsubscribe;
    else unsubscribe();
  }

  async function loadWorkspace({ quiet = false } = {}) {
    if (quiet) refreshing = true; else loading = true;
    errorMessage = '';
    try {
      const result = await getDashboard(dashboardOptions());
      if (result.error) errorMessage = result.error.message || 'Follow-up could not be loaded.';
      else if (result.data) {
        workspace = result.data;
        syncCrmAlerts(result.data);
        void startDashboardWatch();
      }
    } catch (error) { errorMessage = error?.message || 'Follow-up could not be loaded.'; }
    finally { loading = false; refreshing = false; }
  }

  function openCompleteTask(task) {
    selectedTask = task;
    taskForm = { ...blankTaskForm(), nextActionDate: addDays(today, 2) };
    errorMessage = '';
    isCompleteModalOpen = true;
  }
  function chooseDecision(decision) {
    taskForm.decision = decision;
    if (decision === 'schedule' && !taskForm.nextActionDate) taskForm.nextActionDate = addDays(today, 2);
  }

  async function submitTask() {
    if (!selectedTask) return;
    if (taskForm.decision === 'schedule' && !taskForm.nextActionDate) { errorMessage = 'Choose a date for the next call.'; return; }
    if (taskForm.decision === 'close' && !taskForm.closeReason) { errorMessage = 'Choose why follow-up is ending.'; return; }
    savingTask = true;
    errorMessage = '';
    const notes = taskForm.notes.trim();
    const resumeDate = taskForm.snoozeDate || (taskForm.snoozePeriod === '14' ? addDays(today, 14) : taskForm.snoozePeriod === '30' ? addDays(today, 30) : addDays(today, 90));
    const result = await completeTask(selectedTask._id || selectedTask.id, {
      leaderId: selectedTask.assigned_leader_id || personId(selectedTask.assigned_leader), method: taskForm.method, outcome: taskForm.outcome, ...(confidential && notes ? { notes } : {}), skipAutomaticNextTask: true,
      ...(taskForm.decision === 'schedule' ? { nextActionDate: taskForm.nextActionDate, nextTaskType: taskForm.nextTaskType, ...(confidential ? { nextReason: 'Leader planned the next call' } : {}) } : {}),
      ...(taskForm.decision === 'expected' ? { attendanceResponse: 'yes', gatheringType: 'sunday_service', gatheringDate: workspace.service_date, ...(taskForm.confirmationNote.trim() ? { commitmentNote: taskForm.confirmationNote.trim() } : {}) } : {}),
      ...(taskForm.decision === 'later' ? { moveToLater: true, resumeDate, ...(confidential ? { nextReason: notes || 'Not ready for weekly follow-up' } : {}) } : {}),
      ...(taskForm.decision === 'close' ? { closeContact: true, closeReason: taskForm.closeReason } : {}),
    });
    savingTask = false;
    if (result.error) { errorMessage = result.error.message || 'The call could not be saved.'; return; }
    const closeMessage = taskForm.closeReason === 'settled' ? 'is now marked as attending regularly and has left weekly follow-up. Membership is unchanged.' : 'was closed and removed from follow-up.';
    const messages = { schedule: `has a call planned for ${formatDate(taskForm.nextActionDate)}.`, expected: `is expected on ${formatDate(workspace.service_date)}.`, later: `was moved to Later and returns on ${formatDate(resumeDate)}.`, close: closeMessage };
    isCompleteModalOpen = false;
    successMessage = `${personName(selectedTask.person)} ${messages[taskForm.decision]}`;
    await loadWorkspace({ quiet: true });
  }

  async function handleCommitmentResolution(commitment, resolution, gathering, note = '') {
    if (resolution === 'attended' && !gathering) {
      actualAttendance = { commitment, person: commitment.person, gatheringType: commitment.gathering_type, gatheringDate: commitment.gathering_date };
      isActualAttendanceOpen = true;
      return;
    }
    const leaderId = currentLeaderId(commitment.leader_id || commitment.person?.assigned_leader_id);
    const result = await resolveCommitment(commitment._id || commitment.id, resolution, { ...(gathering || {}), ...(leaderId ? { leaderId } : {}), ...(note.trim() ? { note: note.trim() } : {}) });
    if (result.error) { errorMessage = result.error.message || 'The Sunday result could not be saved.'; return result; }
    const count = result.data?.confirmed_sunday_no_shows || ((commitment.person?.confirmed_no_shows || 0) + (resolution === 'no_show' ? 1 : 0));
    successMessage = resolution === 'attended' ? `${personName(commitment.person)} attended. Their attendance history has been updated.` : resolution === 'no_show' && count >= 2 ? `${personName(commitment.person)} has missed ${count} Sundays after saying yes. Moving them to Later is now recommended.` : `${personName(commitment.person)} was marked as ${resolution === 'no_show' ? 'did not attend' : 'cancelled'}.`;
    await loadWorkspace({ quiet: true });
    return result;
  }
  async function handleAttendanceStatus(person, status, gathering, note = '') {
    if (status === 'attended' && !gathering) {
      actualAttendance = { person, gatheringType: 'sunday_service', gatheringDate: workspace.service_date };
      isActualAttendanceOpen = true;
      return;
    }
    const id = String(personId(person));
    const leaderId = currentLeaderId(person.assigned_leader_id);
    if (!leaderId) { errorMessage = 'A leader is required to update the Sunday list.'; return { error: new Error(errorMessage) }; }
    savingAttendanceIds = [...savingAttendanceIds, id];
    const result = await setAttendancePlan(personId(person), leaderId, workspace.service_date, status, note.trim() || undefined, gathering);
    savingAttendanceIds = savingAttendanceIds.filter((savingId) => savingId !== id);
    if (result.error) { errorMessage = result.error.message || 'The Sunday status could not be saved.'; return result; }
    const messages = { away: 'was marked away for this Sunday.', confirmed: 'is confirmed for Sunday.', expected: 'is expected for Sunday.', attended: 'was marked as attended.', absent: 'was marked as did not attend.' };
    successMessage = `${personName(person)} ${messages[status] || 'was updated.'}`;
    await loadWorkspace({ quiet: true });
    return result;
  }
  function requestCommitmentResolution(commitment, resolution, gathering) {
    if (resolution === 'attended') return handleCommitmentResolution(commitment, resolution, gathering);
    sundayNoteAction = { kind: 'commitment', commitment, resolution };
    sundayActionNote = '';
    isSundayNoteOpen = true;
  }
  function requestAttendanceStatus(person, status, gathering) {
    if (status === 'attended') return handleAttendanceStatus(person, status, gathering);
    sundayNoteAction = { kind: 'member', person, status };
    sundayActionNote = '';
    isSundayNoteOpen = true;
  }
  function sundayActionTitle() {
    if (!sundayNoteAction) return 'Sunday update';
    const person = sundayNoteAction.person || sundayNoteAction.commitment?.person;
    const action = sundayNoteAction.kind === 'commitment'
      ? (sundayNoteAction.resolution === 'no_show' ? 'Record missed Sunday' : 'Record cancellation')
      : ({ confirmed: 'Confirm Sunday', expected: 'Change to expected', away: 'Mark away', absent: 'Record missed Sunday' }[sundayNoteAction.status] || 'Update Sunday status');
    return `${action} — ${personName(person)}`;
  }
  function sundayActionHelp() {
    if (!sundayNoteAction) return '';
    if (sundayNoteAction.kind === 'commitment' && sundayNoteAction.resolution === 'cancelled') return 'Cancel this confirmation if it was selected by mistake or their plans changed. For a misclick, enter “Confirmed by mistake”.';
    if (sundayNoteAction.kind === 'commitment' && sundayNoteAction.resolution === 'no_show') return 'Record any known context for why they did not attend after saying yes.';
    if (sundayNoteAction.status === 'confirmed') return 'A note is optional. Add one only when there is useful context to remember.';
    if (sundayNoteAction.status === 'absent') return 'Record any known context for the missed Sunday after their confirmation.';
    return 'Record why this Sunday status changed so the history makes sense later.';
  }
  function sundayActionNoteRequired() {
    if (!sundayNoteAction) return false;
    if (sundayNoteAction.kind === 'commitment') return ['no_show', 'cancelled'].includes(sundayNoteAction.resolution);
    return ['away', 'absent'].includes(sundayNoteAction.status);
  }
  async function submitSundayNoteAction() {
    const note = sundayActionNote.trim();
    if (sundayActionNoteRequired() && !note) { errorMessage = 'Add a short note explaining this Sunday update.'; return; }
    if (!sundayNoteAction) return;
    savingSundayNote = true;
    const action = sundayNoteAction;
    const result = action.kind === 'commitment'
      ? await handleCommitmentResolution(action.commitment, action.resolution, undefined, note)
      : await handleAttendanceStatus(action.person, action.status, undefined, note);
    savingSundayNote = false;
    if (!result?.error) { isSundayNoteOpen = false; sundayNoteAction = null; sundayActionNote = ''; }
  }

  async function changeSunday(amount) {
    workspace = { ...workspace, service_date: addDays(workspace.service_date || today, amount) };
    await loadWorkspace({ quiet: true });
  }
  async function resetSundayToCurrent() {
    const now = new Date();
    const day = now.getDay();
    const diff = (7 - day) % 7;
    workspace = { ...workspace, service_date: addDays(today, diff) };
    await loadWorkspace({ quiet: true });
  }
  async function handleViewLeader(leaderId) { attentionFilter = ''; workerMetric = null; selectedLeaderId = String(leaderId); activeTab = 'week'; await loadWorkspace({ quiet: true }); }
  async function clearLeader() { selectedLeaderId = 'all'; await loadWorkspace({ quiet: true }); }
  async function handleLeaderChange() {
    attentionFilter = ''; workerMetric = null;
    activeTab = 'week';
    await loadWorkspace({ quiet: true });
  }
  async function handleReactivate(contact) {
    const leaderId = currentLeaderId(contact.assigned_leader_id || personId(contact.assigned_leader));
    if (!leaderId) { errorMessage = 'Assign a worker before returning this person to weekly follow-up.'; return; }
    reactivatingId = String(personId(contact));
    const result = await reactivateContact(personId(contact), leaderId, today);
    reactivatingId = '';
    if (result.error) errorMessage = result.error.message || 'The person could not be returned to follow-up.';
    else { successMessage = `${personName(contact)} is back in this week’s list.`; await loadWorkspace({ quiet: true }); }
  }
  async function handleAssign(contact, leaderId, dueDate) {
    delegatingId = String(personId(contact));
    const result = await assignContact(personId(contact), leaderId, dueDate);
    delegatingId = '';
    if (result.error) errorMessage = result.error.message || 'The person could not be assigned.';
    else {
      const leader = (workspace.leaders || []).find((item) => String(personId(item)) === String(leaderId));
      successMessage = `${personName(contact)} was assigned to ${leader ? personName(leader) : 'a worker'} with a first call on ${formatDate(dueDate)}.`;
      await loadWorkspace({ quiet: true });
    }
  }
  async function handleBatchAssign(personIds, leaderId, dueDate) {
    const result = await batchAssignContacts(personIds, leaderId, dueDate);
    if (result.error && !result.data?.length) {
      errorMessage = result.error.message || 'Batch assignment could not be saved.';
    } else {
      const leader = (workspace.leaders || []).find((item) => String(personId(item)) === String(leaderId));
      successMessage = `Assigned ${personIds.length} ${personIds.length === 1 ? 'person' : 'people'} to ${leader ? personName(leader) : 'a worker'} with first call on ${formatDate(dueDate)}.`;
      await loadWorkspace({ quiet: true });
    }
  }
  async function handleQuickNoAnswer(task) {
    const leaderId = currentLeaderId(task.assigned_leader_id || personId(task.assigned_leader));
    const taskId = task._id || task.id;
    quickLoggingTaskId = String(taskId);
    const result = await quickLogNoAnswer(taskId, leaderId);
    quickLoggingTaskId = '';
    if (result.error) {
      errorMessage = result.error.message || 'Could not record no answer.';
    } else {
      successMessage = `Recorded no answer for ${personName(task.person)}. Next call scheduled for ${formatDate(addDays(today, 2))}.`;
      await loadWorkspace({ quiet: true });
    }
  }
  async function changeAssessmentPeriod(period) { assessmentPeriod = period; await loadWorkspace({ quiet: true }); }
  async function openWorkerMetric(stat, key) {
    metricTrigger = document.activeElement;
    attentionFilter = ''; workerMetric = { leaderId: String(stat.leader_id), key }; detailRow = null;
    await tick();
    evidenceHeading?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    evidenceHeading?.focus();
  }
  function closeWorkerMetric() { workerMetric = null; detailRow = null; metricTrigger?.focus?.(); }
  function selectTab(tab) { attentionFilter = ''; workerMetric = null; activeTab = tab; }
  function openMissedReason(commitment) {
    missedReasonAction = commitment;
    missedReasonDraft = commitment?.resolution_note === 'Not in the recorded Sunday attendance.' ? '' : commitment?.resolution_note || '';
    isMissedReasonOpen = true;
  }
  async function saveMissedReason() {
    if (!missedReasonAction || missedReasonDraft.trim().length > 500) return;
    savingMissedReason = true;
    const result = await updateMissedSundayReason(missedReasonAction._id || missedReasonAction.id, missedReasonDraft);
    savingMissedReason = false;
    if (result.error) { errorMessage = result.error.message || 'The reason could not be saved.'; return; }
    isMissedReasonOpen = false;
    missedReasonAction = null;
    await loadWorkspace({ quiet: true });
  }
  function openMissedCall(row) {
    missedCallAction = row;
    missedCallDate = addDays(today, 2);
    isMissedCallOpen = true;
  }
  async function saveMissedCall() {
    if (!missedCallAction || !missedCallDate) return;
    if (missedCallAction.next_task) {
      errorMessage = 'A follow-up task is already open for this person. Open their profile to review it.';
      missedCallAction = null;
      isMissedCallOpen = false;
      await loadWorkspace({ quiet: true });
      return;
    }
    const person = missedCallAction.person;
    const leaderId = missedCallAction.assigned_leader_id;
    if (!personId(person) || !leaderId) { errorMessage = 'Assign a worker before scheduling a call.'; return; }
    savingMissedCall = true;
    const result = await createTask({
      personId: personId(person),
      assignedLeaderId: leaderId,
      dueDate: missedCallDate,
      taskType: 'follow_up',
      ...(confidential ? { reason: 'Check in after a missed Sunday confirmation' } : {}),
    });
    savingMissedCall = false;
    if (result.error) { errorMessage = result.error.message || 'The call could not be scheduled.'; return; }
    missedCallAction = null;
    isMissedCallOpen = false;
    successMessage = `A follow-up call for ${personName(person)} is planned for ${formatDate(missedCallDate)}.`;
    await loadWorkspace({ quiet: true });
  }
  function viewFullProfile(person) {
    if (!personId(person)) return;
    saveDomainReturn('pipeline-profile', returnFrame());
    isDrawerOpen = false;
    void goto(`/people/${encodeURIComponent(personId(person))}`);
  }
  function openPerson(person) {
    if (!personId(person)) return;
    drawerPerson = { ...person, id: person.id || person._id };
    isDrawerOpen = true;
  }
  async function openEvidencePerson(row) {
    const id = row?.person_id || personId(row);
    const people = [...(workspace.contacts || []), ...(workspace.attendance_roster || []), ...(workspace.unassigned_contacts || []), ...(workspace.later_contacts || [])];
    const person = people.find((candidate) => String(personId(candidate)) === String(id));
    if (person) openPerson(person);
    else if (id) {
      const result = await getContactProfile(id);
      if (result.error || !result.data?.person) errorMessage = result.error?.message || 'This person is unavailable or access is restricted.';
      else openPerson(result.data.person);
    }
  }
  function openFullProfileEdit() {
    if (!drawerPerson) return;
    selectedPerson = drawerPerson;
    suspendedDrawerId = String(personId(drawerPerson));
    isDrawerOpen = false;
    isPersonFormOpen = true;
  }
  function handleLogCallFromDrawer() {
    if (!drawerPerson) return;
    suspendedDrawerId = String(personId(drawerPerson));
    isDrawerOpen = false;
    const personTask = (workspace.tasks || []).find((t) => String(t.person_id) === String(personId(drawerPerson)) && t.status === 'open');
    if (personTask) {
      openCompleteTask(personTask);
    } else {
      openCompleteTask({
        id: `adhoc-${personId(drawerPerson)}`,
        person_id: personId(drawerPerson),
        person: drawerPerson,
        assigned_leader_id: currentLeaderId(drawerPerson.assigned_leader_id),
        task_type: 'follow_up',
      });
    }
  }
  async function handlePersonSaved(savedPerson) {
    selectedPerson = savedPerson;
    successMessage = `${personName(savedPerson)} was updated.`;
    await loadWorkspace({ quiet: true });
  }

  $effect(() => {
    if (suspendedDrawerId && !isCompleteModalOpen && !isPersonFormOpen) {
      const id = suspendedDrawerId;
      suspendedDrawerId = '';
      queueMicrotask(() => {
        const person = [...(workspace.contacts || []), ...(workspace.attendance_roster || []), ...(workspace.unassigned_contacts || [])]
          .find((row) => String(personId(row)) === id);
        if (person) openPerson(person);
      });
    }
  });

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get('filter');
    if (filter && ATTENTION_LABELS[filter]) attentionFilter = filter;
    const prior = takeDomainReturn('pipeline-profile');
    if (prior && prior.auth === authKey()) restoreFrame(prior);
    else void loadWorkspace();
    return () => stopDashboardWatch();
  });
</script>

<DashboardLayout>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <PageHeader title="Follow-Up" subtitle="Weekly calls with new people until they settle. Every person has one worker and one next call." />
    <div class="flex items-center gap-2">
      <label class="flex items-center gap-2 text-sm font-medium text-foreground"><span class="sr-only sm:not-sr-only">Worker</span><select bind:value={selectedLeaderId} onchange={handleLeaderChange} class="min-w-44 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary"><option value="all">Everyone</option>{#each workspace.leaders || [] as leader (personId(leader))}<option value={personId(leader)}>{personName(leader)}</option>{/each}</select></label>
      <Button variant="secondary" size="sm" loading={refreshing} onclick={() => loadWorkspace({ quiet: true })}>Refresh</Button>
    </div>
  </div>

  {#if selectedLeaderId !== 'all'}<div class="mt-4 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-foreground"><span>Showing only <strong>{selectedLeaderName()}</strong>’s people.</span><button type="button" class="text-xs font-medium hover:underline" onclick={clearLeader}>Show everyone</button></div>{/if}
  {#if errorMessage}<div class="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{errorMessage}</div>{/if}
  {#if successMessage}<div class="mt-4 flex items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success" role="status"><span>{successMessage}</span><button class="text-xs font-medium hover:underline" onclick={() => successMessage = ''}>Dismiss</button></div>{/if}

  <div class="my-6 flex flex-col gap-3 border-b border-border sm:flex-row sm:items-end sm:justify-between">
    <nav class="flex gap-1 overflow-x-auto" aria-label="Follow-up sections">
      {#each TABS as tab (tab.id)}
        <button type="button" class="flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold {activeTab === tab.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}" onclick={() => selectTab(tab.id)} aria-current={activeTab === tab.id ? 'page' : undefined}>{tab.label}{#if tabCounts[tab.id]}<span class="rounded-full px-2 py-0.5 text-xs {tab.id === 'week' && overdueCount ? 'bg-destructive/10 text-destructive' : 'bg-secondary'}">{tabCounts[tab.id]}</span>{/if}</button>
      {/each}
    </nav>
    {#if activeTab === 'week'}<div class="mb-2 flex self-start rounded-lg border border-border bg-secondary/40 p-1 sm:self-auto" aria-label="This week layout"><button type="button" class="rounded-md px-3 py-1.5 text-xs font-semibold {boardView === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}" onclick={() => boardView = 'list'}>List</button><button type="button" class="rounded-md px-3 py-1.5 text-xs font-semibold {boardView === 'board' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}" onclick={() => boardView = 'board'}>Board</button></div>{/if}
  </div>

  {#if loading}
    <div class="rounded-xl border border-border bg-card py-20 text-center text-sm text-muted-foreground">Loading follow-up…</div>
  {:else if attentionFilter && !errorMessage}
    <section class="rounded-xl border border-border bg-card" aria-label={ATTENTION_LABELS[attentionFilter]}>
      <div class="flex items-center justify-between gap-3 border-b border-border p-5">
        <div><h2 class="text-lg font-semibold">{ATTENTION_LABELS[attentionFilter]}</h2><p class="text-sm text-muted-foreground">{attentionItems.length} matching {attentionItems.length === 1 ? 'record' : 'records'}{attentionFilter === 'expected-sunday' ? ` · ${formatDate(workspace.service_date)}` : ''}</p></div>
        <Button size="sm" variant="secondary" onclick={() => attentionFilter = ''}>Clear filter</Button>
      </div>
      {#if !attentionAvailable}<p class="p-8 text-sm text-destructive" role="alert">Details are unavailable. Refresh to try again.</p>
      {:else if attentionItems.length}
        <div class="divide-y divide-border">
          {#each attentionItems as row, index (`${row._id || row.id || row.person_id}-${index}`)}
            <div class="flex items-center justify-between gap-3 px-5 py-3">
              <div><p class="font-medium">{row.person ? personName(row.person) : row.unavailable ? 'Person unavailable' : personName(row)}</p><p class="text-xs text-muted-foreground">{row.attention_kind === 'task' ? `${String(row.task_type || 'Task').replaceAll('_', ' ')} · ${row.due_date ? formatDate(row.due_date) : 'No due date'}` : attentionFilter === 'expected-sunday' ? 'Expected for this Sunday' : 'Needs a worker'}</p></div>
              {#if !row.unavailable}<Button size="sm" variant="ghost" onclick={() => row.attention_kind === 'task' ? detailRow = row : openEvidencePerson(row.person || row)}>{row.attention_kind === 'task' ? 'Task details' : 'View person'}</Button>{/if}
            </div>
          {/each}
        </div>
      {:else}<p class="p-8 text-sm text-muted-foreground">No matching records.</p>{/if}
      {#if detailRow}
        <div class="border-t border-border bg-secondary/20 p-5"><button type="button" class="mb-3 text-sm font-semibold text-primary" onclick={() => detailRow = null}>← Back to matching records</button><h3 class="font-semibold">{String(detailRow.task_type || 'Task').replaceAll('_', ' ')}</h3><p class="text-sm text-muted-foreground">Due {detailRow.due_date ? formatDate(detailRow.due_date) : 'date not set'} · {personName(detailRow.person)}</p><Button size="sm" variant="secondary" onclick={() => openEvidencePerson(detailRow.person || detailRow)}>View person</Button></div>
      {/if}
    </section>
  {:else if activeTab === 'week'}
    <FollowUpBoard
      unassigned={selectedLeaderId === 'all' ? workspace.unassigned_contacts || [] : []}
      tasks={workspace.tasks || []}
      commitments={workspace.sunday_commitments || workspace.confirmed_commitments || []}
      leaders={workspace.leaders || []}
      {today}
      {weekEnd}
      view={boardView}
      assigningId={delegatingId}
      {quickLoggingTaskId}
      onComplete={openCompleteTask}
      onQuickNoAnswer={handleQuickNoAnswer}
      onAssign={handleAssign}
      onBatchAssign={handleBatchAssign}
      onOpen={openPerson}
    />
  {:else if activeTab === 'sunday'}
    <ExpectedSunday
      roster={workspace.attendance_roster || []}
      commitments={workspace.sunday_commitments || workspace.confirmed_commitments || []}
      results={workspace.recent_sunday_results || []}
      forecast={workspace.attendance_forecast || {}}
      {today}
      savingIds={savingAttendanceIds}
      onStatusChange={requestAttendanceStatus}
      onResolve={requestCommitmentResolution}
      onOpen={openPerson}
      onPreviousSunday={() => changeSunday(-7)}
      onNextSunday={() => changeSunday(7)}
      onCurrentSunday={resetSundayToCurrent}
    />
  {:else if activeTab === 'missed'}
    <MissedSundayFollowUp
      history={workspace.sunday_missed_history || []}
      {today}
      onOpen={openPerson}
      onEditReason={openMissedReason}
      onPlanCall={openMissedCall}
    />
  {:else if activeTab === 'later'}
    <section class="overflow-hidden rounded-xl border border-border bg-card">
      <div class="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 class="text-lg font-semibold text-foreground">Later</h2><p class="mt-1 text-sm text-muted-foreground">Paused from weekly calls. Each person returns to This week on their review date, or sooner if you bring them back.</p></div>
        {#if workspace.later_contacts?.length}<label class="sm:w-64"><span class="sr-only">Search Later</span><input type="search" bind:value={laterSearch} placeholder="Search Later" class="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" /></label>{/if}
      </div>
      {#if laterContacts.length}
        <div class="divide-y divide-border">
          {#each laterContacts as contact (personId(contact))}
            <div class="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <button type="button" class="truncate text-left text-sm font-semibold text-foreground hover:underline" onclick={() => openPerson(contact)}>{personName(contact)}</button>
                <p class="mt-0.5 text-xs text-muted-foreground"><span class="text-foreground">Why:</span> {contact.later_reason || contact.pause_reason || 'Not ready for weekly follow-up'} · <span class="text-foreground">Returns:</span> {formatDate(contact.resume_date || addDays(today, 90))}</p>
              </div>
              <Button variant="secondary" size="sm" loading={reactivatingId === String(personId(contact))} onclick={() => handleReactivate(contact)}>Bring back this week</Button>
            </div>
          {/each}
        </div>
      {:else}
        <p class="px-5 py-14 text-center text-sm text-muted-foreground">{workspace.later_contacts?.length ? 'No one in Later matches this search.' : 'No one is paused in Later.'}</p>
      {/if}
    </section>
  {:else}
    <WorkerAssessment stats={workspace.team_stats || []} period={assessmentPeriod} onPeriodChange={changeAssessmentPeriod} onViewLeader={handleViewLeader} onMetric={openWorkerMetric} />
    {#if workerMetric}
      <section class="mt-4 rounded-xl border border-border bg-card" aria-label="Worker metric evidence">
        <div class="flex items-center justify-between gap-3 border-b border-border p-5"><div><h3 bind:this={evidenceHeading} tabindex="-1" class="font-semibold">{workerStat?.leader_name || 'Worker'} · {workerLabels[workerMetric.key]}</h3><p class="text-sm text-muted-foreground">{periodRange().periodStart} to {periodRange().periodEnd} · {workerCount} matching {workerCount === 1 ? 'record' : 'records'}{['serious_candidates', 'overdue_tasks', 'people_without_next_action', 'attention'].includes(workerMetric.key) ? ' · current snapshot' : ''}</p></div><Button size="sm" variant="secondary" onclick={closeWorkerMetric}>Close</Button></div>
        {#if !workerEvidenceAvailable}<p class="p-8 text-sm text-destructive" role="alert">Details are unavailable. Refresh to try again.</p>{:else if workerRows.length}<div class="divide-y divide-border">{#each workerRows as row, index (`${row.id || row.person_id}-${index}`)}<div class="flex items-center justify-between gap-3 px-5 py-3"><div><p class="font-medium">{row.person_name}</p><p class="text-xs text-muted-foreground">{row.date ? formatDate(row.date) : 'Current person'}{row.outcome ? ` · ${String(row.outcome).replaceAll('_', ' ')}` : ''}{row.resolution ? ` · ${String(row.resolution).replaceAll('_', ' ')}` : ''}{row.task_type ? ` · ${String(row.task_type).replaceAll('_', ' ')}` : ''}</p></div><Button size="sm" variant="ghost" onclick={() => row.task_type ? detailRow = row : openEvidencePerson(row)}>{row.task_type ? 'Task details' : 'View person'}</Button></div>{/each}</div>{:else}<p class="p-8 text-sm text-muted-foreground">No matching evidence for this measure.</p>{/if}
        {#if detailRow}<div class="border-t border-border bg-secondary/20 p-5"><button type="button" class="mb-3 text-sm font-semibold text-primary" onclick={() => detailRow = null}>← Back to evidence</button><h4 class="font-semibold">{detailRow.person_name} · {String(detailRow.task_type || 'Task').replaceAll('_', ' ')}</h4><p class="text-sm text-muted-foreground">Due {detailRow.date ? formatDate(detailRow.date) : 'date not set'}</p><Button size="sm" variant="secondary" onclick={() => openEvidencePerson(detailRow)}>View person</Button></div>{/if}
      </section>
    {/if}
  {/if}

  <Modal bind:isOpen={isCompleteModalOpen} title={selectedTask ? `Log call — ${personName(selectedTask.person)}` : 'Log call'} size="lg">
    <form class="space-y-6" onsubmit={(event) => { event.preventDefault(); submitTask(); }}>
      {#if selectedTask?.person}
        <div class="rounded-xl border border-border bg-secondary/30 p-3.5 text-xs flex flex-wrap items-center justify-between gap-3">
          <div>
            <span class="font-bold text-foreground text-sm">{personName(selectedTask.person)}</span>
            {#if selectedTask.person?.phone}
              <span class="font-mono text-foreground/80 ml-2">{selectedTask.person.phone}</span>
            {/if}
            {#if selectedTask.person?.invited_by_name}
              <p class="text-muted-foreground mt-0.5">Invited by {selectedTask.person.invited_by_name}</p>
            {/if}
          </div>
          {#if selectedTask.person?.phone}
            <div class="flex items-center gap-2 shrink-0">
              <a href="tel:{selectedTask.person.phone.replace(/[^\d+]/g, '')}" class="inline-flex h-7 px-2.5 items-center gap-1.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-primary/10 transition-colors">
                <svg class="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                Call
              </a>
              <a href="https://wa.me/{selectedTask.person.phone.replace(/[^\d]/g, '')}?text={encodeURIComponent(`Hi ${(selectedTask.person.preferred_name || selectedTask.person.first_name || 'there')}, hope you're having a blessed week!`)}" target="_blank" rel="noopener noreferrer" class="inline-flex h-7 px-2.5 items-center gap-1.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:border-success/50 hover:bg-success/10 transition-colors">
                <svg class="h-3 w-3 text-success" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.53 1.942.812 2.791.812 3.179 0 5.766-2.587 5.766-5.768 0-3.18-2.587-5.766-5.766-5.766zm9.969 5.766c0 5.517-4.484 9.999-10 9.999-1.748 0-3.385-.45-4.819-1.238l-5.181 1.357 1.385-5.048c-.86-1.488-1.385-3.224-1.385-5.07 0-5.516 4.484-10 10-10 5.516 0 10 4.484 10 10z"/></svg>
                WhatsApp
              </a>
            </div>
          {/if}
        </div>
      {/if}

      {#if selectedTask?.person?.should_move_to_later}<div class="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground"><strong>Suggestion:</strong> {selectedTask.person.recommendation_reason}. Moving them to Later may be right, but the choice is yours.</div>{/if}

      <fieldset class="space-y-3">
        <legend class="text-sm font-semibold text-foreground">1. What happened</legend>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-sm font-medium text-foreground">Outcome<select bind:value={taskForm.outcome} class="mt-1.5 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm">{#each OUTCOMES as option (option.value)}<option value={option.value}>{option.label}</option>{/each}</select></label>
          <label class="text-sm font-medium text-foreground">How<select bind:value={taskForm.method} class="mt-1.5 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm">{#each METHODS as option (option.value)}<option value={option.value}>{option.label}</option>{/each}</select></label>
        </div>
        {#if confidential}<label class="block text-sm font-medium text-foreground">Notes<textarea bind:value={taskForm.notes} rows="2" placeholder="Only what the next worker needs to know." class="mt-1.5 w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm"></textarea></label>{/if}
      </fieldset>

      <fieldset class="space-y-3">
        <legend class="text-sm font-semibold text-foreground">2. What next</legend>
        <div class="grid gap-2 sm:grid-cols-2">
          {#each NEXT_STEPS.filter(step => confidential || step.id !== 'close') as step (step.id)}
            <button type="button" aria-pressed={taskForm.decision === step.id} onclick={() => chooseDecision(step.id)} class="rounded-xl border p-3 text-left {taskForm.decision === step.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}"><span class="block text-sm font-semibold text-foreground">{step.title}</span><span class="mt-0.5 block text-xs text-muted-foreground">{step.text}</span></button>
          {/each}
        </div>
        {#if taskForm.decision === 'schedule'}
          <div class="space-y-2.5">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-xs text-muted-foreground mr-1">Quick date:</span>
              <button type="button" class="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium hover:border-primary/50 text-foreground" onclick={() => taskForm.nextActionDate = addDays(today, 2)}>+2 Days ({formatDate(addDays(today, 2))})</button>
              <button type="button" class="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium hover:border-primary/50 text-foreground" onclick={() => taskForm.nextActionDate = addDays(today, 4)}>+4 Days ({formatDate(addDays(today, 4))})</button>
              <button type="button" class="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium hover:border-primary/50 text-foreground" onclick={() => taskForm.nextActionDate = addDays(today, 7)}>Next Week</button>
            </div>
            <div class="grid gap-3 sm:grid-cols-2"><label class="text-sm font-medium text-foreground">Date<input type="date" min={today} bind:value={taskForm.nextActionDate} class="mt-1.5 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm" /></label><label class="text-sm font-medium text-foreground">Type of call<select bind:value={taskForm.nextTaskType} class="mt-1.5 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"><option value="follow_up">Call or message</option><option value="sunday_confirmation">Confirm Sunday</option><option value="reengagement">Review again</option></select></label></div>
          </div>
        {:else if taskForm.decision === 'expected'}
          <div class="space-y-3 rounded-xl bg-secondary/50 px-4 py-3">
            <p class="text-sm text-foreground">They join the newcomer list for <strong>{formatDate(workspace.service_date)}</strong>. After the service, record whether they came on the Sunday tab.</p>
            <label class="block text-sm font-medium text-foreground">Sunday confirmation note <span class="font-normal text-muted-foreground">(optional)</span>
              <textarea bind:value={taskForm.confirmationNote} rows="2" placeholder="e.g. Confirmed on WhatsApp; said they are coming with a friend." class="mt-1.5 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"></textarea>
              <span class="mt-1 block text-xs font-normal text-muted-foreground">Use this only when there is useful context worth keeping.</span>
            </label>
          </div>
        {:else if taskForm.decision === 'later'}
          <div class="space-y-3 rounded-xl bg-secondary/40 p-4 text-xs">
            <p class="text-sm text-foreground">Weekly calls stop now. Choose when this person returns to <strong>This week</strong> for review:</p>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="rounded-lg border px-3 py-1.5 font-medium transition-colors {taskForm.snoozePeriod === '14' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-foreground'}" onclick={() => { taskForm.snoozePeriod = '14'; taskForm.snoozeDate = addDays(today, 14); }}>2 Weeks ({formatDate(addDays(today, 14))})</button>
              <button type="button" class="rounded-lg border px-3 py-1.5 font-medium transition-colors {taskForm.snoozePeriod === '30' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-foreground'}" onclick={() => { taskForm.snoozePeriod = '30'; taskForm.snoozeDate = addDays(today, 30); }}>1 Month ({formatDate(addDays(today, 30))})</button>
              <button type="button" class="rounded-lg border px-3 py-1.5 font-medium transition-colors {taskForm.snoozePeriod === '90' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-foreground'}" onclick={() => { taskForm.snoozePeriod = '90'; taskForm.snoozeDate = addDays(today, 90); }}>90 Days ({formatDate(addDays(today, 90))})</button>
            </div>
            <label class="block mt-2 font-medium text-foreground">
              Or pick specific return date:
              <input type="date" min={today} bind:value={taskForm.snoozeDate} class="mt-1 w-full sm:w-56 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs text-foreground" />
            </label>
          </div>
        {:else if taskForm.decision === 'close'}
          <label class="block text-sm font-medium text-foreground">Why is follow-up ending?<select bind:value={taskForm.closeReason} class="mt-1.5 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm">{#each CLOSE_REASONS as reason (reason.value)}<option value={reason.value}>{reason.label}</option>{/each}</select></label>
          {#if taskForm.closeReason === 'settled'}<p class="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground">They are marked as attending regularly and leave weekly follow-up. Membership stays unchanged; record confirmed membership on their People profile.</p>{:else}<p class="rounded-xl bg-secondary/50 px-4 py-3 text-sm text-foreground">They leave follow-up and any open calls are cancelled. Their history stays on their profile.</p>{/if}
        {/if}
      </fieldset>
    </form>
    {#snippet footer()}<Button variant="secondary" onclick={() => isCompleteModalOpen = false}>Cancel</Button><Button loading={savingTask} onclick={submitTask}>Save</Button>{/snippet}
  </Modal>

  <Modal bind:isOpen={isSundayNoteOpen} title={sundayActionTitle()} size="md">
    <form class="space-y-4" onsubmit={(event) => { event.preventDefault(); submitSundayNoteAction(); }}>
      <p class="text-sm text-muted-foreground">{sundayActionHelp()}</p>
      <label class="block text-sm font-medium text-foreground">Note / reason{#if !sundayActionNoteRequired()} <span class="font-normal text-muted-foreground">(optional)</span>{/if}
        <textarea bind:value={sundayActionNote} rows="3" required={sundayActionNoteRequired()} placeholder={sundayActionNoteRequired() ? 'Add enough context for someone reviewing this months later.' : 'Optional context, if there is anything useful to remember.'} class="mt-1.5 w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm"></textarea>
      </label>
    </form>
    {#snippet footer()}<Button variant="secondary" disabled={savingSundayNote} onclick={() => isSundayNoteOpen = false}>Cancel</Button><Button loading={savingSundayNote} onclick={submitSundayNoteAction}>Save update</Button>{/snippet}
  </Modal>

  <Modal bind:isOpen={isMissedReasonOpen} title={missedReasonAction ? `Sunday follow-up note — ${personName(missedReasonAction.person)}` : 'Sunday follow-up note'} size="md">
    <form class="space-y-4" onsubmit={(event) => { event.preventDefault(); saveMissedReason(); }}>
      <p class="text-sm text-muted-foreground">Add the reason you learned for this missed Sunday. The history will keep the previous note changes.</p>
      <label class="block text-sm font-medium text-foreground">Reason or context <span class="font-normal text-muted-foreground">(optional)</span>
        <textarea bind:value={missedReasonDraft} maxlength="500" rows="3" placeholder="For example, transport fell through" class="mt-1.5 w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm"></textarea>
      </label>
    </form>
    {#snippet footer()}<Button variant="secondary" disabled={savingMissedReason} onclick={() => isMissedReasonOpen = false}>Cancel</Button><Button loading={savingMissedReason} onclick={saveMissedReason}>Save reason</Button>{/snippet}
  </Modal>

  <Modal bind:isOpen={isMissedCallOpen} title={missedCallAction ? `Plan a call — ${personName(missedCallAction.person)}` : 'Plan a call'} size="md">
    {#if missedCallAction}
      <div class="space-y-4">
        <p class="text-sm text-muted-foreground">This adds one follow-up task for {personName(missedCallAction.assigned_leader)}. No task will be created until you save.</p>
        <label class="block text-sm font-medium text-foreground">Call due date
          <input type="date" min={today} bind:value={missedCallDate} class="mt-1.5 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm" />
        </label>
      </div>
    {/if}
    {#snippet footer()}<Button variant="secondary" disabled={savingMissedCall} onclick={() => { missedCallAction = null; isMissedCallOpen = false; }}>Cancel</Button><Button loading={savingMissedCall} onclick={saveMissedCall}>Schedule call</Button>{/snippet}
  </Modal>
</DashboardLayout>

<ContactDrawer bind:isOpen={isDrawerOpen} person={drawerPerson} onLogCall={handleLogCallFromDrawer} onEditProfile={openFullProfileEdit} onViewProfile={viewFullProfile} />

<PersonForm bind:isOpen={isPersonFormOpen} person={selectedPerson} onsave={handlePersonSaved} />

{#if actualAttendance}
  <GatheringAttendanceDialog bind:isOpen={isActualAttendanceOpen}
    gatheringType={actualAttendance.gatheringType} gatheringDate={actualAttendance.gatheringDate}
    personName={personName(actualAttendance.person)}
    onconfirm={(gathering) => actualAttendance.commitment
      ? handleCommitmentResolution(actualAttendance.commitment, 'attended', gathering)
      : handleAttendanceStatus(actualAttendance.person, 'attended', gathering)} />
{/if}
