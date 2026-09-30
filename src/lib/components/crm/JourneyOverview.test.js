import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import JourneyOverview from './JourneyOverview.svelte';

afterEach(cleanup);

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
  expect(view.getByText('First timers are people explicitly recorded as first timers when they joined.')).toBeInTheDocument();
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
  await waitFor(() => expect(view.getByText('No records match your search and date range.')).toBeInTheDocument());
  const onRetry = vi.fn();
  const failure = render(JourneyOverview, { props: { error: 'Could not load records.', onRetry } });
  await fireEvent.click(failure.getByRole('button', { name: 'Retry' }));
  expect(onRetry).toHaveBeenCalledOnce();
  const empty = render(JourneyOverview, { props: { data: { first_timers: [], new_converts: [], unnamed_decisions: [] } } });
  expect(empty.getByText('No people have been explicitly recorded as first timers.')).toBeInTheDocument();
});
