"use client";

import { useEffect, useRef, useState } from "react";

export type CardCategory = {
  slug: string;
  nameAr?: string | null;
  nameEn?: string | null;
};

/**
 * Tag row for app cards. Shows up to `MAX_VISIBLE` full category names and
 * folds the rest into a "+N" chip. Like the old project, the hidden tags
 * appear in a floating sheet:
 * - desktop: opens on hover/focus of the chip (grace delay so the pointer
 *   can reach the sheet), closes when the pointer leaves both
 * - everywhere: click/tap pins it open; closes on outside tap, scroll,
 *   or Escape
 * The sheet is `position: fixed` with coords taken from the chip when it
 * opens, so the clipped tag row or viewport edge can never cut it off.
 */
const MAX_VISIBLE = 2;
// how long the pointer may spend bouncing across the chip → sheet gap
const HOVER_GRACE_MS = 150;
// sheet opens below the chip when there is less room above than this
const ABOVE_THRESHOLD_PX = 110;

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
  // `pinned` = click/tap state; `hovered` = desktop hover/focus state.
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const open = pinned || hovered;
  // Anchor + above/below placement computed from the chip when it opens.
  const [pos, setPos] = useState<{
    left: number;
    bottomEdge: number | null;
    topEdge: number | null;
  } | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const hoverCloseTimer = useRef<number | null>(null);

  const cancelHoverClose = () => {
    if (hoverCloseTimer.current !== null) {
      window.clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  };
  const scheduleHoverClose = () => {
    cancelHoverClose();
    hoverCloseTimer.current = window.setTimeout(() => setHovered(false), HOVER_GRACE_MS);
  };
  const canHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(hover: hover) and (pointer: fine)").matches === true;

  const closeAll = () => {
    cancelHoverClose();
    setPinned(false);
    setHovered(false);
  };

  useEffect(() => {
    if (!open) {
      cancelHoverClose();
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popRef.current?.contains(target) || rowRef.current?.contains(target)) return;
      closeAll();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    window.addEventListener("scroll", closeAll, true);
    window.addEventListener("resize", closeAll);
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("scroll", closeAll, true);
      window.removeEventListener("resize", closeAll);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (tags.length === 0) return null;

  const isAr = lang === "ar";
  const shown = tags.slice(0, MAX_VISIBLE);
  const hiddenCount = tags.length - shown.length;

  /** Anchor the sheet to the chip; above it, unless the page top is close. */
  function anchorTo(el: HTMLElement) {
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const half = Math.min(140, vw / 2 - 8);
    const left = Math.min(Math.max(r.left + r.width / 2, half + 8), vw - half - 8);
    const above = r.top > ABOVE_THRESHOLD_PX;
    setPos({
      left,
      bottomEdge: above ? window.innerHeight - r.top + 8 : null,
      topEdge: above ? null : r.bottom + 8,
    });
  }

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    // don't route to anything behind the chip
    e.stopPropagation();
    if (pinned) {
      // second click releases the pin (even when the hover is holding it open)
      closeAll();
      return;
    }
    anchorTo(e.currentTarget);
    setPinned(true);
  }

  function onEnter(e: React.MouseEvent<HTMLButtonElement>) {
    if (!canHover()) return;
    cancelHoverClose();
    anchorTo(e.currentTarget);
    setHovered(true);
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
            onClick={onClick}
            onMouseEnter={onEnter}
            onMouseLeave={scheduleHoverClose}
            onFocus={(e) => {
              if (!canHover()) return;
              anchorTo(e.currentTarget);
              setHovered(true);
            }}
            onBlur={() => setHovered(false)}
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
              : { top: pos.topEdge ?? undefined }),
          }}
          onMouseEnter={cancelHoverClose}
          onMouseLeave={scheduleHoverClose}
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
