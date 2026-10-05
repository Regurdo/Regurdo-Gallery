"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

/** State returned to the login form via useActionState. */
export type AuthFormState = {
  error?: string;
  notice?: string;
} | null;

/** Resolve the public origin of this request (works behind proxies too). */
async function getOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function translateAuthError(message: string): string {
  if (/rate limit/i.test(message)) return "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.";
  if (/signups not allowed/i.test(message))
    return "Pendaftaran akun baru sedang dinonaktifkan. Hubungi admin galeri.";
  if (/invalid email/i.test(message)) return "Format email tidak valid.";
  if (/failed to fetch/i.test(message))
    return "Tidak dapat menghubungi server autentikasi. Periksa konfigurasi Supabase.";
  return message;
}

/** "Masuk dengan Google" — redirects the browser to the OAuth consent screen. */
export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured) {
    redirect("/login?error=" + encodeURIComponent("Supabase belum dikonfigurasi. Lihat SETUP.md."));
  }

  const next = String(formData.get("next") ?? "/galeri");
  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(translateAuthError(error.message)));
  }
  redirect(data.url);
}

/** Email magic link — sends a one-time sign-in URL to the user's inbox. */
export async function signInWithMagicLinkAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured) {
    return {
      error: "Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Masukkan alamat email yang valid." };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) return { error: translateAuthError(error.message) };
  return { notice: `Tautan masuk telah dikirim ke ${email}. Periksa kotak masuk Anda.` };
}

/** Sign out and return to the gallery. */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/galeri");
}
