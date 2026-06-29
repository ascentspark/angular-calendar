import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the calendar demo's end-to-end / accessibility suite.
 * Boots the SSR demo on a dedicated port and runs the axe-core gate against the
 * live, rendered DOM (jsdom can't evaluate layout-dependent contrast).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4300',
    trace: 'on-first-retry',
    // Disable CSS transitions so axe measures settled colours (not a mid-transition
    // blend), and to honour users who request reduced motion.
    reducedMotion: 'reduce',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx ng serve demo --port 4300',
    url: 'http://localhost:4300',
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
