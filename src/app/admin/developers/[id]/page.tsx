import { Suspense } from "react";
import { BackLink } from "@/components/admin/ui";
import { notFound } from "next/navigation";
import { DeveloperForm, type DeveloperInitial } from "@/components/admin/taxonomy-editor";
import { getDeveloperForEdit, type DeveloperEditRow } from "@/lib/repo/admin";

function EditSkeleton() {
  return <div className="h-[800px] animate-pulse rounded-app bg-surface" />;
}

export default function EditDeveloperPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">تعديل مطوّر</h1>
        <BackLink href="/admin/developers">العودة إلى القائمة</BackLink>
      </div>
      <Suspense fallback={<EditSkeleton />}>
        <EditContent params={params} />
      </Suspense>
    </main>
  );
}

function toInitial(d: DeveloperEditRow): DeveloperInitial {
  return {
    id: Number(d.id),
    nameEn: d.nameEn,
    nameAr: d.nameAr,
    website: d.website ?? "",
    email: d.email ?? "",
    logoUrl: d.logoUrl ?? "",
    descriptionEn: d.descriptionEn,
    descriptionAr: d.descriptionAr,
    socialUrls: Object.values(d.socialLinks),
    isVerified: d.isVerified,
  };
}

async function EditContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  const row =
    Number.isInteger(numId) && numId > 0 ? await getDeveloperForEdit(numId) : null;
  if (!row) notFound();
  const initial = toInitial(row);

  return <DeveloperForm key={numId} editing={initial} />;
}
