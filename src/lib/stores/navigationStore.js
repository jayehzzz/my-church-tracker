import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Sidebar visibility (persisted in localStorage)
const savedSidebarState = browser ? localStorage.getItem('sidebarVisible') : null;
const initialSidebarState = savedSidebarState !== null ? savedSidebarState === 'true' : true;

export const sidebarVisible = writable(initialSidebarState);
export const mobileSidebarVisible = writable(false);

function createNavigationStore() {
    return {
        toggleSidebar: () => {
            sidebarVisible.update(v => {
                const newState = !v;
                if (browser) localStorage.setItem('sidebarVisible', String(newState));
                return newState;
            });
        },
        toggleMobileSidebar: () => {
            mobileSidebarVisible.update(v => !v);
        },
        closeMobileSidebar: () => {
            mobileSidebarVisible.set(false);
        },
        openMobileSidebar: () => {
            mobileSidebarVisible.set(true);
        },
        initialize: () => {
            // Re-sync with local storage on mount if needed
            if (browser) {
                const stored = localStorage.getItem('sidebarVisible');
                if (stored !== null) sidebarVisible.set(stored === 'true');
            }
        },
        saveToStorage: () => {
            // Already handled in toggle, but exposed for explicit save if needed
            sidebarVisible.subscribe(v => {
                if (browser) localStorage.setItem('sidebarVisible', String(v));
            })();
        }
    };
}

export const navigationStore = createNavigationStore();
