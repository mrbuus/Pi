import { defineConfig } from '@playwright/test';
const port = 3370;
export default defineConfig({
  testDir: './tests', timeout: 45_000, expect: { timeout: 10_000 },
  fullyParallel: false, workers: 1, retries: 0, forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`, timezoneId: 'Asia/Ulaanbaatar',
    serviceWorkers: 'block', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    channel: process.env.PW_CHANNEL || undefined,
    launchOptions: { executablePath: process.env.PW_EXECUTABLE_PATH || undefined },
  },
  projects: [
    { name: 'mobile-375', use: { viewport: { width: 375, height: 812 } } },
    { name: 'desktop-1280', use: { viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: `npm --prefix ../web run start -- -p ${port} -H 127.0.0.1`,
    url: `http://127.0.0.1:${port}/login`, timeout: 60_000, reuseExistingServer: false,
  },
});
