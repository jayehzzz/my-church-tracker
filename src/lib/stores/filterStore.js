import { writable, derived, get } from 'svelte/store';
import { getDateRange } from '$lib/utils/dateUtils';

// Initial state
const initialState = {
    type: 'thisMonth', // thisYear, thisMonth, last30Days, thisQuarter, specificYear, specificMonth, specificQuarter, customRange
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    quarter: null,
    customStart: null,
    customEnd: null
};

function createFilterStore() {
    const { subscribe, set, update } = writable(initialState);

    return {
        subscribe,

        // Quick Filters
        setThisYear: () => update(s => ({
            ...s,
            type: 'thisYear',
            year: new Date().getFullYear(),
            month: null,
            quarter: null
        })),

        setThisMonth: () => update(s => ({
            ...s,
            type: 'thisMonth',
            year: new Date().getFullYear(),
            month: new Date().getMonth(),
            quarter: null
        })),

        setLast30Days: () => update(s => ({
            ...s,
            type: 'last30Days',
            month: null,
            quarter: null
        })),

        setThisQuarter: () => {
            const today = new Date();
            const q = Math.floor(today.getMonth() / 3) + 1;
            update(s => ({
                ...s,
                type: 'thisQuarter',
                year: today.getFullYear(),
                quarter: `Q${q}`,
                month: null
            }));
        },

        // Relative Selectors
        setLastMonth: () => update(s => ({
            ...s,
            type: 'lastMonth',
            month: null,
            quarter: null
        })),

        setLast3Months: () => update(s => ({
            ...s,
            type: 'last3Months',
            month: null,
            quarter: null
        })),

        setLast6Months: () => update(s => ({
            ...s,
            type: 'last6Months',
            month: null,
            quarter: null
        })),

        setLast12Months: () => update(s => ({
            ...s,
            type: 'last12Months',
            month: null,
            quarter: null
        })),

        // Explicit Selectors
        setYear: (year) => update(s => ({
            ...s,
            type: 'specificYear',
            year,
            month: null,
            quarter: null
        })),

        setMonth: (year, month) => update(s => ({
            ...s,
            type: 'specificMonth',
            year,
            month,
            quarter: null
        })),

        setQuarter: (year, quarter) => update(s => ({
            ...s,
            type: 'specificQuarter',
            year,
            quarter,
            month: null
        })),

        // Custom Range
        setCustomRange: (start, end) => update(s => ({
            ...s,
            type: 'customRange',
            customStart: start,
            customEnd: end,
            year: null,
            month: null,
            quarter: null
        })),

        // Reset
        reset: () => set(initialState),

        // Persistence & Initialization
        initialize: () => {
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('filterState');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        set({ ...initialState, ...parsed });
                    } catch (e) {
                        console.error('Failed to parse filter state', e);
                    }
                }
            }
        },
        syncToURL: () => {
            if (typeof window !== 'undefined') {
                import('$app/navigation').then(({ replaceState }) => {
                    const state = get(filterStore);
                    const url = new URL(window.location);
                    url.searchParams.set('filterType', state.type);
                    if (state.year) url.searchParams.set('year', String(state.year));
                    // Use SvelteKit's replaceState to avoid router conflicts
                    replaceState(url, {});
                });
            }
        },
        saveToStorage: () => {
            // Access current value via subscription or get()
            // Since we are inside the store creator, we can use subscribe or just expose a method that expects the value or uses get()
            // For simplicity, let's use the update trick or assume the caller handles logic.
            // Better: Use `get` from svelte/store
            import('svelte/store').then(({ get }) => {
                const state = get({ subscribe });
                if (typeof window !== 'undefined') {
                    localStorage.setItem('filterState', JSON.stringify(state));
                }
            });
        }
    };
}

export const filterStore = createFilterStore();

// Derived store that outputs the actual date range strings and label
export const dateRange = derived(filterStore, ($store) => {
    return getDateRange($store);
});
