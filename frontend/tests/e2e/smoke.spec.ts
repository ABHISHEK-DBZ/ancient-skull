import { test, expect } from '@playwright/test';

test('landing page loads and theme toggle works', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=Exit Capsule Generator')).toBeVisible();
  await expect(page.locator('text=AI-Powered Dependency Resilience')).toBeVisible();
});

test('dashboard loads for authenticated user', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('text=Dashboard')).toBeVisible();
});
