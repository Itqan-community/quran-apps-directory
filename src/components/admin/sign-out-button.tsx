"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await signOut({ redirect: false });
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/admin/login";
        } finally {
          setBusy(false);
        }
      }}
      className="w-full rounded-app border border-border bg-surface px-3 py-1.5 text-xs text-text transition hover:bg-primary/10 disabled:opacity-50"
    >
      {busy ? "..." : "تسجيل الخروج"}
    </button>
  );
}
