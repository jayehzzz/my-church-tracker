import { describe, expect, it } from 'vitest';
import {
  applyNoShowRule,
  buildAttendanceForecast,
  deriveTeamStats,
  isFresh,
  nextTaskPlanForOutcome,
  nextSunday,
  quarterlyReengagementCandidates,
  sortTasks,
  taskUrgency
} from './followUpCrmLogic.js';

describe('follow-up CRM date and task rules', () => {
  it('finds the coming Sunday without DST or date-only timezone drift', () => {
    expect(nextSunday('2026-03-28')).toBe('2026-03-29'); // UK clocks go forward
    expect(nextSunday('2026-10-24')).toBe('2026-10-25'); // UK clocks go back
    expect(nextSunday('2026-08-30')).toBe('2026-08-30'); // Sunday is inclusive
  });

  it('treats the first fourteen calendar days as fresh and rejects future dates', () => {
    expect(isFresh({ contact_date: '2026-08-13' }, '2026-08-27')).toBe(true);
    expect(isFresh({ contact_date: '2026-08-12' }, '2026-08-27')).toBe(false);
    expect(isFresh({ contact_date: '2026-08-28' }, '2026-08-27')).toBe(false);
  });

  it('schedules low-intent outcomes later unless a leader supplies another date', () => {
    expect(nextTaskPlanForOutcome('not_serious_now', '2026-08-27')).toMatchObject({
      due_date: '2026-09-26',
      task_type: 'reengagement',
      days: 30,
    });
    expect(nextTaskPlanForOutcome('no_response', '2026-08-27')).toMatchObject({
      due_date: '2026-09-03',
      task_type: 'follow_up',
      days: 7,
    });
    expect(nextTaskPlanForOutcome('wrong_number', '2026-08-27')).toBeNull();
  });

  it('returns an owned older contact after 90 days without creating duplicate work', () => {
    const contacts = [
      { id: 'eligible', member_status: 'guest', contact_date: '2026-05-01' },
      { id: 'already-open', member_status: 'guest', contact_date: '2026-04-01' },
      { id: 'closed', member_status: 'guest', contact_date: '2026-01-01', contact_category: 'do_not_contact' },
    ];
    const candidates = quarterlyReengagementCandidates({
      contacts,
      assignments: contacts.map((contact) => ({ person_id: contact.id, leader_id: 'leader', status: 'active' })),
      tasks: [{ person_id: 'already-open', status: 'open', due_date: '2026-09-10' }],
      followUps: [{ contact_id: 'eligible', follow_up_date: '2026-05-20' }],
      today: '2026-09-01',
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      person_id: 'eligible',
      leader_id: 'leader',
      due_date: '2026-09-01',
      automation_key: 'quarterly_reengagement',
      last_contact_date: '2026-05-20',
    });
  });

  it('prioritises overdue and due-today work, then fresh contacts', () => {
    const tasks = [
      { id: 'later', due_date: '2026-09-20' },
      { id: 'fresh', due_date: '2026-09-10', contact: { contact_date: '2026-08-26' } },
      { id: 'today', due_date: '2026-08-27' },
      { id: 'overdue', due_date: '2026-08-26' },
      { id: 'done', due_date: '2026-08-20', status: 'completed' }
    ];

    expect(taskUrgency(tasks[1], '2026-08-27')).toBe('fresh');
    expect(sortTasks(tasks, '2026-08-27').map((task) => task.id)).toEqual([
      'overdue',
      'today',
      'fresh',
      'later',
      'done'
    ]);
    expect(tasks[0].id).toBe('later'); // does not mutate caller data
  });
});

describe('attendance forecasting', () => {
  const people = [
    { id: 'regular-coming', member_status: 'member', activity_status: 'regular' },
    { id: 'regular-away', member_status: 'leader', activity_status: 'regular' },
    { id: 'irregular-confirmed', member_status: 'member', activity_status: 'irregular' },
    { id: 'irregular-unconfirmed', member_status: 'leader', activity_status: 'irregular' },
    { id: 'guest-yes', member_status: 'guest' },
    { id: 'guest-maybe', member_status: 'guest' },
    { id: 'guest-resolved', member_status: 'guest' },
    { id: 'archived', member_status: 'archived', activity_status: 'regular' }
  ];

  it('uses the regular baseline, known absences and explicit pending guest yeses', () => {
    const forecast = buildAttendanceForecast({
      people,
      serviceDate: '2026-08-30',
      attendancePlans: [
        { person_id: 'regular-away', service_date: '2026-08-30', status: 'away' },
        { person_id: 'regular-coming', service_date: '2026-08-30', status: 'confirmed' },
        { person_id: 'irregular-confirmed', service_date: '2026-08-30', status: 'confirmed' },
        { person_id: 'irregular-unconfirmed', service_date: '2026-08-30', status: 'maybe' }
      ],
      commitments: [
        { id: 'yes-1', contact_id: 'guest-yes', service_date: '2026-08-30', response: 'yes' },
        { id: 'yes-duplicate', contact_id: 'guest-yes', service_date: '2026-08-30', response: 'yes' },
        { id: 'maybe', contact_id: 'guest-maybe', service_date: '2026-08-30', response: 'maybe' },
        {
          id: 'resolved',
          contact_id: 'guest-resolved',
          service_date: '2026-08-30',
          response: 'yes',
          resolution: 'attended'
        }
      ]
    });

    expect(forecast).toMatchObject({
      service_date: '2026-08-30',
      regular_baseline: 2,
      known_away: 1,
      confirmed_irregular: 1,
      confirmed_guests: 1,
      confirmed_regular: 1,
      confirmed_total: 3,
      expected_total: 3
    });
    expect(new Set(forecast.expected_person_ids)).toEqual(
      new Set(['regular-coming', 'irregular-confirmed', 'guest-yes'])
    );
  });

  it('lets the most recent attendance plan replace an earlier plan', () => {
    const forecast = buildAttendanceForecast({
      people: [{ id: 'member', member_status: 'member', activity_status: 'regular' }],
      serviceDate: '2026-08-30',
      attendancePlans: [
        { person_id: 'member', service_date: '2026-08-30', status: 'confirmed' },
        { person_id: 'member', service_date: '2026-08-30', status: 'away' }
      ]
    });

    expect(forecast.expected_total).toBe(0);
    expect(forecast.known_away).toBe(1);
  });
});

describe('leader oversight stats', () => {
  it('reports fresh coverage, task accountability and Sunday commitments by assignee', () => {
    const [stats] = deriveTeamStats({
      today: '2026-08-27',
      leaders: [{ id: 'leader-1', first_name: 'Ama', last_name: 'Mensah' }],
      people: [
        { id: 'fresh-contacted', contact_date: '2026-08-25', member_status: 'guest' },
        { id: 'fresh-untouched', contact_date: '2026-08-26', member_status: 'guest' },
        { id: 'older', contact_date: '2026-07-01', member_status: 'guest' }
      ],
      assignments: [
        { leader_id: 'leader-1', person_id: 'fresh-contacted' },
        { leader_id: 'leader-1', person_id: 'fresh-untouched' },
        { leader_id: 'leader-1', person_id: 'older' },
        { leader_id: 'leader-1', person_id: 'older' } // duplicate is harmless
      ],
      tasks: [
        { id: 'late', assignee_id: 'leader-1', person_id: 'fresh-contacted', due_date: '2026-08-26' },
        { id: 'today', assignee_id: 'leader-1', person_id: 'older', due_date: '2026-08-27' }
      ],
      followUps: [
        {
          id: 'follow-up',
          leader_id: 'leader-1',
          contact_id: 'fresh-contacted',
          follow_up_date: '2026-08-26'
        }
      ],
      commitments: [
        {
          leader_id: 'leader-1',
          contact_id: 'fresh-contacted',
          service_date: '2026-08-30',
          response: 'yes'
        }
      ]
    });

    expect(stats).toMatchObject({
      leader_name: 'Ama Mensah',
      assigned_contacts: 3,
      fresh_assigned: 2,
      fresh_contacted: 1,
      fresh_untouched: 1,
      fresh_contact_rate: 50,
      open_tasks: 2,
      overdue_tasks: 1,
      tasks_due_today: 1,
      people_without_next_action: 1,
      confirmed_this_sunday: 1,
      follow_ups_this_week: 1,
      unique_contacts_this_week: 1,
      last_activity: '2026-08-26'
    });
  });
});

describe('confirmed no-show rule', () => {
  it('schedules a cooling-off re-engagement after two distinct explicit yes no-shows', () => {
    const result = applyNoShowRule({
      contact: { id: 'guest', follow_up_status: 'active' },
      commitments: [
        {
          contact_id: 'guest',
          service_date: '2026-08-16',
          response: 'yes',
          resolution: 'no_show'
        },
        {
          contact_id: 'guest',
          service_date: '2026-08-23',
          outcome: 'promised_to_come',
          promise_fulfilled: false
        }
      ]
    });

    expect(result.confirmed_no_shows).toBe(2);
    expect(result.follow_up_status).toBe('active');
    expect(result.recommended_next_action_days).toBe(30);
    expect(result.recommended_next_task_type).toBe('reengagement');
    expect(result.no_show_rule_applied).toBe(true);
  });

  it('never treats a maybe as a broken commitment and deduplicates a Sunday', () => {
    const result = applyNoShowRule({
      contact: { id: 'guest', follow_up_status: 'active' },
      commitments: [
        { contact_id: 'guest', service_date: '2026-08-16', response: 'maybe', resolution: 'no_show' },
        { contact_id: 'guest', service_date: '2026-08-23', response: 'yes', resolution: 'no_show' },
        { contact_id: 'guest', service_date: '2026-08-23', response: 'yes', resolution: 'no_show' }
      ]
    });

    expect(result.confirmed_no_shows).toBe(1);
    expect(result.follow_up_status).toBe('active');
    expect(result.no_show_rule_applied).toBe(false);
  });
});
