import { expect, test } from '@playwright/test';

test('a first-name-only Follow-up guest reaches Sunday Services and reuses the same profile', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-19T12:00:00Z'));
  await page.goto('/tests/browser/task04/?fixture=guest-entry');
  await page.getByRole('button', { name: 'Add expected guest', exact: true }).click();
  const invite = page.getByRole('dialog', { name: 'Add expected guest', exact: true });
  await invite.getByLabel('Guest first name', { exact: true }).fill('Practice Ama');
  await invite.getByLabel('Invitation status').selectOption('coming');
  await invite.getByRole('button', { name: 'Save invitation', exact: true }).click();
  await expect(invite).not.toBeVisible();
  await expect(page.getByText('Guest saved to People and this Sunday’s guest list.', { exact: false })).toBeVisible();

  await page.getByRole('button', { name: 'Record Sunday service', exact: true }).click();
  const service = page.getByRole('dialog', { name: 'Record service', exact: true });
  await service.getByLabel('Service Date').fill('2026-10-18');
  await service.getByRole('button', { name: /2 Attendance/ }).click();
  const ama = service.getByRole('button', { name: 'Practice Ama Non-member profile', exact: true });
  await expect(ama).toHaveAttribute('aria-pressed', 'true');
  await service.getByRole('button', { name: 'Guests from Follow-up (1)', exact: true }).click();
  await expect(ama).toBeVisible();

  // Quick-add can reuse a profile while a different search is active.
  await service.getByLabel('Search all people', { exact: true }).fill('not a match');
  await service.getByRole('button', { name: '+ Add first timer', exact: true }).click();
  await service.getByRole('button', { name: 'Existing guest or new person', exact: true }).click();
  await service.getByPlaceholder('Search existing people by name, phone or email').fill('Practice Ama');
  await service.getByRole('button', { name: 'Practice Ama', exact: true }).click();
  await service.getByRole('button', { name: 'Add and check in', exact: true }).click();
  await expect(service.getByLabel('Search all people', { exact: true })).toHaveValue('');
  await expect(ama).toHaveAttribute('aria-pressed', 'true');
  await expect(service.getByRole('button', { name: 'Practice Ama Non-member profile', exact: true })).toHaveCount(1);

  await service.getByRole('button', { name: 'Review service', exact: true }).click();
  await service.getByRole('button', { name: 'Record service', exact: true }).click();
  await expect(service).not.toBeVisible();
  const result = await page.request.post('/__task04', { data: { kind: 'state', fixtureId: 'guest-entry' } });
  const { data } = await result.json();
  const people = data.people.filter(person => person.first_name === 'Practice Ama');
  expect(people).toHaveLength(1);
  expect(people[0].last_name).toBe('');
  expect(data.attendance.filter(row => row.person_id === people[0]._id)).toHaveLength(1);
});
