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
    <div>
      <section className="app-hero-section">
        <div className="hero-background" aria-hidden />
        <div className="hero-container shimmer-card">
          <div className="shimmer-icon" style={{ width: 130, height: 130, borderRadius: 16 }} />
          <div className="shimmer-text-group">
            <div className="shimmer-line shimmer-title" />
            <div className="shimmer-line shimmer-desc" />
            <div className="shimmer-line shimmer-btn" style={{ width: 140, height: 42 }} />
          </div>
        </div>
      </section>
      <div className="content-section">
        <div className="site-container">
          <div className="details-grid">
            <div className="details-main">
              <div className="shimmer-line" style={{ width: "30%", height: 20, marginBottom: 16 }} />
              <div className="shimmer-line" />
              <div className="shimmer-line" style={{ width: "95%" }} />
              <div className="shimmer-line" style={{ width: "88%" }} />
            </div>
            <aside className="details-side">
              <div className="shimmer-line" style={{ width: "60%" }} />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppDetailPage({ params }: Props) {
  return (
    <main>
      <Suspense fallback={<DetailSkeleton />}>
        <AppDetail params={params} />
      </Suspense>
    </main>
  );
}
