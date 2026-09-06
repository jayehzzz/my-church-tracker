/**
 * Notification Store
 * Manages real-time alerts, pastoral reminders, and ministry updates.
 */
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { api } from '../../../convex/_generated/api.js';
import { getConvexHttpClient, isDemoMode } from '$lib/convex.js';

// These examples are available only in explicit local demo mode.
const DEFAULT_NOTIFICATIONS = [
  {
    id: 'notif-1',
    type: 'followup',
    priority: 'urgent',
    icon: 'phone',
    title: 'Urgent Contact Follow-up',
    description: 'Thomas Anderson requested a pastoral callback regarding next baptism class.',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // 35 mins ago
    read: false,
    href: '/evangelism',
    category: 'followup'
  },
  {
    id: 'notif-2',
    type: 'salvation',
    priority: 'success',
    icon: 'heart',
    title: 'New Salvation Decision',
    description: 'Maria Garcia recorded a salvation decision during the Saturday outreach.',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    read: false,
    href: '/people',
    category: 'milestone'
  },
  {
    id: 'notif-3',
    type: 'followup',
    priority: 'urgent',
    icon: 'home',
    title: 'Pastoral Visit Follow-up Due',
    description: 'Kofi Owusu scheduled for pastoral follow-up prayer this week.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    read: false,
    href: '/visitation',
    category: 'followup'
  },
  {
    id: 'notif-4',
    type: 'service',
    priority: 'normal',
    icon: 'church',
    title: 'Sunday Service Attendance Ready',
    description: 'Attendance numbers for the last Sunday Service (185 attendees) have been compiled.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: false,
    href: '/services',
    category: 'milestone'
  },
  {
    id: 'notif-5',
    type: 'meeting',
    priority: 'normal',
    icon: 'clock',
    title: 'Midweek Prayer Meeting',
    description: 'Tuesday Flow Prayer session starts at 7:00 PM in the Main Sanctuary.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
    read: true,
    href: '/meetings',
    category: 'info'
  }
];

function getStoredNotifications() {
  if (!browser || typeof localStorage === 'undefined') return isDemoMode() ? DEFAULT_NOTIFICATIONS : [];
  try {
    const raw = localStorage.getItem('church_tracker_notifications');
    if (!raw) return isDemoMode() ? DEFAULT_NOTIFICATIONS : [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (isDemoMode() ? DEFAULT_NOTIFICATIONS : []);
  } catch (e) {
    console.error('Failed to load notifications from storage', e);
    return isDemoMode() ? DEFAULT_NOTIFICATIONS : [];
  }
}

export const notifications = writable(getStoredNotifications());

// Live feed state is separate from the items so the UI can distinguish an
// in-flight request, a valid empty feed, and an unavailable feed.
export const liveNotificationState = writable('idle');

// Derived count of unread notifications
export const unreadCount = derived(notifications, ($notifs) => {
  return $notifs.filter((n) => !n.read).length;
});

// Helper to save notifications to localStorage
function save(items) {
  if (browser && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('church_tracker_notifications', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save notifications', e);
    }
  }
}

export const notificationStore = {
  subscribe: notifications.subscribe,

  clearSession: () => {
    notifications.set([]);
    try {
      if (browser) localStorage.removeItem('church_tracker_notifications');
    } catch { /* Storage restrictions must never prevent sign-out. */ }
  },

  markAsRead: (id) => {
    notifications.update((items) => {
      const updated = items.map((item) =>
        item.id === id ? { ...item, read: true } : item
      );
      save(updated);
      return updated;
    });
  },

  markAllAsRead: () => {
    notifications.update((items) => {
      const updated = items.map((item) => ({ ...item, read: true }));
      save(updated);
      return updated;
    });
  },

  removeNotification: (id) => {
    notifications.update((items) => {
      const updated = items.filter((item) => item.id !== id);
      save(updated);
      return updated;
    });
  },

  addNotification: (notif) => {
    notifications.update((items) => {
      const newItem = {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'normal',
        category: 'info',
        ...notif
      };
      const updated = [newItem, ...items];
      save(updated);
      return updated;
    });
  },

  upsertNotification: (notif) => {
    if (!notif?.id) throw new Error('A stable notification id is required');
    notifications.update((items) => {
      const existing = items.find((item) => item.id === notif.id);
      const contentChanged = existing
        && (existing.title !== notif.title || existing.description !== notif.description);
      const nextItem = {
        timestamp: existing?.timestamp || new Date().toISOString(),
        read: existing?.read ?? false,
        priority: 'normal',
        category: 'info',
        ...existing,
        ...notif,
        ...(contentChanged ? { timestamp: new Date().toISOString(), read: false } : {}),
      };
      const updated = [nextItem, ...items.filter((item) => item.id !== notif.id)];
      save(updated);
      return updated;
    });
  },

  resetNotifications: () => {
    const next = isDemoMode() ? DEFAULT_NOTIFICATIONS : [];
    notifications.set(next);
    save(next);
  }
};

export async function refreshLiveNotifications() {
  if (isDemoMode()) return;
  const client = getConvexHttpClient();
  if (!client) {
    liveNotificationState.set('error');
    notifications.set([]);
    return;
  }
  liveNotificationState.set('loading');
  try {
    const feed = await client.query(api.notifications.getFeed, {});
    notifications.update((existing) => {
      const existingById = new Map(existing.map((item) => [item.id, item]));
      const next = feed.map((item) => ({
        ...item,
        read: existingById.get(item.id)?.read ?? false,
      }));
      save(next);
      return next;
    });
    liveNotificationState.set('ready');
  } catch {
    // Do not leave stale alerts on screen when the current feed is unavailable.
    notifications.set([]);
    liveNotificationState.set('error');
  }
}
