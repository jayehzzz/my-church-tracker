import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import SundayRoster from './SundayRoster.svelte';
import TaskQueue from './TaskQueue.svelte';
import FollowUpBoard from './FollowUpBoard.svelte';
import WorkerAssessment from './WorkerAssessment.svelte';
import ExpectedSunday from './ExpectedSunday.svelte';

describe('ExpectedSunday', () => {
  const member = { id: 'member', first_name: 'Ama', last_name: 'Member', expected: true, attendance_plan: { status: 'expected' } };
  const awayMember = { id: 'away', first_name: 'Kofi', last_name: 'Away', attendance_plan: { status: 'away' } };
  const commitment = { id: 'promise', person_id: 'guest', response: 'yes', resolution: 'pending', person: { id: 'guest', first_name: 'Kojo', last_name: 'Guest' } };

  it('shows newcomers, regular members and away people as three separate groups with a summary', () => {
    const { getByRole, getByText } = render(ExpectedSunday, {
      props: { today: '2026-09-02', forecast: { service_date: '2026-09-06' }, roster: [member, awayMember], commitments: [commitment] },
    });

    expect(getByText('2 people expected in total')).toBeDefined();
    const summary = getByRole('group', { name: 'Sunday summary' });
    expect(summary).toContainElement(getByRole('button', { name: /Newcomers who said yes 1/ }));
    expect(summary).toContainElement(getByRole('button', { name: /Regular members expected 1/ }));
    expect(summary).toContainElement(getByRole('button', { name: /Away this Sunday 1/ }));
    expect(getByRole('list', { name: 'Newcomers expected this Sunday' })).toContainElement(getByRole('button', { name: 'Kojo Guest' }));
    expect(getByRole('list', { name: 'Regular members this Sunday' })).toContainElement(getByRole('button', { name: 'Ama Member' }));
    expect(getByRole('list', { name: 'Members away this Sunday' })).toContainElement(getByRole('button', { name: 'Kofi Away' }));
  });

  it('focuses on one group when its summary tile is pressed', async () => {
    const { getByRole, queryByRole } = render(ExpectedSunday, {
      props: { today: '2026-09-02', forecast: { service_date: '2026-09-06' }, roster: [member, awayMember], commitments: [commitment] },
    });

    await fireEvent.click(getByRole('button', { name: /Away this Sunday/ }));
    expect(getByRole('list', { name: 'Members away this Sunday' })).toBeDefined();
    expect(queryByRole('list', { name: 'Regular members this Sunday' })).toBeNull();
    expect(queryByRole('list', { name: 'Newcomers expected this Sunday' })).toBeNull();
    await fireEvent.click(getByRole('button', { name: 'Show all three' }));
    expect(getByRole('list', { name: 'Regular members this Sunday' })).toBeDefined();
  });

  it('switches to recording attendance once the Sunday has arrived', async () => {
    const onStatusChange = vi.fn();
    const onResolve = vi.fn();
    const { getByText, getAllByRole } = render(ExpectedSunday, {
      props: { today: '2026-09-06', forecast: { service_date: '2026-09-06' }, roster: [member], commitments: [commitment], onStatusChange, onResolve },
    });

    expect(getByText('Record attendance')).toBeDefined();
    expect(getByText('0 of 2 recorded · 0 attended so far')).toBeDefined();
    const attendedButtons = getAllByRole('button', { name: 'Attended' });
    expect(attendedButtons).toHaveLength(2);
    await fireEvent.click(attendedButtons[0]);
    expect(onResolve).toHaveBeenCalledWith(commitment, 'attended');
    await fireEvent.click(attendedButtons[1]);
    expect(onStatusChange).toHaveBeenCalledWith(member, 'attended');
  });

  it('summarises the previous Sunday from recorded results', () => {
    const { getByText } = render(ExpectedSunday, {
      props: {
        today: '2026-09-02',
        forecast: { service_date: '2026-09-06' },
        results: [
          { id: 'missed', resolution: 'no_show', gathering_date: '2026-08-30', person: { first_name: 'Missed', last_name: 'Promise' } },
          { id: 'attended', resolution: 'attended', gathering_date: '2026-08-30', person: { first_name: 'Kept', last_name: 'Promise' } },
        ],
      },
    });

    expect(getByText('Last Sunday, 30 Aug:')).toBeDefined();
    expect(getByText('1 attended · 1 did not.')).toBeDefined();
  });
});

describe('FollowUpBoard', () => {
  const leaders = [{ id: 'leader-1', first_name: 'Ama', last_name: 'Leader' }, { id: 'leader-2', first_name: 'Grace', last_name: 'Leader' }];

  it('groups the week by urgency and gives every planned call the same action', () => {
    const overduePerson = { id: 'overdue', first_name: 'Late', last_name: 'Person' };
    const todayPerson = { id: 'today', first_name: 'Today', last_name: 'Person' };
    const promisedPerson = { id: 'promised', first_name: 'Promise', last_name: 'Person' };
    const { getByText, getByRole, getAllByRole, queryByText } = render(FollowUpBoard, {
      props: {
        today: '2026-09-02',
        weekEnd: '2026-09-09',
        leaders,
        unassigned: [{ id: 'new', first_name: 'New', last_name: 'Person', contact_date: '2026-09-01' }],
        tasks: [
          { id: 'late', person_id: 'overdue', person: overduePerson, task_type: 'follow_up', due_date: '2026-08-30' },
          { id: 'now', person_id: 'today', person: todayPerson, task_type: 'follow_up', due_date: '2026-09-02' },
          { id: 'soon', person_id: 'promised', person: promisedPerson, task_type: 'sunday_confirmation', due_date: '2026-09-04' },
        ],
        commitments: [{ id: 'yes', person_id: 'promised', person: promisedPerson, response: 'yes', resolution: 'pending', gathering_date: '2026-09-06' }],
      },
    });

    expect(getByRole('heading', { name: 'Needs a worker' })).toBeDefined();
    expect(getByRole('heading', { name: 'Overdue' })).toBeDefined();
    expect(getByRole('heading', { name: 'Today' })).toBeDefined();
    expect(getByText('Said yes for Sun 6 Sept')).toBeDefined();
    expect(getAllByRole('button', { name: 'Log call' })).toHaveLength(3);
    expect(queryByText('Promised Sunday')).toBeNull();
  });

  it('assigns an unassigned person inline without leaving the list', async () => {
    const contact = { id: 'new', first_name: 'New', last_name: 'Person', contact_date: '2026-09-01' };
    const onAssign = vi.fn();
    const { getByRole, getByLabelText } = render(FollowUpBoard, {
      props: { today: '2026-09-02', weekEnd: '2026-09-09', leaders, unassigned: [contact], onAssign },
    });

    await fireEvent.change(getByLabelText('Worker for New Person'), { target: { value: 'leader-2' } });
    await fireEvent.click(getByRole('button', { name: 'Assign' }));
    expect(onAssign).toHaveBeenCalledWith(contact, 'leader-2', '2026-09-02');
  });

  it('offers the same urgency groups as board columns', () => {
    const { getByRole } = render(FollowUpBoard, {
      props: { today: '2026-09-02', weekEnd: '2026-09-09', view: 'board', unassigned: [{ id: 'new', first_name: 'New', last_name: 'Person' }] },
    });

    expect(getByRole('heading', { name: 'Needs a worker' })).toBeDefined();
    expect(getByRole('heading', { name: 'Overdue' })).toBeDefined();
    expect(getByRole('heading', { name: 'Today' })).toBeDefined();
  });

  it('provides direct call/WhatsApp links and 1-click no answer speed action', async () => {
    const onQuickNoAnswer = vi.fn();
    const task = {
      id: 'task-call',
      person: { id: 'p1', first_name: 'David', last_name: 'Boateng', phone: '+447123456789' },
      due_date: '2026-09-02',
    };
    const { getByRole, getByTitle } = render(FollowUpBoard, {
      props: {
        today: '2026-09-02',
        weekEnd: '2026-09-09',
        tasks: [task],
        onQuickNoAnswer,
      },
    });

    const callLink = getByRole('link', { name: 'Call David Boateng' });
    expect(callLink.getAttribute('href')).toBe('tel:+447123456789');

    const whatsAppLink = getByRole('link', { name: 'WhatsApp David Boateng' });
    expect(whatsAppLink.getAttribute('href')).toContain('https://wa.me/447123456789');

    const noAnswerBtn = getByTitle("Quickly record 'No answer' and reschedule for +2 days");
    await fireEvent.click(noAnswerBtn);
    expect(onQuickNoAnswer).toHaveBeenCalledWith(task);
  });
});

describe('WorkerAssessment', () => {
  it('leads with people worked and Sunday results, with activity detail behind an expand', async () => {
    const { getByText, queryByText, getByRole } = render(WorkerAssessment, {
      props: {
        stats: [{ leader_id: 'leader', leader_name: 'Ama Leader', period_unique_contacts: 4, meaningful_conversations: 3, serious_candidates: 2, sunday_promises: 2, promises_attended: 1, promises_missed: 1, overdue_tasks: 1, people_without_next_action: 0 }],
      },
    });

    expect(getByText('Ama Leader')).toBeDefined();
    expect(getByText('People worked')).toBeDefined();
    expect(getByText('Said yes to Sunday')).toBeDefined();
    expect(getByText('1 person')).toBeDefined();
    expect(queryByText('Real conversations')).toBeNull();
    await fireEvent.click(getByRole('button', { name: 'Details' }));
    expect(getByText('Real conversations')).toBeDefined();
    expect(queryByText(/score/i)).toBeNull();
  });
});

describe('SundayRoster', () => {
  it('allows an away member to be confirmed directly in one action', async () => {
    const member = {
      id: 'member-1',
      first_name: 'Ama',
      last_name: 'Mensah',
      activity_status: 'regular',
      default_expected: true,
      attendance_plan: { status: 'away' },
    };
    const onStatusChange = vi.fn();
    const { getByRole } = render(SundayRoster, {
      props: { roster: [member], onStatusChange },
    });

    const confirm = getByRole('checkbox', { name: 'Confirm' });
    expect(confirm.disabled).toBe(false);
    await fireEvent.click(confirm);
    expect(onStatusChange).toHaveBeenCalledWith(member, 'confirmed');
  });

  it('opens a member from their name', async () => {
    const member = {
      id: 'member-1',
      first_name: 'Ama',
      last_name: 'Mensah',
      activity_status: 'regular',
      default_expected: true,
    };
    const onOpen = vi.fn();
    const { getByRole } = render(SundayRoster, { props: { roster: [member], onOpen } });

    await fireEvent.click(getByRole('button', { name: 'Ama Mensah' }));
    expect(onOpen).toHaveBeenCalledWith(member);
  });
});

describe('TaskQueue', () => {
  it('makes the person name an open-profile action', async () => {
    const person = { id: 'contact-1', first_name: 'Kojo', last_name: 'Owusu', contact_date: '2026-09-01' };
    const onOpen = vi.fn();
    const { getByRole } = render(TaskQueue, {
      props: {
        tasks: [{ id: 'task-1', person, due_date: '2026-09-01', status: 'open', task_type: 'follow_up' }],
        onOpen,
      },
    });

    await fireEvent.click(getByRole('button', { name: 'Kojo Owusu' }));
    expect(onOpen).toHaveBeenCalledWith(person);
  });

  it('keeps longer task queues collapsed until requested', async () => {
    const tasks = ["Ama", "Kojo", "Grace"].map((firstName, index) => ({
      id: `task-${index}`,
      person: { id: `person-${index}`, first_name: firstName, last_name: "Mensah" },
      due_date: `2026-09-0${index + 1}`,
      status: "open",
      task_type: "visitation",
    }));
    const { getByRole, queryByRole } = render(TaskQueue, {
      props: { tasks, initialLimit: 2 },
    });

    expect(queryByRole('button', { name: 'Grace Mensah' })).toBeNull();
    await fireEvent.click(getByRole('button', { name: 'Show 1 more' }));
    expect(getByRole('button', { name: 'Grace Mensah' })).toBeDefined();
  });
});
