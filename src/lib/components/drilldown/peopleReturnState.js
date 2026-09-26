// Ephemeral navigation state; never written to URLs or browser storage.
import { scopedReturnState } from './authReturnState.js';
const frames = scopedReturnState();
export const savePeopleDirectory = state => frames.save('people', state);
export const takePeopleDirectory = () => frames.take('people');
