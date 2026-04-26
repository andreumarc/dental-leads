import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

// API routes that are public (no NextAuth session required — use their own auth)
const PUBLIC_API_ROUTES = [
  "/api/auth",
  "/api/public",
  "/api/webhooks",
  "/api/sync",   // Hub ImpulsoDent sync — auth via HUB_JWT_SECRET Bearer token
];

// All protected app routes (match the (dashboard) route group paths)
const PROTECTED_APP_ROUTES = [
  "/dashboard",
  "/leads",
  "/appointments",
  "/forms",
  "/channels",
  "/automations",
  "/clinics",
  "/users",
  "/settings",
  "/audit",
];

export default auth((req) => {
    const { pathname } = req.nextUrl;

    // Allow public API routes
    const isPublicApiRoute = PUBLIC_API_ROUTES.some(
      (route) => pathname.startsWith(route)
    );
    if (isPublicApiRoute) {
      return NextResponse.next();
    }

    // Allow public pages
    const isPublicPage = PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

    if (isPublicPage) {
      // Already authenticated → redirect away from login
      if (req.auth && pathname === "/login") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // Root redirect
    if (pathname === "/") {
      if (req.auth) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Protect all app routes
    const isProtectedRoute = PROTECTED_APP_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

    if (isProtectedRoute) {
      if (!req.auth) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
    }

    // Protect all other API routes (except already allowed public ones above)
    if (pathname.startsWith("/api/")) {
      if (!req.auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.next();
    }

    return NextResponse.next();
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public static assets (svg, png, jpg, jpeg, gif, webp, ico)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
