import { AppStoreBadge } from "./store-badges";
import { GooglePlayBadge } from "./store-badges";
import { AppGalleryBadge } from "./store-badges";

export function StoreButtons({
  links,
}: {
  links: { googlePlayLink: string | null; appStoreLink: string | null; appGalleryLink: string | null };
}) {
  const items = [
    { key: "google_play", href: links.googlePlayLink, badge: <GooglePlayBadge /> },
    { key: "app_store", href: links.appStoreLink, badge: <AppStoreBadge /> },
    { key: "app_gallery", href: links.appGalleryLink, badge: <AppGalleryBadge /> },
  ].filter((i) => i.href) as { key: string; href: string; badge: React.ReactNode }[];

  if (items.length === 0) return null;
  return (
    <div id="downloads" className="download-links">
      {items.map((i) => (
        <a key={i.key} href={i.href} target="_blank" rel="noopener noreferrer">
          {i.badge}
        </a>
      ))}
    </div>
  );
}
