# Design: Admin Apps UX Improvements — Auto Order, Markdown Descriptions, Submission Editing

Date: 2026-11-04
Status: Approved (brainstorming), pending implementation plan
Path: Bounded ×3 (three scoped changes to existing flows), tracked in one spec per user request

## 1. Problem & Goal

Three admin-friction problems in the apps pipeline:

1. **Manual order numbers.** The admin app form (`/admin/apps/new`) starts the
   «ترتيب العرض» (sort order) field at `0` every time; admins must remember
   what the current max is. Worse, **approved submissions create apps with
   `sort_order = 0`** silently (the column default), so every submission-born
   app collides at the top of the list.
2. **Plain-text descriptions.** `description_en`/`description_ar` render as a
   flat `<p>` on the user-facing detail page and as `whitespace-pre-line` in
   admin. Formatting (headings, lists, links) typed by admins or submitters is
   never displayed.
3. **No submission editing.** Admins can approve / reject / request-info a
   submission, but cannot fix typos or wrong links in it. A trivial mistake
   forces either approve-then-edit the created app, or reject + resubmission
   round-trip through the external submitter.

Success criteria:

- Opening `/admin/apps/new` shows the sort-order field pre-filled with
  max+1 of existing apps; still manually overridable.
- An approved submission creates its app with sort_order = max+1.
- Markdown typed into a description (GFM subset, no raw HTML) renders
  formatted on `/[lang]/app/[id]` and in admin preview surfaces.
- Admin can edit all submission content fields on the review page; edits are
  audit-logged; submitter identity fields stay locked; approval then builds
  the published app from the edited row.

## 2. Non-Goals

- No drag-and-drop reordering UI for apps (number field stays).
- No markdown in `short_description`, `additional_notes`, or other text fields
  — descriptions only. (`short_description` also feeds meta tags; markdown
  there would leak into `description` meta.)
- No admin editing of submissions **after** approval — post-approval fixes go
  through `/admin/apps/[id]`, which already edits the live app. Two synced
  sources of truth are rejected.
- No rich WYSIWYG/toolbar editor; authoring is markdown textarea + preview.
- No notification to the submitter when their submission is edited (the
  existing status emails are unchanged).
- No changes to the public submission flow's fields or validation beyond a hint line.

## 3. Current State (verified)

### Ordering

- `src/components/admin/app-form.tsx` — `AppForm` client island. Line 91:
  `sortOrder: 0` in `emptyInitial()`; line 174 `const [sortOrder, setSortOrder]
  = useState(String(initial.sortOrder))`; lines 610–618 plain number input
  `min={0} step={1}`; line 230 `sortOrder: Number.parseInt(sortOrder, 10) || 0`.
- `src/lib/validation/admin.ts` — `appFormSchema`, line 73:
  `sortOrder: z.number().int().min(0).default(0)`.
- `src/lib/actions/admin-apps.ts` — `saveApp(input)`; create path uses
  `appColumnValues()` with `sortOrder: data.sortOrder`.
- `src/lib/actions/admin-submissions.ts` — `approveSubmission` inserts the
  `apps` row directly (status `published`); **does not set `sortOrder`** →
  column default `0`.
- `db/schema.ts` line 96: `sortOrder: integer("sort_order").default(0)
  .notNull()`, indexed (`apps_sort_order_idx`). No DB migration needed.

### Description rendering

- No markdown library installed (no react-markdown / remark / marked in
  `package.json` or node_modules).
- User-facing: `src/app/[lang]/(site)/app/[id]/description-text.tsx` —
  `DescriptionTextClient` renders `{text}` in a plain `<p>`, with >200-char
  text collapsed behind a 90px truncated view + "read more" toggle.
- Admin review page: `src/app/admin/submissions/[id]/page.tsx` lines 146/156 —
  `<p className="whitespace-pre-line">`.
- Admin app form: description is a plain textarea in
  `src/components/admin/app-form-sections.tsx`.
- No `dangerouslySetInnerHTML` anywhere for descriptions (good — nothing to undo).

### Submissions administration

- `src/lib/validation/submission.ts` — public Zod schema (submitter info,
  app names, store links, descriptions, categories, image URLs, developer
  fields, `additional_notes`, `content_confirmation`).
- `src/app/admin/submissions/[id]/page.tsx` — read-only review view +
  `submission-actions.tsx` (approve / reject / request info / under review /
  notes).
- `src/lib/actions/admin-submissions.ts` — approve builds the app in a
  transaction (insert `apps`, transfer categories, set
  `app_submissions.status='approved'`, `createdAppId`, log).
- `db/schema.ts`: `submission_status_logs` audit table exists (status,
  actor, message, timestamps). `app_submissions` has `adminNotes`,
  `rejectionReason`, `infoRequestMessage`, `reviewedById/At`.
- Conventions: Server Actions in `src/lib/actions/` returning typed
  `{ok, error, fieldErrors}`; `requireAdmin()` guard from
  `src/lib/admin-guard.ts`; hand-rolled React state forms (no form lib);
  Tailwind v4 tokens (`text-text`, `bg-card`, `rounded-app`); admin UI is
  Arabic-only; i18n via `next-intl` (`src/i18n/ar.json`, `en.json`).
- Tests: Vitest against real Postgres on :5433 (`tests/setup.ts`, `.env.test`).

## 4. Architecture / Design per feature

### Feature 1 — Sort order auto-increments

- New repo query `getMaxSortOrder()` (or direct aggregate) in the admin data
  layer returning `COALESCE(MAX(sort_order), -1) + 1`. Consumed as
  `nextSortOrder` (plain integer, fetched server-side on the page, fetch on
  each page load is fine — no live increment needed mid-session).
- `/admin/apps/new/page.tsx` passes `nextSortOrder` into `AppForm` initial
  state instead of `0`.
- `approveSubmission` sets `sortOrder: nextSortOrder` on the created
  app, computed inside the approval transaction to minimize races. A plain
  `MAX()` read does not hard-lock against concurrent approvals; exact
  duplicate sort orders from a rare race are already tolerated by the
  ordering queries (secondary stable sort exists) and match today's manual
  behavior, so no advisory locking is introduced.
- Field keeps `min={0}` and manual override; nothing else changes.

### Feature 2 — Markdown descriptions

- Add deps: **`react-markdown`** + **`remark-gfm`** (GFM: headings, bold,
  italic, lists, links, tables, code, blockquotes). Commit-level pin of the
  same major from npm. Raw HTML inside markdown is **not** rendered
  (`react-markdown` default: HTML is treated as text) → no sanitizer needed
  and no phishable `javascript:` links beyond what a markdown link target
  allows; external link targets get `target="_blank" rel="noopener noreferrer"`.
- New shared client component **`AppDescriptionMarkdown`**
  (`src/components/apps/app-description-markdown.tsx`): wraps
  `react-markdown` with scoped Tailwind classes on children (headings scale,
  lists indented with markers, links `text-primary underline`, break-words).
  RTL-safe: inherits `dir` from the page element; no directional CSS in the
  component itself.
- Reuse over truncation: keep `DescriptionTextClient`'s read-more mechanism by
  converting it to render `AppDescriptionMarkdown` inside a truncated
  container that is expanded on toggle (CSS max-height + overflow, expanded
  via class swap) — markdown still renders fully in the collapsed state.
- Surfaces:
  1. `src/app/[lang]/(site)/app/[id]/description-text.tsx` — replace the flat
     `<p>` with the truncated markdown renderer.
  2. Admin submission review page: description blocks become side-by-side
     «النص | المعاينة» (textarea | formatted preview) while in edit mode
     (Feature 3), and plain markdown-rendered read-only otherwise.
  3. Admin app form (`app-form-sections.tsx`): each of the two description
     textareas gets a «معاينة» (preview) toggle beneath it that shows
     rendered output.
- Public submit form: one hint line under the description field: «يدعم التنسيق:
  **نص، *قوائم*، عناوين، روابط**» (both locales).

### Feature 3 — Admin edits submission data (Option A)

- New Zod schema **`submissionEditSchema`** in `src/lib/validation/`,
  derived by picking the content fields from the submission schema:
  names (en/ar), all store links, `short_description_*`, `description_*`,
  `categories`, `app_icon_url`, `main_image_*`, `screenshots_*`,
  developer fields (name/website/email/logo?), `is_developer`,
  `additional_notes`.
  **Excluded (locked):** `submitter_name`, `submitter_email`,
  `submitter_phone`, `submitter_organization`, `content_confirmation` — the
  admin must not rewrite who submitted what, nor forge consent.
- New action **`editSubmission(id, data)`** in `src/lib/actions/admin-submissions.ts`
  — guard `requireAdmin()`, validate via Zod, transactionally update the
  `app_submissions` row + replace `app_submissions_categories` join rows, and
  append a **`edited`** entry to `submission_status_logs` (reuse the existing
  log-insert helper). Reject-on-possible-state-change: editing is allowed
  while status ∈ {`pending`, `under_review`, `info_requested`} only — an
  `approved`/`rejected` submission is closed; editing it would rewrite history.
- `/admin/submissions/[id]`: **«تعديل البيانات»** toggle. Off (default) →
  current read-only review view (descriptions read via markdown renderer).
  On → edit mode form reusing the field components from
  `src/components/admin/app-form-sections.tsx`, prefilled from the submission
  row (subsection islands, hand-rolled state like `AppForm`, per-field
  `dir` attributes as today). Save → `editSubmission`; result surfaces
  `fieldErrors` inline; the read-only view then shows the new data.
- Approval flow is untouched: `approveSubmission` already reads the row it
  will insert from, so edited data flows into the created app with no logic
  change.

## 5. Data flow / Invariants

- `apps.sort_order` invariant: on insert (either path), value =
  max existing + 1 unless admin explicitly overrode the field.
- Markdown is a **presentation convention**, not a data type: stored as-is in
  `description_*` columns; only renderers interpret it. Raw HTML typed into
  markdown shows as literal text.
- Submission edit writes only to the `app_submissions` tables; the `apps`
  table is never touched by `editSubmission`.
- Audit: every successful `editSubmission` leaves one `submission_status_logs`
  row with the existing actor context; no log row on validation failure.

## 6. Error handling

- `editSubmission` returns `{ok: false, error, fieldErrors}` on Zod failure
  (surfaced inline) already; closed-status edit attempt returns
  `{ok: false, error: "closed"}` typed error. Same shape as other admin actions.
- `nextSortOrder` query failure must not block form rendering: fall back to
  the current `0` default and let admins type a number.
- Markdown renderer must not throw on malformed input (react-markdown is
  tolerant; no test coverage needed beyond "renders garbage as text").
- Coverage plan: integration tests for `editSubmission` (happy path writes
  row + join table + log; locked fields change attempts are ignored/rejected
  by schema; closed-status rejected), agnostic sort-order query test (empty
  table → 0; existing max n → n+1; approveSubmission increments), and
  rendering test of `AppDescriptionMarkdown` (link, list, heading, rtl
  wrapping, truncation toggle still works).

## 7. New dependencies

| Package | Purpose | Size impact |
|---|---|---|
| `react-markdown` | Markdown → React nodes without innerHTML | ~modest, tree-shaken |
| `remark-gfm` | GFM tables/strikethrough/task lists | small |

## 8. Files touched

- `docs/superpowers/...` — this spec, + implementation plan later.
- `src/lib/validation/submission.ts` (or new `validation/admin.ts` section): `submissionEditSchema`.
- `src/lib/actions/admin-submissions.ts`: `editSubmission`, `nextSortOrder`
  usage in `approveSubmission`.
- `src/lib/repo/apps.ts` (or admin data layer): max-sort-order query.
- `src/app/admin/apps/new/page.tsx`: pass `nextSortOrder`.
- `src/components/admin/app-form.tsx`: initial sortOrder wiring (already
  generic — verify accepts initial value).
- `src/components/admin/app-form-sections.tsx`: preview toggle on description textareas.
- `src/app/admin/submissions/[id]/page.tsx` + `submission-actions.tsx`:
  edit-mode toggle, prefilled form, read-only markdown description view.
- `src/components/apps/app-description-markdown.tsx` — new shared renderer.
- `src/app/[lang]/(site)/app/[id]/description-text.tsx`: markdown + truncation.
- `src/app/[lang]/(site)/submit-app/...` + i18n `ar.json`/`en.json`: format hint.
- `package.json`: react-markdown, remark-gfm.
- Tests under `tests/`.

Note: `src/components/apps/category-tags-row.tsx` has an uncommitted,
user-authored modification in the worktree — leave it untouched.
