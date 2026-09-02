import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import DelegationQueue from './DelegationQueue.svelte';
import SundayRoster from './SundayRoster.svelte';
import TaskQueue from './TaskQueue.svelte';

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

describe('DelegationQueue', () => {
  it('shows the full unassigned list and supports person and leader search', async () => {
    const contacts = [
      { id: 'contact-1', first_name: 'Fresh', last_name: 'Person', contact_date: '2026-09-01' },
      { id: 'contact-2', first_name: 'Older', last_name: 'Person', contact_date: '2026-07-01' },
    ];
    const leaders = [
      { id: 'leader-1', first_name: 'Ama', last_name: 'Leader' },
      { id: 'leader-2', first_name: 'Grace', last_name: 'Leader' },
    ];
    const onAssign = vi.fn();
    const { getByLabelText, getByText, queryByText, getAllByRole } = render(DelegationQueue, {
      props: { contacts, leaders, today: '2026-09-01', onAssign },
    });

    expect(getByText('Fresh Person')).toBeDefined();
    expect(getByText('Older Person')).toBeDefined();
    await fireEvent.input(getByLabelText('Search people'), { target: { value: 'Older' } });
    expect(queryByText('Fresh Person')).toBeNull();
    expect(getByText('Older Person')).toBeDefined();

    await fireEvent.input(getByLabelText('Search leaders'), { target: { value: 'Grace' } });
    await waitFor(() => expect(getByText('Grace Leader')).toBeDefined());
    const assignButton = getAllByRole('button', { name: 'Assign' })[0];
    await fireEvent.click(assignButton);
    expect(onAssign).toHaveBeenCalledWith(contacts[1], 'leader-2', '2026-09-01');
  });
});
