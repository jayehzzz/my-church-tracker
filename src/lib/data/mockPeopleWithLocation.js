/**
 * Mock data for people with location information.
 * Re-exported from centralized mockData.js for backward compatibility.
 * 
 * @deprecated Import directly from '$lib/data/mockData' instead
 */

import { mockPeople, churchLocation } from './mockData.js';

// Re-export for backward compatibility with existing imports
export { churchLocation };
export const mockPeopleWithLocation = mockPeople;
