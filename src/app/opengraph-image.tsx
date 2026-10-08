import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/services/og-fonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "دليل التطبيقات القرآنية - Quran Apps Directory";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #a0533b 0%, #8a462f 100%)",
          color: "white",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, fontFamily: "Expo" }}>
          دليل التطبيقات القرآنية
        </div>
        <div style={{ fontSize: 32, marginTop: 16, opacity: 0.85, fontFamily: "Expo" }}>
          أفضل تطبيقات القرآن الكريم في مكان واحد
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Expo", data: ogFonts.bold, style: "normal", weight: 700 }] },
  );
}
