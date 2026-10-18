import { Suspense } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Inbox, Search, X } from "lucide-react";
import type { AdminSubmissionRow, DashboardCounts } from "@/lib/repo/admin";
import { getAdminSubmissions, getDashboardCounts } from "@/lib/repo/admin";
import StatusBadge from "@/components/admin/status-badge";
import {
  EmptyState,
  adminBodyRow,
  adminHeadRow,
  adminTable,
  adminTableWrap,
  adminTh,
} from "@/components/admin/ui";

const PAGE_SIZE = 25; // mirrors getAdminSubmissions' fixed page size

const STATUS_TABS: { value: string; label: string; countKey: keyof DashboardCounts | null }[] = [
  { value: "all", label: "الكل", countKey: null },
  { value: "pending", label: "قيد الانتظار", countKey: "subsPending" },
  { value: "under_review", label: "قيد المراجعة", countKey: "subsUnderReview" },
  { value: "info_requested", label: "طلب معلومات", countKey: "subsInfoRequested" },
  { value: "approved", label: "تمت الموافقة", countKey: "subsApproved" },
  { value: "rejected", label: "مرفوض", countKey: "subsRejected" },
];

const dateFmt = new Intl.DateTimeFormat("ar", { dateStyle: "medium" });

function SubmissionsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-10 animate-pulse rounded-app bg-surface" />
      <div className="h-96 animate-pulse rounded-app border border-border bg-surface" />
    </div>
  );
}

type RawSearchParams = { [key: string]: string | string[] | undefined };

export default function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-text">طلبات إضافة التطبيقات</h1>
      <Suspense fallback={<SubmissionsSkeleton />}>
        <SubmissionsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function firstString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

/** URL shape (binding): ?status={5 statuses|all}&q=&page= — absent status = "all". */
function normalizeStatus(raw: string): string {
  return STATUS_TABS.some((t) => t.value === raw) ? raw : "all";
}

function parsePage(raw: string): number {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** RSC links only — status "all" is omitted, page omitted when 1. */
function listHref(status: string, q: string, page: number): string {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/admin/submissions${qs ? `?${qs}` : ""}`;
}

const tabActiveCls = "border-primary bg-primary font-bold text-white";
const tabIdleCls = "border-border bg-card text-text transition hover:bg-primary/10";

async function SubmissionsContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const status = normalizeStatus(firstString(sp.status));
  const q = firstString(sp.q).trim();
  const page = parsePage(firstString(sp.page));

  const [counts, data] = await Promise.all([
    getDashboardCounts(),
    getAdminSubmissions({
      status: status === "all" ? undefined : status,
      search: q || undefined,
      page,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));
  const totalCount =
    counts.subsPending +
    counts.subsUnderReview +
    counts.subsInfoRequested +
    counts.subsApproved +
    counts.subsRejected;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const count = tab.countKey ? counts[tab.countKey] : totalCount;
          const active = status === tab.value;
          return (
            <Link
              key={tab.value}
              href={listHref(tab.value, q, 1)}
              aria-current={active ? "true" : undefined}
              className={`rounded-app border px-3 py-1.5 text-sm transition ${
                active ? tabActiveCls : tabIdleCls
              }`}
            >
              {tab.label} <span className="text-xs opacity-80">({count})</span>
            </Link>
          );
        })}
      </div>

      <form action="/admin/submissions" method="get" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="status" value={status} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="بحث برقم التتبع، اسم التطبيق، أو البريد الإلكتروني"
          className="w-72 rounded-app border border-border bg-surface px-3 py-2 text-sm text-text"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover"
        >
          <Search aria-hidden className="size-4" />
          بحث
        </button>
        {q && (
          <Link href={listHref(status, "", 1)} className="text-sm text-text-secondary hover:underline">
            مسح
          </Link>
        )}
      </form>

      {data.results.length === 0 ? (
        <EmptyState
          icon={<Inbox aria-hidden className="size-5" />}
          message="لا توجد طلبات مطابقة"
        />
      ) : (
        <div className={adminTableWrap}>
          <table className={adminTable}>
            <thead>
              <tr className={adminHeadRow}>
                <th className={adminTh}>رقم التتبع</th>
                <th className={adminTh}>الأيقونة</th>
                <th className={adminTh}>التطبيق</th>
                <th className={adminTh}>البريد الإلكتروني</th>
                <th className={adminTh}>الحالة</th>
                <th className={adminTh}>الفئات</th>
                <th className={adminTh}>روابط المتجر</th>
                <th className={adminTh}>تاريخ الطلب</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((row) => (
                <SubmissionRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">
          الإجمالي: {data.count}
          {totalPages > 1 && <span className="ms-2">صفحة {page} من {totalPages}</span>}
        </span>
        {totalPages > 1 && (
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={listHref(status, q, page - 1)} className={tabIdleCls}>
                <span className="inline-flex items-center gap-1">
                  <ChevronRight aria-hidden className="size-4" />
                  السابق
                </span>
              </Link>
            ) : (
              <span className="rounded-app border border-border px-3 py-1.5 text-text-secondary opacity-50">
                <span className="inline-flex items-center gap-1">
                  <ChevronRight aria-hidden className="size-4" />
                  السابق
                </span>
              </span>
            )}
            {page < totalPages ? (
              <Link href={listHref(status, q, page + 1)} className={tabIdleCls}>
                <span className="inline-flex items-center gap-1">
                  التالي
                  <ChevronLeft aria-hidden className="size-4" />
                </span>
              </Link>
            ) : (
              <span className="rounded-app border border-border px-3 py-1.5 text-text-secondary opacity-50">
                <span className="inline-flex items-center gap-1">
                  التالي
                  <ChevronLeft aria-hidden className="size-4" />
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SubmissionRow({ row }: { row: AdminSubmissionRow }) {
  const extraCats = Math.max(0, row.categories.length - 3);
  return (
    <tr className={adminBodyRow}>
      <td className="px-3 py-2">
        <Link
          href={`/admin/submissions/${row.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.trackingId}
        </Link>
      </td>
      <td className="px-3 py-2">
        {row.appIconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.appIconUrl}
            alt={row.appNameEn}
            width={40}
            height={40}
            className="rounded-lg object-cover"
          />
        ) : (
          <span className="text-text-secondary">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        <span className="block text-text">{row.appNameEn}</span>
        {row.appNameAr && <span className="block text-xs text-text-secondary">{row.appNameAr}</span>}
      </td>
      <td className="px-3 py-2 text-text">{row.submitterEmail}</td>
      <td className="px-3 py-2">
        <StatusBadge status={row.status} kind="submission" />
      </td>
      <td className="px-3 py-2 text-text">
        {row.categories.length === 0 ? (
          <span className="text-text-secondary">—</span>
        ) : (
          <>
            {row.categories
              .slice(0, 3)
              .map((c) => c.nameAr || c.nameEn)
              .join("، ")}
            {extraCats > 0 && <span className="text-text-secondary"> +{extraCats}</span>}
          </>
        )}
      </td>
      <td className="px-3 py-2">
        {row.hasStoreLink ? (
          <Check aria-label="يوجد رابط متجر" className="size-4 text-green-600" />
        ) : (
          <X aria-label="لا يوجد رابط متجر" className="size-4 text-red-500" />
        )}
      </td>
      <td className="px-3 py-2 text-text-secondary">{dateFmt.format(row.createdAt)}</td>
    </tr>
  );
}
