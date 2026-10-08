import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quran Apps Directory - دليل التطبيقات القرآنية",
    short_name: "Quran Apps",
    description: "Comprehensive directory of Quranic applications - الدليل الشامل للتطبيقات القرآنية",
    theme_color: "#A0533B",
    background_color: "#ffffff",
    display: "standalone",
    orientation: "portrait",
    scope: "/",
    start_url: "/",
    icons: [
      { src: "/images/fav/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { src: "/images/fav/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/images/fav/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/images/fav/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
    categories: ["education", "utilities", "lifestyle"],
  };
}
