import { mkdirSync } from "fs";
import { test as setup } from "@playwright/test";

const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

setup("authenticate", async ({ page }) => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error("TEST_EMAIL and TEST_PASSWORD must be set in .dev.vars");
  }

  mkdirSync("playwright/.auth", { recursive: true });

  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill(TEST_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/campaigns");

  await page.context().storageState({ path: "playwright/.auth/user.json" });
});
