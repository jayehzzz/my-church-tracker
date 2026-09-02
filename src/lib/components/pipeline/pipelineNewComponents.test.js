import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ConfirmationSheet from './ConfirmationSheet.svelte';
import LeaderScoreboard from './LeaderScoreboard.svelte';
import ConversionFunnel from './ConversionFunnel.svelte';

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

describe('LeaderScoreboard', () => {
  const mockStats = [
    {
      leader_id: 'l1',
      leader_name: 'Pastor Alex',
      total_follow_ups: 25,
      follow_ups_this_week: 8,
      follow_ups_this_month: 20,
      unique_contacts_this_week: 6,
      unique_contacts_total: 18,
      assigned_contacts: 12,
      stale_contacts: 2,
      showed_up: 5,
      converted: 3,
      last_activity: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    },
    {
      leader_id: 'l2',
      leader_name: 'Sister Mary',
      total_follow_ups: 0,
      follow_ups_this_week: 0,
      follow_ups_this_month: 0,
      unique_contacts_this_week: 0,
      unique_contacts_total: 0,
      assigned_contacts: 5,
      stale_contacts: 0,
      showed_up: 0,
      converted: 0,
      last_activity: null,
    },
  ];

  it('renders leader cards and metrics', () => {
    const { getByText } = render(LeaderScoreboard, {
      props: { stats: mockStats },
    });

    expect(getByText('Pastor Alex')).toBeDefined();
    expect(getByText('Sister Mary')).toBeDefined();
    expect(getByText('Active 15m ago')).toBeDefined();
    expect(getByText('No activity yet')).toBeDefined();
  });

  it('renders empty state when stats is empty', () => {
    const { getByText } = render(LeaderScoreboard, {
      props: { stats: [] },
    });

    expect(
      getByText('No leaders found. Add leaders to the People Directory to get started.')
    ).toBeDefined();
  });
});

describe('ConversionFunnel', () => {
  const mockFunnel = {
    total_contacts: 100,
    contacted: 80,
    promised: 40,
    visited: 20,
    converted: 10,
    rates: {
      contact_rate: 80,
      promise_rate: 50,
      visit_rate: 50,
      conversion_rate: 50,
    },
  };

  it('renders all 5 funnel stages with counts and rate badges', () => {
    const { getByText } = render(ConversionFunnel, {
      props: { funnel: mockFunnel },
    });

    expect(getByText('New Contacts')).toBeDefined();
    expect(getByText('100')).toBeDefined();
    expect(getByText('Contacted')).toBeDefined();
    expect(getByText('80')).toBeDefined();
    expect(getByText('Promised')).toBeDefined();
    expect(getByText('40')).toBeDefined();
    expect(getByText('Visited')).toBeDefined();
    expect(getByText('20')).toBeDefined();
    expect(getByText('Converted')).toBeDefined();
    expect(getByText('10')).toBeDefined();
  });

  it('renders stage connectors with rates', () => {
    const { getByText, getAllByText } = render(ConversionFunnel, {
      props: { funnel: mockFunnel },
    });

    expect(getByText('80% →')).toBeDefined();
    expect(getAllByText('50% →').length).toBe(3);
  });
});
