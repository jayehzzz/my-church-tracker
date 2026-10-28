import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import JourneyOverview from './JourneyOverview.svelte';

afterEach(() => { cleanup(); vi.useRealTimers(); });

const overview = {
  first_timers: [{
    person: { id: 'p1', first_name: 'Ama', last_name: 'Mensah', phone: '01234', member_status: 'guest' },
    assigned_worker: { first_name: 'Kojo', last_name: 'Leader' },
    date_only: false,
    events: [{ id: 's1', date: '2026-09-06', label: 'sunday service', time: '10:00', location: 'Main Hall' }],
  }],
  new_converts: [{
    person: { id: 'p2', first_name: 'Kofi', last_name: 'Owusu', email: 'kofi@example.com', member_status: 'guest' },
    assigned_worker: null,
    events: [{ id: 's2', date: '2026-09-13', label: 'special service' }],
  }],
  unnamed_decisions_available: true,
  unnamed_decisions: [{ date: '2026-09-13', label: 'special service', count: 2 }],
};

it('shows a loading status while the overview request is pending', () => {
  const view = render(JourneyOverview, { props: { data: overview, loading: true } });
  expect(view.getByRole('status').textContent).toContain('Loading first timer records and salvation decisions');
  expect(view.queryByText('Ama Mensah')).not.toBeInTheDocument();
});

it('shows first visits and service decisions with people, gathering details and unnamed totals', async () => {
  const onOpen = vi.fn();
  const view = render(JourneyOverview, { props: { data: overview, onOpen } });
  expect(view.getByText('Ama Mensah')).toBeInTheDocument();
  expect(view.getByText('Recorded first visits across all church services, including special services. Confirmed first timers and first recorded visits are labelled separately.')).toBeInTheDocument();
  expect(view.getByRole('listitem').textContent).toContain('sunday service');
  expect(view.getByRole('listitem').textContent).toContain('6 Sept 2026');
  expect(view.getByRole('listitem').textContent).toContain('Main Hall');
  expect(view.getByText('Worker: Kojo Leader')).toBeInTheDocument();
  await fireEvent.click(view.getByRole('tab', { name: /New converts/ }));
  expect(view.getByText('Kofi Owusu')).toBeInTheDocument();
  expect(view.getByLabelText('First visits and salvation overview').querySelector('header').textContent).toContain('unnamed service decisions');
  expect(view.getByLabelText('First visits and salvation overview').querySelector('header').textContent).toContain('2');
  await fireEvent.click(view.getByText('Unnamed decisions by service'));
  expect(view.getByText(/special service · 13 Sept 2026/i)).toBeInTheDocument();
  await fireEvent.click(view.getByRole('button', { name: 'Kofi Owusu' }));
  expect(onOpen).toHaveBeenCalledWith(overview.new_converts[0].person);
});

it('filters history by search and date and exposes retry and empty states', async () => {
  const view = render(JourneyOverview, { props: { data: overview } });
  await fireEvent.change(view.getByRole('searchbox', { name: 'Search people and gatherings' }), { target: { value: 'Ama' } });
  expect(view.getByText('Ama Mensah')).toBeInTheDocument();
  expect(view.queryByText('Kofi Owusu')).not.toBeInTheDocument();
  await fireEvent.input(view.getByLabelText('From date'), { target: { value: '2026-09-07' } });
  await waitFor(() => expect(view.getByText('No records match your search, service type and date range.')).toBeInTheDocument());
  const onRetry = vi.fn();
  const failure = render(JourneyOverview, { props: { error: 'Could not load records.', onRetry } });
  await fireEvent.click(failure.getByRole('button', { name: 'Retry' }));
  expect(onRetry).toHaveBeenCalledOnce();
  const empty = render(JourneyOverview, { props: { data: { first_timers: [], new_converts: [], unnamed_decisions: [] } } });
  expect(empty.getByText('No first visits have been recorded at church services.')).toBeInTheDocument();
});

it('shows unique people in an inclusive period and reacts to shared record changes', async () => {
  const onOpen = vi.fn();
  const data = { ...overview, first_timers: [
    { ...overview.first_timers[0], events: [...overview.first_timers[0].events, { id: 's3', date: '2026-09-20', label: 'sunday service' }] },
    { person: { id: 'p3', first_name: 'Outside', last_name: 'Period' }, events: [{ id: 's4', date: '2026-08-31', label: 'sunday service' }] },
  ] };
  const view = render(JourneyOverview, { data, firstTimersOnly: true, fromDate: '2026-09-06', toDate: '2026-09-20', onOpen });
  expect(view.getByRole('status')).toHaveTextContent('1 person recorded as a first timer in this period');
  expect(view.getAllByRole('button', { name: 'Ama Mensah' })).toHaveLength(1);
  expect(view.queryByText('Outside Period')).not.toBeInTheDocument();
  await fireEvent.click(view.getByRole('button', { name: 'View person' }));
  expect(onOpen).toHaveBeenCalledWith(data.first_timers[0].person);
  await view.rerender({ data: { ...data, first_timers: [...data.first_timers, { person: { id: 'p4', first_name: 'New', last_name: 'Arrival' }, events: [{ id: 's5', date: '2026-09-20' }] }] } });
  expect(view.getByRole('status')).toHaveTextContent('2 people recorded as first timers in this period');
  expect(view.getByText('New Arrival')).toBeInTheDocument();
  await fireEvent.input(view.getByLabelText('From date'), { target: { value: '2026-09-21' } });
  expect(view.getByRole('alert')).toHaveTextContent('start date must be on or before');
  expect(view.queryByText('Ama Mensah')).not.toBeInTheDocument();
});

it('provides this-month, last-30-days and all-time shortcuts', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-11T12:00:00'));
  const view = render(JourneyOverview, { data: overview });
  await fireEvent.click(view.getByRole('button', { name: 'This month' }));
  expect(view.getByLabelText('From date')).toHaveValue('2026-10-01');
  expect(view.getByLabelText('To date')).toHaveValue('2026-10-11');
  await fireEvent.click(view.getByRole('button', { name: 'Last 30 days' }));
  expect(view.getByLabelText('From date')).toHaveValue('2026-09-12');
  await fireEvent.click(view.getByRole('button', { name: 'All time' }));
  expect(view.getByLabelText('From date')).toHaveValue('');
  expect(view.getByRole('button', { name: 'Ama Mensah' })).toBeInTheDocument();
});

it('counts special-service first timers and filters them separately from Sunday first visits', async () => {
  const special = { person: { id: 'special-first', first_name: 'Practice Special First' }, events: [{ id: 'special', date: '2026-09-13', label: 'special service', service_type: 'special_service', confirmed_first_timer: true }] };
  const view = render(JourneyOverview, { data: { first_timers: [...overview.first_timers, special] } });
  expect(view.getByRole('status')).toHaveTextContent('2 people recorded as first timers');
  expect(view.getByText('First recorded visit')).toBeInTheDocument();
  expect(view.getByText('Confirmed first timer')).toBeInTheDocument();
  await fireEvent.change(view.getByRole('combobox', { name: /Service type/ }), { target: { value: 'special' } });
  expect(view.getByRole('status')).toHaveTextContent('1 person recorded as a first timer');
  expect(view.getByRole('button', { name: 'Practice Special First' })).toBeInTheDocument();
  expect(view.queryByRole('button', { name: 'Ama Mensah' })).not.toBeInTheDocument();
});
