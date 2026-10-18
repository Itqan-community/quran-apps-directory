import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getMetadataOptionForEdit } from "@/lib/repo/admin";
import { OptionFormPage } from "@/components/admin/metadata-editor";
import type { AdminMetadataOptionRow } from "@/lib/repo/admin";

function FormSkeleton() {
  return <div className="h-96 animate-pulse rounded-app bg-surface" />;
}

export default function EditMetadataOptionPage({
  params,
}: {
  params: Promise<{ id: string; optionId: string }>;
}) {
  return (
    <main className="flex flex-col gap-6">
      <Suspense fallback={<FormSkeleton />}>
        <EditContent params={params} />
      </Suspense>
    </main>
  );
}

async function EditContent({ params }: { params: Promise<{ id: string; optionId: string }> }) {
  const { id, optionId } = await params;
  const numId = Number(id);
  const numOptionId = Number(optionId);
  if (!Number.isInteger(numId) || numId <= 0) notFound();
  const row =
    Number.isInteger(numOptionId) && numOptionId > 0
      ? await getMetadataOptionForEdit(numOptionId)
      : null;
  // An option never moves between types: scope the page to its own type.
  if (!row || Number(row.metadataTypeId) !== numId) notFound();

  const editing: AdminMetadataOptionRow = {
    id: Number(row.id),
    value: row.value,
    labelEn: row.labelEn,
    labelAr: row.labelAr,
    descriptionEn: row.descriptionEn,
    descriptionAr: row.descriptionAr,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    icon: row.icon,
    color: row.color,
    appCount: 0,
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">تعديل الخيار</h1>
        <Link
          href={`/admin/metadata/${numId}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowRight aria-hidden className="size-4" />
          العودة إلى النوع
        </Link>
      </div>
      <OptionFormPage typeId={numId} editing={editing} />
    </>
  );
}
