import "server-only";

import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

/**
 * Verified session user for the current request.
 * Wrapped in React `cache` so multiple components share one call.
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

/** Profile row (display name, avatar, is_admin) for the signed-in user. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, is_admin, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile | null) ?? null;
});

export type SessionInfo = {
  user: User | null;
  profile: Profile | null;
};

export const getSession = cache(async (): Promise<SessionInfo> => {
  const user = await getSessionUser();
  const profile = user ? await getCurrentProfile() : null;
  return { user, profile };
});
