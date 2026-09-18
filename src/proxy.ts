import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const publicPaths = ["/login", "/register", "/forgot-password"];

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;

  const isPublic =
    publicPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    ) ||
    pathname.startsWith("/api/auth") ||
    pathname === "/";

  const isAuthenticated = !!request.auth;

  if (!isAuthenticated && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    isAuthenticated &&
    publicPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
