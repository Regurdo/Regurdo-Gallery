"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildUniqueSlug } from "@/lib/photo-utils";

/**
 * Admin category server actions: create, rename, delete.
 *
 * Security model (defense in depth — same as album/photo actions):
 *  - proxy.ts blocks anonymous visitors from /admin routes;
 *  - every action re-verifies the session AND profiles.is_admin server-side;
 *  - writes go through the USER-scoped client, so RLS (is_admin() policies
 *    on categories) enforces the rule a second time.
 *
 * Slug rules: generated once from the name and never changed afterwards, so
 * /galeri?kategori=<slug> links keep working. Deleting a category never
 * deletes photos — photos.category_id is ON DELETE SET NULL, they simply
 * fall back to "Tanpa Kategori".
 */

/** State consumed by the create form via useActionState. */
export type CategoryFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

/** Result for plain (non-form) actions invoked from buttons. */
export type ActionResult = { error?: string };

type Auth = { error: string } | { supabase: SupabaseClient };

async function requireAdmin(): Promise<Auth> {
  if (!isSupabaseConfigured) {
    return {
      error:
        "Supabase belum diatur. Isi NEXT_PUBLIC_SUPABASE_URL dan kunci di .env.local, lalu jalankan ulang server.",
    };
  }
  const { user, profile } = await getSession();
  if (!user || !profile?.is_admin) {
    return { error: "Aksi ini hanya untuk admin. Masuk dengan akun admin terlebih dahulu." };
  }
  return { supabase: await createClient() };
}

/* ------------------------------- helpers ------------------------------- */

const NAME_MAX = 60;

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function clipped(
  value: string,
  max: number,
  label: string,
  errors: Record<string, string>,
  key: string,
): string {
  if (value.length > max) {
    errors[key] = `${label} maksimal ${max} karakter.`;
    return value.slice(0, max);
  }
  return value;
}

function translateWriteError(message: string): string {
  if (/row-level security|permission denied/i.test(message))
    return "Database menolak aksi ini — pastikan akunmu sudah dijadikan admin (profiles.is_admin).";
  if (/duplicate key/i.test(message))
    return "Kategori dengan nama/slug yang sama sudah ada. Coba nama lain.";
  if (/foreign key/i.test(message))
    return "Data referensi tidak ditemukan — muat ulang halaman lalu coba lagi.";
  if (/failed to fetch|network/i.test(message))
    return "Tidak dapat menghubungi Supabase. Periksa koneksi atau konfigurasi .env.local.";
  return message;
}

/**
 * Refresh every surface that renders category names or counts:
 * homepage KOLEKSI chips, gallery filter chips, the photo manager rows,
 * the dashboard stats, and this manager itself.
 */
function revalidateCategoryPaths() {
  revalidatePath("/");
  revalidatePath("/galeri");
  revalidatePath("/admin");
  revalidatePath("/admin/foto");
  revalidatePath("/admin/kategori");
}

/* -------------------------------- create -------------------------------- */

export async function createCategoryAction(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const { supabase } = auth;

  const errors: Record<string, string> = {};
  const name = clipped(text(formData, "name"), NAME_MAX, "Nama kategori", errors, "name");
  if (!name) errors.name = "Nama kategori wajib diisi.";

  if (Object.keys(errors).length > 0) return { error: "Periksa kembali isian form.", fieldErrors: errors };

  // Slug is derived from the name; buildUniqueSlug appends -2, -3, … on clash.
  const slug = await buildUniqueSlug(name, async (s) => {
    const { data } = await supabase.from("categories").select("id").eq("slug", s).maybeSingle();
    return Boolean(data);
  });

  const { error: insErr } = await supabase.from("categories").insert({ name, slug });
  if (insErr) return { error: translateWriteError(insErr.message) };

  revalidateCategoryPaths();
  // Redirect back so the create form resets and the notice shows.
  redirect("/admin/kategori?created=1");
}

/* -------------------------------- rename -------------------------------- */

export async function updateCategoryAction(id: string, name: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const { supabase } = auth;

  if (!id) return { error: "Kategori tidak dikenali — muat ulang halaman." };

  const trimmed = name.trim().slice(0, NAME_MAX);
  if (!trimmed) return { error: "Nama kategori tidak boleh kosong." };

  const { data: existing } = await supabase.from("categories").select("id").eq("id", id).maybeSingle();
  if (!existing) return { error: "Kategori tidak ditemukan (mungkin sudah dihapus)." };

  // Only the display name changes — the slug stays immutable.
  const { error: updErr } = await supabase.from("categories").update({ name: trimmed }).eq("id", id);
  if (updErr) return { error: translateWriteError(updErr.message) };

  revalidateCategoryPaths();
  return {};
}

/* -------------------------------- delete -------------------------------- */

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const { supabase } = auth;

  if (!id) return { error: "Kategori tidak dikenali." };

  // photos.category_id is ON DELETE SET NULL — photos stay, they just lose
  // their label ("Tanpa Kategori").
  const { error: delErr } = await supabase.from("categories").delete().eq("id", id);
  if (delErr) return { error: translateWriteError(delErr.message) };

  revalidateCategoryPaths();
  return {};
}
