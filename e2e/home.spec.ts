import { test, expect } from '@playwright/test';

test('@AC-01 homepage responds successfully', async ({ page }) => {
  const response = await page.goto('/');

  expect(response).not.toBeNull();
  expect(response?.ok()).toBeTruthy();
});

test('@AC-02 tasks API route responds with JSON payload', async ({ request, baseURL }) => {
  const response = await request.get(`${baseURL}/api/tasks`);

  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);

  const payload = await response.json();
  expect(Array.isArray(payload)).toBeTruthy();
});
