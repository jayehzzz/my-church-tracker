import { expect, it, vi } from 'vitest';
import { writable } from 'svelte/store';

const session = writable({ status: 'authenticated', user: { id: 'u1', role: 'admin', canViewConfidential: true } });
vi.mock('$lib/auth/session.js', () => ({ session }));

it('invalidates all return frames when identity, role, confidentiality or sign-in changes', async () => {
  const { saveDomainReturn, takeDomainReturn } = await import('./domainReturnState.js');
  const { saveMeetingReturn, takeMeetingReturn } = await import('./meetingReturnState.js');
  const { savePeopleDirectory, takePeopleDirectory } = await import('./peopleReturnState.js');
  const save = () => { saveDomainReturn('care', { privateNote: 'private' }); saveMeetingReturn({ cohort: [{ name: 'private' }] }); savePeopleDirectory({ comparison: { name: 'private' } }); };
  const rejected = () => { expect(takeDomainReturn('care')).toBeNull(); expect(takeMeetingReturn()).toBeNull(); expect(takePeopleDirectory()).toBeNull(); };

  save();
  session.set({ status: 'authenticated', user: { id: 'u2', role: 'admin', canViewConfidential: true } });
  rejected();
  save();
  session.set({ status: 'authenticated', user: { id: 'u2', role: 'leader', canViewConfidential: true } });
  rejected();
  save();
  session.set({ status: 'authenticated', user: { id: 'u2', role: 'leader', canViewConfidential: false } });
  rejected();
  save();
  session.set({ status: 'signed-out', user: null });
  rejected();
});
