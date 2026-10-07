import "./globals.css";

export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-3">
          <h1 className="text-6xl font-bold text-text">404</h1>
          <p className="text-lg text-text-secondary">الصفحة غير موجودة</p>
          <p className="text-sm text-text-secondary">Page not found</p>
        </main>
      </body>
    </html>
  );
}
