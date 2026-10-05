import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/config";

/**
 * Next.js 16 proxy (formerly `middleware.ts`).
 *
 * 1. Refreshes the Supabase session cookie on every request.
 * 2. Blocks unauthenticated visitors from /admin (server-side admin layout
 *    performs the deeper is_admin check — never trust the client).
 *
 * When Supabase env is missing (demo mode) there is no auth system at all,
 * so the /admin block is skipped — the admin layout then renders the
 * demo dashboard (all write actions fail gracefully).
 */
const PROTECTED_PREFIXES = ["/admin"];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const needsAuth =
    isSupabaseConfigured &&
    PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Skip static assets and Next internals.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
