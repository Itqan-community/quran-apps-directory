"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function LangToggle({ lang }: { lang: "ar" | "en" }) {
  const pathname = usePathname();
  const target = lang === "ar" ? "en" : "ar";
  const rest = pathname.replace(/^\/(ar|en)/, "") || "";
  return (
    <Link href={`/${target}${rest}`}
      className="rounded-app px-3 py-2 text-sm font-bold text-text-secondary hover:bg-surface hover:text-primary"
      aria-label="Toggle language">
      {lang === "ar" ? "EN" : "ع"}
    </Link>
  );
}
