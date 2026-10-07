"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { searchSuggestions, type Suggestion } from "@/lib/actions/search";

export function CompactSearch({ lang }: { lang: "ar" | "en" }) {
  const t = useTranslations("appList.search");
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Reset search state whenever the route changes (e.g. after picking a suggestion).
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setQuery("");
    setItems([]);
    setOpen(false);
  }

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) return;
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const id = ++requestId.current;
        try {
          const results = await searchSuggestions(query);
          if (requestId.current !== id) return; // stale response
          setItems(results);
          setOpen(results.length > 0);
        } catch (err) {
          console.error("searchSuggestions failed", err);
          if (requestId.current !== id) return; // stale response
          setItems([]);
          setOpen(false);
        }
      });
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  function onQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    if (value.trim().length < 2) { setItems([]); setOpen(false); }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && query.trim()) {
      router.push(`/${lang}/apps?search=${encodeURIComponent(query.trim())}`);
    }
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="compact-search-row border-t border-border bg-card/95">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/searchLogo.svg" alt="" width={24} height={24} />
        <div className="relative flex-1">
          {/* Arrow-key navigation between options is deferred (not in this pass). */}
          <input
            role="combobox"
            aria-expanded={open}
            aria-controls="compact-suggestions"
            aria-autocomplete="list"
            value={query}
            onChange={onQueryChange}
            onKeyDown={onKeyDown}
            onFocus={() => items.length > 0 && setOpen(true)}
            onBlur={() => setOpen(false)}
            placeholder={t("traditionalPlaceholder")}
            aria-label={t("traditional")}
            className="w-full rounded-app border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
          {open && (
            <div id="compact-suggestions" role="listbox"
              className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-app border border-border bg-card shadow-app">
              {pending && items.length === 0 ? (
                <div className="px-3 py-2 text-sm text-text-secondary">{t("button")}…</div>
              ) : (
                items.map((s) => (
                  <Link key={s.id} href={`/${lang}/app/${s.slug}_${s.id}`}
                    role="option"
                    onMouseDown={(e) => e.preventDefault()}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.icon} alt="" width={24} height={24} className="rounded-app" />
                    <span>{lang === "ar" ? s.nameAr : s.nameEn}</span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
