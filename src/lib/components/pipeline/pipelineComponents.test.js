import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FreshnessBadge from './FreshnessBadge.svelte';
import WarmthBadge from './WarmthBadge.svelte';
import KanbanCard from './KanbanCard.svelte';

describe('FreshnessBadge', () => {
  it('renders "this_week" correctly', () => {
    const { getByRole, getByText } = render(FreshnessBadge, {
      props: { freshness: 'this_week' },
    });
    expect(getByRole('status')).toBeDefined();
    expect(getByText('This Week')).toBeDefined();
    expect(getByText('🆕')).toBeDefined();
  });

  it('renders "last_week" correctly', () => {
    const { getByText } = render(FreshnessBadge, {
      props: { freshness: 'last_week' },
    });
    expect(getByText('Last Week')).toBeDefined();
    expect(getByText('📅')).toBeDefined();
  });

  it('renders "two_plus_weeks" correctly', () => {
    const { getByText } = render(FreshnessBadge, {
      props: { freshness: 'two_plus_weeks' },
    });
    expect(getByText('2+ Weeks')).toBeDefined();
    expect(getByText('⚠️')).toBeDefined();
  });

  it('renders "month_plus" correctly', () => {
    const { getByText } = render(FreshnessBadge, {
      props: { freshness: 'month_plus' },
    });
    expect(getByText('Month+')).toBeDefined();
    expect(getByText('🔴')).toBeDefined();
  });
});

describe('WarmthBadge', () => {
  it('renders "hot" warmth correctly', () => {
    const { getByText } = render(WarmthBadge, {
      props: { warmth: 'hot' },
    });
    expect(getByText('Hot')).toBeDefined();
    expect(getByText('🔥')).toBeDefined();
  });

  it('renders "warm" warmth correctly', () => {
    const { getByText } = render(WarmthBadge, {
      props: { warmth: 'warm' },
    });
    expect(getByText('Warm')).toBeDefined();
    expect(getByText('🟡')).toBeDefined();
  });

  it('renders "cool" warmth correctly', () => {
    const { getByText } = render(WarmthBadge, {
      props: { warmth: 'cool' },
    });
    expect(getByText('Cool')).toBeDefined();
    expect(getByText('🔵')).toBeDefined();
  });

  it('renders "cold" warmth correctly', () => {
    const { getByText } = render(WarmthBadge, {
      props: { warmth: 'cold' },
    });
    expect(getByText('Cold')).toBeDefined();
    expect(getByText('❄️')).toBeDefined();
  });

  it('renders "dead" warmth correctly', () => {
    const { getByText } = render(WarmthBadge, {
      props: { warmth: 'dead' },
    });
    expect(getByText('Dead Lead')).toBeDefined();
    expect(getByText('☠️')).toBeDefined();
  });

  it('supports size="sm"', () => {
    const { getByRole } = render(WarmthBadge, {
      props: { warmth: 'hot', size: 'sm' },
    });
    const el = getByRole('status');
    expect(el.className).toContain('text-[11px]');
  });
});

describe('KanbanCard', () => {
  const mockContact = {
    first_name: 'Kwame',
    last_name: 'Mensah',
    phone: '+44 7123 456789',
    contact_date: '2026-08-01',
    freshness: 'this_week',
    warmth_score: 'hot',
    pipeline_stage: 'contacted',
    leader_name: 'Pastor David',
    total_follow_ups: 3,
    last_follow_up_date: new Date().toISOString(),
    promises_made: 2,
    promises_kept: 1,
  };

  it('renders contact details properly', () => {
    const { getByText } = render(KanbanCard, {
      props: { contact: mockContact },
    });

    expect(getByText('Kwame Mensah')).toBeDefined();
    expect(getByText('+44 7123 456789')).toBeDefined();
    expect(getByText('Pastor David')).toBeDefined();
    expect(getByText('3 follow-ups')).toBeDefined();
    expect(getByText('Last: Today')).toBeDefined();
    expect(getByText('Promises: 1/2')).toBeDefined();
  });

  it('handles card click (onViewTimeline)', async () => {
    const onViewTimeline = vi.fn();
    const { getByRole } = render(KanbanCard, {
      props: { contact: mockContact, onViewTimeline },
    });

    const card = getByRole('button', { name: /View timeline for Kwame Mensah/i });
    await fireEvent.click(card);
    expect(onViewTimeline).toHaveBeenCalledWith(mockContact);
  });

  it('handles Log Follow-Up button click without triggering onViewTimeline', async () => {
    const onViewTimeline = vi.fn();
    const onLogFollowUp = vi.fn();
    const { getByRole } = render(KanbanCard, {
      props: { contact: mockContact, onViewTimeline, onLogFollowUp },
    });

    const logBtn = getByRole('button', { name: /Log follow-up for Kwame Mensah/i });
    await fireEvent.click(logBtn);

    expect(onLogFollowUp).toHaveBeenCalledWith(mockContact);
    expect(onViewTimeline).not.toHaveBeenCalled();
  });
});
