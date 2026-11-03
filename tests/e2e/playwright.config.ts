import { defineConfig, devices } from "@playwright/test";

/*
 * End-to-end tests against the production builds: PostgreSQL with migrations,
 * the built API, `next start` and a one-origin edge in front of both.
 * Build first: `pnpm build` (API) and the Web build with NEXT_PUBLIC_API_ORIGIN=/.
 */
const database = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://platform_app:platform_app@127.0.0.1:5432/platform_e2e",
  DATABASE_MIGRATION_URL:
    process.env.DATABASE_MIGRATION_URL ??
    "postgresql://platform_migrator:platform_migrator@127.0.0.1:5432/platform_e2e"
};
export const ORIGIN = "http://localhost:3000";

export default defineConfig({
  testDir: "./specs",
  globalSetup: "./global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: ORIGIN,
    locale: "ru-RU",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // CI installs Playwright's Chromium. Where that build is unsupported
        // (macOS 13), E2E_BROWSER_CHANNEL=chrome uses the installed Google Chrome.
        ...(process.env.E2E_BROWSER_CHANNEL
          ? { channel: process.env.E2E_BROWSER_CHANNEL }
          : {})
      }
    }
  ],
  webServer: [
    {
      command: "node apps/api/dist/main.js",
      cwd: "../..",
      url: "http://127.0.0.1:4000/v1/health",
      env: { ...database, PORT: "4000", WEB_APP_ORIGIN: ORIGIN },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000
    },
    {
      command: "pnpm --filter @platform/web exec next start -p 3001",
      cwd: "../..",
      url: "http://127.0.0.1:3001/login",
      env: { API_INTERNAL_URL: "http://127.0.0.1:4000" },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000
    },
    {
      command: "node tests/e2e/edge.mjs",
      cwd: "../..",
      url: `${ORIGIN}/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    }
  ]
});
