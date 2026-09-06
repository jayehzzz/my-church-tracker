/**
 * Pure rules used by the follow-up CRM.
 *
 * Dates are compared as calendar dates, not instants. In particular, a value
 * such as "2026-03-29" is never passed through `new Date(string)`, which avoids
 * moving it to the previous/next day when the app or tests run in a different
 * timezone.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const COMPLETE_TASK_STATUSES = new Set(['complete', 'completed', 'cancelled', 'canceled', 'done']);

function calendarDate(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const dateOnly = ISO_DATE.exec(value);
    if (dateOnly) {
      const year = Number(dateOnly[1]);
      const month = Number(dateOnly[2]);
      const day = Number(dateOnly[3]);
      const timestamp = Date.UTC(year, month - 1, day);
      const check = new Date(timestamp);

      if (
        check.getUTCFullYear() !== year ||
        check.getUTCMonth() !== month - 1 ||
        check.getUTCDate() !== day
      ) {
        return null;
      }

      return { year, month, day, timestamp };
    }
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  // Date/timestamp inputs represent the calendar date in the user's local
  // timezone. Only date-only strings use the special timezone-free path above.
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return { year, month, day, timestamp: Date.UTC(year, month - 1, day) };
}

function formatCalendarDate(date) {
  if (!date) return null;
  return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function addCalendarDays(date, days) {
  const shifted = new Date(date.timestamp + days * DAY_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    timestamp: shifted.getTime()
  };
}

function daysBetween(later, earlier) {
  if (!later || !earlier) return null;
  return Math.round((later.timestamp - earlier.timestamp) / DAY_MS);
}

function normalise(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function recordId(record) {
  return record?._id ?? record?.id ?? record?.person_id ?? record?.contact_id ?? null;
}

function sameId(left, right) {
  return left != null && right != null && String(left) === String(right);
}

function personIdFrom(record) {
  return record?.person_id ?? record?.contact_id ?? record?.personId ?? record?.contactId ?? null;
}

function leaderIdFrom(record) {
  return (
    record?.leader_id ??
    record?.assignee_id ??
    record?.assigned_to ??
    record?.assigned_leader_id ??
    record?.owner_id ??
    record?.user_id ??
    null
  );
}

function taskDueDate(task) {
  return (
    task?.due_date ??
    task?.dueDate ??
    task?.scheduled_for ??
    task?.scheduled_date ??
    task?.next_action_date ??
    null
  );
}

function isTaskComplete(task) {
  return Boolean(task?.completed_at) || COMPLETE_TASK_STATUSES.has(normalise(task?.status));
}

function personName(person) {
  if (!person) return 'Unknown';
  if (person.name) return person.name;
  return [person.preferred_name || person.first_name, person.last_name].filter(Boolean).join(' ') || 'Unknown';
}

function serviceDateFrom(record) {
  return (
    record?.service_date ??
    record?.promised_date ??
    record?.gathering_date ??
    record?.event_date ??
    null
  );
}

function planDisposition(plan) {
  if (plan?.is_away === true || plan?.attending === false) return 'away';
  if (plan?.is_attending === true || plan?.attending === true || plan?.confirmed === true) return 'confirmed';

  const value = normalise(
    plan?.response ?? plan?.attendance_status ?? plan?.plan_status ?? plan?.status ?? plan?.intention
  );
  if (['away', 'unavailable', 'not_attending', 'not_expected', 'no', 'absent'].includes(value)) {
    return 'away';
  }
  if (['yes', 'confirmed', 'coming', 'attending'].includes(value)) return 'confirmed';
  return 'unknown';
}

function commitmentResponse(commitment) {
  if (commitment?.confirmed === true) return 'yes';

  const explicit = normalise(
    commitment?.response ??
      commitment?.rsvp ??
      commitment?.rsvp_status ??
      commitment?.intent ??
      commitment?.commitment_status
  );
  if (['yes', 'confirmed', 'coming', 'attending'].includes(explicit)) return 'yes';
  if (['maybe', 'possible', 'unsure'].includes(explicit)) return 'maybe';
  if (['no', 'declined', 'not_coming'].includes(explicit)) return 'no';

  if (normalise(commitment?.outcome) === 'promised_to_come') return 'yes';

  // Some stores use `status` for the RSVP, while newer stores use it for the
  // resolution. Only unequivocal RSVP values are accepted here.
  const status = normalise(commitment?.status);
  if (['yes', 'confirmed', 'coming'].includes(status)) return 'yes';
  if (['maybe', 'possible', 'unsure'].includes(status)) return 'maybe';
  if (['no', 'declined', 'not_coming'].includes(status)) return 'no';
  return 'unknown';
}

function commitmentResolution(commitment) {
  if (commitment?.promise_fulfilled === true || commitment?.fulfilled === true || commitment?.attended === true) {
    return 'attended';
  }
  if (commitment?.promise_fulfilled === false || commitment?.fulfilled === false || commitment?.attended === false) {
    return 'no_show';
  }

  const value = normalise(
    commitment?.resolution ??
      commitment?.result ??
      commitment?.attendance_outcome ??
      commitment?.attendance_result ??
      commitment?.attendance_status
  );
  if (['no_show', 'absent', 'did_not_attend', 'missed'].includes(value)) return 'no_show';
  if (['attended', 'fulfilled', 'showed_up', 'present'].includes(value)) return 'attended';
  if (['cancelled', 'canceled', 'declined'].includes(value)) return 'cancelled';

  const status = normalise(commitment?.status);
  if (['no_show', 'resolved_no_show'].includes(status)) return 'no_show';
  if (['attended', 'fulfilled', 'showed_up', 'resolved_attended'].includes(status)) return 'attended';
  if (commitment?.resolved === true) return 'resolved';
  return 'pending';
}

function isExplicitPendingYes(commitment) {
  return commitmentResponse(commitment) === 'yes' && commitmentResolution(commitment) === 'pending';
}

function isArchived(person) {
  return normalise(person?.member_status) === 'archived' || normalise(person?.activity_status) === 'archived';
}

function isMemberOrLeader(person) {
  return ['member', 'leader'].includes(normalise(person?.member_status));
}

/**
 * Return the coming Sunday (today when the supplied date is already Sunday).
 *
 * @param {Date|string|number} [date]
 * @returns {string} YYYY-MM-DD
 */
export function nextSunday(date = new Date()) {
  const current = calendarDate(date);
  if (!current) throw new TypeError('nextSunday requires a valid date');
  const weekday = new Date(current.timestamp).getUTCDay();
  return formatCalendarDate(addCalendarDays(current, (7 - weekday) % 7));
}

/**
 * Whether a contact was first captured within the inclusive freshness window.
 * Future-dated/invalid contacts are deliberately not considered fresh.
 */
export const FRESH_CONTACT_DAYS = 14;
export const QUARTERLY_REENGAGEMENT_DAYS = 90;
export const UNANSWERED_ATTEMPT_LIMIT = 3;
export const SUNDAY_NO_SHOW_LIMIT = 2;

export function isFresh(contact, today = new Date(), days = FRESH_CONTACT_DAYS) {
  if (!contact || !Number.isFinite(Number(days)) || Number(days) < 0) return false;
  const captured = calendarDate(contact.contact_date ?? contact.created_at ?? contact.createdAt);
  const current = calendarDate(today);
  const age = daysBetween(current, captured);
  return age != null && age >= 0 && age <= Number(days);
}

/**
 * Find older evangelism contacts that should return to a leader's work queue.
 * A person is eligible once every 90 days, but only when they have an active
 * owner and no other open task. Closed, paused, member and leader records are
 * deliberately excluded.
 */
export function quarterlyReengagementCandidates({
  contacts = [],
  assignments = [],
  tasks = [],
  followUps = [],
  today = new Date(),
  days = QUARTERLY_REENGAGEMENT_DAYS
} = {}) {
  const current = calendarDate(today);
  if (!current) throw new TypeError('quarterlyReengagementCandidates requires a valid today date');

  const activeOwnerByPerson = new Map();
  for (const assignment of assignments) {
    const status = normalise(assignment?.status);
    if (status && status !== 'active') continue;
    const personId = personIdFrom(assignment);
    const leaderId = leaderIdFrom(assignment);
    if (personId == null || leaderId == null) continue;
    const key = String(personId);
    const existing = activeOwnerByPerson.get(key);
    const assignmentDate = String(assignment?.assigned_at ?? assignment?.created_at ?? '');
    const existingDate = String(existing?.assignment?.assigned_at ?? existing?.assignment?.created_at ?? '');
    if (!existing || assignmentDate >= existingDate) {
      activeOwnerByPerson.set(key, { leader_id: leaderId, assignment });
    }
  }

  const peopleWithOpenTasks = new Set(
    tasks
      .filter((task) => !isTaskComplete(task))
      .map(personIdFrom)
      .filter((id) => id != null)
      .map(String)
  );
  const latestFollowUpByPerson = new Map();
  for (const followUp of followUps) {
    const personId = personIdFrom(followUp);
    const date = calendarDate(
      followUp?.follow_up_date ?? followUp?.activity_date ?? followUp?.created_at
    );
    if (personId == null || !date) continue;
    const key = String(personId);
    const existing = latestFollowUpByPerson.get(key);
    if (!existing || date.timestamp > existing.timestamp) latestFollowUpByPerson.set(key, date);
  }

  return contacts
    .map((contact) => {
      const personId = recordId(contact);
      if (personId == null) return null;
      const key = String(personId);
      const owner = activeOwnerByPerson.get(key);
      const category = normalise(contact?.contact_category ?? contact?.response);
      const followUpStatus = normalise(contact?.follow_up_status);
      if (
        !owner ||
        peopleWithOpenTasks.has(key) ||
        isArchived(contact) ||
        isMemberOrLeader(contact) ||
        contact?.is_paused === true ||
        followUpStatus === 'closed' ||
        ['do_not_contact', 'wrong_number', 'has_church'].includes(category)
      ) {
        return null;
      }

      const recordedDates = [
        calendarDate(contact?.last_follow_up_date),
        latestFollowUpByPerson.get(key),
        calendarDate(contact?.contact_date),
        calendarDate(contact?.created_at)
      ].filter(Boolean);
      const lastContact = recordedDates.sort((a, b) => b.timestamp - a.timestamp)[0];
      const age = daysBetween(current, lastContact);
      if (age == null || age < Number(days)) return null;

      return {
        person_id: personId,
        leader_id: owner.leader_id,
        person: contact,
        due_date: formatCalendarDate(current),
        last_contact_date: formatCalendarDate(lastContact),
        days_since_contact: age,
        task_type: 'reengagement',
        priority: 'normal',
        automation_key: 'quarterly_reengagement',
        reason: '90-day check-in — see if they may be interested now'
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.days_since_contact - a.days_since_contact);
}

/**
 * Suggested next task for a recorded outcome. An explicit leader-selected
 * date should always take precedence over this recommendation.
 */
export function nextTaskPlanForOutcome(outcome, today = new Date()) {
  const current = calendarDate(today);
  if (!current) throw new TypeError('nextTaskPlanForOutcome requires a valid date');

  const plans = {
    positive_conversation: {
      days: 2,
      task_type: 'follow_up',
      reason: 'Continue the positive conversation'
    },
    no_response: {
      days: 7,
      task_type: 'follow_up',
      reason: 'No response — try once more after a short pause'
    },
    care_check_in: {
      days: 7,
      task_type: 'member_care',
      reason: 'Continue the care check-in'
    },
    rescheduled: {
      days: 30,
      task_type: 'reengagement',
      reason: 'They asked to speak later — reconnect after a month'
    },
    not_serious_now: {
      days: QUARTERLY_REENGAGEMENT_DAYS,
      task_type: 'reengagement',
      reason: 'Not serious right now — review again in 90 days'
    },
    on_holiday: {
      days: 30,
      task_type: 'reengagement',
      reason: 'Reconnect after their time away'
    },
    asked_to_pause: {
      days: 30,
      task_type: 'reengagement',
      reason: 'Reconnect after the requested pause'
    },
    busy_period: {
      days: 30,
      task_type: 'reengagement',
      reason: 'Reconnect after their busy period'
    }
  };
  const plan = plans[normalise(outcome)];
  if (!plan) return null;
  return {
    ...plan,
    due_date: formatCalendarDate(addCalendarDays(current, plan.days))
  };
}

/**
 * Summarise the small number of signals needed to decide whether somebody
 * should stay in active weekly work. Only consecutive unanswered attempts are
 * counted; a real conversation resets that streak.
 */
export function deriveCandidateSignals({ contact = {}, followUps = [], commitments = [] } = {}) {
  const contactId = recordId(contact);
  const contactFollowUps = followUps
    .filter((followUp) => contactId == null || sameId(personIdFrom(followUp), contactId))
    .slice()
    .sort((left, right) => {
      const leftDate = calendarDate(left?.follow_up_date ?? left?.activity_date ?? left?.created_at)?.timestamp ?? 0;
      const rightDate = calendarDate(right?.follow_up_date ?? right?.activity_date ?? right?.created_at)?.timestamp ?? 0;
      return rightDate - leftDate;
    });

  let unansweredAttempts = 0;
  for (const followUp of contactFollowUps) {
    if (normalise(followUp?.outcome) !== 'no_response') break;
    unansweredAttempts += 1;
  }

  const relevantCommitments = commitments.filter((commitment) => {
    const commitmentPersonId = personIdFrom(commitment);
    return contactId == null || commitmentPersonId == null || sameId(contactId, commitmentPersonId);
  });
  const confirmedNoShows = new Set(
    relevantCommitments
      .filter((commitment) =>
        commitmentResponse(commitment) === 'yes'
        && commitmentResolution(commitment) === 'no_show'
        && normalise(commitment?.gathering_type ?? 'sunday_service') === 'sunday_service'
      )
      .map((commitment, index) => {
        const date = formatCalendarDate(calendarDate(serviceDateFrom(commitment)));
        return date ? `date:${date}` : `record:${commitment._id ?? commitment.id ?? index}`;
      })
  ).size;
  const attendedMeetings = relevantCommitments.filter(
    (commitment) => commitmentResolution(commitment) === 'attended'
  ).length;
  const acceptedInvitations = relevantCommitments.filter(
    (commitment) => commitmentResponse(commitment) === 'yes'
  ).length;
  const responsiveConversations = contactFollowUps.filter((followUp) =>
    ['positive_conversation', 'rescheduled', 'care_check_in', 'came_to_church', 'showed_up', 'attended']
      .includes(normalise(followUp?.outcome))
  ).length;
  const category = normalise(contact?.contact_category ?? contact?.response);
  const stage = normalise(contact?.pipeline_stage);
  const manuallySerious = contact?.is_serious === true || normalise(contact?.seriousness) === 'serious';
  const manuallyUnserious = contact?.is_serious === false || ['unserious', 'not_serious'].includes(normalise(contact?.seriousness));
  const activeStatus = normalise(contact?.follow_up_status);
  const pausedOrClosed = contact?.is_paused === true || ['later', 'closed'].includes(activeStatus);
  const positiveSignal = manuallySerious
    || category === 'responsive'
    || ['responding', 'invited', 'promised', 'showed_up'].includes(stage)
    || responsiveConversations > 0
    || acceptedInvitations > 0
    || attendedMeetings > 0;
  const shouldMoveToLater = unansweredAttempts >= UNANSWERED_ATTEMPT_LIMIT
    || confirmedNoShows >= SUNDAY_NO_SHOW_LIMIT;

  return {
    unanswered_attempts: unansweredAttempts,
    confirmed_no_shows: confirmedNoShows,
    attended_meetings: attendedMeetings,
    accepted_invitations: acceptedInvitations,
    responsive_conversations: responsiveConversations,
    is_serious: !pausedOrClosed && !manuallyUnserious && positiveSignal && !shouldMoveToLater,
    should_move_to_later: !pausedOrClosed && shouldMoveToLater,
    recommendation_reason: unansweredAttempts >= UNANSWERED_ATTEMPT_LIMIT
      ? `${unansweredAttempts} unanswered attempts`
      : confirmedNoShows >= SUNDAY_NO_SHOW_LIMIT
        ? `${confirmedNoShows} Sunday promises missed`
        : null
  };
}

/**
 * Give an open task a small, UI-friendly urgency label.
 *
 * Order used by sortTasks: overdue, due today, fresh contact, upcoming (within
 * seven days), later, completed.
 */
export function taskUrgency(task, today = new Date()) {
  if (isTaskComplete(task)) return 'completed';

  const current = calendarDate(today);
  const due = calendarDate(taskDueDate(task));
  const untilDue = daysBetween(due, current);
  if (untilDue != null && untilDue < 0) return 'overdue';
  if (untilDue === 0) return 'today';

  const relatedContact = task?.contact ?? task?.person ?? {
    contact_date: task?.contact_date ?? task?.person_contact_date,
    created_at: task?.contact_created_at ?? task?.person_created_at
  };
  if (task?.is_fresh === true || task?.fresh === true || isFresh(relatedContact, today)) return 'fresh';
  if (untilDue != null && untilDue <= 7) return 'upcoming';
  return 'later';
}

/** Return a new task array in operational priority order. */
export function sortTasks(tasks = [], today = new Date()) {
  const rank = { overdue: 0, today: 1, fresh: 2, upcoming: 3, later: 4, completed: 5 };
  return [...(Array.isArray(tasks) ? tasks : [])]
    .map((task, index) => ({ task, index, urgency: taskUrgency(task, today) }))
    .sort((left, right) => {
      const urgencyDifference = rank[left.urgency] - rank[right.urgency];
      if (urgencyDifference) return urgencyDifference;

      const leftDue = calendarDate(taskDueDate(left.task))?.timestamp ?? Number.POSITIVE_INFINITY;
      const rightDue = calendarDate(taskDueDate(right.task))?.timestamp ?? Number.POSITIVE_INFINITY;
      if (leftDue !== rightDue) return leftDue - rightDue;

      const priorityRank = { urgent: 0, high: 1, normal: 2, medium: 2, low: 3 };
      const leftPriority = priorityRank[normalise(left.task?.priority)] ?? 2;
      const rightPriority = priorityRank[normalise(right.task?.priority)] ?? 2;
      return leftPriority - rightPriority || left.index - right.index;
    })
    .map(({ task }) => task);
}

/**
 * Build a conservative attendance forecast for one service.
 *
 * Regular members/leaders form the baseline and are assumed present unless an
 * away plan exists. Irregular members/leaders need an explicit confirmed plan.
 * Guests/prospects need an explicit, unresolved Yes commitment. Each person is
 * counted once even if duplicate plans/commitments exist.
 */
export function buildAttendanceForecast({
  people = [],
  attendancePlans = [],
  commitments = [],
  serviceDate = nextSunday()
} = {}) {
  const targetDate = formatCalendarDate(calendarDate(serviceDate));
  if (!targetDate) throw new TypeError('buildAttendanceForecast requires a valid serviceDate');

  const peopleById = new Map();
  for (const person of people) {
    const id = recordId(person);
    if (id != null && !peopleById.has(String(id))) peopleById.set(String(id), person);
  }

  // Last plan wins, allowing a leader to change "coming" to "away" (or vice
  // versa) without double counting the person.
  const plansByPerson = new Map();
  for (const plan of attendancePlans) {
    if (formatCalendarDate(calendarDate(serviceDateFrom(plan))) !== targetDate) continue;
    const id = personIdFrom(plan);
    if (id != null) plansByPerson.set(String(id), plan);
  }

  const regularBaselinePeople = [];
  const knownAwayPeople = [];
  const regularExpectedPeople = [];
  const confirmedRegularPeople = [];
  const confirmedIrregularPeople = [];
  const confirmedGuestPeople = [];
  const expectedById = new Map();

  for (const [id, person] of peopleById) {
    if (isArchived(person) || !isMemberOrLeader(person)) continue;
    const activity = normalise(person.activity_status);
    const disposition = planDisposition(plansByPerson.get(id));

    if (activity === 'regular') {
      regularBaselinePeople.push(person);
      if (disposition === 'away') {
        knownAwayPeople.push(person);
      } else {
        regularExpectedPeople.push(person);
        expectedById.set(id, person);
        if (disposition === 'confirmed') confirmedRegularPeople.push(person);
      }
    } else if (activity === 'irregular' && disposition === 'confirmed') {
      confirmedIrregularPeople.push(person);
      expectedById.set(id, person);
    }
  }

  const confirmedGuestIds = new Set();
  for (const commitment of commitments) {
    if (formatCalendarDate(calendarDate(serviceDateFrom(commitment))) !== targetDate) continue;
    if (!isExplicitPendingYes(commitment)) continue;

    const rawId = personIdFrom(commitment);
    if (rawId == null) continue;
    const id = String(rawId);
    const person = peopleById.get(id);
    if (!person || isArchived(person) || isMemberOrLeader(person)) continue;
    if (planDisposition(plansByPerson.get(id)) === 'away') continue;

    if (!confirmedGuestIds.has(id)) confirmedGuestPeople.push(person);
    confirmedGuestIds.add(id);
    expectedById.set(id, person);
  }

  const expectedPeople = [...expectedById.values()];
  return {
    service_date: targetDate,
    expected_total: expectedPeople.length,
    regular_baseline: regularBaselinePeople.length,
    known_away: knownAwayPeople.length,
    confirmed_irregular: confirmedIrregularPeople.length,
    confirmed_guests: confirmedGuestPeople.length,
    confirmed_regular: confirmedRegularPeople.length,
    confirmed_total:
      confirmedRegularPeople.length + confirmedIrregularPeople.length + confirmedGuestPeople.length,
    expected_people: expectedPeople,
    expected_person_ids: [...expectedById.keys()],
    regular_baseline_people: regularBaselinePeople,
    known_away_people: knownAwayPeople,
    regular_expected_people: regularExpectedPeople,
    confirmed_regular_people: confirmedRegularPeople,
    confirmed_irregular_people: confirmedIrregularPeople,
    confirmed_guest_people: confirmedGuestPeople
  };
}

/**
 * Create per-leader operational stats for the Team view.
 *
 * The return value is an array so it can be passed directly to a scoreboard.
 */
export function deriveTeamStats({
  leaders = [],
  people = [],
  assignments = [],
  tasks = [],
  followUps = [],
  commitments = [],
  today = new Date(),
  periodStart = null,
  periodEnd = null
} = {}) {
  const current = calendarDate(today);
  if (!current) throw new TypeError('deriveTeamStats requires a valid today date');
  const currentDate = formatCalendarDate(current);
  const sunday = nextSunday(currentDate);
  const currentWeekday = new Date(current.timestamp).getUTCDay();
  const mondayOffset = currentWeekday === 0 ? -6 : 1 - currentWeekday;
  const monday = addCalendarDays(current, mondayOffset).timestamp;
  const monthStart = Date.UTC(current.year, current.month - 1, 1);
  const selectedStart = calendarDate(periodStart)?.timestamp ?? monday;
  const selectedEnd = calendarDate(periodEnd)?.timestamp ?? current.timestamp;

  const peopleById = new Map();
  for (const person of people) {
    const id = recordId(person);
    if (id != null) peopleById.set(String(id), person);
  }

  const assignmentsByLeader = new Map();
  const assign = (leaderId, personId) => {
    if (leaderId == null || personId == null || !peopleById.has(String(personId))) return;
    const key = String(leaderId);
    if (!assignmentsByLeader.has(key)) assignmentsByLeader.set(key, new Set());
    assignmentsByLeader.get(key).add(String(personId));
  };

  for (const assignment of assignments) {
    const status = normalise(assignment?.status);
    if (['inactive', 'ended', 'archived', 'cancelled', 'canceled'].includes(status) || assignment?.active === false) {
      continue;
    }
    assign(leaderIdFrom(assignment), personIdFrom(assignment));
  }
  for (const person of people) {
    assign(
      person?.assigned_leader_id ?? person?.leader_id ?? person?.owner_id,
      recordId(person)
    );
  }

  const stats = leaders.map((leader) => {
    const leaderId = recordId(leader);
    const leaderKey = String(leaderId ?? '');
    const assignedIds = assignmentsByLeader.get(leaderKey) ?? new Set();
    const assignedPeople = [...assignedIds].map((id) => peopleById.get(id)).filter(Boolean);
    const freshPeople = assignedPeople.filter((person) => isFresh(person, currentDate));
    const leaderFollowUps = followUps.filter((followUp) => sameId(leaderIdFrom(followUp), leaderId));
    const followUpsInPeriod = leaderFollowUps.filter((followUp) => {
      const date = calendarDate(followUp.follow_up_date ?? followUp.activity_date ?? followUp.created_at)?.timestamp;
      return date != null && date >= selectedStart && date <= selectedEnd;
    });

    const freshContactedPeople = freshPeople.filter((person) => {
      const id = recordId(person);
      const captured = calendarDate(person.contact_date ?? person.created_at ?? person.createdAt)?.timestamp;
      return leaderFollowUps.some((followUp) => {
        if (!sameId(personIdFrom(followUp), id)) return false;
        const followed = calendarDate(
          followUp.follow_up_date ?? followUp.activity_date ?? followUp.created_at
        )?.timestamp;
        return followed != null && (captured == null || followed >= captured) && followed <= current.timestamp;
      });
    });
    const contactedFreshIds = new Set(freshContactedPeople.map((person) => String(recordId(person))));
    const freshUntouchedPeople = freshPeople.filter((person) => !contactedFreshIds.has(String(recordId(person))));

    const leaderTasks = tasks.filter((task) => sameId(leaderIdFrom(task), leaderId));
    const openTasks = leaderTasks.filter((task) => !isTaskComplete(task));
    const completedTasks = leaderTasks.filter(isTaskComplete);
    const overdueTasks = openTasks.filter((task) => taskUrgency(task, currentDate) === 'overdue');
    const dueTodayTasks = openTasks.filter((task) => taskUrgency(task, currentDate) === 'today');
    const openTaskPersonIds = new Set(openTasks.map(personIdFrom).filter((id) => id != null).map(String));
    const withoutNextActionPeople = assignedPeople.filter(
      (person) => !openTaskPersonIds.has(String(recordId(person)))
    );

    const confirmedPeopleById = new Map();
    for (const commitment of commitments) {
      if (formatCalendarDate(calendarDate(serviceDateFrom(commitment))) !== sunday) continue;
      if (!isExplicitPendingYes(commitment)) continue;
      const personId = personIdFrom(commitment);
      if (personId == null) continue;
      if (!assignedIds.has(String(personId)) && !sameId(leaderIdFrom(commitment), leaderId)) continue;
      const person = peopleById.get(String(personId));
      if (person) confirmedPeopleById.set(String(personId), person);
    }

    const followUpsThisWeek = leaderFollowUps.filter((followUp) => {
      const date = calendarDate(followUp.follow_up_date ?? followUp.activity_date ?? followUp.created_at)?.timestamp;
      return date != null && date >= monday && date <= current.timestamp;
    });
    const followUpsThisMonth = leaderFollowUps.filter((followUp) => {
      const date = calendarDate(followUp.follow_up_date ?? followUp.activity_date ?? followUp.created_at)?.timestamp;
      return date != null && date >= monthStart && date <= current.timestamp;
    });
    const lastActivityTimestamp = Math.max(
      ...leaderFollowUps
        .map((followUp) => calendarDate(followUp.follow_up_date ?? followUp.activity_date ?? followUp.created_at)?.timestamp)
        .filter((date) => date != null),
      Number.NEGATIVE_INFINITY
    );

    const showedUp = leaderFollowUps.filter((followUp) =>
      ['came_to_church', 'showed_up', 'attended'].includes(normalise(followUp.outcome))
    ).length;
    const converted = assignedPeople.filter((person) => ['member', 'leader'].includes(normalise(person.member_status))).length;
    const assignedSignals = assignedPeople.map((person) => deriveCandidateSignals({
      contact: person,
      followUps,
      commitments
    }));
    const seriousCandidates = assignedSignals.filter((signal) => signal.is_serious).length;
    const meaningfulConversations = followUpsInPeriod.filter((followUp) =>
      !['no_response', 'wrong_number'].includes(normalise(followUp?.outcome))
    ).length;
    const periodCommitments = commitments.filter((commitment) => {
      if (!sameId(leaderIdFrom(commitment), leaderId)) return false;
      const date = calendarDate(
        commitment?.created_at ?? commitment?.gathering_date ?? commitment?.service_date
      )?.timestamp;
      return date != null && date >= selectedStart && date <= selectedEnd;
    });
    const sundayPromises = periodCommitments.filter((commitment) =>
      normalise(commitment?.gathering_type ?? 'sunday_service') === 'sunday_service'
      && commitmentResponse(commitment) === 'yes'
    );
    const promisesAttended = sundayPromises.filter(
      (commitment) => commitmentResolution(commitment) === 'attended'
    ).length;
    const promisesMissed = sundayPromises.filter(
      (commitment) => commitmentResolution(commitment) === 'no_show'
    ).length;

    return {
      leader_id: leaderId,
      leader,
      leader_name: personName(leader),
      assigned_contacts: assignedPeople.length,
      assigned_people: assignedPeople,
      fresh_assigned: freshPeople.length,
      fresh_people: freshPeople,
      fresh_contacted: freshContactedPeople.length,
      fresh_untouched: freshUntouchedPeople.length,
      fresh_untouched_people: freshUntouchedPeople,
      fresh_contact_rate: freshPeople.length
        ? Math.round((freshContactedPeople.length / freshPeople.length) * 100)
        : 100,
      open_tasks: openTasks.length,
      overdue_tasks: overdueTasks.length,
      overdue_task_items: overdueTasks,
      tasks_due_today: dueTodayTasks.length,
      due_today_task_items: dueTodayTasks,
      completed_tasks: completedTasks.length,
      people_without_next_action: withoutNextActionPeople.length,
      without_next_action_people: withoutNextActionPeople,
      confirmed_this_sunday: confirmedPeopleById.size,
      confirmed_people: [...confirmedPeopleById.values()],
      follow_ups_this_week: followUpsThisWeek.length,
      follow_ups_this_month: followUpsThisMonth.length,
      unique_contacts_this_week: new Set(followUpsThisWeek.map(personIdFrom).filter(Boolean).map(String)).size,
      period_follow_ups: followUpsInPeriod.length,
      period_unique_contacts: new Set(followUpsInPeriod.map(personIdFrom).filter(Boolean).map(String)).size,
      meaningful_conversations: meaningfulConversations,
      serious_candidates: seriousCandidates,
      sunday_promises: sundayPromises.length,
      promises_attended: promisesAttended,
      promises_missed: promisesMissed,
      last_activity:
        lastActivityTimestamp === Number.NEGATIVE_INFINITY
          ? null
          : formatCalendarDate(calendarDate(lastActivityTimestamp)),
      showed_up: showedUp,
      stale_contacts: freshUntouchedPeople.length,
      converted
    };
  });

  return stats.sort(
    (left, right) =>
      right.overdue_tasks - left.overdue_tasks ||
      right.fresh_untouched - left.fresh_untouched ||
      left.leader_name.localeCompare(right.leader_name)
  );
}

/**
 * Apply the church's two-confirmed-no-shows rule. The contact stays recorded
 * and active, but active chasing stops until a one-month re-engagement task.
 *
 * A Maybe can never count: an explicit Yes and an explicit no-show resolution
 * are both required. Duplicate records for the same service date count once.
 */
export function applyNoShowRule({ contact = {}, commitments = [], threshold = 2 } = {}) {
  const contactId = recordId(contact);
  const relevant = commitments.filter((commitment) => {
    const commitmentPersonId = personIdFrom(commitment);
    const belongsToContact = contactId == null || commitmentPersonId == null || sameId(contactId, commitmentPersonId);
    return (
      belongsToContact &&
      commitmentResponse(commitment) === 'yes' &&
      commitmentResolution(commitment) === 'no_show'
    );
  });

  const distinctNoShows = new Set(
    relevant.map((commitment, index) => {
      const date = formatCalendarDate(calendarDate(serviceDateFrom(commitment)));
      return date ? `date:${date}` : `record:${commitment._id ?? commitment.id ?? index}`;
    })
  ).size;
  const required = Number.isFinite(Number(threshold)) && Number(threshold) > 0 ? Math.ceil(Number(threshold)) : 2;

  return {
    ...contact,
    confirmed_no_shows: distinctNoShows,
    follow_up_status: distinctNoShows >= required ? 'active' : contact.follow_up_status,
    recommended_next_action_days: distinctNoShows >= required ? QUARTERLY_REENGAGEMENT_DAYS : undefined,
    recommended_next_task_type: distinctNoShows >= required ? 'reengagement' : undefined,
    no_show_rule_applied: distinctNoShows >= required
  };
}
