import { expect, test } from "@playwright/test";

test.describe("auth pages", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /welcome back/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/^email$/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("register page renders", async ({ page }) => {
    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: /create your account/i }),
    ).toBeVisible();
  });

  test("unauthenticated users are redirected from dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("authenticated smoke", () => {
  test("seed user can sign in and open dashboard", async ({ page }) => {
    test.skip(
      process.env.E2E_SKIP_AUTH === "1",
      "Skipping authenticated flow (E2E_SKIP_AUTH=1)",
    );

    await page.goto("/login");
    await page.locator('form[data-testid="login-form"]').waitFor();

    await page.getByLabel(/^email$/i).fill("john@acme.dev");
    await page.getByLabel(/^password$/i).fill("password123");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: /welcome back/i }),
    ).toBeVisible();
  });
});
