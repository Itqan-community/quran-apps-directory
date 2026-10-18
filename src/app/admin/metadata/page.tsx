import { Suspense } from "react";
import { connection } from "next/server";
import { Database } from "lucide-react";
import { getMetadataTypesSummary } from "@/lib/repo/admin";
import { AddMetadataTypeButton, MetadataTypesTable } from "@/components/admin/metadata-editor";
import { EmptyState } from "@/components/admin/ui";

function ContentSkeleton() {
  return <div className="h-96 animate-pulse rounded-app bg-surface" />;
}

export default function MetadataPage() {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">البيانات الوصفية</h1>
        <AddMetadataTypeButton />
      </div>
      <Suspense fallback={<ContentSkeleton />}>
        <MetadataContent />
      </Suspense>
    </main>
  );
}

async function MetadataContent() {
  // Admin mutations must read fresh: opt out of the static prerender.
  await connection();
  // Counts only — option rows load on the type hub, not here.
  const types = await getMetadataTypesSummary();

  return (
    <div className="flex flex-col gap-4">
      {types.length === 0 ? (
        <EmptyState
          icon={<Database aria-hidden className="size-5" />}
          message="لا توجد أنواع بيانات بعد — أضف النوع الأول من الزر أعلاه."
        />
      ) : (
        <MetadataTypesTable types={types} />
      )}
    </div>
  );
}
