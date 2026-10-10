import { Suspense } from "react";
import {
  getCountryBreakdown30d,
  getDeviceBreakdown30d,
  getTopApps30d,
  getViewsPerDay30d,
} from "@/lib/repo/analytics";
import { getDashboardCounts } from "@/lib/repo/admin";
import { RankTable, ViewsBar } from "@/components/admin/charts";
import type { RankRow } from "@/components/admin/charts";

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-20 animate-pulse rounded-app bg-surface" />
      <div className="h-64 animate-pulse rounded-app border border-border bg-surface" />
      <div className="h-72 animate-pulse rounded-app border border-border bg-surface" />
      <div className="h-64 animate-pulse rounded-app border border-border bg-surface" />
      <div className="h-64 animate-pulse rounded-app border border-border bg-surface" />
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-text">التحليلات</h1>
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent />
      </Suspense>
    </main>
  );
}

async function AnalyticsContent() {
  const [counts, days, topApps, countries, devices] = await Promise.all([
    getDashboardCounts(),
    getViewsPerDay30d(),
    getTopApps30d(),
    getCountryBreakdown30d(),
    getDeviceBreakdown30d(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-app bg-card p-4 shadow-app">
        <p className="text-xs text-text-secondary">إجمالي الزيارات (آخر 30 يومًا)</p>
        <p className="text-2xl font-bold text-text">{counts.views30d}</p>
      </section>

      <section className="rounded-app bg-card p-4 shadow-app">
        <h2 className="mb-3 font-bold text-text">الزيارات اليومية (آخر 30 يومًا)</h2>
        <ViewsBar data={days} />
        {days.every((d) => d.views === 0) && (
          <p className="mt-2 text-sm text-text-secondary">لا توجد زيارات في آخر 30 يومًا</p>
        )}
      </section>

      <RankSection
        title="أكثر التطبيقات زيارة"
        labelHeader="التطبيق"
        rows={topApps.map((a) => ({
          label: a.nameAr || a.nameEn,
          secondary: a.nameEn,
          views: a.views,
        }))}
      />

      <RankSection
        title="الزيارات حسب الدولة"
        labelHeader="الدولة"
        rows={countries.map((c) => ({
          label: c.countryCode ?? "غير معروف",
          code: c.countryCode != null,
          views: c.views,
        }))}
      />

      <RankSection
        title="الزيارات حسب نوع الجهاز"
        labelHeader="نوع الجهاز"
        rows={devices.map((d) => ({
          label: d.deviceType,
          code: true,
          views: d.views,
        }))}
      />
    </div>
  );
}

function RankSection({
  title,
  labelHeader,
  rows,
}: {
  title: string;
  labelHeader: string;
  rows: RankRow[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold text-text">{title}</h2>
      {rows.length === 0 ? (
        <p className="rounded-app bg-card p-6 text-center text-sm text-text-secondary shadow-app">
          لا توجد بيانات
        </p>
      ) : (
        <RankTable rows={rows} labelHeader={labelHeader} />
      )}
    </section>
  );
}
