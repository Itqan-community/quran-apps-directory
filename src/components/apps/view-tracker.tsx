"use client";

import { useEffect } from "react";

export function ViewTracker({ appId }: { appId: number }) {
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appId }),
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, [appId]);
  return null;
}
