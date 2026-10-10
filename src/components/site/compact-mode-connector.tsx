"use client";

import { useEffect } from "react";

/**
 * Ports the Angular app-list behavior: the navbar switches to its compact
 * variant once the hero search section has scrolled out of view (desktop only).
 */
export function CompactModeConnector() {
  useEffect(() => {
    const header = document.getElementById("site-header");
    if (!header) return;

    if (window.innerWidth <= 992) return;

    const anchor = document.getElementById("search-container");
    if (!anchor) return;

    let threshold = anchor.getBoundingClientRect().bottom + window.scrollY;
    const recalc = () => {
      threshold = anchor.getBoundingClientRect().bottom + window.scrollY;
    };

    const onScroll = () => {
      header.setAttribute(
        "data-header-compact",
        window.scrollY > threshold - 84 ? "true" : "false"
      );
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", recalc);

    const observer = new ResizeObserver(recalc);
    observer.observe(anchor);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", recalc);
      observer.disconnect();
      header.setAttribute("data-header-compact", "false");
    };
  }, []);

  return null;
}
