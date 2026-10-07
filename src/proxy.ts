import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["ar", "en"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();
    const session = await auth();
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  // locale routing (next-intl middleware replaces this in Plan 2)
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (!first || !LOCALES.includes(first)) {
    return NextResponse.redirect(new URL("/ar", req.url));
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: ["/((?!_next|_vercel|api|health|sentry-tunnel|upload|.*\\..*).*)"],
};
