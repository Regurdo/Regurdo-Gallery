/**
 * Central environment configuration.
 *
 * The app must boot even when Supabase env vars are missing (e.g. fresh clone,
 * preview sandbox). UI code checks `isSupabaseConfigured` and renders an
 * Indonesian setup notice instead of crashing.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
/** Server-only. Never expose to the browser. Used by admin server actions. */
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Public site URL — used for OAuth redirects and SEO metadata. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const isAdminClientConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
