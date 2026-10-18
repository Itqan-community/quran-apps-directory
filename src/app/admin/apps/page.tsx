import { Suspense } from "react";
import Link from "next/link";
import type { AppListItem } from "@/lib/repo/admin";
import { getAdminApps } from "@/lib/repo/admin";
import StatusBadge from "@/components/admin/status-badge";
import BulkBar, { BulkSelectionProvider, BulkCheckbox } from "@/components/admin/bulk-bar";
import ReindexEmbeddingsButton from "@/components/admin/reindex-embeddings-button";

const PAGE_SIZE = 25;

const STATUSES: { value: string; label: string }[] = [
  { value: "all", label: "كل الحالات" },
  { value: "draft", label: "مسودة" },
  { value: "published", label: "منشور" },
  { value: "archived", label: "مؤرشف" },
];

const FEATURED: { value: string; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "yes", label: "مميز" },
  { value: "no", label: "غير مميز" },
];

const PLATFORMS: { value: string; label: string }[] = [
  { value: "all", label: "كل المنصات" },
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
  { value: "web", label: "Web" },
  { value: "cross_platform", label: "Cross Platform" },
];

const PLATFORM_LABEL: Record<string, string> = {
  android: "Android",
  ios: "iOS",
  web: "Web",
  cross_platform: "Cross Platform",
};

const dateFmt = new Intl.DateTimeFormat("ar", { dateStyle: "medium" });
const selectCls =
  "rounded-app border border-border bg-surface px-2 py-2 text-sm text-text";

function AppsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-10 animate-pulse rounded-app bg-surface" />
      <div className="h-96 animate-pulse rounded-app border-border bg-surface" />
    </div>
  );
}

type RawSearchParams = { [key: string]: string | string[] | undefined };

export default function AdminAppsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">التطبيقات</h1>
        <div className="flex items-center gap-2">
          <ReindexEmbeddingsButton />
          <Link
            href="/admin/apps/new"
            className="rounded-app bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover"
          >
            + إضافة تطبيق
          </Link>
        </div>
      </div>
      <Suspense fallback={<AppsSkeleton />}>
        <AppsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function firstString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

function parsePage(raw: string): number {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function selectValue(raw: string, values: string[]): string {
  return values.includes(raw) ? raw : "all";
}

function listHref(filters: {
  q: string;
  status: string;
  featured: string;
  platform: string;
  page: number;
}): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.featured !== "all") params.set("featured", filters.featured);
  if (filters.platform !== "all") params.set("platform", filters.platform);
  if (filters.page > 1) params.set("page", String(filters.page));
  const qs = params.toString();
  return `/admin/apps${qs ? `?${qs}` : ""}`;
}

async function AppsContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const q = firstString(sp.q).trim();
  const status = selectValue(firstString(sp.status), ["all", "draft", "published", "archived"]);
  const featured = selectValue(firstString(sp.featured), ["all", "yes", "no"]);
  const platform = selectValue(firstString(sp.platform), ["all", "android", "ios", "web", "cross_platform"]);
  const page = parsePage(firstString(sp.page));

  const apps = await getAdminApps({
      search: q || undefined,
      status,
      featured: featured === "all" ? undefined : featured === "yes",
      platform: platform === "all" ? undefined : platform,
      page,
      pageSize: PAGE_SIZE,
    });

  const totalPages = Math.max(1, Math.ceil(apps.count / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <form action="/admin/apps" method="get" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="بحث باسم التطبيق أو وصفه"
          className="w-72 rounded-app border border-border bg-surface px-3 py-2 text-sm text-text"
        />
        <select name="status" defaultValue={status === "all" ? "all" : status} className={selectCls}>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select name="featured" defaultValue={featured === "all" ? "all" : featured} className={selectCls}>
          {FEATURED.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select name="platform" defaultValue={platform === "all" ? "all" : platform} className={selectCls}>
          {PLATFORMS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-app bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover"
        >
          تصفية
        </button>
        {(q || status !== "all" || featured !== "all" || platform !== "all") && (
          <Link href="/admin/apps" className="text-sm text-text-secondary hover:underline">
            مسح
          </Link>
        )}
      </form>

      <BulkSelectionProvider>
        <BulkBar />
        {apps.results.length === 0 ? (
          <p className="rounded-app bg-card p-6 text-center text-sm text-text-secondary shadow-app">
            لا توجد تطبيقات مطابقة
          </p>
        ) : (
          <div className="overflow-x-auto rounded-app bg-card shadow-app">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-text-secondary">
                  <th className="px-2 py-2 text-start font-medium"> </th>
                  <th className="px-3 py-2 text-start font-medium">الأيقونة</th>
                  <th className="px-3 py-2 text-start font-medium">التطبيق</th>
                  <th className="px-3 py-2 text-start font-medium">المنصة</th>
                  <th className="px-3 py-2 text-start font-medium">التقييم</th>
                  <th className="px-3 py-2 text-start font-medium">المراجعات</th>
                  <th className="px-3 py-2 text-start font-medium">المشاهدات</th>
                  <th className="px-3 py-2 text-start font-medium">مميز</th>
                  <th className="px-3 py-2 text-start font-medium">الحالة</th>
                  <th className="px-3 py-2 text-start font-medium">المطور</th>
                  <th className="px-3 py-2 text-start font-medium">أضيف</th>
                </tr>
              </thead>
              <tbody>
                {apps.results.map((row) => (
                  <AppRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BulkSelectionProvider>

      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">
          الإجمالي: {apps.count}
          {totalPages > 1 && (
            <span className="ms-2">
              صفحة {page} من {totalPages}
            </span>
          )}
        </span>
        {totalPages > 1 && (
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={listHref({ q, status, featured, platform, page: page - 1 })}
                className="rounded-app border border-border bg-surface px-3 py-1.5 transition hover:bg-primary/10"
              >
                السابق
              </Link>
            ) : (
              <span className="rounded-app border border-border px-3 py-1.5 text-text-secondary opacity-50">
                السابق
              </span>
            )}
            {page < totalPages ? (
              <Link
                href={listHref({ q, status, featured, platform, page: page + 1 })}
                className="rounded-app border border-border bg-surface px-3 py-1.5 transition hover:bg-primary/10"
              >
                التالي
              </Link>
            ) : (
              <span className="rounded-app border border-border px-3 py-1.5 text-text-secondary opacity-50">
                التالي
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AppRow({ row }: { row: AppListItem }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <BulkCheckbox id={row.id} />
      <td className="px-3 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={row.applicationIcon}
          alt={row.nameEn}
          width={40}
          height={40}
          className="rounded-lg object-cover"
        />
      </td>
      <td className="px-3 py-2">
        <Link href={`/admin/apps/${row.id}`} className="font-medium text-primary hover:underline">
          {row.nameEn}
        </Link>
        <span className="block text-xs text-text-secondary">{row.nameAr}</span>
      </td>
      <td className="px-3 py-2 text-text">{PLATFORM_LABEL[row.platform] ?? row.platform}</td>
      <td className="px-3 py-2 text-text">{row.avgRating}</td>
      <td className="px-3 py-2 text-text">{row.reviewCount}</td>
      <td className="px-3 py-2 text-text">{row.viewCount}</td>
      <td className="px-3 py-2">
        <span className={row.featured ? "text-green-600" : "text-text-secondary"}>
          {row.featured ? "✓" : "—"}
        </span>
      </td>
      <td className="px-3 py-2">
        <StatusBadge status={row.status} kind="app" />
      </td>
      <td className="px-3 py-2 text-text">{row.developer.nameEn}</td>
      <td className="px-3 py-2 text-text-secondary">{dateFmt.format(row.createdAt)}</td>
    </tr>
  );
}
