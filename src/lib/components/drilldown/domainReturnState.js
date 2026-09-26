// In-memory return context for a full-page profile visit.
import { scopedReturnState } from './authReturnState.js';
const frames = scopedReturnState();
export function saveDomainReturn(domain, frame) { frames.save(domain, frame); }
export function takeDomainReturn(domain) { return frames.take(domain); }
