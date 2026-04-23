import { NextRequest, NextResponse } from "next/server";

import { ensureSessionCookie, isPaidRequest } from "@/lib/session";

function isProtectedPath(pathname: string) {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/api/keys") || pathname.startsWith("/api/notifications");
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!isProtectedPath(pathname)) {
    const response = NextResponse.next();
    ensureSessionCookie(request, response);
    return response;
  }

  if (!isPaidRequest(request)) {
    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json({ error: "This endpoint requires an active subscription" }, { status: 402 });
      ensureSessionCookie(request, response);
      return response;
    }

    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("paywall", "1");

    const response = NextResponse.redirect(redirectUrl);
    ensureSessionCookie(request, response);
    return response;
  }

  const response = NextResponse.next();
  ensureSessionCookie(request, response);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]
};
