import { ImageResponse } from "next/og";
import { getAppCached } from "@/lib/cache/apps";
import { parseAppParam } from "@/lib/app-params";
import { ogFonts } from "@/lib/services/og-fonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const alt = "Quran Apps Directory";

export default async function AppOgImage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { id } = await params;
  const app = await getAppCached(parseAppParam(id));

  if (!app) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #a0533b 0%, #8a462f 100%)",
            color: "white",
            fontSize: 64,
            fontWeight: 700,
            fontFamily: "Expo",
          }}
        >
          دليل التطبيقات القرآنية
        </div>
      ),
      { ...size, fonts: [{ name: "Expo", data: ogFonts.bold, style: "normal", weight: 700 }] },
    );
  }

  const iconBuffer = await fetch(app.applicationIcon)
    .then((r) => r.arrayBuffer())
    .catch(() => null);
  const iconDataUrl = iconBuffer
    ? `data:image/png;base64,${Buffer.from(iconBuffer).toString("base64")}`
    : null;
  const isAr = (await params).lang === "ar";
  const name = isAr ? app.nameAr : app.nameEn;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 40,
          padding: 60,
          background: "linear-gradient(135deg, #a0533b 0%, #8a462f 100%)",
          color: "white",
        }}
      >
        {iconDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconDataUrl}
            alt=""
            width={200}
            height={200}
            style={{ borderRadius: 24, objectFit: "cover" }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 56, fontWeight: 700, fontFamily: "Expo" }}>{name}</div>
          <div style={{ fontSize: 26, opacity: 0.85, fontFamily: "Expo" }}>
            {Math.round(Number(app.avgRating) * 10) / 10} ★ · {app.reviewCount} reviews
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Expo", data: ogFonts.bold, style: "normal", weight: 700 }] },
  );
}
