import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "@/lib/config";

let cached: SupabaseClient | null = null;

/**
 * Service-role client — bypasses RLS. SERVER ONLY.
 *
 * Use sparingly: trusted admin jobs only (e.g. moderating comments,
 * storage cleanup). Never import from a Client Component and never
 * prefix the key with NEXT_PUBLIC_.
 */
export function createAdminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Service role client requested but SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "Add it to .env.local (server-side only).",
    );
  }
  cached ??= createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
