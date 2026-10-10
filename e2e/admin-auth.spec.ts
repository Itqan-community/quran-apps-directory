import { test, expect } from "@playwright/test";

test("admin credentials set session and pass guard", async ({ page }) => {
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("BROWSER-CONSOLE:", msg.text());
  });
  page.on("pageerror", (err) => console.log("PAGE-ERROR:", err.message));
  await page.goto("/admin/login");
  await page.fill('input[type="email"]', process.env.ADMIN_EMAIL ?? "admin@local.dev");
  await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD ?? "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 15_000 });
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name.startsWith("authjs.session-token"))).toBe(true);
  // guard should NOT bounce back to login — the dashboard shell renders
  await page.waitForTimeout(1000);
  expect(page.url()).not.toContain("/admin/login");
  await expect(page.getByRole("heading", { name: "لوحة التحكم" })).toBeVisible({
    timeout: 15_000,
  });
});

test("admin guard redirects anonymous visitors to login", async ({ page }) => {
  await page.goto("/admin");
  await page.waitForURL("**/admin/login", { timeout: 10_000 });
  expect(page.url()).toContain("/admin/login");
});
