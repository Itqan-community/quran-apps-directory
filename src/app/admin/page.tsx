import { Suspense } from "react";
import Link from "next/link";
import {
  Archive,
  CircleCheck,
  CircleX,
  Clock,
  Eye,
  FileText,
  Inbox,
  MessageSquare,
  Search,
  Smartphone,
} from "lucide-react";
import type { AdminSubmissionRow, DashboardCounts } from "@/lib/repo/admin";
import { getAdminSubmissions, getDashboardCounts } from "@/lib/repo/admin";
import { adminBodyRow, adminHeadRow, adminTable, adminTableWrap, adminTh } from "@/components/admin/ui";

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

const APP_CARDS: { key: keyof DashboardCounts; label: string; icon: typeof Smartphone }[] = [
  { key: "appsDraft", label: "مسودة", icon: FileText },
  { key: "appsPublished", label: "منشور", icon: CircleCheck },
  { key: "appsArchived", label: "مؤرشف", icon: Archive },
];

const SUB_CARDS: { key: keyof DashboardCounts; label: string; icon: typeof Smartphone }[] = [
  { key: "subsPending", label: "قيد الانتظار", icon: Clock },
  { key: "subsUnderReview", label: "قيد المراجعة", icon: Search },
  { key: "subsInfoRequested", label: "طلب معلومات", icon: MessageSquare },
  { key: "subsApproved", label: "تمت الموافقة", icon: CircleCheck },
  { key: "subsRejected", label: "مرفوض", icon: CircleX },
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
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-text-secondary">
            <Smartphone aria-hidden className="size-4" />
            التطبيقات
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {APP_CARDS.map((card) => (
              <StatCard key={card.key} icon={card.icon} label={card.label} value={counts[card.key]} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-text-secondary">
            <Inbox aria-hidden className="size-4" />
            طلبات إضافة التطبيقات
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
            {SUB_CARDS.map((card) => {
              const body = <StatCard icon={card.icon} label={card.label} value={counts[card.key]} plain />;
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

        <section className="flex items-center gap-3 rounded-app bg-card p-4 shadow-app">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-app bg-primary/10 text-primary">
            <Eye aria-hidden className="size-5" />
          </span>
          <span>
            <span className="block text-xs text-text-secondary">إجمالي الزيارات (آخر 30 يومًا)</span>
            <span className="block text-2xl font-bold tabular-nums text-text">{counts.views30d}</span>
          </span>
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

function StatCard({
  icon: Icon,
  label,
  value,
  plain = false,
}: {
  icon: typeof Smartphone;
  label: string;
  value: number;
  plain?: boolean;
}) {
  const inner = (
    <>
      <span className="mb-2 flex size-9 items-center justify-center rounded-app bg-primary/10 text-primary">
        <Icon aria-hidden className="size-4.5" />
      </span>
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-text">{value}</p>
    </>
  );
  if (plain) return inner;
  return <div className="rounded-app bg-card p-4 shadow-app">{inner}</div>;
}

function LatestPendingTable({ rows }: { rows: AdminSubmissionRow[] }) {
  return (
    <div className={adminTableWrap}>
      <table className={adminTable}>
        <thead>
          <tr className={adminHeadRow}>
            <th className={adminTh}>رقم التتبع</th>
            <th className={adminTh}>التطبيق</th>
            <th className={adminTh}>البريد الإلكتروني</th>
            <th className={adminTh}>تاريخ الطلب</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={adminBodyRow}>
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
