import { get } from 'svelte/store';
import { session } from '$lib/auth/session.js';

export function returnAuthKey() {
  const { status, user } = get(session);
  return JSON.stringify([status, user?.id || user?._id || user?.sub || user?.email || user?.externalAuthId || '', user?.role, user?.canViewConfidential]);
}

export function scopedReturnState() {
  const frames = new Map();
  let lastKey = returnAuthKey();
  session.subscribe(() => {
    const key = returnAuthKey();
    if (key !== lastKey) { frames.clear(); lastKey = key; }
  });
  return {
    save(key, frame) { frames.set(key, { auth: returnAuthKey(), frame }); },
    take(key) {
      const saved = frames.get(key);
      frames.delete(key);
      return saved?.auth === returnAuthKey() ? saved.frame : null;
    },
    peek(key) {
      const saved = frames.get(key);
      return saved?.auth === returnAuthKey() ? saved.frame : null;
    },
  };
}
