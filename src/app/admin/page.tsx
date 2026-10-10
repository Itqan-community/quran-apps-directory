import { Suspense } from "react";
import Link from "next/link";
import type { AdminSubmissionRow, DashboardCounts } from "@/lib/repo/admin";
import { getAdminSubmissions, getDashboardCounts } from "@/lib/repo/admin";

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-40 animate-pulse rounded-app border border-border bg-surface" />
      <div className="h-48 animate-pulse rounded-app border border-border bg-surface" />
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-text">لوحة التحكم</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <AdminDashboardContent />
      </Suspense>
    </main>
  );
}

const dateFmt = new Intl.DateTimeFormat("ar", { dateStyle: "medium" });

const APP_CARDS: { key: keyof DashboardCounts; label: string }[] = [
  { key: "appsDraft", label: "مسودة" },
  { key: "appsPublished", label: "منشور" },
  { key: "appsArchived", label: "مؤرشف" },
];

const SUB_CARDS: { key: keyof DashboardCounts; label: string }[] = [
  { key: "subsPending", label: "قيد الانتظار" },
  { key: "subsUnderReview", label: "قيد المراجعة" },
  { key: "subsInfoRequested", label: "طلب معلومات" },
  { key: "subsApproved", label: "تمت الموافقة" },
  { key: "subsRejected", label: "مرفوض" },
];

async function AdminDashboardContent() {
  const [counts, pending] = await Promise.all([
    getDashboardCounts(),
    getAdminSubmissions({ status: "pending", page: 1 }),
  ]);
  const latest = pending.results.slice(0, 5);

  return (
    <>
      <div className="flex flex-col gap-4">
        <section>
          <h2 className="mb-3 text-sm font-bold text-text-secondary">التطبيقات</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {APP_CARDS.map((card) => (
              <div key={card.key} className="rounded-app bg-card p-4 shadow-app">
                <p className="text-xs text-text-secondary">{card.label}</p>
                <p className="text-2xl font-bold text-text">{counts[card.key]}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold text-text-secondary">طلبات إضافة التطبيقات</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
            {SUB_CARDS.map((card) => {
              const body = (
                <>
                  <p className="text-xs text-text-secondary">{card.label}</p>
                  <p className="text-2xl font-bold text-text">{counts[card.key]}</p>
                </>
              );
              if (card.key === "subsPending") {
                return (
                  <Link
                    key={card.key}
                    href="/admin/submissions?status=pending"
                    className="rounded-app bg-card p-4 shadow-app transition hover:opacity-85"
                  >
                    {body}
                  </Link>
                );
              }
              return (
                <div key={card.key} className="rounded-app bg-card p-4 shadow-app">
                  {body}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-app bg-card p-4 shadow-app">
          <p className="text-xs text-text-secondary">إجمالي الزيارات (آخر 30 يومًا)</p>
          <p className="text-2xl font-bold text-text">{counts.views30d}</p>
        </section>
      </div>

      <section className="rounded-app bg-card p-4 shadow-app">
        <h2 className="mb-3 font-bold text-text">أحدث الطلبات المعلقة</h2>
        {latest.length === 0 ? (
          <p className="text-sm text-text-secondary">لا توجد طلبات معلقة</p>
        ) : (
          <LatestPendingTable rows={latest} />
        )}
      </section>
    </>
  );
}

function LatestPendingTable({ rows }: { rows: AdminSubmissionRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-start text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-text-secondary">
            <th className="px-2 py-2 text-start font-medium">رقم التتبع</th>
            <th className="px-2 py-2 text-start font-medium">التطبيق</th>
            <th className="px-2 py-2 text-start font-medium">البريد الإلكتروني</th>
            <th className="px-2 py-2 text-start font-medium">تاريخ الطلب</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-b-0">
              <td className="px-2 py-2">
                <Link
                  href={`/admin/submissions/${row.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {row.trackingId}
                </Link>
              </td>
              <td className="px-2 py-2 text-text">{row.appNameAr}</td>
              <td className="px-2 py-2 text-text">{row.submitterEmail}</td>
              <td className="px-2 py-2 text-text-secondary">{dateFmt.format(row.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
