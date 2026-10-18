# Categories & Developers Admin Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split admin Categories and Developers from single-page inline add/edit (`?edit=`) into list + dedicated new + dedicated edit pages with search and filters, matching the existing `/admin/apps` pattern.

**Architecture:** Keep `CategoryForm`/`DeveloperForm` islands as-is in `taxonomy-editor.tsx`, only changing their success/cancel navigation to return to the list. Add filter-aware repo readers, thin list pages with GET search forms, and thin `new` + `[id]` pages that prefill via existing `getCategoryForEdit` / `getDeveloperForEdit`.

**Tech Stack:** Next.js App Router (async Server Components, `searchParams`/`params` promises), Drizzle ORM + postgres, Zod validation, Vitest + Playwright.

**Spec:** User request 2026-10-11: (A) clicking Categories/Developers must not show the add form inline — add lives on another page; (B) edit redirects with data to a dedicated edit page; (C) both lists support search + filter.

## Global Constraints

- Follow `src/app/admin/apps/page.tsx:102-163` GET-form + `listHref` + clear-link pattern; no client-side filtering.
- Preserve existing Tailwind classes (`rounded-app`, `bg-card`, `shadow-app`, `thCls`) and Arabic copy tone.
- Preserve ordering: categories `sortOrder, nameEn` (`src/lib/repo/admin.ts:462`), developers `nameEn` (`src/lib/repo/admin.ts:422`).
- Do not change Zod schemas in `src/lib/validation/admin.ts` or unique-constraint handling in `src/lib/actions/admin-taxonomy.ts`.
- Keep `requireAdmin`, `revalidateTag("categories"/"apps")` behavior unchanged.
- No new dependencies; no pagination (lists are small — keep full filtered list + `الإجمالي` count).

## Review Focus

- Invalid edit id (`/admin/categories/abc`, `/admin/developers/999999`) shows 404 via `notFound()`, not empty form.
- Duplicate `nameEn`/`slug` on edit surfaces field error, does not redirect away.
- Empty search `?q=` behaves as no filter (no zero-result surprise).
- Combined `q` + status filter applies AND, clear link resets both.
- Deleting a developer with apps still shows cascade warning with correct count after filters are added.

---

## File Structure

- `src/lib/repo/admin.ts` — extend `getAllCategories` / `getAllDevelopers` with optional filters; add `escapeLike` reuse. No signature change for `getCategoryForEdit`, `getDeveloperForEdit`, `getDeveloperAppCount`.
- `src/app/admin/categories/page.tsx` — list only: header + `+ إضافة فئة` button to `/admin/categories/new`, GET search/filter form, table with edit links to `/admin/categories/[id]`, delete via `ConfirmSubmit`.
- `src/app/admin/categories/new/page.tsx` — CREATE: title + back link + `<CategoryForm editing={null} />`.
- `src/app/admin/categories/[id]/page.tsx` — EDIT: parse `params.id`, `getCategoryForEdit`, `notFound()` if null, `toInitial`, `<CategoryForm key={id} editing={initial} />`.
- `src/app/admin/developers/page.tsx` — same list shape: `+ إضافة مطوّر` to `/admin/developers/new`, search + verified filter, app-count column preserved, edit links to `/admin/developers/[id]`.
- `src/app/admin/developers/new/page.tsx` — CREATE with `<DeveloperForm editing={null} />`.
- `src/app/admin/developers/[id]/page.tsx` — EDIT with `getDeveloperForEdit` + `notFound()`.
- `src/components/admin/taxonomy-editor.tsx` — `CategoryForm` / `DeveloperForm`: on `res.ok` always `router.push` to list + `router.refresh()`; cancel link points to list; remove `?edit` comment references.
- Tests: `tests/admin-repo.test.ts` (repo filter tests), `e2e/admin.spec.ts:381` (rewrite categories flow for new routes + add developers/search/filter coverage).

---

### Task 1: Filter-aware taxonomy repo readers

**Files:**
- Modify: `src/lib/repo/admin.ts:411-463`
- Test: `tests/admin-repo.test.ts`

**Interfaces:**
- Consumes: existing `escapeLike` helper (`src/lib/repo/admin.ts:70-72`), `categories` / `developers` tables.
- Produces:
  - `export type CategoryFilters = { search?: string; active?: boolean }`
  - `export async function getAllCategories(f?: CategoryFilters): Promise<AdminCategoryOption[]>`
  - `export type DeveloperFilters = { search?: string; verified?: boolean }`
  - `export async function getAllDevelopers(f?: DeveloperFilters): Promise<AdminDeveloperOption[]>`
  - Callers pass `search: q || undefined`, `active`/`verified` only when filter ≠ `all`. Empty/whitespace search = no filter.

- [ ] **Step 1: Write failing tests in `tests/admin-repo.test.ts`**

```ts
// categories: search matches nameEn/nameAr/slug, active filter ANDs
expect((await getAllCategories({ search: "T:Acat One" })).length).toBe(1);
expect((await getAllCategories({ search: "  " })).length).toBeGreaterThanOrEqual(2);
expect((await getAllCategories({ active: false })).every((c) => c.isActive === false)).toBe(true);
// developers: search matches nameEn/website/email, verified filter ANDs
expect((await getAllDevelopers({ search: "T:Admin Dev" })).length).toBeGreaterThanOrEqual(1);
expect((await getAllDevelopers({ verified: true })).every((d) => d.isVerified === true)).toBe(true);
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/admin-repo.test.ts -t "taxonomy filters"`
Expected: FAIL — `getAllCategories` takes 0 args / ignores filters.

- [ ] **Step 3: Implement filters in `src/lib/repo/admin.ts`**

Build `conds: SQL[]`; search uses `ILIKE %escapeLike(trim)% ESCAPE '\'` over `(nameEn, nameAr, slug)` for categories and `(nameEn, nameAr, website, email)` for developers; add `eq(isActive)` / `eq(isVerified)` when defined; keep existing `orderBy`.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/admin-repo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repo/admin.ts tests/admin-repo.test.ts
git commit -m "feat(admin): filter-aware category/developer readers"
```

---

### Task 2: Categories list + new + edit pages

**Files:**
- Modify: `src/app/admin/categories/page.tsx`
- Create: `src/app/admin/categories/new/page.tsx`
- Create: `src/app/admin/categories/[id]/page.tsx`
- Test: `e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `getAllCategories(filters)` from Task 1, `getCategoryForEdit(id)`, `CategoryForm` + `CategoryInitial`, `deleteCategory`, `ConfirmSubmit`.
- Produces routes: `GET /admin/categories?q=&active=`, `GET /admin/categories/new`, `GET /admin/categories/:id`.

- [ ] **Step 1: Rewrite `page.tsx` as list-only**

Header row (`الفئات` + `+ إضافة فئة` link to `/admin/categories/new` mirroring `src/app/admin/apps/page.tsx:56-64`); GET form with `input name="q" type="search"` + `select name="active"` (`all|yes|no` → `كل الحالات|مفعّلة|غير مفعّلة`) + `تصفية` submit + `مسح` link when filtered; table keeps EN/AR/slug/active/sort columns; edit link `href={`/admin/categories/${c.id}`}`; delete unchanged; footer `الإجمالي: {filtered.length}`; remove `CategoryForm`, `parseEdit`, `toInitial`, `?edit` logic.

- [ ] **Step 2: Create `new/page.tsx`**

Title `إضافة فئة جديدة` + `← العودة إلى القائمة` link to `/admin/categories` (mirror `src/app/admin/apps/new/page.tsx:10-24`) + `<CategoryForm editing={null} />` inside `Suspense`.

- [ ] **Step 3: Create `[id]/page.tsx`**

Title `تعديل فئة` + back link; `EditContent({ params })` awaits `params`, parses int, calls `getCategoryForEdit`, calls `notFound()` when NaN or null, maps row via existing `toInitial` (`page.tsx:36-49` moved here), renders `<CategoryForm key={numId} editing={initial} />`.

- [ ] **Step 4: Manual verify**

Run: `npm run dev`, visit `/admin/categories` (no form visible), `/admin/categories/new` (empty form), `/admin/categories/1` (prefilled or 404).
Expected: list has no inline form; new/edit round-trip works.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/categories/
git commit -m "feat(admin): dedicated category list/new/edit pages with search"
```

---

### Task 3: Developers list + new + edit pages

**Files:**
- Modify: `src/app/admin/developers/page.tsx`
- Create: `src/app/admin/developers/new/page.tsx`
- Create: `src/app/admin/developers/[id]/page.tsx`
- Test: `e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `getAllDevelopers(filters)` from Task 1, `getDeveloperForEdit(id)`, `getDeveloperAppCount(id)`, `DeveloperForm` + `DeveloperInitial`, `deleteDeveloper`.
- Produces routes: `GET /admin/developers?q=&verified=`, `GET /admin/developers/new`, `GET /admin/developers/:id`.

- [ ] **Step 1: Rewrite `page.tsx` as list-only**

Header (`المطورون` + `+ إضافة مطوّر` → `/admin/developers/new`); GET form with `q` search (`بحث باسم المطور أو موقعه أو بريده`) + `select name="verified"` (`all|yes|no` → `الكل|موثّق|غير موثّق`); keep verified/app-count columns and per-row `Promise.all(counts)` cascade confirm (`DEV_DELETE_CONFIRM_APPS` vs `DEV_DELETE_CONFIRM_EMPTY`); edit link `href={`/admin/developers/${d.id}`}`; remove `DeveloperForm`, `parseEdit`, `?edit` logic.

- [ ] **Step 2: Create `new/page.tsx`**

Title `إضافة مطوّر جديد` + back link + `<DeveloperForm editing={null} />` in `Suspense`.

- [ ] **Step 3: Create `[id]/page.tsx`**

Same shape as categories edit: parse id, `getDeveloperForEdit`, `notFound()` on miss, existing `toInitial` (`page.tsx:43-56` moved here incl. `Object.values(d.socialLinks)`), `<DeveloperForm key={numId} editing={initial} />`.

- [ ] **Step 4: Manual verify**

Run dev server; check list/search/verified filter, new, edit prefill, delete confirm still shows app count.
Expected: all three routes behave; counts correct under filter.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/developers/
git commit -m "feat(admin): dedicated developer list/new/edit pages with search"
```

---

### Task 4: Point taxonomy forms at the new pages

**Files:**
- Modify: `src/components/admin/taxonomy-editor.tsx:60-121, 292-362`

**Interfaces:**
- Consumes: `saveCategory`, `saveDeveloper` (unchanged return `{ ok: true }`).
- Produces: `CategoryForm({ editing })` and `DeveloperForm({ editing })` usable from both `new` (null) and `[id]` (prefilled) pages.

- [ ] **Step 1: Update `CategoryForm.handleSubmit` success branch**

Replace edit-vs-create split with: `router.push("/admin/categories"); router.refresh();` for both cases (keep `setSaved` flash only for create if desired, but navigation covers it). Update cancel `<Link href="/admin/categories">` (already correct) and doc comment `prefilled when the page resolves ?edit=<id>` → `prefilled by the [id] edit page`.

- [ ] **Step 2: Update `DeveloperForm.handleSubmit` success branch**

Same: `router.push("/admin/developers"); router.refresh();` both cases; fix doc comment likewise.

- [ ] **Step 3: Verify no `?edit=` references remain for these two resources**

Run: `rg "\?edit=" src/app/admin/categories src/app/admin/developers src/components/admin/taxonomy-editor.tsx`
Expected: no matches (metadata page keeps its own `?edit` — out of scope).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/taxonomy-editor.tsx
git commit -m "fix(admin): taxonomy forms redirect to list pages"
```

---

### Task 5: Update E2E + full verification

**Files:**
- Modify: `e2e/admin.spec.ts:381-402`
- Test: `tests/admin-taxonomy-actions.test.ts` (no change expected — regression run only)

**Interfaces:**
- Consumes: routes from Tasks 2–3.

- [ ] **Step 1: Rewrite categories E2E to new flow + add search/filter assertions**

```ts
test("categories: new → list → search/filter → edit → delete", async ({ page }) => {
  await page.goto("/admin/categories/new");
  await page.getByLabel(/الاسم \(EN\)/).fill(CAT_NAME);
  // ... fill AR, submit, expect URL /admin/categories
  await page.goto("/admin/categories?q=" + encodeURIComponent(CAT_NAME));
  await expect(page.getByRole("table")).toContainText(CAT_NAME);
  await page.getByRole("link", { name: "تعديل" }).first().click();
  await expect(page).toHaveURL(/\/admin\/categories\/\d+/);
  // ... edit name, save, expect back on list
});
test("developers: new → verified filter → edit → delete", async ({ page }) => {
  // mirror with ?verified=yes and cascade confirm text
});
```

- [ ] **Step 2: Run unit + typecheck + lint**

Run: `npx vitest run tests/admin-repo.test.ts tests/admin-taxonomy-actions.test.ts && npx tsc --noEmit && npx eslint src/lib/repo/admin.ts src/app/admin/categories src/app/admin/developers src/components/admin/taxonomy-editor.tsx`
Expected: all PASS.

- [ ] **Step 3: Run admin E2E**

Run: `npx playwright test e2e/admin.spec.ts -g "categor|develop"`
Expected: PASS (needs dev DB per existing spec setup).

- [ ] **Step 4: Commit**

```bash
git add e2e/admin.spec.ts
git commit -m "test(e2e): cover new category/developer page flows"
```

---

## Self-Review

- Spec A (add on another page): Tasks 2–3 remove inline forms, add `new/` routes with header buttons. Covered.
- Spec B (edit redirects with data to edit page): Tasks 2–3 `[id]` pages prefill via `get*ForEdit`; Task 4 pushes back to list after save. Covered.
- Spec C (search + filter): Task 1 repo + Tasks 2–3 GET forms mirroring apps. Covered.
- Types consistent: `CategoryFilters`/`DeveloperFilters` defined once in Task 1, consumed by name in Tasks 2–3.
- Proportion: plan is interface + route decisions only; form bodies, SQL bodies left to implementer.
