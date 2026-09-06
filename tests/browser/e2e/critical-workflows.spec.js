import { expect, test } from "@playwright/test";

test("an owner records actual attendance and completes the linked care workflow", async ({ page }) => {
  await page.goto("/tests/browser/task04/");

  await expect(page.getByRole("heading", { name: "Task 04 isolated workflow checks" })).toBeVisible();
  await expect(page.getByLabel("Saved results")).toContainText("Named check-ins: 0");
  await expect(page.getByLabel("Saved results")).toContainText("Commitment: pending");

  // The fixture deliberately supplies two same-day services. The workflow must
  // make the operator choose the real gathering rather than guessing by date.
  await page.getByRole("button", { name: "Resolve CRM attendance" }).click();
  const attendanceDialog = page.getByRole("dialog", { name: "Record actual attendance" });
  await expect(attendanceDialog).toBeVisible();
  const gatheringSelect = attendanceDialog.getByLabel("Gathering attended");
  await expect(gatheringSelect).toBeVisible();
  await expect(gatheringSelect.locator("option")).toHaveCount(3);
  await gatheringSelect.selectOption({ index: 1 });
  await attendanceDialog.getByRole("button", { name: "Save attendance" }).click();

  await expect(page.getByLabel("Saved results")).toContainText("Named check-ins: 1");
  await expect(page.getByLabel("Saved results")).toContainText("Commitment: attended");

  // Logging care creates one timeline entry and one shared next task. The
  // dedicated completion control must close that task rather than reopening it.
  await page.getByRole("button", { name: "Log care" }).click();
  const careDialog = page.locator('[role="dialog"]:not([inert])').filter({
    has: page.getByRole("heading", { name: "Log Pastoral Care" }),
  });
  await expect(careDialog).toBeVisible();
  await careDialog.getByRole("button", { name: /Care leader/ }).click();
  await careDialog.getByPlaceholder("Search leaders…").fill("Browser Leader");
  await careDialog.getByRole("button", { name: "Browser Leader", exact: true }).click();
  await careDialog.getByRole("checkbox", { name: /Create a next action/ }).check();
  await careDialog.getByLabel("Next action due").fill("2026-09-09");
  await careDialog.getByLabel("Care notes").fill("Checked in and agreed a next step.");
  await careDialog.getByRole("button", { name: "Log care", exact: true }).click();

  await expect(careDialog).toBeHidden();
  await page.getByRole("button", { name: "Refresh saved state" }).click();
  await expect(page.getByLabel("Saved results")).toContainText("Care interactions: 1");
  await expect(page.getByLabel("Saved results")).toContainText("Open care tasks: 1");
  await page.getByRole("button", { name: "Complete next care task" }).click();
  await expect(page.getByLabel("Saved results")).toContainText("Open care tasks: 0");
  await expect(page.getByLabel("Saved results")).toContainText("Completed care tasks: 1");
});
