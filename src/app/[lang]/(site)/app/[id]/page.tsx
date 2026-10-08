import type { Metadata } from "next";
import { Suspense } from "react";
import { isLocale } from "@/lib/i18n";
import { getAppCached } from "@/lib/cache/apps";
import { parseAppParam } from "@/lib/app-params";
import { pageMetadata } from "@/lib/seo/metadata";
import AppDetail from "./app-detail";

type Props = { params: Promise<{ lang: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLocale(lang)) return {};
  const app = await getAppCached(parseAppParam(id));
  if (!app) return {};
  const isAr = lang === "ar";
  const title = isAr ? app.nameAr : app.nameEn;
  const description = isAr ? app.shortDescriptionAr : app.shortDescriptionEn;
  return pageMetadata(lang, `/app/${id}`, title, description, app.mainImageEn);
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
      <div className="aspect-[16/9] w-full animate-pulse rounded-app border border-border bg-surface md:h-80" />
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="h-[72px] w-[72px] animate-pulse rounded-app border border-border bg-surface" />
          <div className="flex flex-col gap-2">
            <div className="h-7 w-40 animate-pulse rounded-app bg-surface" />
            <div className="h-4 w-52 animate-pulse rounded-app bg-surface" />
          </div>
        </div>
        <div className="h-5 w-64 animate-pulse rounded-app bg-surface" />
        <div className="h-40 w-full animate-pulse rounded-app bg-surface" />
      </div>
    </div>
  );
}

export default function AppDetailPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Suspense fallback={<DetailSkeleton />}>
        <AppDetail params={params} />
      </Suspense>
    </main>
  );
}
