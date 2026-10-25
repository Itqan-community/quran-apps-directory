import { Suspense } from "react";
import { BackLink } from "@/components/admin/ui";
import { notFound } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import AppForm, { DeleteAppButton, type AppFormInitial } from "@/components/admin/app-form";
import {
  getAppForEdit,
  getAllCategories,
  getAllDevelopers,
  getAllMetadataTypesWithActiveOptions,
} from "@/lib/repo/admin";

function EditSkeleton() {
  return <div className="h-[800px] animate-pulse rounded-app bg-surface" />;
}

export default function EditAppPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">تعديل تطبيق</h1>
        <BackLink href="/admin/apps">العودة إلى القائمة</BackLink>
      </div>
      <Suspense fallback={<EditSkeleton />}>
        <EditContent params={params} />
      </Suspense>
    </main>
  );
}

async function EditContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  const editData =
    Number.isInteger(numId) && numId > 0 ? await getAppForEdit(numId) : null;
  if (!editData) notFound();
  const a = editData!.app;

  const [developers, categories, metadataTypes] = await Promise.all([
    getAllDevelopers(),
    getAllCategories(),
    getAllMetadataTypesWithActiveOptions(),
  ]);

  // Same reading rule as the public detail: file rows first, legacy jsonb fallback per language.
  const shotsEn = editData!.screenshots.filter((s) => s.language === "en");
  const shotsAr = editData!.screenshots.filter((s) => s.language === "ar");
  const initial: AppFormInitial = {
    slug: a.slug,
    nameEn: a.nameEn,
    nameAr: a.nameAr,
    shortDescriptionEn: a.shortDescriptionEn,
    shortDescriptionAr: a.shortDescriptionAr,
    descriptionEn: a.descriptionEn,
    descriptionAr: a.descriptionAr,
    applicationIcon: a.applicationIcon,
    mainImageEn: a.mainImageEn,
    mainImageAr: a.mainImageAr,
    googlePlayLink: a.googlePlayLink ?? "",
    appStoreLink: a.appStoreLink ?? "",
    appGalleryLink: a.appGalleryLink ?? "",
    screenshotsEn: shotsEn.length > 0 ? shotsEn.map((s) => s.image) : (a.screenshotsEn ?? []),
    screenshotsAr: shotsAr.length > 0 ? shotsAr.map((s) => s.image) : (a.screenshotsAr ?? []),
    categoryIds: editData!.categoryIds,
    metadataOptionIds: editData!.metadataOptionIds,
    developerId: a.developerId,
    platform: a.platform,
    status: a.status,
    featured: a.featured,
    sortOrder: a.sortOrder,
    avgRating: a.avgRating,
    reviewCount: a.reviewCount,
    viewCount: a.viewCount,
  };

  return (
    <div className="flex flex-col gap-4">
      <AppForm
        key={numId}
        mode="edit"
        appId={numId}
        developers={developers}
        categories={categories}
        metadataTypes={metadataTypes}
        initial={initial}
      />
      <section className="rounded-app border border-red-300 bg-red-50 p-4 dark:bg-red-500/10">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-red-700 dark:text-red-400">
          <TriangleAlert aria-hidden className="size-4" />
          منطقة الخطر
        </h2>
        <p className="mb-3 text-xs text-red-700 dark:text-red-400">
          الحذف نهائي ويشمل الفئات ولقطات الشاشة والبيانات الوصفية المرتبطة بالتطبيق.
        </p>
        <DeleteAppButton appId={numId} appName={a.nameEn} />
      </section>
    </div>
  );
}
