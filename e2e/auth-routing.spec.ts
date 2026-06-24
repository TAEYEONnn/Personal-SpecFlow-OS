import { expect, test } from "@playwright/test";

test("anonymous users start at login and can reach signup", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();

  const signupLink = page.getByRole("link", { name: "회원가입" });
  await expect(signupLink).toBeVisible();
  await signupLink.click();

  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { name: "계정 만들기" })).toBeVisible();
});
