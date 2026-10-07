# Plan 1: Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the new Next.js repo with local databases, the complete phase-1 Drizzle schema, one-time live-data migration, idempotent JSON seed, the data-access (`lib/repo`) layer with tests, Auth.js admin auth, `/health`, Sentry, and CI.

**Architecture:** Single Next.js 16 monolith (`output: 'standalone'`). All data access lives in framework-agnostic `lib/repo/*` functions over Drizzle. Admin auth is Auth.js v5 credentials with a single seeded staff user. No public REST surface — only internal handlers (`/health`, `/upload` in Plan 3, `/sentry-tunnel`).

**Tech Stack:** Next 16.4.0, React 19.3, Drizzle ORM 0.45 + postgres driver 3.4, drizzle-kit 0.31, Zod 4, next-auth 5 beta, Tailwind v4, next-themes, sharp, @aws-sdk/client-s3, @sentry/nextjs, Vitest 5.

**Old repo (reference only, never modified):** `/home/muhammad/Work/itqan/quran-apps-directory`
- Design tokens: `src/themes.scss`, `src/global_styles.css`
- Fonts: `src/assets/fonts/ExpoArabic-{Book,Medium,Bold}.woff2`, `DG-Ghareeb-REG.ttf`
- Fallback seed data: `backend/applications_data_python.json`
- Arabic utils: `backend/core/utils/arabic.py`

**Commits use the repo format:** `{Short Title} - {description}` (no AI attribution).

---

## File Structure (locked by this plan)

| File | Responsibility |
|---|---|
| `db/schema.ts` | All phase-1 Drizzle tables + indexes |
| `db/index.ts` | Pooled Drizzle client for `DATABASE_URL` |
| `db/migrate-live.ts` | One-time migration: `LIVE_DB_URL` → `DATABASE_URL`, IDs preserved |
| `db/seed.ts` | Idempotent fallback seed from JSON + metadata seeds + admin user |
| `db/parity-check.ts` | Verifies migrated DB vs live DB (counts + spot fields) |
| `src/lib/services/arabic.ts` | Arabic normalization (port of `arabic.py` core) |
| `src/lib/repo/apps.ts` | `getApps` (AND/OR filters, GIN, pagination, ordering), `getApp` (id-or-slug) |
| `src/lib/repo/categories.ts` | `getCategories` (active w/ counts) |
| `src/lib/repo/developers.ts` | `getDeveloperApps(id)`, `getDeveloper(id)` |
| `src/lib/repo/metadata.ts` | `getActiveMetadataNames`, `getMetadataValues` (bilingual + counts) |
| `src/lib/auth.ts` | Auth.js v5 config (credentials + JWT) |
| `src/lib/admin-guard.ts` | `requireAdmin()` used by actions in later plans |
| `src/middleware.ts` | Locale handling + `/admin/*` session guard |
| `src/app/layout.tsx` | Fonts, ThemeProvider, metadata defaults |
| `src/app/globals.css` | Tailwind v4 `@theme` tokens (light/dark) |
| `src/app/health/route.ts` | Railway liveness probe |
| `src/app/admin/login/page.tsx` | Credentials login form |
| `tests/setup.ts`, `tests/fixtures.ts` | Vitest setup, test-DB helpers |
| `docker-compose.yml`, `docker/init-test-db.sql` | Local Postgres(+pgvector) + test DB |
| `.env.example` | Full env map |
| `.github/workflows/ci.yml` | Lint + unit tests on PR |

---

### Task 1: Scaffold the Next.js project into the repo

**Files:** Create: full Next.js scaffold under repo root (`.git` and `docs/` already exist and must be preserved).

- [ ] **Step 1: Scaffold into a sibling temp dir, then merge**

```bash
cd /home/muhammad/Work/itqan
npx create-next-app@latest qad-scaffold --typescript --app --tailwind --eslint --src-dir --import-alias "@/*" --use-npm
```
Accept any remaining defaults (Turbopack). Then:

```bash
rsync -a --exclude .git --exclude node_modules qad-scaffold/ quran-apps-next-js/
rm -rf qad-scaffold
cd quran-apps-next-js && npm install
```

- [ ] **Step 2: Verify versions match or beat the pins**

```bash
npm view next version && node -e "console.log(require('./package.json').dependencies.next)"
npm view react version && node -e "console.log(require('./package.json').dependencies.react)"
```
Expected: printed npm-latest version is ≥ the scaffolded one (scaffold uses latest anyway). Record versions in `docs/specs/2026-10-07-nextjs-foundation-design.md` §3 if they differ.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Project Scaffold - Next.js 16 base app with Tailwind v4 and ESLint"
```

---

### Task 2: Install runtime + test dependencies

**Files:** Modify: `package.json`

- [ ] **Step 1: Install production dependencies**

```bash
npm install drizzle-orm@latest postgres@latest zod@latest next-intl@latest \
  next-themes@latest next-auth@beta lucide-react@latest embla-carousel-react@latest \
  sharp@latest @aws-sdk/client-s3@latest @sentry/nextjs@latest bcryptjs@latest
```

- [ ] **Step 2: Install development dependencies**

```bash
npm install -D drizzle-kit@latest vitest@latest dotenv@latest @types/bcryptjs
```

- [ ] **Step 3: Verify all versions and record them**

```bash
for pkg in next drizzle-orm drizzle-kit postgres next-auth@beta zod next-intl next-themes tailwindcss lucide-react embla-carousel-react sharp @aws-sdk/client-s3 @sentry/nextjs vitest bcryptjs; do echo -n "$pkg: "; npm view "$pkg" version | tail -1; done
node -e "const p=require('./package.json'); console.log(JSON.stringify({...p.dependencies,...p.devDependencies}, null, 1))"
```
Expected: installed versions ≤ npm latest (never ahead). If any next-auth beta release is newer than beta.32, note the number in the spec §3.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Dependencies - runtime and test dependency set"
```

---

### Task 3: Local databases, drizzle config, db client, env

**Files:**
- Create: `docker-compose.yml`, `docker/init-test-db.sql`, `drizzle.config.ts`, `db/index.ts`, `.env.example`, `.env.local`, `.env.test`, `.gitignore` update

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: qad
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/init-test-db.sql:/docker-entrypoint-initdb.d/init-test-db.sql
volumes:
  pgdata:
```

- [ ] **Step 2: Write `docker/init-test-db.sql`**

```sql
CREATE DATABASE qad_test;
CREATE DATABASE qad_shadow;
```

- [ ] **Step 3: Write `.env.example` (and copy to `.env.local` / `.env.test` for dev)**

```bash
# Core
DATABASE_URL=postgres://postgres:postgres@localhost:5433/qad
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/qad_test
# One-time migration source (Railway prod, read-only usage)
LIVE_DB_URL=
# Auth.js
AUTH_SECRET=
AUTH_URL=http://localhost:3000
ADMIN_EMAIL=
ADMIN_PASSWORD=
# Script access to /upload (autofill flows)
ADMIN_API_KEY=
# Cloudflare R2 (S3-compatible)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=https://pub-e11717db663c469fb51c65995892b449.r2.dev
# Sentry
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NOINDEX=1
# Submission emails (Plan 3)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

```bash
cp .env.example .env.local
cp .env.example .env.test
```
Fill `AUTH_SECRET` in both: `openssl rand -base64 32`. Fill `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env.local` with any local values.

- [ ] **Step 4: Update `.gitignore`**

Append to the scaffold `.gitignore`:

```
.env*
!.env.example
```

- [ ] **Step 5: Write `drizzle.config.ts`**

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 6: Write `db/index.ts`**

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });
export { client as pgClient };
```

- [ ] **Step 7: Start the DB and verify connectivity**

```bash
docker compose up -d db
docker compose exec db pg_isready -U postgres
```
Expected: `accepting connections`.

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml docker/ drizzle.config.ts db/index.ts .env.example .gitignore
git commit -m "Local DB Setup - dockerized postgres with pgvector and drizzle client"
```

---

### Task 4: Fonts, design tokens, theme, root layout

**Files:**
- Create: `public/fonts/` (copied), `src/components/theme-provider.tsx`
- Modify: `src/app/globals.css` (replace), `src/app/layout.tsx` (replace), `src/app/page.tsx` (placeholder)

- [ ] **Step 1: Copy fonts from the old repo**

```bash
mkdir -p public/fonts
cp /home/muhammad/Work/itqan/quran-apps-directory/src/assets/fonts/ExpoArabic-Book.woff2 public/fonts/
cp /home/muhammad/Work/itqan/quran-apps-directory/src/assets/fonts/ExpoArabic-Medium.woff2 public/fonts/
cp /home/muhammad/Work/itqan/quran-apps-directory/src/assets/fonts/ExpoArabic-Bold.woff2 public/fonts/
cp /home/muhammad/Work/itqan/quran-apps-directory/src/assets/fonts/DG-Ghareeb-REG.ttf public/fonts/
```

- [ ] **Step 2: Replace `src/app/globals.css` with the token system**

```css
@import "tailwindcss";

@theme inline {
  --color-bg: var(--bg-color);
  --color-surface: var(--surface-color);
  --color-card: var(--card-bg);
  --color-text: var(--text-color);
  --color-text-secondary: var(--text-secondary);
  --color-border: var(--border-color);
  --color-primary: var(--primary-color);
  --color-primary-hover: var(--primary-hover);
  --radius-app: 8px;
  --font-sans: var(--font-expo), Rubik, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

:root {
  --bg-color: #ffffff;
  --surface-color: #f8f9fa;
  --card-bg: #ffffff;
  --text-color: #212529;
  --text-secondary: #6c757d;
  --border-color: #dee2e6;
  --hover-bg: rgba(0, 0, 0, 0.06);
  --primary-color: #a0533b;
  --primary-hover: #8a462f;
  --shadow-app: 0 2px 8px rgba(0, 0, 0, 0.1);
  --hero-warm-soft: rgba(153, 96, 10, 0.25);
  --hero-mint-soft: rgba(18, 188, 172, 0.35);
}

.dark {
  --bg-color: #0f0f0f;
  --surface-color: #1a1a1a;
  --card-bg: #1e1e1e;
  --text-color: #ffffff;
  --text-secondary: #b3b3b3;
  --border-color: #333333;
  --hover-bg: rgba(255, 255, 255, 0.05);
  --primary-color: #ff8c42;
  --primary-hover: #ff7b2e;
  --shadow-app: 0 4px 16px rgba(0, 0, 0, 0.5);
}

html {
  background: var(--bg-color);
}

body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg-color);
  color: var(--text-color);
  font-family: var(--font-sans);
}

*, *::before, *::after {
  font-family: inherit;
}
```

- [ ] **Step 3: Write `src/components/theme-provider.tsx`**

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="auto" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 4: Replace `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const expoArabic = localFont({
  src: [
    { path: "../../public/fonts/ExpoArabic-Book.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/ExpoArabic-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/ExpoArabic-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-expo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "دليل التطبيقات القرآنية الشامل - أفضل تطبيقات القرآن الكريم",
    template: "%s | دليل التطبيقات القرآنية",
  },
  description:
    "الدليل الشامل لأفضل تطبيقات القرآن الكريم - تطبيقات المصحف، التفسير، التلاوة، التحفيظ والتدبر",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={expoArabic.variable}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Replace `src/app/page.tsx` with a placeholder**

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg p-8">
      <h1 className="text-3xl font-bold text-primary">دليل التطبيقات القرآنية</h1>
      <p className="mt-4 text-text-secondary">Foundation build — public pages land in Plan 2.</p>
    </main>
  );
}
```

- [ ] **Step 6: Verify**

Run: `npm run build && npm start & SERVER_PID=$!; sleep 3 && curl -s localhost:3000 | grep -o "دليل التطبيقات القرآنية" | head -1 && kill $SERVER_PID`
Expected: the Arabic title appears in served HTML.

- [ ] **Step 7: Commit**

```bash
git add public/fonts src/app src/components/theme-provider.tsx
git commit -m "Design Tokens - Expo Arabic fonts, light/dark CSS variables, theme provider"
```

---

### Task 5: Drizzle schema (all phase-1 tables)

**Files:**
- Create: `db/schema.ts`
- Test: `tests/schema.test.ts`

- [ ] **Step 1: Write the failing smoke test `tests/schema.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import postgres from "postgres";

const url = process.env.TEST_DATABASE_URL!;
const sql = postgres(url);

const EXPECTED_TABLES = [
  "users",
  "developers",
  "categories",
  "apps",
  "apps_categories",
  "app_screenshots",
  "metadata_types",
  "metadata_options",
  "app_metadata_values",
  "app_submissions",
  "app_submissions_categories",
  "submission_status_logs",
  "app_view_events",
];

describe("schema", () => {
  it("has all phase-1 tables", async () => {
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    const names = tables.map((t) => t.table_name);
    for (const expected of EXPECTED_TABLES) {
      expect(names).toContain(expected);
    }
  });

  it("has GIN indexes on app jsonb filter columns", async () => {
    const indexes = await sql`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'apps' AND indexname LIKE 'apps_%_gin'
    `;
    const names = indexes.map((i) => i.indexname);
    expect(names).toContain("apps_riwayah_gin");
    expect(names).toContain("apps_mushaf_type_gin");
    expect(names).toContain("apps_features_gin");
  });
});
```

- [ ] **Step 2: Push schema to the test DB first so the test fails for the right reason, then confirm failure**

```bash
npx drizzle-kit push --force --url=postgres://postgres:postgres@localhost:5433/qad_test
```
(With no `db/schema.ts` yet, drizzle-kit fails.) Then run the test:

Run: `npx vitest run tests/schema.test.ts`
Expected: FAIL — drizzle-kit error and/or missing tables.

- [ ] **Step 3: Write `db/schema.ts`**

```ts
import {
  pgTable,
  bigserial,
  bigint,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core";

/** Mirrors old core.BaseModel: id + created_at + updated_at */
function baseColumns() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  };
}

export const users = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  isStaff: boolean("is_staff").default(false).notNull(),
  ...baseColumns(),
});

export const developers = pgTable(
  "developers",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    nameEn: text("name_en").notNull().unique(),
    nameAr: text("name_ar").notNull().unique(),
    website: text("website"),
    email: text("email"),
    logoUrl: text("logo_url"),
    descriptionEn: text("description_en").default("").notNull(),
    descriptionAr: text("description_ar").default("").notNull(),
    socialLinks: jsonb("social_links").$type<Record<string, string>>().default({}).notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    ...baseColumns(),
  },
  (t) => [index("developers_is_verified_idx").on(t.isVerified)]
);

export const categories = pgTable(
  "categories",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    nameEn: text("name_en").notNull().unique(),
    nameAr: text("name_ar").notNull().unique(),
    descriptionEn: text("description_en").default("").notNull(),
    descriptionAr: text("description_ar").default("").notNull(),
    slug: text("slug").notNull().unique(),
    icon: text("icon"),
    color: text("color"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...baseColumns(),
  },
  (t) => [
    index("categories_slug_idx").on(t.slug),
    index("categories_is_active_idx").on(t.isActive),
    index("categories_sort_order_idx").on(t.sortOrder),
  ]
);

export const apps = pgTable(
  "apps",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    slug: text("slug").notNull().unique(),
    shortDescriptionEn: text("short_description_en").notNull(),
    shortDescriptionAr: text("short_description_ar").notNull(),
    descriptionEn: text("description_en").notNull(),
    descriptionAr: text("description_ar").notNull(),
    applicationIcon: text("application_icon").notNull(),
    mainImageEn: text("main_image_en").notNull(),
    mainImageAr: text("main_image_ar").notNull(),
    googlePlayLink: text("google_play_link"),
    appStoreLink: text("app_store_link"),
    appGalleryLink: text("app_gallery_link"),
    screenshotsEn: jsonb("screenshots_en").$type<string[]>().default([]).notNull(),
    screenshotsAr: jsonb("screenshots_ar").$type<string[]>().default([]).notNull(),
    avgRating: numeric("avg_rating", { precision: 3, scale: 2 }).default("0.00").notNull(),
    reviewCount: integer("review_count").default(0).notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    platform: text("platform").default("cross_platform").notNull(),
    featured: boolean("featured").default(false).notNull(),
    riwayah: jsonb("riwayah").$type<string[]>().default([]).notNull(),
    mushafType: jsonb("mushaf_type").$type<string[]>().default([]).notNull(),
    features: jsonb("features").$type<string[]>().default([]).notNull(),
    developerId: bigint("developer_id", { mode: "number" })
      .notNull()
      .references(() => developers.id, { onDelete: "cascade" }),
    status: text("status").default("draft").notNull(),
    ...baseColumns(),
  },
  (t) => [
    index("apps_name_en_idx").on(t.nameEn),
    index("apps_name_ar_idx").on(t.nameAr),
    index("apps_slug_idx").on(t.slug),
    index("apps_status_idx").on(t.status),
    index("apps_featured_idx").on(t.featured),
    index("apps_status_featured_idx").on(t.status, t.featured),
    index("apps_avg_rating_idx").on(t.avgRating),
    index("apps_review_count_idx").on(t.reviewCount),
    index("apps_view_count_idx").on(t.viewCount),
    index("apps_platform_idx").on(t.platform),
    index("apps_sort_order_idx").on(t.sortOrder),
    index("apps_developer_idx").on(t.developerId),
    index("apps_riwayah_gin").using("gin", t.riwayah),
    index("apps_mushaf_type_gin").using("gin", t.mushafType),
    index("apps_features_gin").using("gin", t.features),
  ]
);

/** M2M through table; names match Django defaults for simple migration */
export const appsCategories = pgTable("apps_categories", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  appId: bigint("app_id", { mode: "number" })
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  categoryId: bigint("category_id", { mode: "number" })
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
});

export const appScreenshots = pgTable(
  "app_screenshots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    appId: bigint("app_id", { mode: "number" })
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    language: text("language").default("en").notNull(),
    image: text("image").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [index("app_screenshots_app_lang_idx").on(t.appId, t.language, t.sortOrder)]
);

export const metadataTypes = pgTable(
  "metadata_types",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull().unique(),
    labelEn: text("label_en").notNull(),
    labelAr: text("label_ar").notNull(),
    descriptionEn: text("description_en").default("").notNull(),
    descriptionAr: text("description_ar").default("").notNull(),
    isMultiSelect: boolean("is_multi_select").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    icon: text("icon"),
    ...baseColumns(),
  },
  (t) => [index("metadata_types_is_active_idx").on(t.isActive)]
);

export const metadataOptions = pgTable(
  "metadata_options",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    metadataTypeId: bigint("metadata_type_id", { mode: "number" })
      .notNull()
      .references(() => metadataTypes.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    labelEn: text("label_en").notNull(),
    labelAr: text("label_ar").notNull(),
    descriptionEn: text("description_en").default("").notNull(),
    descriptionAr: text("description_ar").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    icon: text("icon"),
    color: text("color"),
    ...baseColumns(),
  },
  (t) => [
    uniqueIndex("unique_metadata_type_value").on(t.metadataTypeId, t.value),
    index("metadata_options_type_active_idx").on(t.metadataTypeId, t.isActive),
    index("metadata_options_value_idx").on(t.value),
  ]
);

export const appMetadataValues = pgTable(
  "app_metadata_values",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    appId: bigint("app_id", { mode: "number" })
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    metadataOptionId: bigint("metadata_option_id", { mode: "number" })
      .notNull()
      .references(() => metadataOptions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("unique_app_metadata_option").on(t.appId, t.metadataOptionId)]
);

export const appSubmissions = pgTable(
  "app_submissions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    trackingId: text("tracking_id").notNull().unique(),
    status: text("status").default("pending").notNull(),
    submitterName: text("submitter_name").default("").notNull(),
    submitterEmail: text("submitter_email").notNull(),
    submitterPhone: text("submitter_phone").default("").notNull(),
    submitterOrganization: text("submitter_organization").default("").notNull(),
    isDeveloper: boolean("is_developer").default(false).notNull(),
    appNameEn: text("app_name_en").notNull(),
    appNameAr: text("app_name_ar").default("").notNull(),
    shortDescriptionEn: text("short_description_en").default("").notNull(),
    shortDescriptionAr: text("short_description_ar").default("").notNull(),
    descriptionEn: text("description_en").default("").notNull(),
    descriptionAr: text("description_ar").default("").notNull(),
    googlePlayLink: text("google_play_link").default("").notNull(),
    appStoreLink: text("app_store_link").default("").notNull(),
    appGalleryLink: text("app_gallery_link").default("").notNull(),
    websiteLink: text("website_link").default("").notNull(),
    crawledContent: text("crawled_content"),
    appIconUrl: text("app_icon_url").default("").notNull(),
    mainImageEn: text("main_image_en").default("").notNull(),
    mainImageAr: text("main_image_ar").default("").notNull(),
    screenshotsEn: jsonb("screenshots_en").$type<string[]>().default([]).notNull(),
    screenshotsAr: jsonb("screenshots_ar").$type<string[]>().default([]).notNull(),
    additionalNotes: text("additional_notes").default("").notNull(),
    contentConfirmation: boolean("content_confirmation").default(false).notNull(),
    adminNotes: text("admin_notes").default("").notNull(),
    rejectionReason: text("rejection_reason").default("").notNull(),
    infoRequestMessage: text("info_request_message").default("").notNull(),
    reviewedById: bigint("reviewed_by_id", { mode: "number" }).references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAppId: bigint("created_app_id", { mode: "number" }).references(() => apps.id, {
      onDelete: "set null",
    }),
    ...baseColumns(),
  },
  (t) => [
    index("app_submissions_status_idx").on(t.status),
    index("app_submissions_email_idx").on(t.submitterEmail),
    index("app_submissions_status_created_idx").on(t.status, t.createdAt),
  ]
);

export const appSubmissionsCategories = pgTable("app_submissions_categories", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  appsubmissionId: bigint("appsubmission_id", { mode: "number" })
    .notNull()
    .references(() => appSubmissions.id, { onDelete: "cascade" }),
  categoryId: bigint("category_id", { mode: "number" })
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
});

export const submissionStatusLogs = pgTable(
  "submission_status_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    submissionId: bigint("submission_id", { mode: "number" })
      .notNull()
      .references(() => appSubmissions.id, { onDelete: "cascade" }),
    fromStatus: text("from_status").default("").notNull(),
    toStatus: text("to_status").notNull(),
    changedById: bigint("changed_by_id", { mode: "number" }).references(() => users.id, {
      onDelete: "set null",
    }),
    notes: text("notes").default("").notNull(),
    ...baseColumns(),
  },
  (t) => [index("submission_status_logs_submission_idx").on(t.submissionId)]
);

export const appViewEvents = pgTable(
  "app_view_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    appId: bigint("app_id", { mode: "number" })
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).defaultNow().notNull(),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    sessionId: text("session_id"),
    countryCode: text("country_code"),
    ipHash: text("ip_hash"),
    deviceType: text("device_type").default("unknown").notNull(),
    browser: text("browser"),
    os: text("os"),
  },
  (t) => [
    index("app_view_events_app_viewed_idx").on(t.appId, t.viewedAt),
    index("app_view_events_viewed_app_idx").on(t.viewedAt, t.appId),
    index("app_view_events_app_country_idx").on(t.appId, t.countryCode),
    index("app_view_events_app_device_idx").on(t.appId, t.deviceType),
  ]
);
```

- [ ] **Step 4: Push schema to both local databases**

```bash
npx drizzle-kit push --force
npx drizzle-kit push --force --url=postgres://postgres:postgres@localhost:5433/qad_test
```
Expected: no errors.

- [ ] **Step 5: Run the schema tests**

Run: `npx vitest run tests/schema.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add db/schema.ts tests/schema.test.ts
git commit -m "Drizzle Schema - all phase-1 tables with GIN indexes"
```

---

### Task 6: One-time live migration script

**Files:**
- Create: `db/migrate-live.ts`

- [ ] **Step 1: Write `db/migrate-live.ts`**

```ts
import postgres from "postgres";

const SOURCE_URL = process.env.LIVE_DB_URL;
const TARGET_URL = process.env.DATABASE_URL;
if (!SOURCE_URL || !TARGET_URL) {
  console.error("Set LIVE_DB_URL and DATABASE_URL first.");
  process.exit(1);
}

const source = postgres(SOURCE_URL, { max: 4 });
const target = postgres(TARGET_URL, { max: 4 });

type CopySpec = { table: string; columns: string[]; where?: string };

const SPECS: CopySpec[] = [
  {
    table: "developers",
    columns: [
      "id", "name_en", "name_ar", "website", "email", "logo_url",
      "description_en", "description_ar", "social_links", "is_verified",
      "created_at", "updated_at",
    ],
  },
  {
    table: "categories",
    columns: [
      "id", "name_en", "name_ar", "description_en", "description_ar",
      "slug", "icon", "color", "sort_order", "is_active", "created_at", "updated_at",
    ],
  },
  {
    table: "apps",
    columns: [
      "id", "name_en", "name_ar", "slug",
      "short_description_en", "short_description_ar",
      "description_en", "description_ar",
      "application_icon", "main_image_en", "main_image_ar",
      "google_play_link", "app_store_link", "app_gallery_link",
      "screenshots_en", "screenshots_ar",
      "avg_rating", "review_count", "view_count", "sort_order",
      "developer_id", "platform", "featured",
      "riwayah", "mushaf_type", "features",
      "status", "created_at", "updated_at",
    ],
  },
  { table: "apps_categories", columns: ["id", "app_id", "category_id"] },
  { table: "app_screenshots", columns: ["id", "app_id", "language", "image", "sort_order"] },
  {
    table: "metadata_types",
    columns: [
      "id", "name", "label_en", "label_ar", "description_en", "description_ar",
      "is_multi_select", "sort_order", "is_active", "icon", "created_at", "updated_at",
    ],
  },
  {
    table: "metadata_options",
    columns: [
      "id", "metadata_type_id", "value", "label_en", "label_ar",
      "description_en", "description_ar", "sort_order", "is_active",
      "icon", "color", "created_at", "updated_at",
    ],
  },
  { table: "app_metadata_values", columns: ["id", "app_id", "metadata_option_id", "created_at"] },
  {
    table: "app_submissions",
    columns: [
      "id", "tracking_id", "status",
      "submitter_name", "submitter_email", "submitter_phone", "submitter_organization",
      "is_developer", "app_name_en", "app_name_ar",
      "short_description_en", "short_description_ar", "description_en", "description_ar",
      "google_play_link", "app_store_link", "app_gallery_link", "website_link",
      "app_icon_url", "main_image_en", "main_image_ar",
      "screenshots_en", "screenshots_ar",
      "additional_notes", "content_confirmation",
      "admin_notes", "rejection_reason", "info_request_message",
      "reviewed_by_id", "reviewed_at", "created_app_id",
      "created_at", "updated_at",
    ],
  },
  { table: "app_submissions_categories", columns: ["id", "appsubmission_id", "category_id"] },
  {
    table: "submission_status_logs",
    columns: [
      "id", "submission_id", "from_status", "to_status",
      "changed_by_id", "notes", "created_at", "updated_at",
    ],
  },
  {
    table: "app_view_events",
    columns: [
      "id", "app_id", "viewed_at", "referrer", "user_agent", "session_id",
      "country_code", "ip_hash", "device_type", "browser", "os",
    ],
    where: "viewed_at > now() - interval '90 days'",
  },
];

const CHUNK = 500;

async function copyTable(spec: CopySpec): Promise<number> {
  const where = spec.where ? `WHERE ${spec.where}` : "";
  const rows = await source.unsafe(
    `SELECT ${spec.columns.join(",")} FROM ${spec.table} ${where}`
  );
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const flat: unknown[] = [];
    const tuples = chunk.map((row) => {
      const r = row as Record<string, unknown>;
      const ph = spec.columns.map((_, idx) => `$${flat.push(r[spec.columns[idx]]), flat.length}`).join(",");
      return `(${ph})`;
    });
    await target.unsafe(
      `INSERT INTO ${spec.table} (${spec.columns.join(",")}) VALUES ${tuples.join(",")} ON CONFLICT DO NOTHING`,
      flat
    );
    inserted += chunk.length;
  }
  return inserted;
}

async function fixSequences() {
  for (const spec of SPECS) {
    await target.unsafe(
      `SELECT setval(pg_get_serial_sequence('${spec.table}','id'), COALESCE((SELECT MAX(id) FROM ${spec.table}), 1))`
    );
  }
}

async function main() {
  console.log("Migrating", SPECS.length, "tables...");
  for (const spec of SPECS) {
    const n = await copyTable(spec);
    console.log(`${spec.table}: ${n}`);
  }
  await fixSequences();
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

- [ ] **Step 2: Add npm scripts to `package.json`**

```json
"scripts": {
  "db:push": "drizzle-kit push --force",
  "db:push:test": "drizzle-kit push --force --url=postgres://postgres:postgres@localhost:5433/qad_test",
  "db:migrate-live": "node --experimental-strip-types --env-file=.env.local db/migrate-live.ts"
}
```

- [ ] **Step 3: Dry-run against a copy of the production DB (never the live one directly)**

```bash
# Obtain a Railway prod DB dump/copy first, restore it to a scratch DB, then:
LIVE_DB_URL=postgres://...scratch... npm run db:migrate-live
```
Expected: table-by-table counts printed; `apps: 44` (or current live count). Re-run once to verify idempotency (counts identical, no duplicate rows).

- [ ] **Step 4: Commit**

```bash
git add db/migrate-live.ts package.json
git commit -m "Live Migration - one-time data migration script with ID preservation"
```

---

### Task 7: Idempotent JSON fallback seed + metadata seeds + admin user

**Files:**
- Create: `db/seed-data/applications_data_python.json` (copied), `db/seed.ts`

- [ ] **Step 1: Copy fallback seed data from the old repo**

```bash
mkdir -p db/seed-data
cp /home/muhammad/Work/itqan/quran-apps-directory/backend/applications_data_python.json db/seed-data/
```

- [ ] **Step 2: Write `db/seed.ts`**

```ts
import "dotenv/config";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 4 });

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  mushaf: { en: "Mushaf", ar: "مصحف" },
  tafsir: { en: "Tafsir", ar: "تفسير" },
  recite: { en: "Recite", ar: "تسميع" },
  memorize: { en: "Memorize", ar: "تحفيظ" },
  kids: { en: "Kids", ar: "أطفال" },
  translations: { en: "Translation", ar: "ترجمات" },
  audio: { en: "Audio", ar: "صوتيات" },
  riwayat: { en: "Riwayat", ar: "روايات" },
  tools: { en: "Other", ar: "أخرى" },
  accessibility: { en: "Accessibility", ar: "ذوي الإعاقة" },
  tajweed: { en: "Tajweed", ar: "تجويد" },
};

const METADATA_SEED = {
  riwayah: {
    label_en: "Riwayah", label_ar: "الرواية", sort_order: 1,
    description_en: "Quranic recitation style (method of recitation)",
    description_ar: "رواية القرآن الكريم (طريقة التلاوة)",
    options: [
      ["hafs", "Hafs", "حفص"], ["warsh", "Warsh", "ورش"], ["qalun", "Qalun", "قالون"],
      ["shubah", "Shu'bah", "شعبة"], ["alduri", "Al-Duri", "الدوري"], ["alsusi", "Al-Susi", "السوسي"],
      ["hisham", "Hisham", "هشام"], ["ibn_dhakwan", "Ibn Dhakwan", "ابن ذكوان"],
      ["khalaf", "Khalaf", "خلف"], ["khallad", "Khallad", "خلاد"], ["other", "Other", "أخرى"],
    ],
  },
  mushaf_type: {
    label_en: "Mushaf Type", label_ar: "نوع المصحف", sort_order: 2,
    description_en: "Supported Mushaf types",
    description_ar: "أنواع المصاحف المدعومة",
    options: [
      ["madani", "Madani (Madinah)", "مديني"], ["uthmani", "Uthmani", "عثماني"],
      ["indo_pak", "Indo-Pakistani", "هندي باكستاني"], ["moroccan", "Moroccan", "مغربي"],
      ["simple", "Simple (Imlaei)", "إملائي"], ["tajweed", "Tajweed Colored", "مصحف التجويد"],
      ["other", "Other", "أخرى"],
    ],
  },
  features: {
    label_en: "Features", label_ar: "الميزات", sort_order: 3,
    description_en: "App features",
    description_ar: "ميزات التطبيق",
    options: [
      ["offline", "Offline Mode", "بدون إنترنت"], ["audio", "Audio Recitation", "تلاوة صوتية"],
      ["translation", "Translation", "ترجمة"], ["tafsir", "Tafsir", "تفسير"],
      ["bookmarks", "Bookmarks", "إشارات مرجعية"], ["search", "Search", "بحث"],
      ["tajweed", "Tajweed", "تجويد"], ["dark_mode", "Dark Mode", "الوضع الليلي"],
      ["memorization", "Memorization Tools", "أدوات الحفظ"], ["prayer_times", "Prayer Times", "مواقيت الصلاة"],
      ["qibla", "Qibla Direction", "اتجاه القبلة"], ["notifications", "Notifications", "الإشعارات"],
    ],
  },
};

type AppRow = {
  id: string; Name_Ar: string; Name_En: string;
  Short_Description_Ar: string; Short_Description_En: string;
  Description_Ar: string; Description_En: string;
  sort: number; Apps_Avg_Rating: number; categories: string[];
  screenshots_ar: string[]; screenshots_en: string[];
  mainImage_ar: string; mainImage_en: string; applicationIcon: string;
  Developer_Name_En: string; Developer_Name_Ar: string; Developer_Website: string;
  Google_Play_Link: string; AppStore_Link: string; App_Gallery_Link: string;
};

async function seedCategories() {
  let i = 0;
  for (const [slug, labels] of Object.entries(CATEGORY_LABELS)) {
    i += 1;
    await sql`
      INSERT INTO categories (name_en, name_ar, slug, sort_order, is_active)
      VALUES (${labels.en}, ${labels.ar}, ${slug}, ${i}, true)
      ON CONFLICT (slug) DO NOTHING
    `;
  }
}

async function seedMetadata() {
  let t = 0;
  for (const [name, def] of Object.entries(METADATA_SEED)) {
    t += 1;
    const rows = await sql`
      INSERT INTO metadata_types (name, label_en, label_ar, description_en, description_ar, is_multi_select, sort_order, is_active)
      VALUES (${name}, ${def.label_en}, ${def.label_ar}, ${def.description_en}, ${def.description_ar}, true, ${def.sort_order}, true)
      ON CONFLICT (name) DO NOTHING
      RETURNING id
    `;
    if (rows.length === 0) continue; // already seeded
    const typeId = rows[0].id as number;
    let o = 0;
    for (const [value, en, ar] of def.options as [string, string, string][]) {
      o += 1;
      await sql`
        INSERT INTO metadata_options (metadata_type_id, value, label_en, label_ar, sort_order, is_active)
        VALUES (${typeId}, ${value}, ${en}, ${ar}, ${o}, true)
        ON CONFLICT (metadata_type_id, value) DO NOTHING
      `;
    }
    console.log(`metadata: ${name} seeded`);
  }
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("admin: skipped (ADMIN_EMAIL/ADMIN_PASSWORD not set)");
    return;
  }
  const hash = bcrypt.hashSync(password, 12);
  await sql`
    INSERT INTO users (email, password_hash, name, is_staff)
    VALUES (${email}, ${hash}, 'Admin', true)
    ON CONFLICT (email) DO NOTHING
  `;
  console.log("admin: ensured");
}

async function seedAppsFromJson() {
  const raw = readFileSync(resolve("db/seed-data/applications_data_python.json"), "utf8");
  const data = JSON.parse(raw) as { apps: AppRow[] };
  const apps = data.apps;
  console.log(`apps: seeding ${apps.length} from JSON`);

  for (const a of apps) {
    // developer upsert by name_en
    const dev = await sql`
      INSERT INTO developers (name_en, name_ar, website)
      VALUES (${a.Developer_Name_En}, ${a.Developer_Name_Ar}, ${a.Developer_Website})
      ON CONFLICT (name_en) DO NOTHING
      RETURNING id
    `;
    let devId: number;
    if (dev.length > 0) devId = dev[0].id as number;
    else {
      const found = await sql`SELECT id FROM developers WHERE name_en = ${a.Developer_Name_En}`;
      devId = found[0].id as number;
    }

    const app = await sql`
      INSERT INTO apps (
        slug, name_en, name_ar,
        short_description_en, short_description_ar,
        description_en, description_ar,
        application_icon, main_image_en, main_image_ar,
        google_play_link, app_store_link, app_gallery_link,
        screenshots_en, screenshots_ar,
        avg_rating, sort_order, platform, featured, status, developer_id
      ) VALUES (
        ${a.id}, ${a.Name_En}, ${a.Name_Ar},
        ${a.Short_Description_En}, ${a.Short_Description_Ar},
        ${a.Description_En}, ${a.Description_Ar},
        ${a.applicationIcon}, ${a.mainImage_en}, ${a.mainImage_ar},
        ${a.Google_Play_Link}, ${a.AppStore_Link}, ${a.App_Gallery_Link},
        ${JSON.stringify(a.screenshots_en)}::jsonb, ${JSON.stringify(a.screenshots_ar)}::jsonb,
        ${a.Apps_Avg_Rating.toFixed(2)}, ${a.sort}, 'cross_platform', false, 'published', ${devId}
      )
      ON CONFLICT (slug) DO NOTHING
      RETURNING id
    `;
    if (app.length === 0) continue; // already present

    const appId = app[0].id as number;
    // category links
    for (const catSlug of a.categories) {
      const cat = await sql`SELECT id FROM categories WHERE slug = ${catSlug}`;
      if (cat.length > 0) {
        await sql`
          INSERT INTO apps_categories (app_id, category_id) VALUES (${appId}, ${cat[0].id as number})
          ON CONFLICT DO NOTHING
        `;
      }
    }
    // screenshot file rows
    for (const [lang, urls] of [["en", a.screenshots_en], ["ar", a.screenshots_ar]] as const) {
      for (let s = 0; s < urls.length; s++) {
        await sql`
          INSERT INTO app_screenshots (app_id, language, image, sort_order)
          VALUES (${appId}, ${lang}, ${urls[s]}, ${s})
        `;
      }
    }
  }
  console.log("apps: done");
}

async function main() {
  await seedCategories();
  await seedMetadata();
  await seedAppsFromJson();
  await seedAdmin();
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Add npm script**

```json
"db:seed": "node --experimental-strip-types --env-file=.env.local db/seed.ts"
```

- [ ] **Step 4: Run and verify idempotency**

```bash
npm run db:seed && npm run db:seed
```
Expected: second run logs zero new inserts (all `ON CONFLICT DO NOTHING`).

- [ ] **Step 5: Commit**

```bash
git add db/seed-data db/seed.ts package.json
git commit -m "Seed - idempotent JSON seed, metadata seeds, seeded admin user"
```

---

### Task 8: Arabic utils + `lib/repo/apps.ts` (TDD)

**Files:**
- Create: `src/lib/services/arabic.ts`, `src/lib/repo/apps.ts`
- Test: `tests/arabic.test.ts`, `tests/apps-repo.test.ts`

- [ ] **Step 1: Write failing tests `tests/arabic.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { normalizeArabic } from "@/lib/services/arabic";

describe("normalizeArabic", () => {
  it("removes tashkeel", () => {
    expect(normalizeArabic("مُحَمَّد")).toBe("محمد");
  });
  it("folds alef variants", () => {
    expect(normalizeArabic("أإآٱ")).toBe("اااا");
  });
  it("folds taa marbuta and hamza carriers", () => {
    expect(normalizeArabic("ةؤئ")).toBe("هوي");
  });
  it("handles empty string", () => {
    expect(normalizeArabic("")).toBe("");
  });
});
```

Run: `npx vitest run tests/arabic.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 2: Write `src/lib/services/arabic.ts` (port of arabic.py core)**

```ts
/** Arabic text normalization for search matching. Port of backend/core/utils/arabic.py. */

const TASHKEEL = /[\u064B-\u065F\u0670]/g;
const ALEF_VARIANTS: Record<string, string> = { "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا" };
const CHAR_NORMALIZE: Record<string, string> = { "ة": "ه", "ؤ": "و", "ئ": "ي" };

export function normalizeArabic(text: string): string {
  if (!text) return "";
  return text
    .replace(TASHKEEL, "")
    .replace(/[أإآٱةؤئ]/g, (ch) => ALEF_VARIANTS[ch] ?? CHAR_NORMALIZE[ch] ?? ch);
}
```

Run: `npx vitest run tests/arabic.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 3: Write failing tests `tests/apps-repo.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { getApps, getApp, type AppsFilters } from "@/lib/repo/apps";

const url = process.env.TEST_DATABASE_URL!;
const sql = postgres(url);

let devA = 0, devB = 0, catMushaf = 0, catTafsir = 0;

async function seedFixtures() {
  const d = await sql`
    INSERT INTO developers (name_en, name_ar) VALUES ('T:Unit A', 'وحدة أ'), ('T:Unit B', 'وحدة ب')
    RETURNING id
  `;
  devA = d[0].id; devB = d[1].id;
  const c = await sql`
    INSERT INTO categories (name_en, name_ar, slug) VALUES ('T:Mushaf', 'مصحف', 't-mushaf'), ('T:Tafsir', 'تفسير', 't-tafsir')
    RETURNING id
  `;
  catMushaf = c[0].id; catTafsir = c[1].id;

  const apps = await sql`
    INSERT INTO apps
      (slug, name_en, name_ar, short_description_en, short_description_ar, description_en, description_ar,
       application_icon, main_image_en, main_image_ar, avg_rating, sort_order, platform, featured, status, developer_id,
       riwayah, mushaf_type, features)
    VALUES
      ('t-app-1', 'Alpha', 'ألفا', 'd1', 'د1', 'desc1', 'وصف1', 'i1.png', 'c1.png', 'c1.png', '4.50', 1, 'android', true, 'published', ${devA}, '["hafs","warsh"]'::jsonb, '["madani"]'::jsonb, '["offline","audio"]'::jsonb),
      ('t-app-2', 'Beta', 'بيتا', 'd2', 'د2', 'desc2', 'وصف2', 'i2.png', 'c2.png', 'c2.png', '3.00', 2, 'ios', false, 'published', ${devA}, '["hafs"]'::jsonb, '[]'::jsonb, '["audio"]'::jsonb),
      ('t-app-3', 'Gamma', 'غاما', 'd3', 'د3', 'desc3', 'وصف3', 'i3.png', 'c3.png', 'c3.png', '5.00', 3, 'cross_platform', true, 'draft', ${devB}, '["warsh"]'::jsonb, '[]'::jsonb, '[]'::jsonb)
    RETURNING id
  `;
  await sql`INSERT INTO apps_categories (app_id, category_id) VALUES (${apps[0].id}, ${catMushaf}), (${apps[1].id}, ${catTafsir})`;
}

beforeAll(async () => {
  await seedFixtures();
});

afterAll(async () => {
  await sql`DELETE FROM apps WHERE slug LIKE 't-app-%'`;
  await sql`DELETE FROM categories WHERE slug LIKE 't-%'`;
  await sql`DELETE FROM developers WHERE name_en LIKE 'T:Unit%'`;
  await sql.end();
});

describe("getApps", () => {
  it("returns published apps ordered by sort_order by default", async () => {
    const res = await getApps({});
    expect(res.count).toBe(2);
    expect(res.results[0].slug).toBe("t-app-1");
  });

  it("filters by category (OR within)", async () => {
    const res = await getApps({ categorySlugs: ["t-mushaf", "t-tafsir"] });
    expect(res.count).toBe(2);
  });

  it("AND between different filter fields", async () => {
    const res: Awaited<ReturnType<typeof getApps>> = await getApps({
      platforms: ["ios"], featured: false,
    });
    expect(res.count).toBe(1);
    expect(res.results[0].slug).toBe("t-app-2");
  });

  it("OR within one jsonb metadata field via GIN", async () => {
    const res = await getApps({ riwayah: ["warsh"] });
    expect(res.count).toBe(1); // only t-app-1 (t-app-3 is draft)
  });

  it("search matches name", async () => {
    const res = await getApps({ search: "alph" });
    expect(res.count).toBe(1);
    expect(res.results[0].slug).toBe("t-app-1");
  });

  it("respects ordering override", async () => {
    const res = await getApps({ ordering: "avg_rating,desc" });
    expect(res.results[0].slug).toBe("t-app-1");
  });

  it("paginates", async () => {
    const res = await getApps({ page: 2, pageSize: 1 });
    expect(res.count).toBe(2);
    expect(res.results.length).toBe(1);
  });

  it("includeDrafts shows drafts (admin path)", async () => {
    const res = await getApps({ status: "draft" });
    expect(res.count).toBe(1);
    expect(res.results[0].slug).toBe("t-app-3");
  });
});

describe("getApp", () => {
  it("resolves by slug with developer and categories", async () => {
    const app = await getApp("t-app-1");
    expect(app).not.toBeNull();
    expect(app!.developer.nameEn).toBe("T:Unit A");
    expect(app!.categories[0].slug).toBe("t-mushaf");
  });

  it("resolves by id", async () => {
    const bySlug = await getApp("t-app-1");
    const byId = await getApp(String(bySlug!.id));
    expect(byId!.slug).toBe("t-app-1");
  });

  it("does not return drafts without includeDrafts", async () => {
    expect(await getApp("t-app-3")).toBeNull();
    expect(await getApp("t-app-3", { includeDrafts: true })).not.toBeNull();
  });
});
```

Run: `npx vitest run tests/apps-repo.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Write `src/lib/repo/apps.ts`**

```ts
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { apps, appsCategories, categories, developers } from "@/db/schema";
import { normalizeArabic } from "@/lib/services/arabic";

export type AppsFilters = {
  search?: string;
  developerId?: number;
  categorySlugs?: string[];
  platforms?: string[];
  featured?: boolean;
  status?: string; // default "published"; "draft" etc. for admin
  riwayah?: string[];
  mushafType?: string[];
  features?: string[];
  ordering?: string; // CSV like "sort_order,name_en" or "avg_rating,desc"
  page?: number;
  pageSize?: number;
};

export type AppListItem = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  shortDescriptionEn: string;
  shortDescriptionAr: string;
  applicationIcon: string;
  mainImageEn: string;
  mainImageAr: string;
  avgRating: string;
  reviewCount: number;
  viewCount: number;
  sortOrder: number;
  featured: boolean;
  platform: string;
  status: string;
  developer: {
    id: number;
    nameEn: string;
    nameAr: string;
    website: string | null;
    logo: string | null;
  };
  categories: { id: number; slug: string; nameEn: string; nameAr: string }[];
};

const ORDERABLE = {
  sort_order: apps.sortOrder,
  name_en: apps.nameEn,
  avg_rating: apps.avgRating,
  view_count: apps.viewCount,
  review_count: apps.reviewCount,
  created_at: apps.createdAt,
} as const;

function parseOrdering(ordering?: string) {
  const parts = (ordering ?? "sort_order,name_en").split(",").map((s) => s.trim());
  const dir = parts[parts.length - 1] === "desc" ? "desc" : "asc";
  const field = parts[0] in ORDERABLE ? (parts[0] as keyof typeof ORDERABLE) : "sort_order";
  const col = ORDERABLE[field];
  return dir === "desc" ? desc(col) : asc(col);
}

/** Build EXISTS condition for csv filters over jsonb arrays */
function jsonbAny(col: typeof apps.riwayah, values: string[]) {
  const list = sql.join(
    values.map((v) => sql`${v}`),
    sql`, `
  );
  return sql`${col} ?| array[${list}]::text[]`;
}

export async function getApps(filters: AppsFilters = {}) {
  const pageNum = Math.max(1, filters.page ?? 1);
  const pageSizeNum = Math.min(200, Math.max(1, filters.pageSize ?? 100));
  const status = filters.status ?? "published";

  const conds = [eq(apps.status, status)];
  if (filters.featured !== undefined) conds.push(eq(apps.featured, filters.featured));
  if (filters.developerId) conds.push(eq(apps.developerId, filters.developerId));
  if (filters.platforms?.length) conds.push(inArray(apps.platform, filters.platforms));
  if (filters.riwayah?.length) conds.push(jsonbAny(apps.riwayah, filters.riwayah));
  if (filters.mushafType?.length) conds.push(jsonbAny(apps.mushafType, filters.mushafType));
  if (filters.features?.length) conds.push(jsonbAny(apps.features, filters.features));
  if (filters.categorySlugs?.length) {
    conds.push(sql`EXISTS (
      SELECT 1 FROM apps_categories ac
      JOIN categories ON categories.id = ac.category_id
      WHERE ac.app_id = apps.id AND categories.slug IN (${sql.join(
        filters.categorySlugs.map((s) => sql`${s}`),
        sql`, `
      )})
    )`);
  }
  if (filters.search) {
    const raw = `%${filters.search.trim()}%`;
    const norm = `%${normalizeArabic(filters.search.trim())}%`;
    conds.push(
      or(
        ilike(apps.nameEn, raw),
        ilike(apps.nameAr, raw),
        ilike(apps.shortDescriptionEn, raw),
        ilike(apps.shortDescriptionAr, raw),
        norm !== raw ? sql`translate(${apps.nameAr}, 'أإآٱةؤئ', 'اااااهوي') ILIKE ${norm}` : sql`false`
      )!
    );
  }

  const where = and(...conds);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(apps)
    .where(where);

  const rows = await db
    .select({
      id: apps.id,
      slug: apps.slug,
      nameEn: apps.nameEn,
      nameAr: apps.nameAr,
      shortDescriptionEn: apps.shortDescriptionEn,
      shortDescriptionAr: apps.shortDescriptionAr,
      applicationIcon: apps.applicationIcon,
      mainImageEn: apps.mainImageEn,
      mainImageAr: apps.mainImageAr,
      avgRating: apps.avgRating,
      reviewCount: apps.reviewCount,
      viewCount: apps.viewCount,
      sortOrder: apps.sortOrder,
      featured: apps.featured,
      platform: apps.platform,
      status: apps.status,
      devId: developers.id,
      devNameEn: developers.nameEn,
      devNameAr: developers.nameAr,
      devWebsite: developers.website,
      devLogo: developers.logoUrl,
    })
    .from(apps)
    .innerJoin(developers, eq(developers.id, apps.developerId))
    .where(where)
    .orderBy(parseOrdering(filters.ordering), asc(apps.nameEn))
    .limit(pageSizeNum)
    .offset((pageNum - 1) * pageSizeNum);

  const pageIds = rows.map((r) => r.id);
  const catRows =
    pageIds.length > 0
      ? await db
          .select({
            appId: appsCategories.appId,
            id: categories.id,
            slug: categories.slug,
            nameEn: categories.nameEn,
            nameAr: categories.nameAr,
          })
          .from(appsCategories)
          .innerJoin(categories, eq(categories.id, appsCategories.categoryId))
          .where(inArray(appsCategories.appId, pageIds))
      : [];
  const catsByApp = new Map<number, AppListItem["categories"]>();
  for (const c of catRows) {
    const list = catsByApp.get(c.appId) ?? [];
    list.push({ id: c.id, slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr });
    catsByApp.set(c.appId, list);
  }

  const results: AppListItem[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    nameEn: r.nameEn,
    nameAr: r.nameAr,
    shortDescriptionEn: r.shortDescriptionEn,
    shortDescriptionAr: r.shortDescriptionAr,
    applicationIcon: r.applicationIcon,
    mainImageEn: r.mainImageEn,
    mainImageAr: r.mainImageAr,
    avgRating: r.avgRating,
    reviewCount: r.reviewCount,
    viewCount: r.viewCount,
    sortOrder: r.sortOrder,
    featured: r.featured,
    platform: r.platform,
    status: r.status,
    developer: {
      id: r.devId,
      nameEn: r.devNameEn,
      nameAr: r.devNameAr,
      website: r.devWebsite,
      logo: r.devLogo,
    },
    categories: catsByApp.get(r.id) ?? [],
  }));

  return { count: total, page: pageNum, pageSize: pageSizeNum, results };
}

export type AppDetail = AppListItem & {
  descriptionEn: string;
  descriptionAr: string;
  googlePlayLink: string | null;
  appStoreLink: string | null;
  appGalleryLink: string | null;
  screenshotsEn: string[];
  screenshotsAr: string[];
  createdAt: Date;
  updatedAt: Date;
};

export async function getApp(
  idOrSlug: string,
  opts?: { includeDrafts?: boolean }
): Promise<AppDetail | null> {
  const isId = /^\d+$/.test(idOrSlug);
  const conds = [
    isId ? eq(apps.id, Number(idOrSlug)) : eq(apps.slug, idOrSlug),
    ...(opts?.includeDrafts ? [] : [eq(apps.status, "published")]),
  ];

  const rows = await db
    .select()
    .from(apps)
    .where(and(...conds))
    .limit(1);
  if (rows.length === 0) return null;
  const a = rows[0];

  const devRows = await db.select().from(developers).where(eq(developers.id, a.developerId)).limit(1);
  const d = devRows[0];

  const catRows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      nameEn: categories.nameEn,
      nameAr: categories.nameAr,
    })
    .from(appsCategories)
    .innerJoin(categories, eq(categories.id, appsCategories.categoryId))
    .where(eq(appsCategories.appId, a.id));

  // screenshots: prefer file rows, fallback to legacy jsonb
  const shotRows = await db
    .select()
    .from(appScreenshots)
    .where(eq(appScreenshots.appId, a.id))
    .orderBy(asc(appScreenshots.sortOrder));
  const shotsEn = shotRows.filter((s) => s.language === "en").map((s) => s.image);
  const shotsAr = shotRows.filter((s) => s.language === "ar").map((s) => s.image);

  return {
    id: a.id,
    slug: a.slug,
    nameEn: a.nameEn,
    nameAr: a.nameAr,
    shortDescriptionEn: a.shortDescriptionEn,
    shortDescriptionAr: a.shortDescriptionAr,
    descriptionEn: a.descriptionEn,
    descriptionAr: a.descriptionAr,
    applicationIcon: a.applicationIcon,
    mainImageEn: a.mainImageEn,
    mainImageAr: a.mainImageAr,
    googlePlayLink: a.googlePlayLink,
    appStoreLink: a.appStoreLink,
    appGalleryLink: a.appGalleryLink,
    screenshotsEn: shotsEn.length > 0 ? shotsEn : (a.screenshotsEn ?? []),
    screenshotsAr: shotsAr.length > 0 ? shotsAr : (a.screenshotsAr ?? []),
    avgRating: a.avgRating,
    reviewCount: a.reviewCount,
    viewCount: a.viewCount,
    sortOrder: a.sortOrder,
    featured: a.featured,
    platform: a.platform,
    status: a.status,
    developer: {
      id: d.id,
      nameEn: d.nameEn,
      nameAr: d.nameAr,
      website: d.website,
      logo: d.logoUrl,
    },
    categories: catRows,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

import { appScreenshots } from "@/db/schema";
```

- [ ] **Step 5: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

Create `tests/setup.ts`:

```ts
import { config as dotenvConfig } from "dotenv";

const env = dotenvConfig({ path: ".env.test" });
if (!process.env.TEST_DATABASE_URL && env?.parsed?.TEST_DATABASE_URL) {
  process.env.TEST_DATABASE_URL = env.parsed.TEST_DATABASE_URL;
}
```

Add npm script:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: PASS (arabic 4 + apps-repo 11 + schema 2).

- [ ] **Step 7: Commit**

```bash
git add src/lib tests vitest.config.ts package.json
git commit -m "Repo Layer - apps repository with AND/OR filters, TDD coverage"
```

---

### Task 9: Remaining repo functions (categories, developers, metadata)

**Files:**
- Create: `src/lib/repo/categories.ts`, `src/lib/repo/developers.ts`, `src/lib/repo/metadata.ts`
- Test: `tests/repo-misc.test.ts`

- [ ] **Step 1: Write failing tests `tests/repo-misc.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { getCategories } from "@/lib/repo/categories";
import { getDeveloperApps } from "@/lib/repo/developers";
import { getActiveMetadataNames, getMetadataValues } from "@/lib/repo/metadata";

const sql = postgres(process.env.TEST_DATABASE_URL!);

beforeAll(async () => {
  await sql`
    INSERT INTO categories (name_en, name_ar, slug, sort_order, is_active)
    VALUES ('T:Active', 'مفعّل', 't-active', 1, true), ('T:Inactive', 'معطّل', 't-inactive', 2, false)
  `;
  await sql`INSERT INTO metadata_types (name, label_en, label_ar, is_active) VALUES ('t_type', 'T', 'ت', true)`;
  await sql`
    INSERT INTO metadata_options (metadata_type_id, value, label_en, label_ar, is_active)
    SELECT id, 't_val', 'V', 'قيمة', true FROM metadata_types WHERE name = 't_type'
  `;
  const dev = await sql`INSERT INTO developers (name_en, name_ar) VALUES ('T:Dev', 'مطور') RETURNING id`;
  await sql`
    INSERT INTO apps (slug, name_en, name_ar, short_description_en, short_description_ar,
      description_en, description_ar, application_icon, main_image_en, main_image_ar,
      status, developer_id, riwayah)
    VALUES ('t-app-9', 'Zeta', 'زيتا', 'd', 'د', 'desc', 'وصف', 'i.png', 'c.png', 'c.png', 'published', ${dev[0].id}, '["hafs"]'::jsonb)
  `;
});

afterAll(async () => {
  await sql`DELETE FROM apps WHERE slug = 't-app-9'`;
  await sql`DELETE FROM categories WHERE slug LIKE 't-%'`;
  await sql`DELETE FROM metadata_types WHERE name = 't_type'`;
  await sql`DELETE FROM developers WHERE name_en = 'T:Dev'`;
  await sql.end();
});

describe("getCategories", () => {
  it("returns only active categories with app counts", async () => {
    const cats = await getCategories();
    const active = cats.find((c) => c.slug === "t-active");
    expect(active).toBeDefined();
    expect(active!.appCount).toBe(0);
    expect(cats.find((c) => c.slug === "t-inactive")).toBeUndefined();
  });
});

describe("getDeveloperApps", () => {
  it("returns published apps of developer id with developer info", async () => {
    const dev = await sql`SELECT id FROM developers WHERE name_en = 'T:Dev'`;
    const res = await getDeveloperApps(dev[0].id as number);
    expect(res.count).toBe(1);
    expect(res.results[0].slug).toBe("t-app-9");
    expect(res.developer?.nameEn).toBe("T:Dev");
  });
});

describe("metadata", () => {
  it("lists active metadata names", async () => {
    const names = await getActiveMetadataNames();
    expect(names).toContain("t_type");
  });

  it("returns bilingual values with counts", async () => {
    const vals = await getMetadataValues();
    expect(vals.platforms).toBeDefined();
  });
});
```

Run: `npx vitest run tests/repo-misc.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 2: Write `src/lib/repo/categories.ts`**

```ts
import { eq, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import { appsCategories, categories } from "@/db/schema";

export type CategoryItem = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  appCount: number;
};

export async function getCategories(): Promise<CategoryItem[]> {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      nameEn: categories.nameEn,
      nameAr: categories.nameAr,
      descriptionEn: categories.descriptionEn,
      descriptionAr: categories.descriptionAr,
      icon: categories.icon,
      color: categories.color,
      sortOrder: categories.sortOrder,
      appCount: sql<number>`(SELECT count(*)::int FROM apps_categories ac
        JOIN apps a ON a.id = ac.app_id
        WHERE ac.category_id = ${categories.id} AND a.status = 'published')`,
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder), asc(categories.nameEn));
  return rows;
}

export async function getCategoryBySlug(slug: string) {
  const rows = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return rows[0] ?? null;
}
```

- [ ] **Step 3: Write `src/lib/repo/developers.ts`**

```ts
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { apps, developers } from "@/db/schema";
import type { AppListItem } from "./apps";
import { getAppListRows } from "./apps-rows";

export async function getDeveloperApps(developerId: number): Promise<{
  count: number;
  developer: { id: number; nameEn: string; nameAr: string; website: string | null; logo: string | null } | null;
  results: AppListItem[];
}> {
  const devRows = await db.select().from(developers).where(eq(developers.id, developerId)).limit(1);
  if (devRows.length === 0) return { count: 0, developer: null, results: [] };
  const d = devRows[0];
  const res = await getAppListRows({ developerId });
  return {
    count: res.count,
    developer: { id: d.id, nameEn: d.nameEn, nameAr: d.nameAr, website: d.website, logo: d.logoUrl },
    results: res.results,
  };
}
```

Write the shared row-fetch helper `src/lib/repo/apps-rows.ts` (extracted from Task 8 so developers.ts reuses the exact same query — DRY):

```ts
import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { apps, appsCategories, categories, developers } from "@/db/schema";
import type { AppListItem, AppsFilters } from "./apps";
import { normalizeArabic } from "@/lib/services/arabic";

function jsonbAny(col: typeof apps.riwayah, values: string[]) {
  const list = sql.join(
    values.map((v) => sql`${v}`),
    sql`, `
  );
  return sql`${col} ?| array[${list}]::text[]`;
}

export async function getAppListRows(filters: AppsFilters): Promise<{
  count: number;
  results: AppListItem[];
}> {
  const pageNum = Math.max(1, filters.page ?? 1);
  const pageSizeNum = Math.min(200, Math.max(1, filters.pageSize ?? 100));
  const status = filters.status ?? "published";

  const conds = [eq(apps.status, status)];
  if (filters.featured !== undefined) conds.push(eq(apps.featured, filters.featured));
  if (filters.developerId) conds.push(eq(apps.developerId, filters.developerId));
  if (filters.platforms?.length) conds.push(inArray(apps.platform, filters.platforms));
  if (filters.riwayah?.length) conds.push(jsonbAny(apps.riwayah, filters.riwayah));
  if (filters.mushafType?.length) conds.push(jsonbAny(apps.mushafType, filters.mushafType));
  if (filters.features?.length) conds.push(jsonbAny(apps.features, filters.features));
  if (filters.categorySlugs?.length) {
    conds.push(sql`EXISTS (
      SELECT 1 FROM apps_categories ac
      JOIN categories ON categories.id = ac.category_id
      WHERE ac.app_id = apps.id AND categories.slug IN (${sql.join(
        filters.categorySlugs.map((s) => sql`${s}`),
        sql`, `
      )})
    )`);
  }
  if (filters.search) {
    const raw = `%${filters.search.trim()}%`;
    const norm = `%${normalizeArabic(filters.search.trim())}%`;
    conds.push(
      or(
        ilike(apps.nameEn, raw),
        ilike(apps.nameAr, raw),
        ilike(apps.shortDescriptionEn, raw),
        ilike(apps.shortDescriptionAr, raw),
        norm !== raw ? sql`translate(${apps.nameAr}, 'أإآٱةؤئ', 'اااااهوي') ILIKE ${norm}` : sql`false`
      )!
    );
  }

  const where = and(...conds);
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(apps)
    .where(where);

  const rows = await db
    .select({
      id: apps.id,
      slug: apps.slug,
      nameEn: apps.nameEn,
      nameAr: apps.nameAr,
      shortDescriptionEn: apps.shortDescriptionEn,
      shortDescriptionAr: apps.shortDescriptionAr,
      applicationIcon: apps.applicationIcon,
      mainImageEn: apps.mainImageEn,
      mainImageAr: apps.mainImageAr,
      avgRating: apps.avgRating,
      reviewCount: apps.reviewCount,
      viewCount: apps.viewCount,
      sortOrder: apps.sortOrder,
      featured: apps.featured,
      platform: apps.platform,
      status: apps.status,
      devId: developers.id,
      devNameEn: developers.nameEn,
      devNameAr: developers.nameAr,
      devWebsite: developers.website,
      devLogo: developers.logoUrl,
    })
    .from(apps)
    .innerJoin(developers, eq(developers.id, apps.developerId))
    .where(where)
    .orderBy(asc(apps.sortOrder), asc(apps.nameEn))
    .limit(pageSizeNum)
    .offset((pageNum - 1) * pageSizeNum);

  const pageIds = rows.map((r) => r.id);
  const catRows =
    pageIds.length > 0
      ? await db
          .select({
            appId: appsCategories.appId,
            id: categories.id,
            slug: categories.slug,
            nameEn: categories.nameEn,
            nameAr: categories.nameAr,
          })
          .from(appsCategories)
          .innerJoin(categories, eq(categories.id, appsCategories.categoryId))
          .where(inArray(appsCategories.appId, pageIds))
      : [];
  const catsByApp = new Map<number, AppListItem["categories"]>();
  for (const c of catRows) {
    const list = catsByApp.get(c.appId) ?? [];
    list.push({ id: c.id, slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr });
    catsByApp.set(c.appId, list);
  }

  const results: AppListItem[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    nameEn: r.nameEn,
    nameAr: r.nameAr,
    shortDescriptionEn: r.shortDescriptionEn,
    shortDescriptionAr: r.shortDescriptionAr,
    applicationIcon: r.applicationIcon,
    mainImageEn: r.mainImageEn,
    mainImageAr: r.mainImageAr,
    avgRating: r.avgRating,
    reviewCount: r.reviewCount,
    viewCount: r.viewCount,
    sortOrder: r.sortOrder,
    featured: r.featured,
    platform: r.platform,
    status: r.status,
    developer: {
      id: r.devId,
      nameEn: r.devNameEn,
      nameAr: r.devNameAr,
      website: r.devWebsite,
      logo: r.devLogo,
    },
    categories: catsByApp.get(r.id) ?? [],
  }));

  return { count: total, results };
}
```

Then simplify `src/lib/repo/apps.ts` to delegate — this is the final content of the file after Task 9 (replaces the Task 8 version):

```ts
import type { AppsFilters } from "./apps-rows";

export type { AppsFilters, AppListItem } from "./apps-rows";
export { getApp, type AppDetail } from "./apps-detail";

export async function getApps(filters: AppsFilters = {}) {
  const { count, results } = await getAppListRows(filters);
  const pageNum = Math.max(1, filters.page ?? 1);
  const pageSizeNum = Math.min(200, Math.max(1, filters.pageSize ?? 100));
  return { count, page: pageNum, pageSize: pageSizeNum, results };
}
```

```ts
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { apps, appScreenshots, appsCategories, categories, developers } from "@/db/schema";
import type { AppListItem } from "./apps-rows";

export type AppDetail = AppListItem & {
  descriptionEn: string;
  descriptionAr: string;
  googlePlayLink: string | null;
  appStoreLink: string | null;
  appGalleryLink: string | null;
  screenshotsEn: string[];
  screenshotsAr: string[];
  createdAt: Date;
  updatedAt: Date;
};

export async function getApp(
  idOrSlug: string,
  opts?: { includeDrafts?: boolean }
): Promise<AppDetail | null> {
  const isId = /^\d+$/.test(idOrSlug);
  const conds = [
    isId ? eq(apps.id, Number(idOrSlug)) : eq(apps.slug, idOrSlug),
    ...(opts?.includeDrafts ? [] : [eq(apps.status, "published")]),
  ];
  const rows = await db.select().from(apps).where(and(...conds)).limit(1);
  if (rows.length === 0) return null;
  const a = rows[0];

  const devRows = await db.select().from(developers).where(eq(developers.id, a.developerId)).limit(1);
  const d = devRows[0];

  const catRows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      nameEn: categories.nameEn,
      nameAr: categories.nameAr,
    })
    .from(appsCategories)
    .innerJoin(categories, eq(categories.id, appsCategories.categoryId))
    .where(eq(appsCategories.appId, a.id));

  const shotRows = await db
    .select()
    .from(appScreenshots)
    .where(eq(appScreenshots.appId, a.id))
    .orderBy(asc(appScreenshots.sortOrder));
  const shotsEn = shotRows.filter((s) => s.language === "en").map((s) => s.image);
  const shotsAr = shotRows.filter((s) => s.language === "ar").map((s) => s.image);

  return {
    id: a.id,
    slug: a.slug,
    nameEn: a.nameEn,
    nameAr: a.nameAr,
    shortDescriptionEn: a.shortDescriptionEn,
    shortDescriptionAr: a.shortDescriptionAr,
    descriptionEn: a.descriptionEn,
    descriptionAr: a.descriptionAr,
    applicationIcon: a.applicationIcon,
    mainImageEn: a.mainImageEn,
    mainImageAr: a.mainImageAr,
    googlePlayLink: a.googlePlayLink,
    appStoreLink: a.appStoreLink,
    appGalleryLink: a.appGalleryLink,
    screenshotsEn: shotsEn.length > 0 ? shotsEn : (a.screenshotsEn ?? []),
    screenshotsAr: shotsAr.length > 0 ? shotsAr : (a.screenshotsAr ?? []),
    avgRating: a.avgRating,
    reviewCount: a.reviewCount,
    viewCount: a.viewCount,
    sortOrder: a.sortOrder,
    featured: a.featured,
    platform: a.platform,
    status: a.status,
    developer: {
      id: d.id,
      nameEn: d.nameEn,
      nameAr: d.nameAr,
      website: d.website,
      logo: d.logoUrl,
    },
    categories: catRows,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}
```

Update `src/lib/repo/apps.ts` exports to point at both:

```ts
import { getAppListRows } from "./apps-rows";
import type { AppsFilters } from "./apps-rows";

export type { AppsFilters, AppListItem } from "./apps-rows";
export { getApp, type AppDetail } from "./apps-detail";

export async function getApps(filters: AppsFilters = {}) {
  const { count, results } = await getAppListRows(filters);
  const pageNum = Math.max(1, filters.page ?? 1);
  const pageSizeNum = Math.min(200, Math.max(1, filters.pageSize ?? 100));
  return { count, page: pageNum, pageSize: pageSizeNum, results };
}
```

- [ ] **Step 4: Write `src/lib/repo/metadata.ts`**

```ts
import { and, eq, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import { apps, appMetadataValues, metadataOptions, metadataTypes } from "@/db/schema";

export async function getActiveMetadataNames(): Promise<string[]> {
  const rows = await db
    .select({ name: metadataTypes.name })
    .from(metadataTypes)
    .where(eq(metadataTypes.isActive, true))
    .orderBy(asc(metadataTypes.sortOrder));
  return rows.map((r) => r.name);
}

export type MetadataValue = { value: string; labelEn: string; labelAr: string; count: number };
export type MetadataValuesResponse = {
  platforms: MetadataValue[];
  [key: string]: MetadataValue[]; // dynamic metadata types
};

const PLATFORMS: [string, string, string][] = [
  ["android", "Android", "أندرويد"],
  ["ios", "iOS", "آي أو إس"],
  ["web", "Web", "ويب"],
  ["cross_platform", "Cross Platform", "متعدد المنصات"],
];

export async function getMetadataValues(): Promise<MetadataValuesResponse> {
  const published = eq(apps.status, "published");

  const platforms: MetadataValue[] = [];
  for (const [value, en, ar] of PLATFORMS) {
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(apps)
      .where(and(published, eq(apps.platform, value)));
    if (c > 0) platforms.push({ value, labelEn: en, labelAr: ar, count: c });
  }

  const response: MetadataValuesResponse = { platforms };

  const types = await db
    .select()
    .from(metadataTypes)
    .where(eq(metadataTypes.isActive, true))
    .orderBy(asc(metadataTypes.sortOrder));

  for (const t of types) {
    const values = await db
      .select({
        value: metadataOptions.value,
        labelEn: metadataOptions.labelEn,
        labelAr: metadataOptions.labelAr,
        count: sql<number>`(SELECT count(*)::int FROM app_metadata_values amv
          JOIN apps a ON a.id = amv.app_id
          WHERE amv.metadata_option_id = ${metadataOptions.id} AND a.status = 'published')`,
      })
      .from(metadataOptions)
      .where(and(eq(metadataOptions.metadataTypeId, t.id), eq(metadataOptions.isActive, true)))
      .orderBy(asc(metadataOptions.sortOrder));
    response[t.name] = values.filter((v) => v.count > 0);
  }

  return response;
}
```

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: PASS (all suites).

- [ ] **Step 6: Commit**

```bash
git add src/lib/repo tests/repo-misc.test.ts
git commit -m "Repo Layer - categories, developers, metadata repositories"
```

---

### Task 10: Auth.js v5 admin auth

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/admin-guard.ts`, `src/app/admin/login/page.tsx`
- Modify: `src/middleware.ts` (new), `src/app/admin/layout.tsx` (new)

- [ ] **Step 1: Write `src/lib/auth.ts`**

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
        const user = rows[0];
        if (!user || !user.isStaff) return null;
        const valid = bcrypt.compareSync(password, user.passwordHash);
        if (!valid) return null;
        return { id: String(user.id), email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id ?? token.sub;
      return token;
    },
    session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.sub;
      return session;
    },
  },
});
```

- [ ] **Step 2: Write the auth handler route**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 3: Write `src/middleware.ts` (locale + admin guard)**

```ts
import createIntlMiddleware from "next-intl/middleware";
import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

const intl = createIntlMiddleware({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "always",
});

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();
    const session = await auth();
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  return intl(req);
}

export const config = {
  matcher: ["/((?!_next|_vercel|api|health|sentry-tunnel|upload|.*\\..*).*)"],
};
```

The matcher excludes: Next internals, all `/api/*` (incl. the auth handler), `/health`, `/sentry-tunnel`, `/upload` (created in Plan 3), and any path with a dot (static files). `/admin/*` is matched intentionally and branched inside the function.

- [ ] **Step 4: Write `src/app/admin/layout.tsx`**

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bg">{children}</div>;
}
```

- [ ] **Step 5: Write `src/app/admin/login/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError("بيانات الدخول غير صحيحة");
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-app bg-card p-6 shadow-app">
        <h1 className="mb-6 text-xl font-bold text-text">تسجيل دخول المشرف</h1>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="البريد الإلكتروني"
          className="mb-4 w-full rounded-app border border-border bg-surface px-3 py-2 text-text"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="كلمة المرور"
          className="mb-4 w-full rounded-app border border-border bg-surface px-3 py-2 text-text"
        />
        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-app bg-primary px-3 py-2 font-bold text-white disabled:opacity-50"
        >
          {busy ? "..." : "دخول"}
        </button>
      </form>
    </main>
  );
}
```

Note: `next-auth/react` requires the `SessionProvider` only when using `useSession`; `signIn` works standalone.

- [ ] **Step 6: Write `src/lib/admin-guard.ts`**

```ts
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Call at the top of every admin page/action in Plans 3-4. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return session;
}
```

- [ ] **Step 7: Verify manually**

```bash
# .env.local must have ADMIN_EMAIL / ADMIN_PASSWORD filled
npm run db:seed
npm run build
npm start & SERVER_PID=$!; sleep 3
curl -s -o /dev/null -w "%{http_code}" localhost:3000/admin
# Expected: 307 (redirect to /admin/login)
curl -s -o /dev/null -w "%{http_code}" localhost:3000/admin/login
# Expected: 200
kill $SERVER_PID
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth.ts src/lib/admin-guard.ts src/middleware.ts src/app/admin src/app/api/auth
git commit -m "Admin Auth - Auth.js v5 credentials with middleware guard"
```

---

### Task 11: `/health` route

**Files:**
- Create: `src/app/health/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const checkDb = url.searchParams.get("check_db") === "true";

  const data: Record<string, unknown> = {
    status: "healthy",
    service: "Quran Apps Directory API",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  };

  let code = 200;
  if (checkDb) {
    try {
      await db.execute(sql`select 1`);
      data.database_status = "connected";
    } catch {
      data.database_status = "disconnected";
      data.status = "unhealthy";
      code = 503;
    }
  }

  return NextResponse.json(data, { status: code });
}
```

- [ ] **Step 2: Verify**

```bash
npm run build
npm start & SERVER_PID=$!; sleep 3
curl -s "localhost:3000/health?check_db=true"
# Expected: {"status":"healthy","service":"Quran Apps Directory API",...,"database_status":"connected"}
kill $SERVER_PID
```

- [ ] **Step 3: Commit**

```bash
git add src/app/health
git commit -m "Health Endpoint - liveness probe with optional DB check"
```

---

### Task 12: Sentry init

**Files:**
- Create: `src/instrumentation.ts`, `src/instrumentation-client.ts`
- Modify: `next.config.ts` (wrap with `withSentryConfig`), `.env.example` unchanged

- [ ] **Step 1: Write `src/instrumentation.ts`** (server-side)

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server");
  }
}
```

- [ ] **Step 2: Write `src/sentry.server.ts`**

```ts
import * as Sentry from "@sentry/nextjs";

export const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
```

- [ ] **Step 3: Write `src/instrumentation-client.ts`**

```ts
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
```

- [ ] **Step 4: Wrap `next.config.ts`**

```ts
import type { NextConfig } from "next";
import withSentryConfig from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
  sourcemaps: { disable: true },
});
```

- [ ] **Step 5: Verify build still passes**

Run: `npm run build`
Expected: success (Sentry inactive without DSN).

- [ ] **Step 6: Commit**

```bash
git add src/instrumentation.ts src/instrumentation-client.ts src/sentry.server.ts next.config.ts
git commit -m "Error Tracking - Sentry init for server and client"
```

---

### Task 13: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint-test:
    runs-on: ubuntu-latest
    services:
      db:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: qad_test
        ports: ["5433:5432"]
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      TEST_DATABASE_URL: postgres://postgres:postgres@localhost:5433/qad_test
      DATABASE_URL: postgres://postgres:postgres@localhost:5433/qad_test
      AUTH_SECRET: ci-secret
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx drizzle-kit push --force
      - run: npm test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "CI - lint and unit tests with postgres service"
```

---

### Task 14: Parity check + final verification

**Files:**
- Create: `db/parity-check.ts`

- [ ] **Step 1: Write `db/parity-check.ts`**

```ts
import "dotenv/config";
import postgres from "postgres";

/** Compares the fresh DB against the live DB after migrate-live. Exits 1 on mismatch. */

const live = postgres(process.env.LIVE_DB_URL!, { max: 2 });
const fresh = postgres(process.env.DATABASE_URL!, { max: 2 });

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

async function main() {
  const liveApps = await live`SELECT count(*)::int AS n FROM apps WHERE status = 'published'`;
  const freshApps = await fresh`SELECT count(*)::int AS n FROM apps WHERE status = 'published'`;
  if (liveApps[0].n !== freshApps[0].n) {
    fail(`app count mismatch: live=${liveApps[0].n} fresh=${freshApps[0].n}`);
  }
  console.log(`app count: ${freshApps[0].n} OK`);

  const liveSample = await live`
    SELECT slug, name_en, name_ar, avg_rating::text AS avg_rating, featured
    FROM apps ORDER BY slug LIMIT 5
  `;
  for (const row of liveSample) {
    const match = await fresh`
      SELECT slug, name_en, avg_rating::text AS avg_rating, featured
      FROM apps WHERE slug = ${row.slug}
    `;
    if (match.length === 0) fail(`missing app slug=${row.slug}`);
    if (match[0].name_en !== row.name_en) fail(`name_en mismatch slug=${row.slug}`);
    if (match[0].avg_rating !== row.avg_rating) fail(`rating mismatch slug=${row.slug}`);
    if (match[0].featured !== row.featured) fail(`featured mismatch slug=${row.slug}`);
  }
  console.log("spot fields: OK");
  console.log("PARITY OK");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

- [ ] **Step 2: Add npm script**

```json
"db:parity": "node --experimental-strip-types --env-file=.env.local db/parity-check.ts"
```

- [ ] **Step 3: Run the full plan verification suite**

```bash
npm run lint && npm test && npm run build
docker compose up -d db && npm run db:push:test && npx vitest run
```
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add db/parity-check.ts package.json
git commit -m "Parity Check - migrated DB verification script"
```

---

## Self-Review Notes (fixes applied while writing)

- Task 6 initially contained a broken `copyTable` sketch followed by the real implementation; the sketch was removed so the file contains only the complete `$n`-placeholder implementation.
- Task 8 originally inlined `getApp` + duplicate query logic; refactored during self-review into `apps-rows.ts` (shared list query) + `apps-detail.ts` (getApp) to keep DRY and small files, with no circular type imports (`AppDetail` is defined once in `apps-detail.ts`).
- `apps_categories` and `app_submissions_categories` through tables were initially missing from the schema; added with Django-compatible names so Task 6 works without join tricks.
- `middleware.ts` matcher originally matched `/health` and `/api/*`, which would have sent them through locale middleware; fixed with explicit negations.
- Shell verification snippets rewritten to capture `SERVER_PID=$!` and `kill $SERVER_PID` (portable, no interactive job control).

## Spec Coverage Check

| Spec section | Task |
|---|---|
| §2 D2 Drizzle, D3 fresh DB + migrate | Tasks 3, 5, 6, 14 |
| §2 D9 Auth.js | Task 10 |
| §4 repo layout | Tasks 3–12 |
| §5 rendering/data flow rules | reads/writes rules implemented as specified; actions come in Plans 3–4 |
| §6 data model | Task 5 (+ seeds Task 7) |
| §10 error handling | `/health` 503 (Task 11); action typed results in Plans 3–4 |
| §11 testing | Tasks 5, 8, 9, 13 |
| §14 out of scope | not implemented here (correct) |
