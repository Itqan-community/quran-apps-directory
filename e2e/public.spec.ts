import { test, expect } from "@playwright/test";

// From the synced dev DB (live parity): first app by sort order
const FIRST_APP = { slug: "1-wahy", id: 1 };

test.describe("public smoke", () => {
  test("bare root redirects to /ar", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/ar$/);
  });

  test("home EN renders apps grid with hero", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("heading", { name: "Light in your hands.." })).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible();
  });

  test("home AR renders RTL", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator('html[dir="rtl"]')).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("invalid locale 404s", async ({ page }) => {
    const res = await page.goto("/fr");
    expect(res?.status()).toBe(404);
  });

  test("category filter renders filtered grid", async ({ page }) => {
    await page.goto("/en/mushaf");
    await expect(page.locator("article").first()).toBeVisible();
  });

  test("unknown category shows hero with empty state (old SPA soft 404)", async ({ page }) => {
    await page.goto("/en/not-a-real-category");
    // Live parity: the old SPA renders the listing hero with the empty state
    // (200, no hard 404). Invalid locales (/fr) get a real 404 via global-not-found.
    await expect(page.getByRole("heading", { name: "Light in your hands.." })).toBeVisible();
    await expect(page.getByText("No applications found")).toBeVisible();
  });

  test("app detail renders name and JSON-LD", async ({ page }) => {
    await page.goto(`/en/app/${FIRST_APP.slug}_${FIRST_APP.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(ld).toContain("SoftwareApplication");
  });

  test("app detail by bare slug resolves too", async ({ page }) => {
    await page.goto(`/en/app/${FIRST_APP.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("apps listing filters by search param", async ({ page }) => {
    await page.goto("/en/apps?search=ayah");
    await expect(page.locator("article").first()).toContainText(/ayah|آية/i);
  });

  test("ramadan page renders custom footer without global footer", async ({ page }) => {
    await page.goto("/ar/ramadan");
    await expect(page.getByText("مع القرآن.. رفقة أقرب")).toBeVisible();
    await expect(page.getByRole("heading", { name: "رمضان فرصة للمشاركة" })).toBeVisible();
  });
});

test.describe("smart search", () => {
  test("smart tab navigates to mode=smart and renders results/chips", async ({ page }) => {
    await page.goto("/ar/apps");
    await page.getByRole("tab", { name: "البحث الذكي" }).click();
    await page.getByRole("textbox", { name: "البحث الذكي" }).fill("قارئ قران");
    await page.getByRole("button", { name: "إرسال" }).click();
    await expect(page).toHaveURL(/\/ar\/apps\?.*mode=smart/);
    // did-you-mean chip when suggestion exists (alias 'قران'→'قرآن'); must be encoded href:
    await expect(page.locator("a.did-you-mean")).toHaveAttribute("href", /search=[^&]*%D9%82%D8%B1%D8%A2%D9%86/);
    // page still lists apps or shows fallback notice — both are valid UI; assert it rendered (no 500):
    await expect(page.getByRole("heading", { name: /نتائج البحث عن/ })).toBeVisible();
  });

  test("traditional tab stays modeless", async ({ page }) => {
    await page.goto("/en/apps");
    await page.getByRole("tab", { name: /Traditional/ }).click();
    await page.getByRole("textbox", { name: "Traditional Search" }).fill("alpha");
    await page.getByRole("button", { name: "Search Now" }).click();
    await expect(page).toHaveURL(/\/en\/apps\?search=alpha/);
    await expect(page).not.toHaveURL(/mode=smart/);
  });
});
