/**
 * Cross-navigation focus handoff. Navigating from a sheet/palette link
 * remounts the dock on the destination page, so the initiating component
 * cannot focus the destination element directly. It records the intended
 * target here (module scope, shared across the client bundle) before the
 * client-side navigation; the dock consumes it once it mounts on the new
 * page and focuses the matching element.
 *
 * In-memory only: a hard reload loses the request, which is correct — a fresh
 * load has no "previous" focus to restore.
 */
export type DockFocusTarget = "category" | "search-results";

let pending: DockFocusTarget | null = null;

export function requestDockFocus(target: DockFocusTarget) {
  pending = target;
}

export function takeDockFocus(): DockFocusTarget | null {
  const target = pending;
  pending = null;
  return target;
}
