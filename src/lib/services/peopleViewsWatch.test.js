import { beforeEach, expect, it, vi } from 'vitest';
const remote = vi.hoisted(() => ({ client: { onUpdate: vi.fn() } }));
vi.mock('$lib/convex.js', () => ({
  getConvexClient: async () => remote.client,
  getConvexHttpClient: () => remote.client,
  isDemoMode: () => false,
  unavailableError: () => new Error('Backend unavailable'),
}));
beforeEach(() => remote.client.onUpdate.mockReset());

it('subscribes to scoped journey records and forwards changes, failures and cleanup', async () => {
  const { watchJourneyOverview } = await import('./followUpCrmService.js');
  const onUpdate = vi.fn(), onError = vi.fn(), stop = vi.fn();
  remote.client.onUpdate.mockReturnValue(stop);
  const unsubscribe = await watchJourneyOverview({ leaderId: 'leader1' }, { onUpdate, onError });
  const [, args, update, failure] = remote.client.onUpdate.mock.calls[0];
  expect(args).toEqual({ leaderId: 'leader1' });
  update({ first_timers: [{ person: { id: 'new-person' } }] });
  expect(onUpdate).toHaveBeenCalledWith({ first_timers: [{ person: { id: 'new-person' } }] });
  failure(new Error('Access lost'));
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Access lost' }));
  unsubscribe();
  expect(stop).toHaveBeenCalledOnce();
});

it('keeps services, people and check-ins subscribed and cleans them up together', async () => {
  const { watchServiceWorkspace } = await import('./servicesService.js');
  const stops = [vi.fn(), vi.fn(), vi.fn()];
  for (const stop of stops) remote.client.onUpdate.mockReturnValueOnce(stop);
  const onServices = vi.fn(), onPeople = vi.fn(), onAttendance = vi.fn();
  const stop = await watchServiceWorkspace({ onServices, onPeople, onAttendance });
  remote.client.onUpdate.mock.calls.forEach(([, args, update], index) => {
    expect(args).toEqual({});
    update([{ _id: `row${index}` }]);
  });
  expect(onServices).toHaveBeenCalledWith([{ _id: 'row0', id: 'row0' }]);
  expect(onPeople).toHaveBeenCalledWith([{ _id: 'row1', id: 'row1' }]);
  expect(onAttendance).toHaveBeenCalledWith([{ _id: 'row2', id: 'row2' }]);
  stop();
  for (const unsubscribe of stops) expect(unsubscribe).toHaveBeenCalledOnce();
});
