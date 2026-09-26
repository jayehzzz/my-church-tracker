import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import ProfileHeader from './ProfileHeader.svelte';
import ProfileDetails from './ProfileDetails.svelte';
import ProfileQuickViewCard from './ProfileQuickViewCard.svelte';
import AttendanceHistory from './AttendanceHistory.svelte';
import ProfileHistoryTabs from './ProfileHistoryTabs.svelte';

afterEach(cleanup);
const person = { id: '1', first_name: 'Anne', last_name: 'Jones', member_status: 'member', activity_status: 'regular' };

describe('people profile actions', () => {
  it('connects activity and status choices to save handlers', async () => {
    const onUpdateStatus = vi.fn(), onUpdateActivity = vi.fn();
    const { getByLabelText } = render(ProfileHeader, { person, onUpdateStatus, onUpdateActivity });
    await fireEvent.change(getByLabelText('Church status'), { target: { value: 'guest' } });
    await fireEvent.change(getByLabelText('Activity status'), { target: { value: 'irregular' } });
    expect(onUpdateStatus).toHaveBeenCalledWith('guest');
    expect(onUpdateActivity).toHaveBeenCalledWith('irregular');
  });
  it('opens the real edit form for notes and distinguishes unknown boolean fields', async () => {
    const onEdit = vi.fn();
    const { getByRole, getAllByText, queryByRole } = render(ProfileDetails, { person, currentAge: null, onEdit });
    await fireEvent.click(getByRole('button', { name: 'Edit notes' }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(queryByRole('textbox')).toBeNull();
    expect(getAllByText('Not recorded').length).toBeGreaterThan(3);
  });
  it('shows outreach, leadership, and Basonta involvement as separate profile concepts', () => {
    const outreach = {
      ...person,
      member_status: 'contact',
      role: 'bacenta_leader',
      church_role: 'basonta',
      basontas: ['media'],
      first_visit_date: null,
    };
    const details = render(ProfileDetails, { person: outreach, currentAge: null, onEdit: vi.fn() });
    expect(details.getByText('Outreach Contact')).toBeTruthy();
    expect(details.getByText('Bacenta Leader')).toBeTruthy();
    expect(details.getByText('Basonta member')).toBeTruthy();
    expect(details.getByText('Not yet attended')).toBeTruthy();
    expect(details.getByText(/First timer marks the first recorded visit/)).toBeTruthy();
    details.unmount();

    const quickView = render(ProfileQuickViewCard, { person: outreach });
    expect(quickView.getByText('Outreach Contact')).toBeTruthy();
    expect(quickView.getByText('Leadership: Bacenta Leader')).toBeTruthy();
    expect(quickView.getByText(/Basonta \/ group involvement: media/)).toBeTruthy();
  });
  it('keeps long attendance histories manageable and service details reachable', async () => {
    const onRecordClick = vi.fn();
    const history = Array.from({ length: 20 }, (_, id) => ({ id, services: { service_date: `2026-08-${String(id + 1).padStart(2, '0')}`, service_type: 'sunday_service' } }));
    const { getByRole, getAllByRole } = render(AttendanceHistory, { attendanceHistory: history, onRecordClick });
    expect(getAllByRole('row')).toHaveLength(16);
    await fireEvent.click(getAllByRole('button', { name: /View service on/ })[0]);
    expect(onRecordClick).toHaveBeenCalledWith(history[0]);
    await fireEvent.click(getByRole('button', { name: 'Show more attendance' }));
    expect(getAllByRole('row')).toHaveLength(21);
  });
  it('does not represent unavailable history as no attendance', () => {
    const { getByText, queryByText } = render(ProfileHistoryTabs, { errors: { attendance: true }, storageKey: null });
    expect(getByText(/This history is unavailable/)).toBeDefined();
    expect(queryByText(/No attendance records found/)).toBeNull();
  });

  it('opens whole-row details from outreach and pastoral care history tabs', async () => {
    const onOutreachClick = vi.fn();
    const onVisitationClick = vi.fn();
    const outreach = [{ id: 'outreach-1', first_name: 'Sam', last_name: 'Guest', contact_date: '2026-08-20', response: 'responsive' }];
    const visitations = [{ id: 'visit-1', visit_date: '2026-08-21', interaction_type: 'phone_call', outcome: 'welcomed_encouraged', visited_by_name: 'Leader' }];
    const view = render(ProfileHistoryTabs, {
      attendanceHistory: [],
      outreachContacts: outreach,
      visitations,
      onOutreachClick,
      onVisitationClick,
      storageKey: null,
    });

    await fireEvent.click(view.getByRole('button', { name: /Outreach/ }));
    await fireEvent.click(view.getByText('Sam Guest').closest('tr'));
    expect(onOutreachClick).toHaveBeenCalledWith(outreach[0]);

    await fireEvent.click(view.getByRole('button', { name: /Pastoral Care/ }));
    await fireEvent.click(view.getByRole('button', { name: /View pastoral care details/ }));
    expect(onVisitationClick).toHaveBeenCalledWith(visitations[0]);
  });
});
