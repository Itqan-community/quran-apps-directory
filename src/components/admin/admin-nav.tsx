"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./sign-out-button";

const NAV_ITEMS = [
  { label: "لوحة التحكم", href: "/admin" },
  { label: "الطلبات", href: "/admin/submissions" },
  { label: "التطبيقات", href: "/admin/apps" },
  { label: "الفئات", href: "/admin/categories" },
  { label: "المطورون", href: "/admin/developers" },
  { label: "البيانات الوصفية", href: "/admin/metadata" },
  { label: "التحليلات", href: "/admin/analytics" },
];

type NavUser = { name: string; email: string } | null;

export default function AdminNav({ user }: { user: NavUser }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") return null;

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-l border-border bg-surface p-4 md:flex">
      <div className="mb-6 rounded-app bg-card p-3 shadow-app">
        <p className="truncate text-sm font-bold text-text">{user?.name ?? user?.email}</p>
        {user?.name && <p className="truncate text-xs text-text-secondary">{user.email}</p>}
        <div className="mt-2">
          <SignOutButton />
        </div>
      </div>
      <nav className="flex flex-col gap-1" aria-label="القائمة الإدارية">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`block rounded-app px-3 py-2 text-sm transition hover:bg-primary/10 ${
                active
                  ? "border-b-2 border-primary font-bold text-primary"
                  : "text-text"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
