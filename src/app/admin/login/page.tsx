"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { BookOpenText, LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (!res || res.error || res.code || res.ok === false) {
        setError("بيانات الدخول غير صحيحة");
        return;
      }
      // Full reload on purpose: middleware must see the fresh session cookie
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/admin";
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-app bg-card p-6 shadow-app">
        <span className="mb-4 flex size-11 items-center justify-center rounded-app bg-primary text-white">
          <BookOpenText aria-hidden className="size-6" />
        </span>
        <h1 className="mb-1 text-xl font-bold text-text">تسجيل دخول المشرف</h1>
        <p className="mb-6 text-sm text-text-secondary">دليل تطبيقات القرآن — لوحة الإدارة</p>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="البريد الإلكتروني"
          className="mb-4 w-full rounded-app border border-border bg-surface px-3 py-2 text-text"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="كلمة المرور"
          className="mb-4 w-full rounded-app border border-border bg-surface px-3 py-2 text-text"
        />
        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-app bg-primary px-3 py-2 font-bold text-white disabled:opacity-50"
        >
          <LogIn aria-hidden className="size-4" />
          {busy ? "..." : "دخول"}
        </button>
      </form>
    </main>
  );
}
