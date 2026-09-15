import { expect, test } from '@playwright/test';

test('landing page communicates the product promise and remains usable on mobile', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Stop refreshing');
  await expect(page.getByRole('link', { name: /create ticket alert/i }).first()).toBeVisible();
});

test('authenticated demo flow', async ({ page }) => {
  test.skip(process.env.E2E_FULL !== 'true', 'Requires PostgreSQL, Redis, API, and worker.');
  const suffix = Date.now();
  await page.goto('/register');
  await page.getByLabel('Display name').fill('E2E User');
  await page.getByLabel('Email address').fill(`e2e-${suffix}@ticketwatch.local`);
  await page.getByLabel('Password').fill('StrongDemoPassword!123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Your ticket signals' })).toBeVisible();
  await page
    .getByRole('link', { name: /create alert/i })
    .first()
    .click();
  await page.getByRole('button', { name: 'Validate and scan' }).click();
  await expect(page.getByText('Coolie')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel(/Aliases/).fill('Avatar 3');
});
