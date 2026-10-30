import { test, expect } from "@playwright/test";
import { startSlowFlightProxy } from "./helpers/slow-flight-proxy";

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

  test("app detail description expands when Read More is clicked", async ({ page }) => {
    await page.goto(`/en/app/${FIRST_APP.slug}_${FIRST_APP.id}`);

    const description = page.locator(".details-main p").first();
    const readMore = page.getByRole("button", { name: "Read More" });
    await expect(readMore).toBeVisible();

    const collapsedHeight = await description.evaluate((el) => el.getBoundingClientRect().height);
    // The toggle is inert until hydration; retry a no-op early click.
    await expect(async () => {
      await readMore.click();
      await expect(page.getByRole("button", { name: "Read Less" })).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });

    // The expand must not be clipped by an ancestor: the paragraph grows well past
    // its collapsed height and the toggle stays visible below it.
    const expandedHeight = await description.evaluate((el) => el.getBoundingClientRect().height);
    expect(expandedHeight).toBeGreaterThan(collapsedHeight + 50);
  });

  test("apps listing filters by search param", async ({ page }) => {
    await page.goto("/en/apps?search=ayah");
    await expect(page.locator("article").first()).toContainText(/ayah|آية/i);
  });

  test("home sort select reorders the grid and updates the URL", async ({ page }) => {
    await page.goto("/en");
    const sort = page.getByLabel("Sort by");
    await expect(sort).toBeVisible();
    // The select is inert until hydration; retry a no-op early selection.
    await expect(async () => {
      await sort.selectOption("newest");
      await expect(page).toHaveURL(/sort=newest/, { timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
    await expect(page.locator("article").first()).toContainText(/Ten Qira.at Researcher/);
  });

  test("home paginates 20 apps per page", async ({ page }) => {
    await page.goto("/en");
    const cards = page.locator("article:not(.shimmer-card)");
    await expect(cards).toHaveCount(20);
    const pager = page.getByRole("navigation", { name: "Pagination" });
    await pager.getByRole("link", { name: "2", exact: true }).click();
    await expect(page).toHaveURL(/\/en\?page=2$/);
    // Wait for the streamed page-2 content before counting
    await expect(cards.first()).toContainText("Moeen");
    await expect(cards).toHaveCount(20);
  });

  test("home keeps the sort when paginating", async ({ page }) => {
    await page.goto("/en?sort=newest");
    const cards = page.locator("article:not(.shimmer-card)");
    await expect(cards.first()).toContainText(/Ten Qira.at Researcher/);
    await page
      .getByRole("navigation", { name: "Pagination" })
      .getByRole("link", { name: "2", exact: true })
      .click();
    await expect(page).toHaveURL(/sort=newest/);
    await expect(page).toHaveURL(/page=2/);
    await expect(cards.first()).toContainText("Al Quran: Tafsir& by Word");
  });

  test("category filter keeps the sort and the pager", async ({ page }) => {
    await page.goto("/en?sort=newest");
    const cards = page.locator("article:not(.shimmer-card)");
    await expect(cards.first()).toContainText(/Ten Qira.at Researcher/);

    // The dock rail keeps the active ordering across category switches.
    await page
      .getByRole("navigation", { name: "Categories" })
      .getByRole("link", { name: /Mushaf/ })
      .click();
    await expect(page).toHaveURL(/\/en\/mushaf\?sort=newest$/);

    // A cross-route client navigation leaves a hidden PPR static shell inside
    // <main> (pre-existing Next.js 16 artifact), so post-navigation locators are
    // scoped to the visible page. The visible UI must show exactly one dock and
    // one sort control — pin that, then assert the sort value on the visible one.
    await expect(page.locator(".category-dock").filter({ visible: true })).toHaveCount(1);
    const visibleSort = page.getByLabel("Sort by").filter({ visible: true });
    await expect(visibleSort).toHaveCount(1);
    await expect(visibleSort).toHaveValue("newest");

    // The category listing paginates at the same window size as the home grid.
    const pager = page
      .getByRole("navigation", { name: "Pagination" })
      .filter({ visible: true });
    await expect(pager).toBeVisible();
    await pager.getByRole("link", { name: "2", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/mushaf\?sort=newest&page=2$/);
    await expect(
      page.locator("article:not(.shimmer-card)").filter({ visible: true }).first(),
    ).toBeVisible();
  });

  test("dock shows counts and preserves the sort", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en?sort=newest");

    const nav = page.getByRole("navigation", { name: "Categories" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: /^All/ })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await nav.getByRole("link", { name: /Mushaf/ }).click();
    await expect(page).toHaveURL(/\/en\/mushaf\?sort=newest$/);

    // Cross-route client navigation leaves a hidden PPR static shell inside
    // <main> (pre-existing Next.js 16 artifact): scope to the visible page and
    // pin that exactly one sort control is visible.
    const visibleSort = page.getByLabel("Sort by").filter({ visible: true });
    await expect(visibleSort).toHaveCount(1);
    await expect(visibleSort).toHaveValue("newest");
  });

  test("apps search results keep the dock sort", async ({ page }) => {
    await page.goto("/en/apps?search=ayah");
    await expect(page.getByRole("navigation", { name: "Categories" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Search results for/i })).toBeVisible();

    const sort = page.getByLabel("Sort by").filter({ visible: true });
    await expect(sort).toHaveCount(1);
    await expect(sort).toHaveValue("featured");

    // Re-sorting stays on the search results and carries the query over
    // (only the pager's `page` is dropped).
    await sort.selectOption("newest");
    await expect(page).toHaveURL(/\/en\/apps\?search=ayah&sort=newest$/);
    await expect(sort).toHaveValue("newest");
    await expect(page.getByRole("heading", { name: /Search results for/i })).toBeVisible();

    // A new search submitted from the hero keeps the active sort.
    await page.getByRole("textbox", { name: "Traditional Search" }).fill("mushaf");
    await page.getByRole("button", { name: "Search Now" }).click();
    await expect(page).toHaveURL(/\/en\/apps\?search=mushaf&sort=newest$/);
    await expect(page.getByLabel("Sort by").filter({ visible: true })).toHaveValue("newest");
  });

  test("unknown category has no active dock chip", async ({ page }) => {
    await page.goto("/en/not-a-real-category");
    await expect(page.getByRole("navigation", { name: "Categories" })).toBeVisible();
    await expect(page.locator(".dock-pill[aria-current='page']")).toHaveCount(0);
  });

  test("narrow desktop rail scrolls to the last category", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/en");

    const nav = page.getByRole("navigation", { name: "Categories" });
    expect(await nav.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);

    const tools = nav.getByRole("link", { name: /Tools/ });
    await tools.scrollIntoViewIfNeeded();
    await expect(tools).toBeVisible();
  });

  test("dock rail fits all 12 pills at 1440 without scrolling", async ({ page }) => {
    // Spec §5 hard goal: at the 1440 reference width every pill is visible and
    // the rail never scrolls (the inline-end fade is only for narrower widths).
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en");
    // Wait for the streamed listing so the dock is the settled one, not the
    // streaming fallback.
    await expect(page.locator("article:not(.shimmer-card)").first()).toBeVisible();
    await expect(page.locator(".category-dock")).toHaveCount(1);

    const nav = page.getByRole("navigation", { name: "Categories" });
    const fit = await nav.evaluate((rail) => {
      const pills = Array.from(rail.querySelectorAll(".dock-pill"));
      const last = pills[pills.length - 1];
      if (!last) throw new Error("no dock pills rendered");
      const rr = rail.getBoundingClientRect();
      const lr = last.getBoundingClientRect();
      return {
        count: pills.length,
        scrollWidth: rail.scrollWidth,
        clientWidth: rail.clientWidth,
        lastRight: lr.right,
        railRight: rr.right,
      };
    });

    expect(fit.count).toBe(12);
    // The rail must not scroll at 1440.
    expect(fit.scrollWidth).toBeLessThanOrEqual(fit.clientWidth);
    // The last pill clears the rail's 28px trailing pad, i.e. the fade zone.
    expect(fit.lastRight).toBeLessThanOrEqual(fit.railRight - 28);
  });

  test("dock controls show an unclipped keyboard focus ring", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en?sort=newest");

    // The initial load briefly streams the skeleton dock alongside the static
    // shell; wait for the settled page with exactly one dock and one sort control.
    await expect(page.locator(".category-dock")).toHaveCount(1);
    await expect(page.getByLabel("Sort by")).toHaveCount(1);

    // Resolve --primary-color to a computed color for comparison.
    const primary = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "var(--primary-color)";
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });

    // The native select is transparent (opacity: 0), so a ring on it is
    // invisible: the 2px primary ring must render on the visible .dock-sort pill.
    await page.getByLabel("Sort by").focus();
    const sortRing = await page
      .locator(".dock-sort")
      .evaluate((el) => {
        const cs = getComputedStyle(el);
        return { width: cs.outlineWidth, style: cs.outlineStyle, color: cs.outlineColor };
      });
    expect(sortRing.style).toBe("solid");
    expect(sortRing.width).toBe("2px");
    expect(sortRing.color).toBe(primary);

    // The rail is a scroll container (overflow-y: hidden): the focused pill's
    // ring must not be clipped by it — top/bottom and the inline-start edge of
    // the first ("All") pill.
    await page
      .getByRole("navigation", { name: "Categories" })
      .getByRole("link", { name: /^All/ })
      .focus();
    const clip = await page.evaluate(() => {
      const pill = document.querySelector(".dock-rail .dock-pill");
      const rail = document.querySelector(".dock-rail");
      if (!pill || !rail) throw new Error("dock rail or first pill not found");
      const pcs = getComputedStyle(pill);
      const rcs = getComputedStyle(rail);
      const extend = parseFloat(pcs.outlineWidth) + parseFloat(pcs.outlineOffset || "0");
      const pr = pill.getBoundingClientRect();
      const rr = rail.getBoundingClientRect();
      // A scroll container clips at its padding box (border box minus border).
      return {
        style: pcs.outlineStyle,
        outlineTop: pr.top - extend,
        outlineLeft: pr.left - extend,
        railTop: rr.top + parseFloat(rcs.borderTopWidth || "0"),
        railLeft: rr.left + parseFloat(rcs.borderLeftWidth || "0"),
      };
    });
    expect(clip.style).toBe("solid");
    expect(clip.outlineTop).toBeGreaterThanOrEqual(clip.railTop);
    expect(clip.outlineLeft).toBeGreaterThanOrEqual(clip.railLeft);
  });

  test("home AR az sort orders by Arabic name (Arabic letter order)", async ({ page }) => {
    await page.goto("/ar?sort=az");
    // First app in Arabic letter order; EN-name sorting would surface a different app
    await expect(page.locator("article").first().locator("h3.app-name")).toContainText("آمين");
  });

  test("home sort select back to Featured drops the param", async ({ page }) => {
    await page.goto("/en?sort=newest");
    await expect(page.locator("article").first()).toContainText(/Ten Qira.at Researcher/);
    const sort = page.getByLabel("Sort by");
    await expect(async () => {
      await sort.selectOption("featured");
      await expect(page).toHaveURL(/\/en$/, { timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
    // Featured apps lead the curated grid (Wahy is the first featured app)
    await expect(page.locator("article").first()).toContainText("Wahy");
  });

  test("ramadan page renders custom footer without global footer", async ({ page }) => {
    await page.goto("/ar/ramadan");
    await expect(page.getByText("مع القرآن.. رفقة أقرب")).toBeVisible();
    await expect(page.getByRole("heading", { name: "رمضان فرصة للمشاركة" })).toBeVisible();
  });

  test("search palette submits a search", async ({ page }) => {
    await page.goto("/en");
    // Wait for the streamed listing so the dock is the settled one, not the
    // streaming fallback whose open state would be discarded on the swap.
    await expect(page.locator("article:not(.shimmer-card)").first()).toBeVisible();
    const search = page.getByRole("button", { name: "Search apps" });
    const dialog = page.getByRole("dialog", { name: "Search apps" });
    // The dock is inert until hydration; retry a no-op early click.
    await expect(async () => {
      await search.click();
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });

    const input = dialog.getByRole("textbox", { name: "Search apps" });
    await expect(input).toBeFocused();

    await input.fill("ayah");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/en\/apps\?search=ayah/);
  });

  test("search palette supports Smart mode", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("article:not(.shimmer-card)").first()).toBeVisible();
    const search = page.getByRole("button", { name: "Search apps" });
    const dialog = page.getByRole("dialog", { name: "Search apps" });
    await expect(async () => {
      await search.click();
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });

    await dialog.getByRole("button", { name: "Smart Search" }).click();
    await dialog.getByRole("textbox", { name: "Search apps" }).fill("ayah");
    await dialog.getByRole("textbox").press("Enter");
    await expect(page).toHaveURL(/\/en\/apps\?search=ayah&mode=smart/);
  });

  test("search palette closes on Escape and returns focus", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("article:not(.shimmer-card)").first()).toBeVisible();
    const search = page.getByRole("button", { name: "Search apps" });
    const dialog = page.getByRole("dialog", { name: "Search apps" });
    await expect(async () => {
      await search.click();
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(search).toBeFocused();
  });

  test("search palette category shortcut preserves the sort", async ({ page }) => {
    await page.goto("/en?sort=newest");
    await expect(page.locator("article:not(.shimmer-card)").first()).toBeVisible();
    const search = page.getByRole("button", { name: "Search apps" });
    const dialog = page.getByRole("dialog", { name: "Search apps" });
    await expect(async () => {
      await search.click();
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });

    await dialog.getByRole("link", { name: /Mushaf/ }).click();
    await expect(page).toHaveURL(/\/en\/mushaf\?sort=newest$/);

    // Cross-route client navigation leaves a hidden PPR static shell inside
    // <main> (pre-existing Next.js 16 artifact): scope the post-navigation
    // dialog assertion to visible content and pin one visible dock.
    await expect(dialog.filter({ visible: true })).toHaveCount(0);
    await expect(page.locator(".category-dock").filter({ visible: true })).toHaveCount(1);
  });

  test("Ctrl+K opens the search palette", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("article:not(.shimmer-card)").first()).toBeVisible();
    const dialog = page.getByRole("dialog", { name: "Search apps" });
    // The keydown listener attaches on hydration; retry a pre-hydration press.
    await expect(async () => {
      await page.keyboard.press("Control+k");
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
  });

  test("Ctrl+K Escape returns focus to the search button", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("article:not(.shimmer-card)").first()).toBeVisible();
    const search = page.getByRole("button", { name: "Search apps" });
    const dialog = page.getByRole("dialog", { name: "Search apps" });
    // The keydown listener attaches on hydration; retry a pre-hydration press.
    await expect(async () => {
      await page.keyboard.press("Control+k");
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // Nothing was focused before showModal() for a shortcut open, so the
    // browser's own focus restore cannot get here — the dock must.
    await expect(search).toBeFocused();
  });

  test("palette stays open across the streaming fallback swap", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Replay the initial page through a proxy in two parts (fallback shell,
    // then settled content) with a delay in between, so the skeleton window
    // is wide enough to open the palette in.
    const proxy = await startSlowFlightProxy("http://127.0.0.1:3210", 3_000);
    try {
      // Load the initial page itself through the slow proxy. The persistent
      // dock renders with the fallback cards, then the settled listing arrives
      // — the same-page fallback → settled swap spec §4.5 promises to survive.
      // (A category route change is not the target: the dock intentionally
      // closes overlays on route changes.)
      await page.goto(`http://127.0.0.1:${proxy.port}/en`, {
        waitUntil: "commit",
      });

      // Open the palette as soon as the persistent dock is interactive. The
      // page was loaded through the slow proxy, so the listing/count may still
      // be streaming; the dock's hydration is the only gate (the card
      // skeletons can be hidden in the PPR shell). The assertions below then
      // prove the dock (and the overlay) survive the settled content arriving.
      const search = page.getByRole("button", { name: "Search apps" });
      const dialog = page.getByRole("dialog", { name: "Search apps" });
      await expect(async () => {
        await search.click();
        await expect(dialog).toBeVisible({ timeout: 1_000 });
      }).toPass({ timeout: 20_000 });
      await dialog.getByRole("textbox", { name: "Search apps" }).fill("mushaf");

      // The delayed settled content lands on the same page: the fallback
      // swaps to the listing.
      await expect(page).toHaveURL(/\/en$/);
      await expect(
        page.locator("article:not(.shimmer-card)").filter({ visible: true }).first(),
      ).toBeVisible({ timeout: 15_000 });

      // The palette survived the swap: still open, query intact, and the dock
      // is the single persistent one (its count has streamed in). Cross-route
      // client navigation leaves a hidden PPR static shell inside <main>
      // (pre-existing Next.js 16 artifact), so pin one *visible* dock.
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("textbox", { name: "Search apps" })).toHaveValue(
        "mushaf",
      );
      await expect(
        page.locator(".category-dock").filter({ visible: true }),
      ).toHaveCount(1);
    } finally {
      await proxy.close();
    }
  });

  test("palette category link navigation returns focus to the active pill", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en?sort=newest");
    await expect(page.locator("article:not(.shimmer-card)").first()).toBeVisible();
    const search = page.getByRole("button", { name: "Search apps" });
    const dialog = page.getByRole("dialog", { name: "Search apps" });
    await expect(async () => {
      await search.click();
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });

    await dialog.getByRole("link", { name: /Mushaf/ }).click();
    await expect(page).toHaveURL(/\/en\/mushaf\?sort=newest$/);
    await expect(dialog.filter({ visible: true })).toHaveCount(0);

    // Post-navigation focus lands on the active dock pill of the new page,
    // not on <body>.
    const pill = page
      .getByRole("navigation", { name: "Categories" })
      .getByRole("link", { name: /Mushaf/ })
      .filter({ visible: true });
    await expect(pill).toBeFocused();
  });

  test("palette submit returns focus to the results heading", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("article:not(.shimmer-card)").first()).toBeVisible();
    const search = page.getByRole("button", { name: "Search apps" });
    const dialog = page.getByRole("dialog", { name: "Search apps" });
    await expect(async () => {
      await search.click();
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });

    const input = dialog.getByRole("textbox", { name: "Search apps" });
    await input.fill("ayah");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/en\/apps\?search=ayah/);

    // The heading streams in with the results; focus must land on it once it
    // is rendered.
    const heading = page
      .getByRole("heading", { name: /Search results for/ })
      .filter({ visible: true });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
  });

  test("Arabic dock and search are RTL-usable", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/ar");
    await expect(page.locator("html[dir='rtl']")).toHaveCount(1);

    const nav = page.getByRole("navigation", { name: "التصنيفات" });
    await expect(nav).toBeVisible();
    expect(await nav.evaluate((el) => getComputedStyle(el).direction)).toBe("rtl");

    // RTL: the rail flows right-to-left, so the first pill (All) sits to the
    // right of the last one — its `left` edge is further along the viewport.
    const lefts = await nav.locator(".dock-pill").evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().left),
    );
    expect(lefts[0]).toBeGreaterThan(lefts[lefts.length - 1]);

    await nav.getByRole("link", { name: /مصحف/ }).click();
    await expect(page).toHaveURL(/\/ar\/mushaf$/);

    // Cross-route client navigation leaves a hidden PPR static shell inside
    // <main> (pre-existing Next.js 16 artifact): scope the post-navigation
    // locators to visible content and pin that exactly one dock is visible.
    await expect(page.locator(".category-dock").filter({ visible: true })).toHaveCount(1);
    // Wait for the streamed listing so the dock is the settled one, not the
    // streaming fallback whose open state would be discarded on the swap.
    await expect(page.locator("article:not(.shimmer-card)").first()).toBeVisible();

    const search = page
      .getByRole("button", { name: "ابحث عن التطبيقات" })
      .filter({ visible: true });
    const dialog = page
      .getByRole("dialog", { name: "ابحث عن التطبيقات" })
      .filter({ visible: true });
    // The dock is inert until hydration; retry a no-op early click.
    await expect(async () => {
      await search.click();
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
    await expect(dialog.getByRole("textbox", { name: "ابحث عن التطبيقات" })).toBeVisible();
  });
});

test.describe("mobile category sheet", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens, lists all categories and navigates", async ({ page }) => {
    await page.goto("/en");
    // Wait for the streamed listing so the dock is the settled one, not the
    // streaming fallback whose open state would be discarded on the swap.
    await expect(page.locator("article:not(.shimmer-card)").first()).toBeVisible();

    const trigger = page.getByRole("button", { name: /All apps/ });

    // Take the overlay's scroll offset right after focus moves into the sheet.
    // `showModal()` focuses the first focusable descendant (the close button)
    // while the panel is still translated a full panel-height below the fold.
    // If the overlay is a scroll container (e.g. `overflow: hidden`, which is
    // still scrollable programmatically) the UA's initial focus scroll moves it
    // by exactly that offset, pinning the panel in place: the sheet pops open
    // instead of sliding up. The overlay must therefore not scroll at all.
    await page.evaluate(() => {
      const dialog = document.getElementById("category-sheet")!;
      (window as unknown as { __sheetScrollAtFocus: Promise<number> }).__sheetScrollAtFocus =
        new Promise<number>((resolve) => {
          document.addEventListener(
            "focusin",
            (e) => {
              if (!dialog.contains(e.target as Node)) return;
              setTimeout(() => resolve(dialog.scrollTop), 0);
            },
            { capture: true },
          );
        });
    });

    await trigger.click();

    const sheet = page.getByRole("dialog", { name: "Browse categories" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link")).toHaveCount(12);

    const scrollAtFocus = await page.evaluate(
      () =>
        (window as unknown as { __sheetScrollAtFocus: Promise<number> })
          .__sheetScrollAtFocus,
    );
    expect(scrollAtFocus, "focusing the sheet must not scroll its overlay").toBe(0);

    // The sheet must be full-bleed: the panel spans the full viewport width
    // and reaches the bottom edge. Visibility/count assertions cannot catch
    // the UA's `dialog:modal` max-size cap (it leaves a dimmed strip below
    // and beside the panel), so pin the geometry explicitly — once the entry
    // transform has settled (the panel slides up from below the viewport, and
    // `toBeVisible` already holds while it is still off-screen).
    await page.waitForFunction(() => {
      const panel = document.querySelector(".m-sheet-panel");
      if (!panel) return false;
      const transform = getComputedStyle(panel).transform;
      return transform === "none" || transform === "matrix(1, 0, 0, 1, 0, 0)";
    });

    const geometry = await page.evaluate(() => {
      const panel = document.querySelector(".m-sheet-panel");
      if (!panel) return null;
      const rect = panel.getBoundingClientRect();
      return {
        left: rect.left,
        width: rect.width,
        bottom: rect.bottom,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      };
    });
    expect(geometry, "sheet panel must exist").not.toBeNull();
    expect(geometry!.left).toBeCloseTo(0, 0);
    expect(geometry!.width).toBeCloseTo(geometry!.innerWidth, 0);
    expect(geometry!.bottom).toBeCloseTo(geometry!.innerHeight, 0);

    await sheet.getByRole("link", { name: /Mushaf/ }).click();
    await expect(page).toHaveURL(/\/en\/mushaf$/);

    // Cross-route client navigation leaves a hidden PPR static shell inside
    // <main> (pre-existing Next.js 16 artifact): scope the sheet assertion to
    // visible content and pin that exactly one dock is visible afterwards.
    await expect(sheet.filter({ visible: true })).toHaveCount(0);
    await expect(page.locator(".category-dock").filter({ visible: true })).toHaveCount(1);
  });

  test("closes on Escape and returns focus", async ({ page }) => {
    await page.goto("/en");
    // Wait for the streamed listing so the dock is the settled one, not the
    // streaming fallback whose open state would be discarded on the swap.
    await expect(page.locator("article:not(.shimmer-card)").first()).toBeVisible();

    const trigger = page.getByRole("button", { name: /All apps/ });
    await trigger.click();

    const sheet = page.getByRole("dialog", { name: "Browse categories" });
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("sheet link navigation returns focus to the category trigger", async ({
    page,
  }) => {
    await page.goto("/en");
    await expect(page.locator("article:not(.shimmer-card)").first()).toBeVisible();

    const trigger = page.getByRole("button", { name: /All apps/ });
    await trigger.click();
    const sheet = page.getByRole("dialog", { name: "Browse categories" });
    await expect(sheet).toBeVisible();

    await sheet.getByRole("link", { name: /Mushaf/ }).click();
    await expect(page).toHaveURL(/\/en\/mushaf$/);
    await expect(sheet.filter({ visible: true })).toHaveCount(0);

    // Post-navigation focus lands on the (now active) category trigger of the
    // new page, not on <body>.
    const activeTrigger = page.getByRole("button", { name: /Mushaf/ }).filter({ visible: true });
    await expect(activeTrigger).toBeFocused();
  });

  test("mobile controls meet the 44px tap-target minimum", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("article:not(.shimmer-card)").first()).toBeVisible();

    const minHeight = (locator: ReturnType<typeof page.locator>) =>
      locator.evaluate((el) => parseFloat(getComputedStyle(el).height));

    // Dock sort pill (mobile).
    expect(await minHeight(page.locator(".dock-sort"))).toBeGreaterThanOrEqual(44);

    // Sheet close button.
    const trigger = page.getByRole("button", { name: /All apps/ });
    await trigger.click();
    const sheet = page.getByRole("dialog", { name: "Browse categories" });
    await expect(sheet).toBeVisible();
    expect(
      await minHeight(sheet.locator(".m-sheet-close")),
    ).toBeGreaterThanOrEqual(44);
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    // Palette close, mode buttons and suggestion chips (full-screen on mobile).
    const search = page.getByRole("button", { name: "Search apps" });
    await search.click();
    const dialog = page.getByRole("dialog", { name: "Search apps" });
    await expect(dialog).toBeVisible();
    expect(await minHeight(dialog.locator(".sp-close"))).toBeGreaterThanOrEqual(44);
    expect(
      await minHeight(dialog.locator(".sp-mode-btn").first()),
    ).toBeGreaterThanOrEqual(44);
    expect(
      await minHeight(dialog.locator(".sp-suggest-btn").first()),
    ).toBeGreaterThanOrEqual(44);
  });
});

test.describe("mobile search", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens full-screen with all categories", async ({ page }) => {
    await page.goto("/en");
    // Wait for the streamed listing so the dock is the settled one, not the
    // streaming fallback whose open state would be discarded on the swap.
    await expect(page.locator("article:not(.shimmer-card)").first()).toBeVisible();
    const search = page.getByRole("button", { name: "Search apps" });
    const dialog = page.getByRole("dialog", { name: "Search apps" });
    // The dock is inert until hydration; retry a no-op early click.
    await expect(async () => {
      await search.click();
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });

    await expect(dialog.getByRole("textbox", { name: "Search apps" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close search" })).toBeVisible();
    await expect(dialog.getByRole("link")).toHaveCount(11);

    const box = await dialog.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(390);
  });

  test("Ctrl+K Escape returns focus to the search button", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("article:not(.shimmer-card)").first()).toBeVisible();
    const search = page.getByRole("button", { name: "Search apps" });
    const dialog = page.getByRole("dialog", { name: "Search apps" });
    // The keydown listener attaches on hydration; retry a pre-hydration press.
    await expect(async () => {
      await page.keyboard.press("Control+k");
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // The visible trigger is the mobile button here; the desktop one is
    // display:none and can never take focus.
    await expect(search).toBeFocused();
  });
});

test.describe("track submission", () => {
  test("email tab switches the form field", async ({ page }) => {
    await page.goto("/en/track-submission");
    await expect(page.locator('input[name="id"]')).toBeVisible();

    await page.getByRole("link", { name: "By Email" }).click();
    await expect(page).toHaveURL(/\/en\/track-submission\?email=/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="id"]')).toHaveCount(0);

    await page.getByRole("link", { name: "By Tracking ID" }).click();
    await expect(page.locator('input[name="id"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toHaveCount(0);
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
    // Smart search keeps the dock's sort too (it re-orders the matched set).
    await expect(page.locator(".dock-sort").filter({ visible: true })).toHaveCount(1);
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

test.describe("compact header", () => {
  test("compact header keeps search but drops category chips", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en");
    await page.mouse.wheel(0, 1200);

    await expect(page.locator("#site-header")).toHaveAttribute(
      "data-header-compact",
      "true",
    );
    await expect(page.locator(".compact-category-chip")).toHaveCount(0);
    await expect(page.locator(".compact-search-input")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Categories" })).toBeVisible();
  });
});
