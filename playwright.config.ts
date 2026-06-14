import { readFileSync } from "fs";
import { defineConfig, devices } from "@playwright/test";

try {
  readFileSync(".dev.vars", "utf8")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (key && !process.env[key]) process.env[key] = value;
    });
} catch {
  // .dev.vars absent — test runner uses env vars already in process.env
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
  },
  projects: [
    // Unauthenticated flows — no storageState, no setup dependency.
    // File convention: *.spec.ts
    {
      name: "unauthenticated",
      testMatch: /(?<!\.auth)\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },

    // Authenticated flows — requires auth.setup.ts to run first and write playwright/.auth/user.json.
    // File convention: *.auth.spec.ts
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "authenticated",
      testMatch: /\.auth\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
  },
});
