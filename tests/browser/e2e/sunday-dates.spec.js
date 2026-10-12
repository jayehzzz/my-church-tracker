import { expect, test } from "@playwright/test";

test("Monday entry starts on Sunday and prevents accidentally choosing Monday", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-12T12:00:00Z"));
  await page.goto("/tests/browser/task04/");
  await page.getByRole("button", { name: "Record Sunday service", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Record service" });
  await expect(form.getByLabel("Service Date")).toHaveValue("2026-10-11");
  await form.getByLabel("Service Date").fill("2026-10-12");
  await form.getByRole("button", { name: /2 Attendance/ }).click();
  await expect(form.getByText("Choose a Sunday for a Sunday service")).toBeVisible();
  await form.getByLabel("Service Date").fill("2026-10-11");
  await form.getByRole("button", { name: /2 Attendance/ }).click();
  await expect(form.getByRole("heading", { name: "Record named attendance" })).toBeVisible();
  const confirmed = form.getByRole("button", { name: "Browser Leader Leader", exact: true });
  await expect(confirmed).toHaveAttribute("aria-pressed", "true");
  await expect(form.getByRole("button", { name: "Confirmed (1)", exact: true })).toBeVisible();
  await confirmed.click();
  await expect(confirmed).toHaveAttribute("aria-pressed", "false");
  await form.getByRole("button", { name: "Everyone", exact: true }).click();
  await expect(form.getByRole("button", { name: "Browser Guest Non-member profile", exact: true })).toBeVisible();
});
