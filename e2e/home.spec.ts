import { expect, test } from '@playwright/test';

test('@AC-01 la page principale charge', async ({ page }) => {
  const response = await page.goto('/');

  expect(response).not.toBeNull();
  expect(response?.status()).toBeLessThan(400);
});
