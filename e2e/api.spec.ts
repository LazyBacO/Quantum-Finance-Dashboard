import { expect, test } from '@playwright/test';

test('@AC-02 une route API répond', async ({ request, baseURL }) => {
  const response = await request.get(`${baseURL}/api/tasks`);

  expect(response.status()).toBe(200);
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  expect(Array.isArray(payload)).toBeTruthy();
});
