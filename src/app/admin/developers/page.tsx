import { Suspense } from "react";
import Link from "next/link";
import { Funnel, Pencil, Users } from "lucide-react";
import { getAllDevelopers, getDeveloperAppCount } from "@/lib/repo/admin";
import { deleteDeveloper } from "@/lib/actions/admin-taxonomy";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import {
  AddButtonLink,
  EmptyState,
  StatusPill,
  adminBodyRow,
  adminHeadRow,
  adminIconAction,
  adminTable,
  adminTableWrap,
  adminTh,
} from "@/components/admin/ui";

// FK CASCADE warns loudly: deleting a developer deletes their apps.
const DEV_DELETE_CONFIRM_APPS =
  "سيتم حذف المطور نهائيًا. سيتم حذف تطبيقات المطور المرتبطة. هل تريد المتابعة؟";
const DEV_DELETE_CONFIRM_EMPTY = "سيتم حذف المطور نهائيًا. هل تريد المتابعة؟";

const selectCls =
  "rounded-app border border-border bg-surface px-2 py-2 text-sm text-text";

const VERIFIED: { value: string; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "yes", label: "موثّق" },
  { value: "no", label: "غير موثّق" },
];

function ContentSkeleton() {
  return <div className="h-96 animate-pulse rounded-app bg-surface" />;
}

type RawSearchParams = { [key: string]: string | string[] | undefined };

export default function DevelopersPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">المطورون</h1>
        <AddButtonLink href="/admin/developers/new">إضافة مطوّر</AddButtonLink>
      </div>
      <Suspense fallback={<ContentSkeleton />}>
        <DevelopersContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function firstString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

function selectValue(raw: string, values: string[]): string {
  return values.includes(raw) ? raw : "all";
}

async function DevelopersContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const q = firstString(sp.q).trim();
  const verified = selectValue(firstString(sp.verified), ["all", "yes", "no"]);

  const developers = await getAllDevelopers({
    search: q || undefined,
    verified: verified === "all" ? undefined : verified === "yes",
  });

  // Per-row linked-app count feeds the cascade warning + the count column.
  const counts = await Promise.all(developers.map((d) => getDeveloperAppCount(d.id)));

  return (
    <div className="flex flex-col gap-4">
      <form action="/admin/developers" method="get" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="بحث باسم المطور أو موقعه أو بريده"
          className="w-72 rounded-app border border-border bg-surface px-3 py-2 text-sm text-text"
        />
        <select name="verified" defaultValue={verified} className={selectCls}>
          {VERIFIED.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover"
        >
          <Funnel aria-hidden className="size-4" />
          تصفية
        </button>
        {(q || verified !== "all") && (
          <Link href="/admin/developers" className="text-sm text-text-secondary hover:underline">
            مسح
          </Link>
        )}
      </form>

      {developers.length === 0 ? (
        <EmptyState
          icon={<Users aria-hidden className="size-5" />}
          message="لا يوجد مطورون مطابقون"
        />
      ) : (
        <div className={adminTableWrap}>
          <table className={adminTable}>
            <thead>
              <tr className={adminHeadRow}>
                <th className={adminTh}>الاسم (EN)</th>
                <th className={adminTh}>الاسم (AR)</th>
                <th className={adminTh}>الموقع</th>
                <th className={adminTh}>الحالة</th>
                <th className={adminTh}>التطبيقات</th>
                <th className={adminTh}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {developers.map((d, i) => {
                const count = counts[i] ?? 0;
                return (
                  <tr key={d.id} className={adminBodyRow}>
                    <td className="px-3 py-2 text-text">{d.nameEn}</td>
                    <td className="px-3 py-2 text-text">{d.nameAr}</td>
                    <td className="max-w-48 truncate px-3 py-2 text-xs text-text-secondary" dir="ltr">
                      {d.website || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill active={d.isVerified} on="موثّق" off="غير موثّق" />
                    </td>
                    <td className="px-3 py-2 text-text">
                      {count > 0 ? <span className="font-bold tabular-nums">{count}</span> : <span className="text-text-secondary">0</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/developers/${d.id}`} className={adminIconAction}>
                          <Pencil aria-hidden className="size-3.5" />
                          تعديل
                        </Link>
                        <ConfirmSubmit
                          confirmMessage={count > 0 ? DEV_DELETE_CONFIRM_APPS : DEV_DELETE_CONFIRM_EMPTY}
                          label="حذف"
                          action={deleteDeveloper.bind(null, d.id)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-text-secondary">الإجمالي: {developers.length}</p>
    </div>
  );
}
