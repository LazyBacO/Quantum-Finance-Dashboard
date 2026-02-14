import { test, expect } from '@playwright/test';

test('@AC-01 homepage responds successfully', async ({ page }) => {
  const response = await page.goto('/');

  expect(response).not.toBeNull();
  expect(response?.ok()).toBeTruthy();
});
