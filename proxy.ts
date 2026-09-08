import { NextResponse } from "next/server";

import { auth } from "@/auth";

/**
 * Routes that require a signed-in account. Listed as prefixes so nested paths
 * (e.g. /orders/abc123) are covered without extra entries.
 */
const PROTECTED_PREFIXES = ["/cart", "/checkout", "/profile", "/orders"];

/**
 * Guards customer routes in one place rather than repeating a session check at
 * the top of every page — a page added later is protected by adding a prefix
 * here, and cannot be forgotten.
 *
 * `auth()` wraps the handler so the session is decoded once per request. The
 * session is a JWT, so this costs no database round-trip.
 */
export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected || request.auth?.user?.id) {
    return NextResponse.next();
  }

  const signIn = new URL("/sign-in", request.nextUrl);
  // Remembered so sign-in can return the visitor to what they were doing
  // instead of dropping them on the home page.
  signIn.searchParams.set("callbackUrl", pathname);

  return NextResponse.redirect(signIn);
});

export const config = {
  // Without a matcher the proxy runs on every request, including static assets
  // and image optimisation. Excluding those keeps CSS, JS and images off the
  // auth path entirely.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|Images|.*\\.).*)"],
};
