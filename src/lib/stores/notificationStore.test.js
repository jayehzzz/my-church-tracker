import { describe, it, expect, beforeEach } from "vitest";
import { get } from "svelte/store";
import {
  notifications,
  unreadCount,
  notificationStore,
} from "./notificationStore.js";

describe("Notification Store", () => {
  beforeEach(() => {
    notificationStore.resetNotifications();
  });

  it("starts empty in live mode and calculates unread count", () => {
    const list = get(notifications);
    expect(list).toEqual([]);

    const count = get(unreadCount);
    const expectedUnread = list.filter((n) => !n.read).length;
    expect(count).toBe(expectedUnread);
  });

  it("marks a notification as read and decrements unreadCount", () => {
    notificationStore.addNotification({ title: "Live alert", description: "A real event" });
    const initialUnread = get(unreadCount);
    const unreadItem = get(notifications).find((n) => !n.read);
    expect(unreadItem).toBeDefined();

    notificationStore.markAsRead(unreadItem.id);

    const updatedList = get(notifications);
    const updatedItem = updatedList.find((n) => n.id === unreadItem.id);
    expect(updatedItem.read).toBe(true);
    expect(get(unreadCount)).toBe(initialUnread - 1);
  });

  it("marks all notifications as read", () => {
    notificationStore.markAllAsRead();

    const list = get(notifications);
    expect(list.every((n) => n.read === true)).toBe(true);
    expect(get(unreadCount)).toBe(0);
  });

  it("adds and removes notifications correctly", () => {
    notificationStore.addNotification({
      title: "Test Followup",
      description: "Test description",
      category: "followup",
      priority: "urgent",
    });

    let list = get(notifications);
    const added = list.find((n) => n.title === "Test Followup");
    expect(added).toBeDefined();
    expect(added.read).toBe(false);

    notificationStore.removeNotification(added.id);
    list = get(notifications);
    expect(list.find((n) => n.id === added.id)).toBeUndefined();
  });

  it("updates a stable CRM alert without creating duplicates", () => {
    notificationStore.upsertNotification({
      id: "crm-overdue-work",
      title: "CRM work overdue",
      description: "2 tasks are overdue.",
      href: "/pipeline",
    });
    notificationStore.upsertNotification({
      id: "crm-overdue-work",
      title: "CRM work overdue",
      description: "3 tasks are overdue.",
      href: "/pipeline",
    });

    const matching = get(notifications).filter((item) => item.id === "crm-overdue-work");
    expect(matching).toHaveLength(1);
    expect(matching[0].description).toBe("3 tasks are overdue.");
    expect(matching[0].read).toBe(false);
  });
});
