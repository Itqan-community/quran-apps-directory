import { Suspense } from "react";
import { getAllMetadataTypesWithAllOptions, type AdminMetadataTypeWithAllOptions } from "@/lib/repo/admin";
import { MetadataTypeForm, MetadataTypeCard, type MetadataTypeInitial } from "@/components/admin/metadata-editor";

function ContentSkeleton() {
  return <div className="h-96 animate-pulse rounded-app bg-surface" />;
}

type RawSearchParams = { [key: string]: string | string[] | undefined };

export default function MetadataPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-text">البيانات الوصفية</h1>
      <Suspense fallback={<ContentSkeleton />}>
        <MetadataContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function parseEdit(raw: string | string[] | undefined): number | null {
  if (typeof raw !== "string") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function toInitial(t: AdminMetadataTypeWithAllOptions): MetadataTypeInitial {
  return {
    id: Number(t.id),
    name: t.name,
    labelEn: t.labelEn,
    labelAr: t.labelAr,
    descriptionEn: t.descriptionEn,
    descriptionAr: t.descriptionAr,
    isMultiSelect: t.isMultiSelect,
    sortOrder: t.sortOrder,
    isActive: t.isActive,
    icon: t.icon ?? "",
  };
}

async function MetadataContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const editId = parseEdit(sp.edit);

  // Types (incl. inactive) each with all their options + per-option app usage counts.
  const types = await getAllMetadataTypesWithAllOptions();
  const editing = editId !== null ? (types.find((t) => t.id === editId) ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* key: remount the island whenever the edited id changes so state re-reads the initials */}
      <MetadataTypeForm key={editing?.id ?? "new"} editing={editing ? toInitial(editing) : null} />

      {types.length === 0 ? (
        <p className="rounded-app bg-card p-6 text-center text-sm text-text-secondary shadow-app">
          لا توجد أنواع بيانات بعد — أضف النوع الأول من النموذج أعلاه.
        </p>
      ) : (
        types.map((t) => (
          <MetadataTypeCard key={t.id} type={t} highlighted={t.id === editing?.id} />
        ))
      )}

      <p className="text-xs text-text-secondary">الإجمالي: {types.length}</p>
    </div>
  );
}
