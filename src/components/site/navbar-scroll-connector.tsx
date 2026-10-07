"use client";

import { useEffect } from "react";

export function NavbarScrollConnector() {
  useEffect(() => {
    const header = document.getElementById("site-header");
    if (!header) return;
    const onScroll = () => {
      if (window.innerWidth <= 992) return;
      header.setAttribute("data-header-compact", window.scrollY > 200 ? "true" : "false");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return null;
}
