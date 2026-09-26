import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
const albums = [
  { id: 'album-service', sourceType: 'service', sourceId: 's/1', title: 'Sunday memories', eventDate: '2026-09-06', category: 'service', media: [{ id: 'p1', type: 'photo', url: '/one.jpg', caption: 'First' }, { id: 'p2', type: 'photo', url: '/two.jpg', caption: 'Second' }] },
  { id: 'album-meeting', sourceType: 'album', meetingId: 'm&2', title: 'Prayer memories', eventDate: '2026-09-08', category: 'fellowship', media: [{ id: 'p3', type: 'photo', url: '/three.jpg' }] },
];
vi.mock('$lib/auth/session.js', () => ({ session: writable({ status: 'authenticated', user: { id: 'owner', role: 'owner', canViewConfidential: true } }) }));
vi.mock('$lib/convex.js', () => ({ isDemoMode: () => false, getConvexHttpClient: () => null }));
vi.mock('$lib/components/layout/DashboardLayout.svelte', async () => ({ default: (await import('../pipeline/TestLayout.svelte')).default }));
vi.mock('svelte/transition', () => ({ fade: () => ({}), fly: () => ({}), scale: () => ({}) }));
vi.mock('$lib/services/memoriesService.js', () => ({ getAll: async () => ({ data: albums, error: null }), remove: vi.fn() }));
vi.mock('$lib/services/servicesService.js', () => ({ getAll: async () => ({ data: [], error: null }) }));
vi.mock('$lib/services/meetingsService.js', () => ({ getAll: async () => ({ data: [], error: null }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('shows exact service and meeting links and restores album, media and filters', async () => {
  const scrollTo = vi.fn();
  vi.stubGlobal('scrollTo', scrollTo);
  const { default: Page } = await import('./+page.svelte');
  const view = render(Page);
  await waitFor(() => expect(view.getAllByRole('button', { name: 'Open Sunday memories' })[0]).toBeInTheDocument());
  await fireEvent.input(view.getByPlaceholderText('Search memories…'), { target: { value: 'Sunday' } });
  await fireEvent.click(view.getAllByRole('button', { name: 'Open Sunday memories' })[0]);
  expect(view.getByRole('link', { name: 'View service' })).toHaveAttribute('href', '/services?service=s%2F1');
  await fireEvent.click(view.getByRole('button', { name: 'Next media' }));
  expect(view.getByText('Second')).toBeInTheDocument();
  const saved = view.component.snapshot.capture();
  expect(JSON.stringify(saved)).not.toContain('Second');
  view.unmount();
  const returned = render(Page);
  returned.component.snapshot.restore(saved);
  await waitFor(() => expect(returned.getByRole('dialog', { name: 'Sunday memories' })).toHaveTextContent('Second'));
  expect(returned.getByPlaceholderText('Search memories…').value).toBe('Sunday');
  await new Promise(resolve => requestAnimationFrame(resolve));
  expect(scrollTo).toHaveBeenCalled();
  await fireEvent.click(returned.getByRole('button', { name: 'Close modal' }));
  await fireEvent.input(returned.getByPlaceholderText('Search memories…'), { target: { value: 'Prayer' } });
  await fireEvent.click(returned.getAllByRole('button', { name: 'Open Prayer memories' })[0]);
  expect(returned.getByRole('link', { name: 'View meeting' })).toHaveAttribute('href', '/meetings?meeting=m%262');
});
