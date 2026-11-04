# Admin Apps UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sort order auto-increments on app create/approval, descriptions render markdown everywhere, and admins can edit pending submission data in place.

**Architecture:** Three bounded changes to existing flows. (1) A new `getNextSortOrder()` repo query fed into `/admin/apps/new` and `approveSubmission`. (2) A shared `AppDescriptionMarkdown` client component (react-markdown + remark-gfm, no raw HTML) replacing flat-text description rendering, with preview toggles in admin forms. (3) A `submissionEditSchema` + `editSubmission` server action writing content fields to the locked `app_submissions` row with one audit-log row per save, surfaced as an edit modal on the review page.

**Tech Stack:** Next.js 16 App Router + Server Actions, Drizzle ORM (Postgres), Zod 4, next-intl, Tailwind v4, Vitest (node env, real Postgres on :5433, `fileParallelism: false`).

**Spec:** `docs/superpowers/specs/2026-11-04-app-admin-improvements-design.md` (read it first — the plan argues from it).

## Global Constraints

- Per root `AGENTS.md`: before writing any code, read the relevant guide(s) under `node_modules/next/dist/docs/` — this Next.js version may differ from training data. Verify Server Action / RSC conventions before Task 4–5 work.
- Do NOT touch `src/components/apps/category-tags-row.tsx` — uncommitted user-authored work.
- Admin UI copy is Arabic-only (hardcoded Arabic strings, as today). Public-site copy goes through next-intl keys (`src/i18n/ar.json`, `en.json`).
- No new runtime deps beyond `react-markdown` + `remark-gfm`; no dev-dep additions (no jsdom / testing-library — component tests must use `renderToStaticMarkup` from `react-dom/server`, node env).
- Server actions follow existing patterns: `requireAdmin()` guard first, typed `{ok...}` returns, `revalidateTag(...)` after commit inside try/failed-commit semantics as sibling actions do.
- Markdown is stored as typed — no transformation on write; only renderers interpret it; raw HTML in markdown renders as literal text (react-markdown default).
- Tests DB is shared and files run sequentially; follow existing fixture prefix conventions (trailing `%` LIKE patterns) and defensive pre-cleans as in `tests/review-actions.test.ts`.
- Untested-UI note: repo has no jsdom tests; UI islands are verified by typecheck/lint + build (each task's final steps) — do not invent component DOM tests.

## Review Focus

These inputs are implied by the spec but no single task's happy-path test exercises them all; each is pinned to its owning task below.

1. Malformed/garbage markdown must render as text, never throw or blank the page → Task 2 final assertion (`renderToStaticMarkup` on ``"*[broken]("``, `"<div><script>x</script>"` etc., expect: no throw, no `<script>` tag in output).
2. `javascript:` URLs typed as `[x](javascript:alert(1))` must not yield executable links (react-markdown default urlTransform strips them) → Task 2 assertion: markup contains no `href="javascript:`.
3. RTL Arabic description containing lists/headings must read right-to-left with list markers on the correct side → Task 2 pins `.app-md` CSS to logical properties (`padding-inline-start`, `text-align: start`), manual check step.
4. Editing an `approved`/`rejected` submission must be refused (`invalid_transition`), not silently rewritten → Task 4 test.
5. Submitter identity fields (name/email/phone/organization) and `content_confirmation` must be immune to any values an admin sends → Task 4 test sends a real `submitter_email` and asserts the row is unchanged.

---

### Task 1: `getNextSortOrder()` + wire into new-app page and approval

**Files:**
- Modify: `src/lib/repo/apps.ts` (add function, follow existing import style in that file)
- Modify: `src/app/admin/apps/new/page.tsx:24-39` (`NewContent`)
- Modify: `src/lib/actions/admin-submissions.ts:216-241` (`approveSubmission` Step 5 insert)
- Create: `tests/next-sort-order.test.ts`
- Modify: `tests/review-actions.test.ts` (add assertion inside an existing approval test in that file)

**Interfaces:**
- Produces: `export async function getNextSortOrder(): Promise<number>` in `src/lib/repo/apps.ts`. Returns `COALESCE(MAX(sort_order), -1) + 1` over the whole `apps` table (drizzle `max` aggregate or one-row `sql` select — simplest working form wins).
- Consumes (later task): nothing — Task 1 is standalone.

- [ ] **Step 1: Write the failing test** — `tests/next-sort-order.test.ts`

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { getNextSortOrder } from "@/lib/repo/apps";

const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 2 });
const P = "t-sorto-%";
const DEV = "T:SortO Dev";

beforeAll(async () => {
  await sql`DELETE FROM apps WHERE slug LIKE ${P}`;
  await sql`DELETE FROM developers WHERE name_en = ${DEV}`;
  // FK target, mirrors tests/review-actions.test.ts seeding style
  await sql`INSERT INTO developers (name_en, name_ar) VALUES (${DEV}, 'ت:ترتيب') RETURNING id`;
});
afterAll(async () => {
  await sql`DELETE FROM apps WHERE slug LIKE ${P}`;
  await sql`DELETE FROM developers WHERE name_en = ${DEV}`;
  await sql.end();
});

describe("getNextSortOrder", () => {
  it("returns current max + 1", async () => {
    const [{ id }] = await sql`SELECT id FROM developers WHERE name_en = ${DEV}`;
    const base = await getNextSortOrder(); // whatever unrelated fixtures occupy
    await sql`
      INSERT INTO apps (slug, name_en, name_ar, short_description_en, short_description_ar,
        description_en, description_ar, application_icon, main_image_en, main_image_ar,
        avg_rating, sort_order, platform, status, developer_id)
      VALUES ('t-sorto-a', 'T:SortO Big', 'ت:أ', 'd', 'د', 'desc', 'وصف', 'i.png', 'c.png', 'c.png',
        '3.00', ${base + 5}, 'android', 'published', ${id})`;
    expect(await getNextSortOrder()).toBe(base + 6);
  });
});
```

- [ ] **Step 2: Run it — expects FAIL** ("getNextSortOrder is not exported"): `npx vitest run tests/next-sort-order.test.ts`
- [ ] **Step 3: Implement** `getNextSortOrder` in `src/lib/repo/apps.ts` — single select over `apps`, `max(sortOrder)` fallback `-1`, return `+ 1` as a number (drizzle `max()` may return string/number-like; coerce with `Number()`).
- [ ] **Step 4: Run — expects PASS** (same command as Step 2).
- [ ] **Step 5: Wire `/admin/apps/new`** — in `src/app/admin/apps/new/page.tsx` `NewContent`: `const next = await getNextSortOrder();` and pass `initial={{ ...CREATE_DEFAULT, sortOrder: next }}` instead of `initial={CREATE_DEFAULT}`. No changes to `AppForm` itself.
- [ ] **Step 6: Wire approval** — in `approveSubmission` Step 5 (inside the same `db.transaction`, after the duplicate-name check): compute `nextSort` with one plain aggregate select (`sql`COALESCE(MAX(sort_order), -1) + 1 AS nxt FROM ${apps}`` — inside the tx, no row lock, per spec §4-F1), then add `sortOrder: Number(nextSort),` to the `tx.insert(apps).values({...})` object (currently absent → column default 0).
- [ ] **Step 7: Approval assertion** — in an existing `approveSubmission` test in `tests/review-actions.test.ts`, immediately before calling `approveSubmission` capture `const [{ m }] = await sql\`SELECT COALESCE(MAX(sort_order), -1) AS m FROM apps\``, then after `ok` assert the created app row (via `appBySlug` helper) has `Number(a.sort_order) === Number(m) + 1`.
- [ ] **Step 8: Run both suites — PASS:** `npx vitest run tests/next-sort-order.test.ts tests/review-actions.test.ts`
- [ ] **Step 9: Typecheck + lint:** `npx tsc --noEmit && npm run lint`
- [ ] **Step 10: Commit:**

```bash
git add src/lib/repo/apps.ts src/app/admin/apps/new/page.tsx src/lib/actions/admin-submissions.ts tests/next-sort-order.test.ts tests/review-actions.test.ts
git commit -m "feat(apps): sort order auto-increments on create and approval"
```

---

### Task 2: `AppDescriptionMarkdown` + user-facing detail page

**Files:**
- Modify: `package.json` — `npm i react-markdown remark-gfm`
- Create: `src/components/apps/app-description-markdown.tsx`
- Modify: `src/app/[lang]/(site)/app/[id]/description-text.tsx` (replaces flat `<p>`)
- Modify: the global stylesheet that defines `.truncated`/`.read-more-button` (find it by grep — likely `src/app/globals.css` or an `app-detail` CSS file) — add `.app-md` rules
- Create: `tests/markdown-render.test.tsx`

**Interfaces:**
- Produces: `export function AppDescriptionMarkdown({ text }: { text: string })` — a plain (no `"use client"` directive needed; it is imported by client components and must also work in RSC) component returning a `<div class="app-md">` wrapping `react-markdown` + `remarkGfm`.
- Consumes: existing `.truncated` CSS class for collapse behavior in `DescriptionTextClient`.

- [ ] **Step 1: Install deps:** `npm i react-markdown remark-gfm`
- [ ] **Step 2: Write the failing test** — `tests/markdown-render.test.tsx`, node env + `renderToStaticMarkup(React.createElement(AppDescriptionMarkdown, { text }))`. Assertions:
  - `'**bold** # Heading\n\n- عنصر\n- آخر\n\n[حلقة](https://x.example)'` renders containing `<strong>`, `<h1>`, `<ul>`, `<li>`, and `<a href="https://x.example"` with `target="_blank"` and `rel` containing `noopener`.
  - `text: '[x](javascript:alert(1))'` → no `href="javascript:` in output.
  - `text: 'plain <script>alert(1)</script> text'` → no literal `<script>` element tag (output has no `<script>` opener).
  - Garbage input `'*[broken]('` does not throw.
  - RTL: rendered `<ul>` inherits a `.app-md` rule written with `padding-inline-start` — assert the CSS file text contains `padding-inline-start` inside a `.app-md` block (fs read + string assertion).
- [ ] **Step 3: Run — expects FAIL** (`npx vitest run tests/markdown-render.test.tsx`, component missing).
- [ ] **Step 4: Implement** `src/components/apps/app-description-markdown.tsx`:
  - `<div className="app-md ..."><ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown></div>` (no `components` re-mapping for blocks — styling is CSS; only override `a` to add `target="_blank"` + `rel="noopener noreferrer"` and to **not** re-throw on odd hrefs; keep markdown's own URL sanitation).
- [ ] **Step 5: Add `.app-md` rules** to the stylesheet defining `.truncated`: scaled headings (`.app-md h1..h4`), `ul/ol` with `padding-inline-start`, `text-align: revert` on blocks, links `text-[var(--primary-color)] underline` (or the repo's primary-token equivalent — match neighboring CSS conventions), `code`/`blockquote`/`table` minimal borders, `overflow-wrap: break-word` on wrapper. All horizontal spacing via logical properties (RTL requirement).
- [ ] **Step 6: Swap the renderer** — `description-text.tsx` keeps its state/toggle logic; replace the `<p ...>{text}</p>` with:

```tsx
<div className={showToggle && !expanded ? "truncated" : undefined}>
  <AppDescriptionMarkdown text={text} />
</div>
```

  (If `.truncated` animates `max-height` + fade mask, confirm visually it still truncates multi-block content; adjust the CSS selector from `p.truncated` to `.truncated` if it was element-scoped.)
- [ ] **Step 7: Run tests — PASS** (Step 2 command) and then `npm run build` to confirm the detail page compiles with the new component.
- [ ] **Step 8: Manual RTL check (dev server, DB fixture):** Arabic app with lists/headings → lists indent right-side, no direction flip. Fix CSS only if wrong.
- [ ] **Step 9: Commit:**

```bash
git add package.json package-lock.json src/components/apps/app-description-markdown.tsx src/app/[lang]/(site)/app/[id]/description-text.tsx tests/markdown-render.test.tsx <stylesheet>
git commit -m "feat(descriptions): render markdown on app detail page"
```

---

### Task 3: Admin preview surfaces + submit-form hint

**Files:**
- Create: `src/components/admin/md-preview.tsx` (client: `export function MdPreviewToggle({ value, dir }: { value: string; dir: "ltr" | "rtl" })`)
- Modify: `src/components/admin/app-form.tsx:321,328` — under each description textarea render `<MdPreviewToggle dir="ltr" value={f.descriptionEn} />` / `dir="rtl"` / `f.descriptionAr`
- Modify: `src/app/admin/submissions/[id]/page.tsx` `AppDetailsSection` (lines ~146,156) — replace `<p className="whitespace-pre-line">{dash(a.descriptionEn)}</p>` and the AR twin with `<AppDescriptionMarkdown text={a.descriptionEn} />` when non-empty, else `—`
- Modify: `src/components/apps/submit-app-form.tsx:395-399` + `src/i18n/ar.json` + `src/i18n/en.json`

**Interfaces:**
- Consumes: `AppDescriptionMarkdown` from Task 2.

- [ ] **Step 1: Implement `MdPreviewToggle`** — Arabic-only admin UI: button «معاينة يظهر التنسيق» toggles a bordered panel rendering `<AppDescriptionMarkdown text={value} />` (collapsed by default; `dir` passed to the panel wrapper). No textareas are hidden — preview sits under it.
- [ ] **Step 2: Wire app-form** — one line under each of the two description `<textarea>` + `<ErrorList>` group blocks (lines 321–330).
- [ ] **Step 3: Wire review page read-only markdown** as above (import `AppDescriptionMarkdown`).
- [ ] **Step 4: Submit-form hint** — after the two description `Field`s (lines 395–399), extend their `hints` via the existing `Field` prop (`hint=` is already supported): add i18n keys `submitApp.hints.markdown`:
  - `ar.json`: `"يدعم التنسيق: عناوين، **غامق**، قوائم، روابط"`
  - `en.json`: `"Formatting supported: headings, **bold**, lists, links"`
  Applied with `hint={t("hints.markdown")}` on both descEn and descAr fields.
- [ ] **Step 5: Verify:** `npx tsc --noEmit && npm run lint && npm run build` (no unit tests required here — UI-only).
- [ ] **Step 6: Commit:**

```bash
git add src/components/admin/md-preview.tsx src/components/admin/app-form.tsx src/app/admin/submissions/[id]/page.tsx src/components/apps/submit-app-form.tsx src/i18n/ar.json src/i18n/en.json
git commit -m "feat(admin): markdown preview in app form + review page, submit-form formatting hint"
```

---

### Task 4: `submissionEditSchema` + `editSubmission` action

**Files:**
- Modify: `src/lib/validation/submission.ts` — hoist the current object literal into `export const submissionBaseSchema = z.object({...})` (keep `.refine` on `submissionSchema = submissionBaseSchema.refine(...)` — imports of `submissionSchema`/`SubmissionInput` keep working).
- Modify: `src/lib/actions/admin-submissions.ts` — new exported action + result type.
- Create: `tests/submission-edit.test.ts`

**Interfaces:**
- Produces (Task 5 consumes):

```ts
export const submissionEditSchema: z.ZodType<...> = submissionBaseSchema
  .omit({
    submitter_name: true, submitter_email: true, submitter_phone: true,
    submitter_organization: true, content_confirmation: true,
  });
// NOTE: .omit() on a plain object schema; the store-link cross-field refine is NOT
// applied on edit (admin may clear all links intentionally).
export type SubmissionEditInput = z.infer<typeof submissionEditSchema>;

export type EditSubmissionResult =
  | { ok: true }
  | { ok: false; error: "validation"; fieldErrors: Record<string, string[]> }
  | { ok: false; error: "not_found" | "invalid_transition" | "db"; message: string };

export async function editSubmission(id: number, raw: unknown): Promise<EditSubmissionResult>
```

- [ ] **Step 1: Write the failing test** — `tests/submission-edit.test.ts` mirroring `tests/review-actions.test.ts` mocks (`@/lib/auth` → user id 1, `next/cache`, stub console backend/envs, `vi.mock("@/lib/services/submission-images")` NOT needed). Fixtures with prefix `QAD-EDT`:
  - users(id=1), developer, category row, and one pending `app_submissions` row (insert directly by SQL with tracking `QAD-EDT1`, min-required columns incl. `app_icon_url`/`main_image_en`/`main_image_ar` NOT NULL — check `db/schema.ts` column list before writing the seed), plus one `app_submissions_categories` join.
  - Helper `payload()` producing one valid snake_case body (all content fields; `app_name_en: "T:Edt New Name"`, `google_play_link: "https://play.google.com/x"`, `description_en: "# Markdown desc"`, `categories: [catId]`, `submitter_email: "hacker@example.com"` included **to prove it is dropped**).
  - Tests:
    1. `editSubmission(id, payload)` → `{ok: true}`; row updated (`app_name_en`, `description_en` contain markdown verbatim); join table replaced (old cat gone, new cat present); **`submitter_email` unchanged**; `status` unchanged.
    2. `submission_status_logs` gained a row with `from_status = to_status = 'pending'`, `changed_by_id = 1`, notes mentioning تعديل.
    3. Closed edit: SQL-set status → `'approved'` → result `{ok:false, error:"invalid_transition"}`; `'rejected'` same.
    4. Validation: `google_play_link: "ftp://x"` → `{ok:false, error:"validation"}`, `fieldErrors.google_play_link` non-empty; and the store-link refine is NOT enforced: all links empty parses fine (`ok: true`).
    5. `{ok:false, error:"not_found"}` for id 999999.
- [ ] **Step 2: Run — expects FAIL** (`npx vitest run tests/submission-edit.test.ts`, action missing).
- [ ] **Step 3: Implement validation** — restructure `submission.ts` per the Interfaces block. Keep `submissionSchema` export shape identical (grep call sites: `src/lib/actions/submissions.ts` and tests).
- [ ] **Step 4: Implement action** in `admin-submissions.ts`:
  - `requireAdmin()`; `submissionEditSchema.safeParse(raw)` → on fail map `z.issues`-style to `fieldErrors` **exactly the way `saveApp` does in `src/lib/actions/admin-apps.ts`** (read that mapping and mirror it).
  - `db.transaction`: `lockSubmission(tx, id)`; guard `!sub || !["pending","under_review","info_requested"].includes(sub.status)` → not_found / `invalid_transition` ("لا يمكن تعديل بيانات هذا الطلب في حالته الحالية.");
  - update the row's content columns (camelCase keys: `appNameEn`, `appNameAr`, `googlePlayLink`, `appStoreLink`, `appGalleryLink`, `websiteLink`, `shortDescriptionEn/Ar`, `descriptionEn/Ar`, `appIconUrl`, `mainImageEn/Ar`, `screenshotsEn/Ar`, `developerNameEn/Ar`, `developerWebsite`, `developerEmail`, `isDeveloper`, `additionalNotes`);
  - delete-then-insert `app_submissions_categories` for `data.categories` (delete filtered by `appsubmissionId`);
  - insert `submissionStatusLogs` `{ submissionId: sub.id, fromStatus: sub.status, toStatus: sub.status, changedById: userId, notes: "تم تعديل بيانات الطلب بواسطة الإدارة" }`.
- [ ] **Step 5: Run — PASS** (Step 2 command) and `npx vitest run tests/review-actions.test.ts tests/submissions-repo.test.ts` to prove the `submissionSchema` refactor broke nothing.
- [ ] **Step 6: Typecheck + lint + commit:**

```bash
npx tsc --noEmit && npm run lint
git add src/lib/validation/submission.ts src/lib/actions/admin-submissions.ts tests/submission-edit.test.ts
git commit -m "feat(submissions): admin editSubmission action with audit log and locked identity fields"
```

---

### Task 5: Edit-mode UI on the review page

**Files:**
- Create: `src/components/admin/submission-edit-form.tsx` (client island; portal modal like `DeveloperModal` in `src/components/admin/taxonomy-editor.tsx`)
- Modify: `src/app/admin/submissions/[id]/page.tsx` (load categories, mount launcher)

**Interfaces:**
- Consumes: `editSubmission`, `EditSubmissionResult`, `SubmissionEditInput` (Task 4); `inputCls, labelCls, checkChipCls, StoreUrlField, UrlUploadField, ScreenshotsEditor, SectionHeader, SubPanel, LangTag` from `src/components/admin/app-form-sections.tsx`; `AppDescriptionMarkdown` + `MdPreviewToggle` from Tasks 2–3; `getSubmissionDetail`, `SubmissionDetail`, `getAllCategories` from `src/lib/repo/admin.ts` (read exact `CategoryOption` shape in `src/components/admin/app-form.tsx:39`).

- [ ] **Step 1: Implement the launcher + modal.**
  - `export function SubmissionEditLauncher({ detail, categories }: { detail: SubmissionDetail; categories: CategoryOption[] })` — admin-Arabic button «تعديل البيانات»; disabled (title explains) when `detail.status === "approved" || detail.status === "rejected" || detail.createdApp !== null`. Opens the modal.
  - `SubmissionEditModal({ detail, categories, onClose })` — portal overlay (copy `DeveloperModal`'s portal/overlay/close-on-backdrop pattern). Sections matching the review page order, prefilled from `detail`:
    - app details: `app_name_en/ar` (dir per lang), `short_description_en/ar` (max 150 counter), `description_en/ar` textareas each followed by `<MdPreviewToggle dir={...} value={...} />`;
    - store links: `StoreUrlField` ×4;
    - categories: `CategoryOption` chips via `checkChipCls`;
    - developer: 4 text inputs; `is_developer` boolean;
    - media: `UrlUploadField` for icon + main images, `ScreenshotsEditor` for the two arrays.
  - State is one local snake_case object mirroring `SubmissionEditInput`; keys preinitialized from `detail` (screenshots arrays as string arrays — check `ScreenshotsEditor`'s props signature and pass whatever it takes).
  - Save → `editSubmission(detail.id, payload)`; `ok:false + fieldErrors` → inline per-field errors; other failures → a message bar showing `message`; `ok:true` → `onClose()` + `router.refresh()`.
- [ ] **Step 2: Wire the page** — in `DetailContent`: `const allCategories = await getAllCategories();` pass `<SubmissionEditLauncher detail={detail} categories={allCategories} />` between `SubmissionActions` and `TrackingSection`.
- [ ] **Step 3: Verify:** `npx tsc --noEmit && npm run lint && npm run build`.
- [ ] **Step 4: Manual check (dev server):** pending submission → open modal → edit name + add markdown description + change category → save → review page shows new values and the log gains the edit entry; approved submission → button disabled.
- [ ] **Step 5: Commit:**

```bash
git add src/components/admin/submission-edit-form.tsx src/app/admin/submissions/[id]/page.tsx
git commit -m "feat(admin): edit-mode modal for submission data on review page"
```
