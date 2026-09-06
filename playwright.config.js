import { defineConfig } from "@playwright/test";

// These checks run the existing Task 04 browser fixture. It uses convex-test
// with authenticated in-memory identities, so CI exercises the real Svelte
// workflow and Convex transaction rules without credentials or church records.
export default defineConfig({
  testDir: "./tests/browser/e2e",
  timeout: 30_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:5194",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npx vite --config tests/browser/task04/vite.config.js",
    url: "http://127.0.0.1:5194/tests/browser/task04/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
