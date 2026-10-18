import { Suspense } from "react";
import { BackLink } from "@/components/admin/ui";
import { CategoryForm } from "@/components/admin/taxonomy-editor";

function FormSkeleton() {
  return <div className="h-[800px] animate-pulse rounded-app bg-surface" />;
}

export default function NewCategoryPage() {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">إضافة فئة جديدة</h1>
        <BackLink href="/admin/categories">العودة إلى القائمة</BackLink>
      </div>
      <Suspense fallback={<FormSkeleton />}>
        <CategoryForm editing={null} />
      </Suspense>
    </main>
  );
}
