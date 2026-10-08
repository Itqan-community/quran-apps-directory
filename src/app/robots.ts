import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const noindex = process.env.NOINDEX === "1";
  if (noindex) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://quran-apps.itqan.dev"}/sitemap.xml`,
  };
}
