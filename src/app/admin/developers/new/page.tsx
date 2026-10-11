import { Suspense } from "react";
import Link from "next/link";
import { DeveloperForm } from "@/components/admin/taxonomy-editor";

function FormSkeleton() {
  return <div className="h-[800px] animate-pulse rounded-app bg-surface" />;
}

export default function NewDeveloperPage() {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">إضافة مطوّر جديد</h1>
        <Link href="/admin/developers" className="text-sm text-primary hover:underline">
          ← العودة إلى القائمة
        </Link>
      </div>
      <Suspense fallback={<FormSkeleton />}>
        <DeveloperForm editing={null} />
      </Suspense>
    </main>
  );
}
