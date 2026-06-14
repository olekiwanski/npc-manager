import { test, expect } from "@playwright/test";

// Override project-level storageState — this file tests unauthenticated flows.
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * Seed test — pattern reference for the Playwright agent generator.
 *
 * Four conventions every generated test must follow:
 *   1. Locators: getByRole / getByLabel / getByText first; never CSS or XPath.
 *   2. Test independence: full setup → action → assertion cycle; no state shared between tests.
 *   3. Wait for state, not time: waitForURL(), toBeVisible(), waitForResponse() — never waitForTimeout().
 *   4. Test name maps to a risk in context/foundation/test-plan.md.
 *
 * For tests that create data: use unique identifiers (e.g. `Test Campaign ${Date.now()}`)
 * and clean up in afterEach / at the end of the test body. See auth.spec.ts for examples.
 */

// Risk #6 — unauthenticated access to protected routes must redirect to sign-in.
test("unauthenticated user visiting /dashboard is redirected to sign-in page", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForURL("**/auth/signin");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("unauthenticated user visiting /campaigns is redirected to sign-in page", async ({ page }) => {
  await page.goto("/campaigns");
  await page.waitForURL("**/auth/signin");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
