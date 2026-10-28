export function formatAppCount(
  count: number | null | undefined,
): string | null {
  if (count == null || !Number.isFinite(count)) return null;
  return String(count);
}
