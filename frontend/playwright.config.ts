import { defineConfig, devices } from '@playwright/test'

const PORT = 5173

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // Login goes through the app's real 5-attempts/15-minutes throttle
  // (routes/api.php), same as production. Running specs in parallel (or
  // retrying) multiplies how many login requests land in that window and
  // self-locks the suite, so everything runs serially with no retries.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  // A cold Vite dev server compiles each page's module graph on first
  // request, which can take a few seconds - give actions headroom for that.
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port ' + PORT,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
