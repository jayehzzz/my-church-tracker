import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ConfirmationSheet from './ConfirmationSheet.svelte';

describe('ConfirmationSheet', () => {
  const mockPromises = [
    {
      _id: 'p1',
      contact_name: 'John Doe',
      contact_phone: '+44 7000 111222',
      leader_name: 'Pastor Alex',
      promised_date: '2026-08-28',
      promise_fulfilled: null,
    },
    {
      _id: 'p2',
      contact_name: 'Jane Smith',
      contact_phone: '+44 7000 333444',
      leader_name: 'Sister Mary',
      promised_date: '2026-08-29',
      promise_fulfilled: true,
    },
    {
      _id: 'p3',
      contact_name: 'Mark Johnson',
      contact_phone: '+44 7000 555666',
      leader_name: 'Brother Eric',
      promised_date: '2026-08-30',
      promise_fulfilled: false,
    },
  ];

  it('renders header, title, and contact items', () => {
    const { getByText } = render(ConfirmationSheet, {
      props: {
        promises: mockPromises,
        serviceDateLabel: 'Sunday 31 August 2026',
      },
    });

    expect(getByText(/Sunday Confirmation Sheet — Sunday 31 August 2026/i)).toBeDefined();
    expect(getByText(/Expected This Week \(3 people\)/i)).toBeDefined();
    expect(getByText('John Doe')).toBeDefined();
    expect(getByText('+44 7000 111222')).toBeDefined();
    expect(getByText('Jane Smith')).toBeDefined();
    expect(getByText('Mark Johnson')).toBeDefined();
  });

  it('renders resolved status badges', () => {
    const { getByText } = render(ConfirmationSheet, {
      props: { promises: mockPromises },
    });

    expect(getByText(/Showed Up/i)).toBeDefined();
    expect(getByText(/No Show/i)).toBeDefined();
  });

  it('handles single resolution buttons', async () => {
    const onResolve = vi.fn();
    const { getByLabelText } = render(ConfirmationSheet, {
      props: {
        promises: [mockPromises[0]],
        onResolve,
      },
    });

    const markShowBtn = getByLabelText('Mark John Doe as Showed Up');
    await fireEvent.click(markShowBtn);
    expect(onResolve).toHaveBeenCalledWith('p1', true);

    const markNoShowBtn = getByLabelText('Mark John Doe as No Show');
    await fireEvent.click(markNoShowBtn);
    expect(onResolve).toHaveBeenCalledWith('p1', false);
  });

  it('handles bulk confirmation callback', async () => {
    const onBulkResolve = vi.fn();
    const { getByText } = render(ConfirmationSheet, {
      props: {
        promises: mockPromises,
        onBulkResolve,
      },
    });

    const bulkBtn = getByText('Confirm All & Close Week');
    await fireEvent.click(bulkBtn);
    expect(onBulkResolve).toHaveBeenCalledTimes(1);
    expect(onBulkResolve).toHaveBeenCalledWith([
      { follow_up_id: 'p1', fulfilled: true },
      { follow_up_id: 'p2', fulfilled: true },
      { follow_up_id: 'p3', fulfilled: false },
    ]);
  });

  it('renders empty state when promises is empty', () => {
    const { getByText } = render(ConfirmationSheet, {
      props: { promises: [] },
    });

    expect(getByText(/No promises to confirm this week. Keep following up! 💪/i)).toBeDefined();
  });
});
