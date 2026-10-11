import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryForm, type CategoryInitial } from "@/components/admin/taxonomy-editor";
import { getCategoryForEdit, type CategoryEditRow } from "@/lib/repo/admin";

function EditSkeleton() {
  return <div className="h-[800px] animate-pulse rounded-app bg-surface" />;
}

export default function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">تعديل فئة</h1>
        <Link href="/admin/categories" className="text-sm text-primary hover:underline">
          ← العودة إلى القائمة
        </Link>
      </div>
      <Suspense fallback={<EditSkeleton />}>
        <EditContent params={params} />
      </Suspense>
    </main>
  );
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

async function EditContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  const row =
    Number.isInteger(numId) && numId > 0 ? await getCategoryForEdit(numId) : null;
  if (!row) notFound();
  const initial = toInitial(row);

  return <CategoryForm key={numId} editing={initial} />;
}
