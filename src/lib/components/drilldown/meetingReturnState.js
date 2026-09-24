// One in-memory return frame for profile navigation; no person data in URLs or storage.
import { scopedReturnState } from './authReturnState.js';
const frames = scopedReturnState();
export const saveMeetingReturn = value => frames.save('meeting', value);
export const peekMeetingReturn = () => frames.peek('meeting');
export const takeMeetingReturn = () => frames.take('meeting');
