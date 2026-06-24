import { expect, test } from "@playwright/test";

test("anonymous users start at signup and can reach login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { name: "계정 만들기" })).toBeVisible();

  const loginLink = page.getByRole("link", { name: "로그인" });
  await expect(loginLink).toBeVisible();
  await loginLink.click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();
});
