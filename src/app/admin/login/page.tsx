"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError("بيانات الدخول غير صحيحة");
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-app bg-card p-6 shadow-app">
        <h1 className="mb-6 text-xl font-bold text-text">تسجيل دخول المشرف</h1>
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
          className="w-full rounded-app bg-primary px-3 py-2 font-bold text-white disabled:opacity-50"
        >
          {busy ? "..." : "دخول"}
        </button>
      </form>
    </main>
  );
}
