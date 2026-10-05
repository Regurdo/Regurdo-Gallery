import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";

/**
 * Refreshes the Supabase auth session on every request (rotates expired
 * access tokens) and returns both the response (with updated cookies) and
 * the verified user, so route protection can rely on a trusted identity.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: { id: string } | null;
}> {
  let response = NextResponse.next({ request });

  // Without env vars we simply pass through; pages render setup notices.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { response, user: null };
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() validates the JWT against the Supabase Auth server —
  // never trust getSession() alone on the server side.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
