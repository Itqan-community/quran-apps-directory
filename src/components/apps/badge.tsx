import type { ReactNode } from "react";

export function Badge({ children, variant }: { children: ReactNode; variant: "featured" | "new" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-white ${
        variant === "featured" ? "bg-primary" : "bg-emerald-600"
      }`}
    >
      {children}
    </span>
  );
}
