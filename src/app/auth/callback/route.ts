import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth & magic-link landing: exchanges the one-time code for a session
 * cookie, then forwards the visitor to `next` (or the gallery).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only allow in-app paths (prevents open redirects).
  const rawNext = searchParams.get("next") ?? "/galeri";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/galeri";

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Supabase belum dikonfigurasi. Lihat SETUP.md.")}`,
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Provider-side error (cancelled consent, expired link, etc.)
  const desc =
    searchParams.get("error_description") ??
    searchParams.get("error") ??
    "Tautan masuk tidak valid atau telah kedaluwarsa. Coba lagi.";

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(desc)}&next=${encodeURIComponent(next)}`,
  );
}
