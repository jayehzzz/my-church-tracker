import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import DiscipleshipReview from './DiscipleshipReview.svelte';
import EngagementRadarSection from './EngagementRadarSection.svelte';
import { addDiscipleshipReview } from '$lib/services/peopleService.js';
import { session } from '$lib/auth/session.js';

vi.mock('$lib/auth/session.js', () => ({ session: writable({ user: { canViewConfidential: true } }) }));
vi.mock('$lib/convex.js', () => ({ isDemoMode: () => false }));
vi.mock('$lib/services/peopleService.js', () => ({ addDiscipleshipReview: vi.fn() }));
const person = { id: 'member', member_status: 'member' };
afterEach(() => { cleanup(); vi.clearAllMocks(); session.set({ user: { canViewConfidential: true } }); });

describe('participation and leader review', () => {
  it('lets an ordinary member profile inspect a category and change the period', async () => {
    const { getByRole, getByText, getByLabelText } = render(EngagementRadarSection, { person });
    await fireEvent.click(getByRole('button', { name: 'Prayer', exact: true }));
    expect(getByRole('button', { name: 'Prayer', exact: true }).getAttribute('aria-pressed')).toBe('true');
    expect(getByRole('heading', { name: 'Prayer meetings' })).toBeDefined();
    await fireEvent.change(getByLabelText('Period'), { target: { value: '24' } });
    expect(getByText('0 of 24 weeks')).toBeDefined();
    expect(getByRole('button', { name: 'Record a review' })).toBeDefined();
  });
  it('retains a failed draft and passes the saved profile to the parent after retry', async () => {
    const onsave = vi.fn();
    const { getByRole, getByLabelText, queryByRole } = render(DiscipleshipReview, { person, onsave });
    await fireEvent.click(getByRole('button', { name: 'Record a review' }));
    await fireEvent.click(getByRole('button', { name: 'Journey focus' }));
    await fireEvent.click(getByRole('button', { name: 'Building foundations' }));
    await fireEvent.input(getByLabelText('Understanding & growth'), { target: { value: 'Questions discussed together.' } });
    await fireEvent.input(getByLabelText('Agreed next step'), { target: { value: 'Meet again next week.' } });
    addDiscipleshipReview.mockResolvedValueOnce({ error: new Error('Connection unavailable') });
    await fireEvent.click(getByRole('button', { name: 'Save review' }));
    await waitFor(() => expect(getByRole('alert').textContent).toContain('Connection unavailable'));
    expect(getByLabelText('Understanding & growth').value).toBe('Questions discussed together.');
    const saved = { ...person, discipleship_reviews: [] };
    addDiscipleshipReview.mockResolvedValueOnce({ data: saved });
    await fireEvent.click(getByRole('button', { name: 'Save review' }));
    await waitFor(() => expect(onsave).toHaveBeenCalledWith(saved));
    expect(queryByRole('button', { name: 'Save review' })).toBeNull();
    expect(addDiscipleshipReview).toHaveBeenLastCalledWith('member', expect.objectContaining({ focus: 'foundations', next_step: 'Meet again next week.' }));
  });
  it('hides confidential review content and its editor without confidential access', () => {
    session.set({ user: { canViewConfidential: false } });
    const { queryByRole, queryByText } = render(DiscipleshipReview, { person: { ...person, discipleship_reviews: [{ conversation_date: '2026-01-01', recorded_at: '2026-01-01', understanding: 'Private conversation', next_step: 'Private step' }] } });
    expect(queryByRole('button', { name: 'Record a review' })).toBeNull();
    expect(queryByText('Private conversation')).toBeNull();
  });
});
