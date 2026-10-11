import { Suspense } from "react";
import Link from "next/link";
import { getAllCategories } from "@/lib/repo/admin";
import { deleteCategory } from "@/lib/actions/admin-taxonomy";
import ConfirmSubmit from "@/components/admin/confirm-submit";

const CAT_DELETE_CONFIRM =
  "سيتم حذف الفئة نهائيًا مع ارتباطاتها بالتطبيقات. هل تريد المتابعة؟";

const thCls = "px-3 py-2 text-start font-medium";
const selectCls =
  "rounded-app border border-border bg-surface px-2 py-2 text-sm text-text";

const ACTIVE: { value: string; label: string }[] = [
  { value: "all", label: "كل الحالات" },
  { value: "yes", label: "مفعّلة" },
  { value: "no", label: "غير مفعّلة" },
];

function ContentSkeleton() {
  return <div className="h-96 animate-pulse rounded-app bg-surface" />;
}

type RawSearchParams = { [key: string]: string | string[] | undefined };

export default function CategoriesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">الفئات</h1>
        <Link
          href="/admin/categories/new"
          className="rounded-app bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover"
        >
          + إضافة فئة
        </Link>
      </div>
      <Suspense fallback={<ContentSkeleton />}>
        <CategoriesContent searchParams={searchParams} />
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

async function CategoriesContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const q = firstString(sp.q).trim();
  const active = selectValue(firstString(sp.active), ["all", "yes", "no"]);

  const categories = await getAllCategories({
    search: q || undefined,
    active: active === "all" ? undefined : active === "yes",
  });

  return (
    <div className="flex flex-col gap-4">
      <form action="/admin/categories" method="get" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="بحث باسم الفئة أو الرابط"
          className="w-72 rounded-app border border-border bg-surface px-3 py-2 text-sm text-text"
        />
        <select name="active" defaultValue={active} className={selectCls}>
          {ACTIVE.map((s) => (
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
        {(q || active !== "all") && (
          <Link href="/admin/categories" className="text-sm text-text-secondary hover:underline">
            مسح
          </Link>
        )}
      </form>

      {categories.length === 0 ? (
        <p className="rounded-app bg-card p-6 text-center text-sm text-text-secondary shadow-app">
          لا توجد فئات مطابقة
        </p>
      ) : (
        <div className="overflow-x-auto rounded-app bg-card shadow-app">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-secondary">
                <th className={thCls}>الاسم (EN)</th>
                <th className={thCls}>الاسم (AR)</th>
                <th className={thCls}>الرابط</th>
                <th className={thCls}>مفعلة</th>
                <th className={thCls}>الترتيب</th>
                <th className={thCls}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2 text-text">{c.nameEn}</td>
                  <td className="px-3 py-2 text-text">{c.nameAr}</td>
                  <td className="px-3 py-2 font-mono text-xs text-text-secondary" dir="ltr">
                    {c.slug}
                  </td>
                  <td className="px-3 py-2">
                    <span className={c.isActive ? "text-green-600" : "text-text-secondary"}>
                      {c.isActive ? "✓" : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text">{c.sortOrder}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/categories/${c.id}`}
                        className="rounded-app border border-border bg-surface px-3 py-1.5 text-xs text-text transition hover:bg-primary/10"
                      >
                        تعديل
                      </Link>
                      <ConfirmSubmit
                        confirmMessage={CAT_DELETE_CONFIRM}
                        label="حذف"
                        action={deleteCategory.bind(null, c.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-text-secondary">الإجمالي: {categories.length}</p>
    </div>
  );
}
