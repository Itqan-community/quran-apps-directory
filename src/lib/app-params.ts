/** Parse app detail params: `slug_id` → id; numeric → id; else the whole string (slug). */
export function parseAppParam(param: string): string {
  const lastUnderscore = param.lastIndexOf("_");
  if (lastUnderscore !== -1) {
    const suffix = param.substring(lastUnderscore + 1);
    if (/^\d+$/.test(suffix)) return suffix;
  }
  return param;
}
