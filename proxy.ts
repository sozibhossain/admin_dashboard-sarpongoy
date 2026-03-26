import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { AUTH_ROUTES, PROTECTED_PREFIXES } from "@/lib/constants";

const isAuthRoute = (pathname: string) => AUTH_ROUTES.includes(pathname);

const isProtectedRoute = (pathname: string) =>
  PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export async function proxy(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const pathname = req.nextUrl.pathname;

  if (pathname === "/") {
    if (token?.accessToken) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuthRoute(pathname) && token?.accessToken) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isProtectedRoute(pathname)) {
    if (!token?.accessToken) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (token.role !== "admin") {
      return NextResponse.redirect(new URL("/login?error=unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/students/:path*",
    "/teachers/:path*",
    "/schools/:path*",
    "/profile/:path*",
    "/login",
    "/forgot-password",
    "/verify-otp",
    "/reset-password",
  ],
};
