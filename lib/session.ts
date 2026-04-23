import { type NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "tracker_session";
export const PAYWALL_COOKIE_NAME = "paid_access";

export function getSessionIdFromRequest(request: NextRequest) {
  const existing = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return existing || null;
}

export function isPaidRequest(request: NextRequest) {
  return request.cookies.get(PAYWALL_COOKIE_NAME)?.value === "1";
}

export function ensureSessionCookie(request: NextRequest, response: NextResponse) {
  const existing = getSessionIdFromRequest(request);
  if (existing) {
    return existing;
  }

  const sessionId = crypto.randomUUID();
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });

  return sessionId;
}
