"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, direction: "rtl" }}>حدث خطأ ما</h1>
        <p style={{ color: "#6c757d", marginTop: "0.5rem", direction: "rtl" }}>
          Something went wrong — please try again
        </p>
        <button
          onClick={reset}
          style={{ marginTop: "1rem", background: "#a0533b", color: "#fff", border: "none", padding: "0.5rem 1.25rem", borderRadius: 8, cursor: "pointer" }}
        >
          إعادة المحاولة / Retry
        </button>
      </div>
    </div>
  );
}
