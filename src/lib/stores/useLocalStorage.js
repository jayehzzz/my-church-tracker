/**
 * LocalStorage utility for persisted state management
 * SSR-safe: checks for browser environment
 */

import { browser } from '$app/environment';

/**
 * Get a value from localStorage with optional default
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default if not found
 * @returns {*} Parsed value or default
 */
export function getStorageValue(key, defaultValue = null) {
    if (!browser) return defaultValue;

    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn(`Error reading localStorage key "${key}":`, error);
        return defaultValue;
    }
}

/**
 * Set a value in localStorage
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON serialized)
 */
export function setStorageValue(key, value) {
    if (!browser) return;

    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
    }
}

/**
 * Remove a value from localStorage
 * @param {string} key - Storage key
 */
export function removeStorageValue(key) {
    if (!browser) return;

    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn(`Error removing localStorage key "${key}":`, error);
    }
}

/**
 * Create a persisted state object that syncs with localStorage
 * @param {string} key - Storage key
 * @param {*} initialValue - Initial/default value
 * @returns {{ value: *, save: function, reset: function }}
 */
export function createPersistedState(key, initialValue) {
    let value = $state(getStorageValue(key, initialValue));

    return {
        get value() {
            return value;
        },
        set value(newValue) {
            value = newValue;
            setStorageValue(key, newValue);
        },
        save() {
            setStorageValue(key, value);
        },
        reset() {
            value = initialValue;
            removeStorageValue(key);
        }
    };
}
