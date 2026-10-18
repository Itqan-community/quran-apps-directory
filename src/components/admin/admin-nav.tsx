"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpenText,
  ChartColumn,
  ChevronDown,
  Database,
  Inbox,
  LayoutDashboard,
  Menu,
  Plus,
  Smartphone,
  Tags,
  Users,
  X,
} from "lucide-react";
import SignOutButton from "./sign-out-button";
import { MetadataTypeModal } from "./metadata-editor";
import type { MetadataNavRow } from "@/lib/repo/admin";

const NAV_ITEMS = [
  { label: "لوحة التحكم", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "الطلبات", href: "/admin/submissions", icon: Inbox, exact: false },
  { label: "التطبيقات", href: "/admin/apps", icon: Smartphone, exact: false },
  { label: "الفئات", href: "/admin/categories", icon: Tags, exact: false },
  { label: "المطورون", href: "/admin/developers", icon: Users, exact: false },
  { label: "البيانات الوصفية", href: "/admin/metadata", icon: Database, exact: false },
  { label: "التحليلات", href: "/admin/analytics", icon: ChartColumn, exact: false },
];

type NavUser = { name: string | null; email: string | null } | null;

const itemIdle =
  "text-admin-ink-muted transition hover:bg-admin-ink-soft hover:text-admin-ink-text";
const itemActive = "bg-primary font-bold text-white shadow-app";

function isActiveItem(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNav({
  user,
  metadataTypes,
}: {
  user: NavUser;
  metadataTypes: MetadataNavRow[];
}) {
  const pathname = usePathname();

  if (pathname === "/admin/login") return null;

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-admin-ink p-4 text-admin-ink-text md:flex">
      <NavBody user={user} metadataTypes={metadataTypes} />
    </aside>
  );
}

/** Compact top bar + slide-over drawer: admin had no navigation below md. */
export function AdminMobileBar({
  user,
  metadataTypes,
}: {
  user: NavUser;
  metadataTypes: MetadataNavRow[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer on navigation (render-time adjustment, not an effect).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  if (pathname === "/admin/login") return null;

  return (
    <>
      <div className="mb-4 flex items-center gap-3 rounded-app bg-admin-ink p-3 text-admin-ink-text md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="فتح القائمة الإدارية"
          className="rounded-app p-2 transition hover:bg-admin-ink-soft"
        >
          <Menu aria-hidden className="size-5" />
        </button>
        <span className="text-sm font-bold">لوحة الإدارة</span>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation" onClick={() => setOpen(false)}>
          <div className="admin-modal-backdrop absolute inset-0 bg-black/50" />
          <div
            className="admin-drawer-panel absolute inset-y-0 start-0 flex w-72 flex-col bg-admin-ink p-4 text-admin-ink-text"
            role="dialog"
            aria-modal="true"
            aria-label="القائمة الإدارية"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-bold">لوحة الإدارة</span>
              <button
                type="button"
                autoFocus
                onClick={() => setOpen(false)}
                aria-label="إغلاق القائمة"
                className="rounded-app p-2 transition hover:bg-admin-ink-soft"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <NavBody user={user} metadataTypes={metadataTypes} />
          </div>
        </div>
      )}
    </>
  );
}

function NavBody({ user, metadataTypes }: { user: NavUser; metadataTypes: MetadataNavRow[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const inMetadata = pathname.startsWith("/admin/metadata");

  // Collapsible submenu: open on mount inside the section (or when arriving
  // from outside), then entirely user-controlled via the chevron.
  const [metaOpen, setMetaOpen] = useState(inMetadata);
  const wasInSection = useRef(inMetadata);
  useEffect(() => {
    if (inMetadata && !wasInSection.current) setMetaOpen(true);
    wasInSection.current = inMetadata;
  }, [inMetadata]);

  const showTypeSublist = metadataTypes.length > 0;

  return (
    <>
      <div className="mb-5 flex items-center gap-2.5 px-1">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-app bg-primary text-white">
          <BookOpenText aria-hidden className="size-5" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-bold">دليل تطبيقات القرآن</span>
          <span className="text-xs text-admin-ink-muted">لوحة الإدارة</span>
        </span>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label="القائمة الإدارية">
        {NAV_ITEMS.map((item) => {
          const active = isActiveItem(pathname, item.href, item.exact);
          const Icon = item.icon;
          const isMeta = item.href === "/admin/metadata";
          return (
            <div key={item.href}>
              <div
                className={`flex items-center gap-1 rounded-app px-2 py-1 ${
                  active ? "" : ""
                }`}
              >
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-app px-2 py-2 text-sm ${active ? itemActive : itemIdle}`}
                >
                  <Icon aria-hidden className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
                {isMeta && showTypeSublist && (
                  <button
                    type="button"
                    onClick={() => setMetaOpen((v) => !v)}
                    aria-expanded={metaOpen}
                    aria-controls="metadata-types-sublist"
                    aria-label={metaOpen ? "طي قائمة الأنواع" : "فتح قائمة الأنواع"}
                    className={`shrink-0 rounded-app p-2 transition hover:bg-admin-ink-soft ${active ? "text-white" : "text-admin-ink-muted"}`}
                  >
                    <ChevronDown aria-hidden className="admin-chevron size-4" data-open={metaOpen ? "true" : "false"} />
                  </button>
                )}
              </div>
              {isMeta && showTypeSublist && (
                <div className="admin-submenu" data-open={metaOpen ? "true" : "false"}>
                  <ul id="metadata-types-sublist" className="flex flex-col gap-0.5 pe-1 ps-4 pt-1">
                    <li>
                      <button
                        type="button"
                        onClick={() => setAddOpen(true)}
                        className="flex w-full items-center gap-2 rounded-app border border-dashed border-admin-ink-muted/40 px-3 py-1.5 text-start text-xs font-bold text-admin-ink-text transition hover:border-primary hover:text-primary"
                      >
                        <Plus aria-hidden className="size-3.5 shrink-0" />
                        إضافة نوع بيانات
                      </button>
                    </li>
                    {metadataTypes.map((t) => {
                      const href = `/admin/metadata/${t.id}`;
                      const typeActive = pathname === href || pathname.startsWith(`${href}/`);
                      return (
                        <li key={t.id}>
                          <Link
                            href={href}
                            title={`${t.labelEn} (${t.name})`}
                            aria-current={typeActive ? "page" : undefined}
                            className={`flex items-center gap-2 rounded-app px-3 py-1.5 text-xs transition hover:bg-admin-ink-soft ${
                              typeActive
                                ? "bg-admin-ink-soft font-bold text-admin-ink-text"
                                : "text-admin-ink-muted hover:text-admin-ink-text"
                            }`}
                          >
                            <span
                              aria-hidden
                              className={`size-1.5 shrink-0 rounded-full ${typeActive ? "bg-primary" : "bg-current opacity-40"}`}
                            />
                            <span className="truncate">{t.labelAr}</span>
                            {!t.isActive && <span className="shrink-0 opacity-70">(موقوف)</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-4 rounded-app bg-admin-ink-soft p-3">
        <p className="truncate text-xs font-bold text-admin-ink-text">{user?.name || user?.email}</p>
        {user?.name && <p className="truncate text-[11px] text-admin-ink-muted">{user.email}</p>}
        <div className="mt-2">
          <SignOutButton />
        </div>
      </div>

      <MetadataTypeModal
        open={addOpen}
        editing={null}
        onClose={() => setAddOpen(false)}
        onSaved={(id) => {
          router.refresh();
          if (id !== undefined) router.push(`/admin/metadata/${id}`);
        }}
      />
    </>
  );
}
