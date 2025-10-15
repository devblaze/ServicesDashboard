import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Services Dashboard
 *
 * This configuration is optimized for creating demo videos and E2E testing.
 * Video recording is enabled for all tests to capture demonstrations.
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Record video for all tests (essential for demos)
    video: 'on',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Viewport size
    viewport: { width: 1920, height: 1080 },

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Slow down operations by this amount (ms) - useful for demo videos
    // Set to 0 for normal speed, increase for slower demos
    launchOptions: {
      slowMo: process.env.DEMO_MODE ? 500 : 0,
    },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // High quality video for demos
        video: {
          mode: 'on',
          size: { width: 1920, height: 1080 }
        },
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        video: {
          mode: 'on',
          size: { width: 1920, height: 1080 }
        },
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        video: {
          mode: 'on',
          size: { width: 1920, height: 1080 }
        },
      },
    },

    // Mobile viewports for responsive demos
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        video: {
          mode: 'on'
        },
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        video: {
          mode: 'on'
        },
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
