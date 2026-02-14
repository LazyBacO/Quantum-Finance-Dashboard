import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
  },
});
