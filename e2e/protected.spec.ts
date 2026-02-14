import { expect, test } from '@playwright/test';

test('@AC-03 une page protégée redirige correctement', async ({ page }) => {
  const response = await page.goto('/protected');

  expect(response).not.toBeNull();
  expect(page.url()).toContain('/dashboard');
  expect(response?.status()).toBeLessThan(400);
});
