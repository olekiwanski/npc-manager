import { test, expect } from "@playwright/test";

// Both tests start with no session — we're testing the sign-in form from scratch.
// waitForLoadState("networkidle") ensures the Astro client:load React island has
// hydrated before we interact with the form; without it, fill() can set the DOM
// value before React attaches onChange, and the next re-render resets it to "".
// pressSequentially fires key events for the email field, which is more reliable
// than fill() when the island hydration boundary is close.
// { exact: true } on getByLabel("Password") is required because the "Show password"
// toggle has aria-label="Show password", which matches without exact mode.
test.use({ storageState: { cookies: [], origins: [] } });

const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

// Risk #7 — valid credentials complete the full auth loop.
test("valid credentials sign-in redirects to campaigns page", async ({ page }) => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error("TEST_EMAIL and TEST_PASSWORD must be set in .dev.vars");
  }

  await page.goto("/auth/signin");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email", { exact: true }).pressSequentially(TEST_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/campaigns");

  await expect(page.getByRole("heading", { name: "Campaigns" })).toBeVisible();
  await expect(page.getByText(TEST_EMAIL)).toBeVisible();
});

// Error path — wrong credentials stay on sign-in page with error visible.
test("wrong credentials show error on sign-in page", async ({ page }) => {
  if (!TEST_EMAIL) {
    throw new Error("TEST_EMAIL must be set in .dev.vars");
  }

  await page.goto("/auth/signin");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email", { exact: true }).pressSequentially(TEST_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/auth/signin**");

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
});
