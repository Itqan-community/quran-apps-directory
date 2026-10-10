import { Suspense } from "react";
import Link from "next/link";
import { getAllCategories, getCategoryForEdit, type CategoryEditRow } from "@/lib/repo/admin";
import { deleteCategory } from "@/lib/actions/admin-taxonomy";
import { CategoryForm, type CategoryInitial } from "@/components/admin/taxonomy-editor";
import ConfirmSubmit from "@/components/admin/confirm-submit";

const CAT_DELETE_CONFIRM =
  "سيتم حذف الفئة نهائيًا مع ارتباطاتها بالتطبيقات. هل تريد المتابعة؟";

const thCls = "px-3 py-2 text-start font-medium";

function ContentSkeleton() {
  return <div className="h-96 animate-pulse rounded-app bg-surface" />;
}

type RawSearchParams = { [key: string]: string | string[] | undefined };

export default function CategoriesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-text">الفئات</h1>
      <Suspense fallback={<ContentSkeleton />}>
        <CategoriesContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function parseEdit(raw: string | string[] | undefined): number | null {
  if (typeof raw !== "string") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function toInitial(c: CategoryEditRow): CategoryInitial {
  return {
    id: Number(c.id),
    nameEn: c.nameEn,
    nameAr: c.nameAr,
    slug: c.slug,
    descriptionEn: c.descriptionEn,
    descriptionAr: c.descriptionAr,
    icon: c.icon ?? "",
    color: c.color ?? "",
    sortOrder: c.sortOrder,
    isActive: c.isActive,
  };
}

async function CategoriesContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const editId = parseEdit(sp.edit);

  const categories = await getAllCategories();
  const editing = editId !== null ? await getCategoryForEdit(editId) : null;
  const editingInitial = editing ? toInitial(editing) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* key: remount the island whenever the edited id changes so state re-reads the initials */}
      <CategoryForm key={editingInitial?.id ?? "new"} editing={editingInitial} />

      {categories.length === 0 ? (
        <p className="rounded-app bg-card p-6 text-center text-sm text-text-secondary shadow-app">
          لا توجد فئات بعد — أضف الفئة الأولى من النموذج أعلاه.
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
                <tr
                  key={c.id}
                  className={`border-b border-border last:border-b-0 ${
                    c.id === editing?.id ? "bg-primary/5" : ""
                  }`}
                >
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
                        href={`/admin/categories?edit=${c.id}`}
                        aria-current={c.id === editing?.id ? "true" : undefined}
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
