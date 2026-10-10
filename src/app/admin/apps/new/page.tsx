import { Suspense } from "react";
import Link from "next/link";
import AppForm, { CREATE_DEFAULT } from "@/components/admin/app-form";
import { getAllCategories, getAllDevelopers, getAllMetadataTypesWithActiveOptions } from "@/lib/repo/admin";

function FormSkeleton() {
  return <div className="h-[800px] animate-pulse rounded-app bg-surface" />;
}

export default function NewAppPage() {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">إضافة تطبيق جديد</h1>
        <Link href="/admin/apps" className="text-sm text-primary hover:underline">
          ← العودة إلى القائمة
        </Link>
      </div>
      <Suspense fallback={<FormSkeleton />}>
        <NewContent />
      </Suspense>
    </main>
  );
}

async function NewContent() {
  const [developers, categories, metadataTypes] = await Promise.all([
    getAllDevelopers(),
    getAllCategories(),
    getAllMetadataTypesWithActiveOptions(),
  ]);

  return (
    <AppForm
      mode="create"
      developers={developers}
      categories={categories}
      metadataTypes={metadataTypes}
      initial={CREATE_DEFAULT}
    />
  );
}
