import type { Locale } from "@/lib/i18n";

const LABELS: Record<string, { ar: string; en: string }> = {
  google_play: { ar: "متجر جوجل بلاي", en: "Google Play" },
  app_store: { ar: "متجر آبل", en: "App Store" },
  app_gallery: { ar: "متجر هواوي", en: "AppGallery" },
};

export function StoreButtons({
  links,
  lang,
}: {
  links: { googlePlayLink: string | null; appStoreLink: string | null; appGalleryLink: string | null };
  lang: Locale;
}) {
  const items = [
    { key: "google_play", href: links.googlePlayLink },
    { key: "app_store", href: links.appStoreLink },
    { key: "app_gallery", href: links.appGalleryLink },
  ].filter((i) => i.href) as { key: string; href: string }[];

  if (items.length === 0) return null;
  return (
    <div id="downloads" className="flex flex-wrap gap-3">
      {items.map((i) => (
        <a
          key={i.key}
          href={i.href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-app border border-border bg-card px-4 py-2 text-sm font-bold text-text hover:border-primary hover:text-primary"
        >
          {LABELS[i.key][lang]}
        </a>
      ))}
    </div>
  );
}
