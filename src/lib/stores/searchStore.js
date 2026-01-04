import { writable, derived } from 'svelte/store';

// Search UI state stores
export const isSearchOpen = writable(false);
export const searchQuery = writable('');
export const searchResults = writable([]);

// isSearching: true while a search query is in-progress
const _isSearching = writable(false);
export const isSearching = { subscribe: _isSearching.subscribe };

// Open/Close functions
export function openSearch() {
    isSearchOpen.set(true);
}

export function closeSearch() {
    isSearchOpen.set(false);
    searchQuery.set('');
    searchResults.set([]);
}

// Mock data for search (in production this would search actual data/API)
const mockSearchData = [
    { id: 1, type: 'person', title: 'Sarah Johnson', subtitle: 'Active Member', icon: 'user', href: '/people' },
    { id: 2, type: 'person', title: 'Michael Chen', subtitle: 'Volunteer', icon: 'user', href: '/people' },
    { id: 3, type: 'person', title: 'Emily Davis', subtitle: 'New Visitor', icon: 'user', href: '/people' },
    { id: 4, type: 'contact', title: 'Thomas Anderson', subtitle: 'Follow Up Needed', icon: 'users', href: '/evangelism' },
    { id: 5, type: 'contact', title: 'Maria Garcia', subtitle: 'Initial Contact', icon: 'users', href: '/evangelism' },
    { id: 6, type: 'service', title: 'Sunday Service - Dec 15', subtitle: '185 attendees', icon: 'calendar', href: '/services' },
    { id: 7, type: 'service', title: 'Sunday Service - Dec 8', subtitle: '172 attendees', icon: 'calendar', href: '/services' },
    { id: 8, type: 'meeting', title: 'Prayer Meeting - Tuesday', subtitle: 'Weekly Prayer', icon: 'clock', href: '/meetings' },
    { id: 9, type: 'meeting', title: 'Small Group - Alpha', subtitle: 'Wed 7pm', icon: 'clock', href: '/meetings' },
];

// Debounce timer
let searchTimeout;

// Perform search with debounce
export function performSearch(query) {
    searchQuery.set(query);

    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    // If query is too short, clear results
    if (!query || query.length < 2) {
        searchResults.set([]);
        _isSearching.set(false);
        return;
    }

    // Start searching indicator
    _isSearching.set(true);

    // Debounced search (300ms delay)
    searchTimeout = setTimeout(() => {
        const lowerQuery = query.toLowerCase();

        // Filter mock data based on query
        const results = mockSearchData.filter(item =>
            item.title.toLowerCase().includes(lowerQuery) ||
            item.subtitle.toLowerCase().includes(lowerQuery)
        );

        searchResults.set(results);
        _isSearching.set(false);
    }, 300);
}
