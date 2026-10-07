"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LinkItem = { href: string; label: string };

export function MobileMenu({ links, communityLabel }: { links: LinkItem[]; communityLabel: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle mobile menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="flex h-10 w-10 flex-col items-center justify-center gap-1.5"
      >
        <span className={`h-0.5 w-6 bg-text transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
        <span className={`h-0.5 w-6 bg-text transition-opacity ${open ? "opacity-0" : ""}`} />
        <span className={`h-0.5 w-6 bg-text transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
      </button>
      {open && (
        <nav id="mobile-menu" className="absolute inset-x-0 top-16 z-40 flex flex-col border-b border-border bg-card p-2 shadow-app">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="rounded-app px-3 py-3 text-sm text-text hover:bg-surface">
              {l.label}
            </Link>
          ))}
          <a href="https://community.itqan.dev/" target="_blank" rel="noopener noreferrer"
            className="rounded-app px-3 py-3 text-sm text-primary">
            {communityLabel}
          </a>
        </nav>
      )}
    </div>
  );
}
