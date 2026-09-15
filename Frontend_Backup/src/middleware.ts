import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require the user to be logged in
const PROTECTED_ROUTES = ["/", "/search", "/library", "/liked-songs", "/history", "/downloads", "/playlists", "/playlist", "/album", "/artist", "/profile", "/settings", "/queue", "/lyrics", "/ai-generator", "/browse"];

// Routes only for unauthenticated users
const AUTH_ROUTES = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read access token from cookie (set during login) or check localStorage via cookie
  const accessToken = request.cookies.get("access_token")?.value;
  // Also check for the Supabase session cookie pattern
  const supabaseCookie = [...request.cookies.getAll()].find(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );

  const isAuthenticated = !!(accessToken || supabaseCookie);

  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Unauthenticated user trying to access protected route → redirect to login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user trying to access login/signup → redirect to home
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all routes except static files, Next.js internals, and API routes
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|eot)).*)",
  ],
};
