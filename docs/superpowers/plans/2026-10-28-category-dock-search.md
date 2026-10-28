# Category Dock + Spotlight Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hero category pills and detached sort toolbar with a sticky floating category dock and a launcher-only Spotlight search, preserving `?sort=` and the existing search behavior.

**Architecture:** A client `CategoryDock` — rendered by the streaming `ListingResults` and its skeleton — owns the category rail, sort, mobile category sheet and search-palette state. A separate `SearchPalette` native dialog navigates into the existing `/apps?search=…` flow. URL helpers keep category, sort and search links consistent. Server components keep fetching data; the dock is the only new client boundary.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl, TypeScript, CSS in `src/app/globals.css`, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-28-category-dock-search-design.md`

## Global Constraints

- No new dependencies. No database, schema or public API changes. Search is a launcher only.
- Preserve the `c308410` URL contract: category links carry `?sort=`; sort routes to the current `basePath` and drops the page; changing category resets the page.
- `showSort` controls the sort control; `/apps` must not render it. Home and category pages must.
- `AppsListing`, `ListingResults` and `ListingCardsSkeleton` stay server components. Only `CategoryDock`, `CategorySheet`, `SearchPalette` and `SortSelect` are client components.
- All user-facing strings go through `appList` in `src/i18n/en.json` and `src/i18n/ar.json`. No hardcoded visible copy.
- Support `.dark`, `html[dir="rtl"]`, keyboard focus and `prefers-reduced-motion`.
- Mobile tap targets are at least 44px; focus rings are visible.
- The dock and both dialogs must work at 1440, 1024 and 390px, in English and Arabic.
- The Playwright config builds the app and serves it on `:3210`; the development DB must be seeded and reachable. The first e2e run can take several minutes.
- Do not commit `.superpowers/` or `/tmp` mockups. The approved reference images are committed under `docs/superpowers/specs/assets/`.
- Use conventional commits in the task steps.

## Review Focus

1. **Desktop 1024–1280:** the 12-chip rail overflows; the inline-end fade must hint at more, and the last category must be scrollable into view. Task 2’s 1024px e2e pins this.
2. **Arabic RTL:** rail order, inline-end fade, dividers, sheet grid, palette alignment and sort chevron must mirror. Task 6’s `/ar` e2e pins this.
3. **Unknown category:** no chip is active, the mobile trigger falls back to “All apps”, the count is 0 and the page still renders. Task 2’s e2e pins this.
4. **Streaming `count={null}`:** the fallback must never render `null`, `NaN` or a false `0`; it shows a fixed-width shimmer while links, sheet and palette remain interactive. Task 1’s `formatAppCount` test and Task 2’s null branch pin this.
5. **Dialog and route changes:** opening a category from the palette or the sheet must close the overlay, unlock body scroll and return focus; Escape must do the same. Task 3 and Task 4 e2e pin this.

---

## File Structure

**Create**

- `src/lib/listing-links.ts` — `sortQuery`, `categoryHref`, `searchHref`.
- `src/lib/listing-format.ts` — `formatAppCount`.
- `src/components/apps/category-dock.tsx` — dock shell, chip rail, search button, mobile trigger, dialog state.
- `src/components/apps/category-sheet.tsx` — mobile bottom-sheet dialog.
- `src/components/apps/search-palette.tsx` — Spotlight launcher dialog.
- `tests/listing-links.test.ts`
- `tests/listing-format.test.ts`

**Modify**

- `src/components/apps/sort-select.tsx` — sort pill with a transparent native select.
- `src/components/apps/apps-listing.tsx` — remove hero chips; pass categories to results and fallback.
- `src/components/apps/listing-skeleton.tsx` — render the dock with `count={null}` above the cards.
- `src/components/site/compact-search.tsx` — remove category chips and dropdown.
- `src/components/site/site-header.tsx` — remove the categories fetch.
- `src/app/globals.css` — dock/sheet/palette styles; remove old chip/toolbar/sort styles.
- `src/i18n/en.json`, `src/i18n/ar.json` — new labels.
- `e2e/public.spec.ts` — updated selectors and new coverage.

---

### Task 1: URL and count helpers

**Files:**
- Create: `src/lib/listing-links.ts`
- Create: `src/lib/listing-format.ts`
- Test: `tests/listing-links.test.ts`
- Test: `tests/listing-format.test.ts`

**Interfaces:**
- Produces: `sortQuery(sort?: string): string`
- Produces: `categoryHref(lang: Locale, slug?: string | null, sort?: string): string`
- Produces: `searchHref(lang: Locale, query: string, mode?: "traditional" | "smart"): string`
- Produces: `formatAppCount(count: number | null | undefined): string | null`

- [ ] **Step 1: Write the failing helper tests**

Create `tests/listing-links.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { categoryHref, searchHref, sortQuery } from "@/lib/listing-links";

describe("listing link helpers", () => {
  it("omits the featured sort", () => {
    expect(sortQuery("featured")).toBe("");
    expect(sortQuery()).toBe("");
  });

  it("keeps and encodes a non-default sort", () => {
    expect(sortQuery("newest")).toBe("?sort=newest");
    expect(sortQuery("a b")).toBe("?sort=a%20b");
  });

  it("builds category and all links with the sort", () => {
    expect(categoryHref("en", "mushaf", "newest")).toBe("/en/mushaf?sort=newest");
    expect(categoryHref("ar", undefined, "newest")).toBe("/ar?sort=newest");
    expect(categoryHref("en", "mushaf", "featured")).toBe("/en/mushaf");
  });

  it("builds traditional and smart search links", () => {
    expect(searchHref("en", "ayah")).toBe("/en/apps?search=ayah");
    expect(searchHref("en", "  ayah  ", "smart")).toBe("/en/apps?search=ayah&mode=smart");
    expect(searchHref("ar", "تجويد", "smart")).toBe(
      "/ar/apps?search=%D8%AA%D8%AC%D9%88%D9%8A%D8%AF&mode=smart",
    );
    expect(searchHref("en", "   ")).toBe("/en/apps");
  });
});
```

Create `tests/listing-format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatAppCount } from "@/lib/listing-format";

describe("formatAppCount", () => {
  it("formats finite counts", () => {
    expect(formatAppCount(0)).toBe("0");
    expect(formatAppCount(123)).toBe("123");
  });

  it("returns null for unknown or invalid counts", () => {
    expect(formatAppCount(null)).toBeNull();
    expect(formatAppCount(undefined)).toBeNull();
    expect(formatAppCount(Number.NaN)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/listing-links.test.ts tests/listing-format.test.ts`

Expected: FAIL because `@/lib/listing-links` and `@/lib/listing-format` do not exist.

- [ ] **Step 3: Implement the helpers**

`src/lib/listing-links.ts`:

```ts
import type { Locale } from "@/lib/i18n";

export function sortQuery(sort?: string): string {
  return sort && sort !== "featured" ? `?sort=${encodeURIComponent(sort)}` : "";
}

export function categoryHref(
  lang: Locale,
  slug?: string | null,
  sort?: string,
): string {
  const base = slug ? `/${lang}/${slug}` : `/${lang}`;
  return `${base}${sortQuery(sort)}`;
}

export function searchHref(
  lang: Locale,
  query: string,
  mode: "traditional" | "smart" = "traditional",
): string {
  const q = query.trim();
  if (!q) return `/${lang}/apps`;
  const modeQuery = mode === "smart" ? "&mode=smart" : "";
  return `/${lang}/apps?search=${encodeURIComponent(q)}${modeQuery}`;
}
```

`src/lib/listing-format.ts`:

```ts
export function formatAppCount(
  count: number | null | undefined,
): string | null {
  if (count == null || !Number.isFinite(count)) return null;
  return String(count);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/listing-links.test.ts tests/listing-format.test.ts`

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/listing-links.ts src/lib/listing-format.ts tests/listing-links.test.ts tests/listing-format.test.ts
git commit -m "feat(listings): add listing link and count helpers"
```

---

### Task 2: Dock shell, chip rail, sort, integration and streaming fallback

**Files:**
- Create: `src/components/apps/category-dock.tsx`
- Modify: `src/components/apps/sort-select.tsx`
- Modify: `src/components/apps/apps-listing.tsx`
- Modify: `src/components/apps/listing-skeleton.tsx`
- Modify: `src/app/globals.css`
- Test: `e2e/public.spec.ts`

**Interfaces:**
- Consumes: `sortQuery`, `categoryHref`, `formatAppCount` from Task 1.
- Produces: `CategoryDock({ lang, categories, selectedCategory, sort, showSort, basePath, count }: CategoryDockProps): React.ReactElement`

```ts
type CategoryDockProps = {
  lang: Locale;
  categories: CategoryItem[];
  selectedCategory?: string;
  sort?: string;
  showSort?: boolean;
  basePath?: string;
  count: number | null;
};
```

- Produces: `ListingCardsSkeleton({ lang, categories, selectedCategory, sort, showSort, basePath })`.
- `SortSelect` keeps its existing props: `{ lang, value, basePath }`.

- [ ] **Step 1: Write the failing dock e2e coverage**

In `e2e/public.spec.ts`, update the existing `category filter keeps the sort and the pager` test to click the dock instead of `.categories-chips`:

```ts
await page
  .getByRole("navigation", { name: "Categories" })
  .getByRole("link", { name: /Mushaf/ })
  .click();
```

Add these tests inside the existing `public smoke` describe:

```ts
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
  await expect(page.getByLabel("Sort by")).toHaveValue("newest");
});

test("apps search results use the dock without sort", async ({ page }) => {
  await page.goto("/en/apps?search=ayah");
  await expect(page.getByRole("navigation", { name: "Categories" })).toBeVisible();
  await expect(page.getByLabel("Sort by")).toHaveCount(0);
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
```

- [ ] **Step 2: Run the e2e tests to verify they fail**

Run: `npx playwright test e2e/public.spec.ts -g "dock|apps search results|unknown category|narrow desktop"`

Expected: FAIL because the dock does not exist and the old `.categories-chips` selector no longer matches.

- [ ] **Step 3: Rewrite `SortSelect` as the dock sort pill**

In `src/components/apps/sort-select.tsx`, keep `SORT_OPTIONS`, `useRouter`, `useTranslations`, `basePath` and the `onChange` route behavior. Replace the markup with a pill:

```tsx
return (
  <div className="dock-sort">
    <SortIcon />
    <span className="dock-sort-value">{t(value)}</span>
    <Chevron />
    <select
      className="dock-sort-native"
      aria-label={t("label")}
      value={value}
      onChange={onChange}
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {t(opt)}
        </option>
      ))}
    </select>
  </div>
);
```

The native select is `position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%`. Do not use `display: none`; Playwright’s `getByLabel("Sort by")` and `selectOption` must keep working.

Coerce an unknown `value` to `featured` before calling `t(value)` and before passing it to the select; `?sort=` is user-controlled URL input and an unknown key would otherwise throw in next-intl.

- [ ] **Step 4: Implement the `CategoryDock` desktop shell**

In `src/components/apps/category-dock.tsx`, implement:

```tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";
import type { CategoryItem } from "@/lib/repo/categories";
import { categoryHref } from "@/lib/listing-links";
import { formatAppCount } from "@/lib/listing-format";
import { SortSelect } from "./sort-select";

export type CategoryDockProps = {
  lang: Locale;
  categories: CategoryItem[];
  selectedCategory?: string;
  sort?: string;
  showSort?: boolean;
  basePath?: string;
  count: number | null;
};

export function CategoryDock({
  lang,
  categories,
  selectedCategory,
  sort,
  showSort,
  basePath,
  count,
}: CategoryDockProps) {
  const t = useTranslations("appList");
  const allActive = selectedCategory === undefined;
  const activeSlug = categories.some((c) => c.slug === selectedCategory)
    ? selectedCategory
    : undefined;
  const allCount = allActive ? formatAppCount(count) : null;
  const totalText = formatAppCount(count);

  return (
    <div className="category-dock-shell">
      <div className="category-dock">
        <nav className="dock-rail" aria-label={t("categories.title")}>
          <Link
            href={categoryHref(lang, undefined, sort)}
            scroll={false}
            className={`dock-pill ${allActive ? "active" : ""}`}
            aria-current={allActive ? "page" : undefined}
          >
            <span>{t("categories.all")}</span>
            {allActive &&
              (allCount ? (
                <span className="dock-num">{allCount}</span>
              ) : (
                <span className="dock-num dock-num--shimmer" aria-hidden />
              ))}
          </Link>

          {categories.map((category) => {
            const isActive = activeSlug === category.slug;
            return (
              <Link
                key={category.id}
                href={categoryHref(lang, category.slug, sort)}
                scroll={false}
                className={`dock-pill ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span>{lang === "ar" ? category.nameAr : category.nameEn}</span>
                <span className="dock-num">{category.appCount}</span>
              </Link>
            );
          })}
        </nav>

        <div className="dock-actions">
          <span className="dock-count">
            {totalText ? (
              `${totalText} ${t(count === 1 ? "sort.app" : "sort.apps")}`
            ) : (
              <span className="dock-shimmer dock-shimmer--count" aria-hidden />
            )}
          </span>
          {showSort && (
            <SortSelect lang={lang} value={sort ?? "featured"} basePath={basePath} />
          )}
        </div>
      </div>
    </div>
  );
}
```

The mobile trigger and search button are added in Tasks 3 and 4; this task’s dock is the desktop rail and utility zone.

- [ ] **Step 5: Integrate the dock and remove the hero chips**

`src/components/apps/apps-listing.tsx`:

- Remove the `CategoryIcon` and `SortSelect` imports and the `sortQuery` variable.
- Delete the `categories-chips-wrapper` / `categories-chips` block from the hero.
- Remove the now-unused `GRID_ICON` constant at the bottom of the file.
- Pass `categories={categories}` to `ListingResults`.
- Change the fallback to:

```tsx
<Suspense
  fallback={
    <ListingCardsSkeleton
      lang={lang}
      categories={categories}
      selectedCategory={selectedCategory}
      sort={sort}
      showSort={showSort}
      basePath={basePath}
    />
  }
>
```

`ListingResults`:

- Add `categories: CategoryItem[]` to the props type and destructuring.
- Render `<CategoryDock ... />` immediately before `<div className="main-content">`, outside it:

```tsx
return (
  <>
    <CategoryDock
      lang={lang}
      categories={categories}
      selectedCategory={selectedCategory}
      sort={sort}
      showSort={showSort}
      basePath={basePath}
      count={count}
    />
    <div className="main-content">
      {/* search header, notices, grid, pagination */}
    </div>
  </>
);
```

- Remove the `.listing-toolbar` block entirely.
- Keep the search-results header, did-you-mean link, smart fallback notice, `NoResults`, grid and pagination.

`src/components/apps/listing-skeleton.tsx`:

- Accept the props above.
- Render `<CategoryDock ... count={null} />` above the card grid.
- Keep the card grid inside `<div className="main-content" aria-hidden="true">`.

- [ ] **Step 6: Add the dock and chip CSS**

In `src/app/globals.css`, add the dock rules from spec §4.1 and §5. Use these class names:

- `.category-dock-shell` — sticky, `top: 98px`, `z-index: 40`, `max-width: 1392px`, `margin: -34px auto 0`, `padding: 0 16px`.
- `.category-dock` — glass surface, `height: 72px`, `border-radius: 20px`, `display: flex`, `align-items: center`, `gap: 8px`, `padding: 0 14px 0 12px`.
- `.dock-rail` — flex 1, horizontal scroll, hidden scrollbar, inline-end mask fade, `gap: 2px`.
- `.dock-pill` — 38px pill, 13px/500, warm chip surface, inset hairline, active brown fill.
- `.dock-num` — 18px white counter capsule, 9.5px/600 tabular; active translucent white.
- `.dock-actions` — flex, utility count and sort; hairline before the zone.
- `.dock-count` — 11.5px muted, tabular.
- `.dock-sort` — 38px white pill with sort glyph, value, chevron; `position: relative`.
- `.dock-sort-native` — absolute inset 0, opacity 0, full size.
- `.dock-shimmer` — fixed-width shimmer blocks for the count and All badge.

Remove the old `.categories-chips-wrapper`, `.categories-chips`, `.category-chip`, `.listing-toolbar`, `.listing-toolbar-count`, `.sort-select-wrap`, `.sort-select-label` and `.sort-select` rules. Keep `.chip-icon`; it is still used by the About page.

Add a `@media (max-width: 900px)` block that keeps the rail scrollable and sets the dock height to 64px; Task 3 replaces the rail with the trigger and sheet.

- [ ] **Step 7: Run the e2e tests to verify they pass**

Run: `npx playwright test e2e/public.spec.ts -g "dock|apps search results|unknown category|narrow desktop|category filter keeps"`

Expected: PASS.

- [ ] **Step 8: Run lint and the helper tests**

Run: `npm run lint && npx vitest run tests/listing-links.test.ts tests/listing-format.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/apps/category-dock.tsx src/components/apps/sort-select.tsx \
  src/components/apps/apps-listing.tsx src/components/apps/listing-skeleton.tsx \
  src/app/globals.css e2e/public.spec.ts
git commit -m "feat(listings): add floating category dock"
```

---

### Task 3: Mobile trigger and category sheet

**Files:**
- Create: `src/components/apps/category-sheet.tsx`
- Modify: `src/components/apps/category-dock.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/i18n/en.json`, `src/i18n/ar.json`
- Test: `e2e/public.spec.ts`

**Interfaces:**
- Produces: `CategorySheet({ open, onClose, lang, categories, selectedCategory, sort, count }: CategorySheetProps): React.ReactElement | null`

```ts
type CategorySheetProps = {
  open: boolean;
  onClose: () => void;
  lang: Locale;
  categories: CategoryItem[];
  selectedCategory?: string;
  sort?: string;
  count: number | null;
};
```

- `CategoryDock` gains a trigger ref and `sheetOpen` state; it renders `<CategorySheet open={sheetOpen} onClose={closeSheet} ... />`.

- [ ] **Step 1: Write the failing mobile sheet e2e tests**

Add a nested describe to `e2e/public.spec.ts`:

```ts
test.describe("mobile category sheet", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens, lists all categories and navigates", async ({ page }) => {
    await page.goto("/en");

    const trigger = page.getByRole("button", { name: /All apps/ });
    await trigger.click();

    const sheet = page.getByRole("dialog", { name: "Browse categories" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link")).toHaveCount(12);

    await sheet.getByRole("link", { name: /Mushaf/ }).click();
    await expect(page).toHaveURL(/\/en\/mushaf$/);
    await expect(sheet).not.toBeVisible();
  });

  test("closes on Escape and returns focus", async ({ page }) => {
    await page.goto("/en");
    const trigger = page.getByRole("button", { name: /All apps/ });
    await trigger.click();

    const sheet = page.getByRole("dialog", { name: "Browse categories" });
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx playwright test e2e/public.spec.ts -g "mobile category sheet"`

Expected: FAIL because the mobile trigger and sheet do not exist.

- [ ] **Step 3: Add the i18n keys**

Add to `appList.categories` in both files:

```json
"allApps": "All apps",
"browse": "Browse categories",
"allCategories": "All categories",
"count": "{count} categories",
"close": "Close categories"
```

Arabic:

```json
"allApps": "كل التطبيقات",
"browse": "تصفح التصنيفات",
"allCategories": "جميع التصنيفات",
"count": "{count} تصنيفاً",
"close": "إغلاق التصنيفات"
```

- [ ] **Step 4: Implement `CategorySheet`**

Create `src/components/apps/category-sheet.tsx` as a client component. Render the
`<dialog id="category-sheet">` **always** (do not return `null` when closed), so
the trigger’s `aria-controls` always resolves and the closed dialog is hidden by
the user agent. Use a `useEffect` keyed on `open`:

- When `open` is true: `if (!dialog.open) dialog.showModal()`; set
  `document.body.style.overflow = "hidden"`; move focus into the sheet.
- When `open` becomes false or the component unmounts: `dialog.close()` if open
  and restore `document.body.style.overflow`.
- Never put the body-scroll cleanup only in a mount-only effect; the dialog
  stays mounted across open/close.
- `onCancel` prevents the default and calls `onClose`.
- A click whose target is the dialog itself calls `onClose` (backdrop).
- The panel contains the handle, header, close button and a 3-column grid of 12 links.
- The All tile count is shown only when `selectedCategory` is undefined; category tiles use `appCount`.
- Active tile: brown fill, white text, `aria-current="page"`.
- Category links use `categoryHref(lang, slug, sort)` and call `onClose` on click.

- [ ] **Step 5: Wire the mobile trigger in `CategoryDock`**

- Add `const [sheetOpen, setSheetOpen] = useState(false)` and `const triggerRef = useRef<HTMLButtonElement>(null)`.
- `closeSheet()` sets false and focuses `triggerRef`.
- Add `const pathname = usePathname()` and an effect that closes the sheet when
  the pathname changes, so a category link, browser back or any other route
  change cannot leave the sheet open.
- Derive the active category and trigger count:

```tsx
const activeCategory = categories.find((c) => c.slug === activeSlug);
const triggerCount = activeCategory
  ? formatAppCount(activeCategory.appCount)
  : allActive
    ? formatAppCount(count)
    : null;
```

- Pass `id="category-sheet"` to the sheet dialog.
- Render a `.m-cat` button visible at ≤900px:

```tsx
<button
  ref={triggerRef}
  type="button"
  className="m-cat"
  onClick={() => setSheetOpen(true)}
  aria-haspopup="dialog"
  aria-expanded={sheetOpen}
  aria-controls="category-sheet"
>
  <span className="m-cat-label">
    {activeCategory
      ? lang === "ar"
        ? activeCategory.nameAr
        : activeCategory.nameEn
      : t("categories.allApps")}
  </span>
  {triggerCount ? (
    <span className="m-cat-count">{triggerCount}</span>
  ) : activeCategory || allActive ? (
    <span className="m-cat-count m-cat-count--shimmer" aria-hidden />
  ) : null}
  <Chevron />
</button>
```

- The trigger count is the active category’s `appCount` when a category is active; the result count when All is active; nothing for an unknown category.
- Render the sort pill when `showSort`.
- The `CategorySheet` gets `id="category-sheet"` on its dialog.

- [ ] **Step 6: Add the mobile sheet CSS**

At ≤900px:

- Hide `.dock-rail` and the desktop count; show `.m-cat`.
- Dock height 64px, radius 18px, padding 0 8px.
- `.m-cat` 44px, warm surface, label + count capsule + chevron; flex 1.
- `dialog.m-sheet`: fixed bottom, full width, 24px top radius, sheet surface, safe-area padding, `::backdrop` dim + blur.
- Grid: 3 columns, 52px tiles, active brown, 12px names, 10px counts.
- The sheet must sit above the fixed header (native dialog top layer).

- [ ] **Step 7: Run the mobile tests to verify they pass**

Run: `npx playwright test e2e/public.spec.ts -g "mobile category sheet"`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/apps/category-sheet.tsx src/components/apps/category-dock.tsx \
  src/app/globals.css src/i18n/en.json src/i18n/ar.json e2e/public.spec.ts
git commit -m "feat(listings): add mobile category sheet"
```

---

### Task 4: Search button and Spotlight palette

**Files:**
- Create: `src/components/apps/search-palette.tsx`
- Modify: `src/components/apps/category-dock.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/i18n/en.json`, `src/i18n/ar.json`
- Test: `e2e/public.spec.ts`

**Interfaces:**
- Produces: `SearchPalette({ open, onClose, lang, categories, sort }: SearchPaletteProps): React.ReactElement | null`

```ts
type SearchPaletteProps = {
  open: boolean;
  onClose: () => void;
  lang: Locale;
  categories: CategoryItem[];
  sort?: string;
};
```

- `CategoryDock` gains `searchOpen`, `searchButtonRef` and a `closeSearch` handler.

- [ ] **Step 1: Write the failing palette e2e tests**

Add:

```ts
test("search palette submits a search", async ({ page }) => {
  await page.goto("/en");
  const search = page.getByRole("button", { name: "Search apps" });
  await search.click();

  const dialog = page.getByRole("dialog", { name: "Search apps" });
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole("textbox", { name: "Search apps" });
  await expect(input).toBeFocused();

  await input.fill("ayah");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/en\/apps\?search=ayah/);
});

test("search palette supports Smart mode", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Search apps" }).click();
  const dialog = page.getByRole("dialog", { name: "Search apps" });

  await dialog.getByRole("button", { name: "Smart Search" }).click();
  await dialog.getByRole("textbox", { name: "Search apps" }).fill("ayah");
  await dialog.getByRole("textbox").press("Enter");
  await expect(page).toHaveURL(/\/en\/apps\?search=ayah&mode=smart/);
});

test("search palette closes on Escape and returns focus", async ({ page }) => {
  await page.goto("/en");
  const search = page.getByRole("button", { name: "Search apps" });
  await search.click();

  const dialog = page.getByRole("dialog", { name: "Search apps" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(search).toBeFocused();
});

test("search palette category shortcut preserves the sort", async ({ page }) => {
  await page.goto("/en?sort=newest");
  await page.getByRole("button", { name: "Search apps" }).click();

  const dialog = page.getByRole("dialog", { name: "Search apps" });
  await dialog.getByRole("link", { name: /Mushaf/ }).click();
  await expect(page).toHaveURL(/\/en\/mushaf\?sort=newest$/);
  await expect(dialog).toBeHidden();
});

test("Ctrl+K opens the search palette", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: "Search apps" })).toBeVisible();
});
```

Add a mobile test:

```ts
test.describe("mobile search", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens full-screen with all categories", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "Search apps" }).click();

    const dialog = page.getByRole("dialog", { name: "Search apps" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Search apps" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close search" })).toBeVisible();
    await expect(dialog.getByRole("link")).toHaveCount(11);

    const box = await dialog.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(390);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx playwright test e2e/public.spec.ts -g "search palette|Ctrl\+K|mobile search"`

Expected: FAIL because the search button and palette do not exist.

- [ ] **Step 3: Add the search i18n keys**

Add to `appList.search`:

```json
"paletteAria": "Search apps",
"palettePlaceholder": "Search apps, categories…",
"mode": "Search mode",
"try": "Try searching for",
"suggestionMushaf": "Mushaf with translation",
"suggestionTajweed": "Tajweed for kids",
"suggestionMemorize": "Apps for memorization",
"enter": "Enter to search",
"openAnytime": "Open anytime",
"close": "Close",
"closeAria": "Close search"
```

Arabic:

```json
"paletteAria": "ابحث عن التطبيقات",
"palettePlaceholder": "ابحث عن التطبيقات أو التصنيفات…",
"mode": "طريقة البحث",
"try": "جرّب البحث عن",
"suggestionMushaf": "المصحف مع الترجمة",
"suggestionTajweed": "التجويد للأطفال",
"suggestionMemorize": "تطبيقات للحفظ",
"enter": "اضغط Enter للبحث",
"openAnytime": "افتح في أي وقت",
"close": "إغلاق",
"closeAria": "إغلاق البحث"
```

- [ ] **Step 4: Implement `SearchPalette`**

Create `src/components/apps/search-palette.tsx` as a client component. Render the
`<dialog id="search-palette">` **always** (do not return `null` when closed), so
`aria-controls` always resolves. Use a `useEffect` keyed on `open`:

- When `open` is true: `if (!dialog.open) dialog.showModal()`; focus the input;
  set `document.body.style.overflow = "hidden"`.
- When `open` becomes false or the component unmounts: close the dialog if open
  and restore body scroll.
- `onCancel` prevents default and calls `onClose`.
- Clicking the dialog backdrop calls `onClose`.
- State: `mode: "traditional" | "smart"`, `query: string`.
- Submit: trim; if empty return; `router.push(searchHref(lang, q, mode))`; `onClose()`.
- Example queries: buttons that call the same submit with the translated suggestion text.
- Category shortcuts: all 11 in the markup, with the last five carrying a `search-cat--extra` class. Desktop hides the extras; mobile shows them. Links use `categoryHref(lang, slug, sort)` and call `onClose`.
- “All categories” is a button that calls `onClose`.
- Desktop panel and mobile full-screen layout per spec §4.3/§5.
- The close button uses `aria-label={t("search.closeAria")}`.

- [ ] **Step 5: Wire the search button and ⌘K in `CategoryDock`**

- Add `searchOpen` state, `desktopSearchRef` and
  `lastSearchTriggerRef: useRef<HTMLButtonElement | null>(null)`.
- Both the desktop `.dock-search` and mobile `.m-search` buttons set
  `lastSearchTriggerRef.current = e.currentTarget` before opening.
- `closeSearch()` sets false and focuses `lastSearchTriggerRef.current`; when the
  palette was opened by Ctrl/⌘K, set `lastSearchTriggerRef.current =
  desktopSearchRef.current` before opening.
- Extend the Task 3 pathname effect to also close the search palette on any
  route change.
- Render a 34px `.dock-search` button before the rail and a 44px `.m-search` button on mobile:

```tsx
<button
  ref={desktopSearchRef}
  type="button"
  className="dock-search"
  onClick={(e) => {
    lastSearchTriggerRef.current = e.currentTarget;
    setSearchOpen(true);
  }}
  aria-label={t("search.paletteAria")}
  aria-haspopup="dialog"
  aria-expanded={searchOpen}
  aria-controls="search-palette"
>
  <SearchIcon />
</button>
```

- Add a keydown listener:

```tsx
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("input, textarea, [contenteditable='true']")) return;
    e.preventDefault();
    setSearchOpen(true);
  }
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);
```

- Render `<SearchPalette open={searchOpen} onClose={closeSearch} lang={lang} categories={categories} sort={sort} />`.
- The palette dialog gets `id="search-palette"`.

- [ ] **Step 6: Add the palette CSS**

Add the palette rules from spec §4.3/§5:

- Desktop `.search-palette` fixed at `top: 12vh`, 660px, glass, 22px radius, shadow.
- `::backdrop` dim + blur.
- 64px input row, mode segmented, 3×2 category grid, query chips, footer.
- Mobile `@media (max-width: 900px)`: fixed inset 0, full-screen warm surface, input row card, close button visible, all 11 category tiles visible, footer hidden.
- Reduced motion handled in Task 6.
- The close button is visible on desktop and mobile; the Esc pill is desktop-only.

- [ ] **Step 7: Run the palette tests to verify they pass**

Run: `npx playwright test e2e/public.spec.ts -g "search palette|Ctrl\+K|mobile search"`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/apps/search-palette.tsx src/components/apps/category-dock.tsx \
  src/app/globals.css src/i18n/en.json src/i18n/ar.json e2e/public.spec.ts
git commit -m "feat(search): add spotlight search palette"
```

---

### Task 5: Remove duplicate category chips from the compact header

**Files:**
- Modify: `src/components/site/compact-search.tsx`
- Modify: `src/components/site/site-header.tsx`
- Modify: `src/app/globals.css`
- Test: `e2e/public.spec.ts`

- [ ] **Step 1: Write the failing compact-header test**

Add:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test e2e/public.spec.ts -g "compact header"`

Expected: FAIL because `.compact-category-chip` elements still exist.

- [ ] **Step 3: Simplify `CompactSearch`**

Remove:

- The `categories` prop and `CategoryItem` import.
- `CategoryIcon`, `usePathname`, `keepSort`, `VISIBLE_CHIPS`, `dropdownOpen`, `activeSlug`, `GRID_ICON`.
- The five chips, the More dropdown and its panel.

Keep the logo link, search input, Enter submit and search button. The submit URL stays `/{lang}/apps?search=…`.

- [ ] **Step 4: Remove the header categories fetch**

In `src/components/site/site-header.tsx`, remove the `getCategoriesCached` import, the `categories` fetch and the `categories` prop on `<CompactSearch>`.

- [ ] **Step 5: Remove the compact category CSS**

In `src/app/globals.css`, remove `.compact-category-chip`, `.compact-category-trigger`, `.compact-category-dropdown`, `.compact-category-panel`, `.compact-category-option`, `.compact-chevron`, `.compact-chip-icon` and `.compact-chip-text` (and their dark/RTL variants). Keep `.compact-search-input`, `.compact-search-container`, `.compact-search-icon`, `.compact-search-btn` and `.compact-logo`.

Do not remove `.chip-icon`; it is still used by the About page.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx playwright test e2e/public.spec.ts -g "compact header"`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/site/compact-search.tsx src/components/site/site-header.tsx \
  src/app/globals.css e2e/public.spec.ts
git commit -m "refactor(site): remove duplicate header categories"
```

---

### Task 6: RTL, dark, responsive polish and full verification

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/apps/category-dock.tsx` (only if class/markup tweaks are needed)
- Modify: `src/components/apps/category-sheet.tsx` (only if class/markup tweaks are needed)
- Modify: `src/components/apps/search-palette.tsx` (only if class/markup tweaks are needed)
- Test: `e2e/public.spec.ts`

- [ ] **Step 1: Write the failing RTL e2e test**

Add:

```ts
test("Arabic dock and search are RTL-usable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ar");
  await expect(page.locator("html[dir='rtl']")).toHaveCount(1);

  const nav = page.getByRole("navigation", { name: "التصنيفات" });
  await expect(nav).toBeVisible();
  expect(await nav.evaluate((el) => getComputedStyle(el).direction)).toBe("rtl");

  const lefts = await nav.locator(".dock-pill").evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().left),
  );
  expect(lefts[0]).toBeGreaterThan(lefts[lefts.length - 1]);

  await nav.getByRole("link", { name: /مصحف/ }).click();
  await expect(page).toHaveURL(/\/ar\/mushaf$/);

  await page.getByRole("button", { name: "ابحث عن التطبيقات" }).click();
  const dialog = page.getByRole("dialog", { name: "ابحث عن التطبيقات" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "ابحث عن التطبيقات" })).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify it fails or exposes layout issues**

Run: `npx playwright test e2e/public.spec.ts -g "Arabic dock"`

Expected: FAIL if the Arabic labels/roles, RTL ordering or dialogs are not wired
yet. If the interaction assertions pass before the RTL CSS, the direction and
right-to-left ordering assertions above still pin the rail, and Step 6’s visual
check remains the gate for the fade, dividers and sheet/palette mirroring.

- [ ] **Step 3: Add tokens, dark mode, RTL, motion and sticky polish**

In `src/app/globals.css`:

- Add the dock/sheet/palette tokens from spec §5 to `:root` and `.dark`.
- Use logical properties for padding/borders/insets in the dock, sheet and palette.
- Add `[dir="rtl"] .dock-rail` and `[dir="rtl"] .search-cats` mask/flow overrides; mirror the sort chevron if needed.
- Add `@media (prefers-reduced-motion: reduce)` to remove dock/pill/palette/sheet transitions and transforms.
- Add focus-visible rings (2px primary, 2px offset) to pills, buttons, the sort select, the sheet links and palette controls.
- Verify the dock’s sticky top against the fixed header at desktop and mobile; adjust the ~98px value if the compact header measurement differs.
- Verify the inline-end fade appears only when the rail overflows; at 1440 all 12 chips are visible.
- Ensure the mobile sheet/palette safe-area padding and full-screen sizing.
- Ensure the dock’s active/counter/muted text meets 4.5:1 in both themes.

- [ ] **Step 4: Remove dead code and classes**

Run:

```bash
rg -n "categories-chips|category-chip|listing-toolbar|sort-select-wrap|sort-select-label|compact-category|compact-chip" src e2e
```

Expected: no matches. If any remain, remove them. Do not remove `.chip-icon` or `CategoryIcon`; they are used by About.

Check for unused imports/constants in `apps-listing.tsx` (`GRID_ICON`, `CategoryIcon`, `SortSelect`) and `compact-search.tsx`.

- [ ] **Step 5: Run the full verification**

Run:

```bash
npm run lint
npx vitest run
npx playwright test e2e/public.spec.ts
```

Expected: all pass. The Playwright run builds the app and starts `:3210`; ensure the dev DB is seeded and reachable.

- [ ] **Step 6: Visual pass**

Check at 1440, 1024 and 390; English and Arabic; light and dark:

- Hero has no chips; the dock overlaps the hero and sticks below the header.
- All 12 chips fit at 1440; the fade/scroll works at 1024; Tools is reachable.
- Active chip, counters and sort state are correct.
- Palette opens from the dock button and Ctrl/⌘K; input focused; Enter searches; Smart adds `mode=smart`; Escape/scrim/X close and return focus.
- Mobile search is full-screen; all 11 categories visible; the category sheet works and closes on selection/Escape.
- The compact header has search but no category chips.
- Nothing renders `null`/`NaN` while streaming; the dock count shimmers.
- Reduced motion removes the overlay/pill transitions.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/components/apps/category-dock.tsx \
  src/components/apps/category-sheet.tsx src/components/apps/search-palette.tsx e2e/public.spec.ts
git commit -m "chore(listings): polish dock RTL dark and responsive states"
```

---

## Plan Self-Review

- **Spec coverage:** dock/chips/sort (Task 2), mobile sheet (Task 3), search palette (Task 4), hero/header cleanup (Tasks 2/5), streaming fallback (Task 2), tokens/RTL/dark/a11y (Task 6), URL/i18n/tests (Tasks 1–4). No spec requirement is left without a task.
- **Type consistency:** `CategoryDockProps`, `CategorySheetProps`, `SearchPaletteProps`, `formatAppCount`, `categoryHref` and `searchHref` are defined once and reused by name.
- **Review Focus:** narrow desktop (Task 2), RTL (Task 6), unknown category (Task 2), null count (Task 1 helper + Task 2 shimmer branch), dialog route/focus (Tasks 3–4).
- **Proportion:** the plan defines interfaces and tests; CSS values live in the spec rather than being transcribed here.
