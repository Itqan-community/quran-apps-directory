"use client";

import { useEffect, useRef, useState } from "react";

export type CardCategory = {
  slug: string;
  nameAr?: string | null;
  nameEn?: string | null;
};

/**
 * Tag row for app cards. Shows up to `MAX_VISIBLE` full category names and
 * folds the rest into a "+N" chip. Clicking the chip pops the hidden tags
 * in a floating sheet (like the old project's tooltip — but tap-friendly:
 * hover never worked on touch). Closes on outside tap, scroll or Escape.
 * `position: fixed` so the card's clipped tag row can't cut the pop off.
 */
const MAX_VISIBLE = 2;

export function CategoryTagsRow({
  tags,
  lang,
  moreLabel,
  lessLabel,
}: {
  tags: CardCategory[];
  lang: "ar" | "en";
  moreLabel: string;
  lessLabel: string;
}) {
  const [open, setOpen] = useState(false);
  // Anchor + above/below placement computed from the chip at click time.
  const [pos, setPos] = useState<{
    left: number;
    bottomEdge: number | null;
    topEdge: number | null;
  } | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popRef.current?.contains(target) || rowRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (tags.length === 0) return null;

  const isAr = lang === "ar";
  const shown = tags.slice(0, MAX_VISIBLE);
  const hiddenCount = tags.length - shown.length;

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    // don't route to anything behind the chip
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // keep the sheet (~260px wide at most) fully on screen
    const half = Math.min(140, vw / 2 - 8);
    const left = Math.min(Math.max(r.left + r.width / 2, half + 8), vw - half - 8);
    // cap the sheet height against the smaller phone viewport
    const above = r.top > 110;
    setPos({
      left,
      bottomEdge: above ? vh - r.top + 8 : null,
      topEdge: above ? null : r.bottom + 8,
    });
    setOpen(true);
  }

  return (
    <>
      <div ref={rowRef} className="category-tags">
        {shown.map((tag) => {
          const label = isAr ? tag.nameAr : tag.nameEn;
          return (
            // title: very long names can still ellipsize inside the row
            <span key={tag.slug} className="category-tag" title={label ?? undefined}>
              {label}
            </span>
          );
        })}
        {tags.length > MAX_VISIBLE && (
          <button
            type="button"
            className="category-tag category-more"
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label={open ? lessLabel : moreLabel}
            title={open ? lessLabel : moreLabel}
            onClick={toggle}
          >
            +{hiddenCount}
          </button>
        )}
      </div>
      {open && pos && (
        <div
          ref={popRef}
          role="dialog"
          aria-label={moreLabel}
          className="category-tooltip"
          style={{
            left: pos.left,
            ...(pos.bottomEdge !== null
              ? { bottom: pos.bottomEdge }
              : { top: pos.topEdge }),
          }}
        >
          {tags.slice(MAX_VISIBLE).map((tag) => {
            const label = isAr ? tag.nameAr : tag.nameEn;
            return (
              <span key={tag.slug} className="tooltip-tag">
                {label}
              </span>
            );
          })}
        </div>
      )}
    </>
  );
}
