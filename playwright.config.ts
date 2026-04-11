import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  // Store screenshots and traces next to the test files.
  outputDir: 'tests/e2e/.output',
  use: {
    baseURL: 'http://localhost:5173',
    // Always capture a screenshot on failure; keep one on success too so I
    // can read it with the Read tool to verify UI work visually.
    screenshot: 'on',
    // Headless so it runs without a display server.
    headless: true,
  },
  // Start the Vite dev server before running any test, tear it down after.
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
