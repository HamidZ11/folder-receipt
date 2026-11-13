import { defineConfig, devices } from '@playwright/test';

// Runs against a production build (vite preview) so the CSP is in force.
// The e2e build adds only the dev-only break-ui toggle (VITE_WORST_CASES=1) and goes
// to dist-e2e/, so dist/ stays a clean production build.
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  reporter: 'list',
  use: { baseURL: 'http://localhost:4174' },
  webServer: {
    command: 'VITE_WORST_CASES=1 pnpm build --outDir dist-e2e && vite preview --outDir dist-e2e --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
