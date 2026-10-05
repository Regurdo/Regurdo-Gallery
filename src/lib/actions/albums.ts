"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildUniqueSlug } from "@/lib/photo-utils";

/**
 * Admin album server actions: create, edit, delete, reorder, and manage the
 * photos inside an album (add / remove / reorder / set cover).
 *
 * Security model (defense in depth — same as photo actions):
 *  - proxy.ts blocks anonymous visitors from /admin routes;
 *  - every action re-verifies the session AND profiles.is_admin server-side;
 *  - writes go through the USER-scoped client, so RLS (is_admin() policies
 *    on albums + album_photos) enforces the rule a second time.
 */

/** State consumed by <AlbumForm> via useActionState. */
export type AlbumFormState = {
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
    return "Album dengan judul/slug yang sama sudah ada. Coba judul lain.";
  if (/foreign key/i.test(message))
    return "Data referensi tidak ditemukan — muat ulang halaman lalu coba lagi.";
  if (/failed to fetch|network/i.test(message))
    return "Tidak dapat menghubungi Supabase. Periksa koneksi atau konfigurasi .env.local.";
  return message;
}

function revalidateAlbumPaths(albumId?: string) {
  revalidatePath("/album");
  revalidatePath("/admin/album");
  if (albumId) revalidatePath(`/admin/album/${albumId}`);
}

/* -------------------------------- create -------------------------------- */

export async function createAlbumAction(
  _prev: AlbumFormState,
  formData: FormData,
): Promise<AlbumFormState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const { supabase } = auth;

  const errors: Record<string, string> = {};
  const title = clipped(text(formData, "title"), 120, "Judul", errors, "title");
  if (!title) errors.title = "Judul wajib diisi.";
  const description = clipped(text(formData, "description"), 400, "Deskripsi", errors, "description");

  if (Object.keys(errors).length > 0) return { error: "Periksa kembali isian form.", fieldErrors: errors };

  const slug = await buildUniqueSlug(title, async (s) => {
    const { data } = await supabase.from("albums").select("id").eq("slug", s).maybeSingle();
    return Boolean(data);
  });

  const { data: maxRow } = await supabase
    .from("albums")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = (typeof maxRow?.sort_order === "number" ? maxRow.sort_order : 0) + 1;

  const { data: created, error: insErr } = await supabase
    .from("albums")
    .insert({ slug, title, description: description || null, sort_order: nextSort })
    .select("id")
    .single();

  if (insErr || !created) {
    return { error: translateWriteError(insErr?.message ?? "Album gagal dibuat.") };
  }

  revalidateAlbumPaths();
  // Fresh album is empty — send the admin straight to the contents manager.
  redirect(`/admin/album/${created.id}/isi`);
}

/* --------------------------------- edit --------------------------------- */

export async function updateAlbumAction(
  _prev: AlbumFormState,
  formData: FormData,
): Promise<AlbumFormState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const { supabase } = auth;

  const id = text(formData, "id");
  if (!id) return { error: "Album tidak dikenali — muat ulang halaman." };

  const errors: Record<string, string> = {};
  const title = clipped(text(formData, "title"), 120, "Judul", errors, "title");
  if (!title) errors.title = "Judul wajib diisi.";
  const description = clipped(text(formData, "description"), 400, "Deskripsi", errors, "description");

  if (Object.keys(errors).length > 0) return { error: "Periksa kembali isian form.", fieldErrors: errors };

  const { error: updErr } = await supabase
    .from("albums")
    .update({ title, description: description || null })
    .eq("id", id);

  if (updErr) return { error: translateWriteError(updErr.message) };

  revalidateAlbumPaths(id);
  redirect("/admin/album?update=ok");
}

/* -------------------------------- delete -------------------------------- */

export async function deleteAlbumAction(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const { supabase } = auth;

  if (!id) return { error: "Album tidak dikenali." };

  // album_photos rows disappear via ON DELETE CASCADE; photos themselves
  // are untouched (an album is just a curated list).
  const { error: delErr } = await supabase.from("albums").delete().eq("id", id);
  if (delErr) return { error: translateWriteError(delErr.message) };

  revalidateAlbumPaths();
  return {};
}

/* ------------------------------- reorder ------------------------------- */

export async function moveAlbumAction(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const { supabase } = auth;

  if (!id) return { error: "Album tidak dikenali." };

  // Order rows exactly like the public /album page, then swap positions.
  const { data: rows } = await supabase
    .from("albums")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const list = rows ?? [];
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return { error: "Album tidak ditemukan." };

  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= list.length) return {}; // already at the edge

  const a = list[idx];
  const b = list[swapWith];

  await supabase.from("albums").update({ sort_order: b.sort_order }).eq("id", a.id);
  await supabase.from("albums").update({ sort_order: a.sort_order }).eq("id", b.id);

  revalidateAlbumPaths();
  return {};
}

/* --------------------------- album contents ---------------------------- */

export async function addAlbumPhotoAction(albumId: string, photoId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const { supabase } = auth;

  if (!albumId || !photoId) return { error: "Album atau foto tidak dikenali." };

  const { data: album } = await supabase.from("albums").select("id").eq("id", albumId).maybeSingle();
  if (!album) return { error: "Album tidak ditemukan (mungkin sudah dihapus)." };

  const { data: existing } = await supabase
    .from("album_photos")
    .select("photo_id")
    .eq("album_id", albumId)
    .eq("photo_id", photoId)
    .maybeSingle();
  if (existing) return { error: "Foto sudah ada di album ini." };

  const { data: maxRow } = await supabase
    .from("album_photos")
    .select("sort_order")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = (typeof maxRow?.sort_order === "number" ? maxRow.sort_order : 0) + 1;

  const { error: insErr } = await supabase
    .from("album_photos")
    .insert({ album_id: albumId, photo_id: photoId, sort_order: nextSort });
  if (insErr) return { error: translateWriteError(insErr.message) };

  revalidateAlbumPaths(albumId);
  return {};
}

export async function removeAlbumPhotoAction(albumId: string, photoId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const { supabase } = auth;

  if (!albumId || !photoId) return { error: "Album atau foto tidak dikenali." };

  const { error: delErr } = await supabase
    .from("album_photos")
    .delete()
    .eq("album_id", albumId)
    .eq("photo_id", photoId);
  if (delErr) return { error: translateWriteError(delErr.message) };

  // If the removed photo was the cover, clear it (public pages then fall
  // back to the first remaining photo).
  const { data: album } = await supabase
    .from("albums")
    .select("cover_photo_id")
    .eq("id", albumId)
    .maybeSingle();
  if (album?.cover_photo_id === photoId) {
    await supabase.from("albums").update({ cover_photo_id: null }).eq("id", albumId);
  }

  revalidateAlbumPaths(albumId);
  return {};
}

export async function moveAlbumPhotoAction(
  albumId: string,
  photoId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const { supabase } = auth;

  if (!albumId || !photoId) return { error: "Album atau foto tidak dikenali." };

  const { data: rows } = await supabase
    .from("album_photos")
    .select("photo_id, sort_order")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: true })
    .order("photo_id", { ascending: true });

  const list = rows ?? [];
  const idx = list.findIndex((r) => r.photo_id === photoId);
  if (idx === -1) return { error: "Foto tidak ditemukan di album ini." };

  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= list.length) return {}; // already at the edge

  const a = list[idx];
  const b = list[swapWith];

  await supabase
    .from("album_photos")
    .update({ sort_order: b.sort_order })
    .eq("album_id", albumId)
    .eq("photo_id", a.photo_id);
  await supabase
    .from("album_photos")
    .update({ sort_order: a.sort_order })
    .eq("album_id", albumId)
    .eq("photo_id", b.photo_id);

  revalidateAlbumPaths(albumId);
  return {};
}

export async function setAlbumCoverAction(albumId: string, photoId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const { supabase } = auth;

  if (!albumId || !photoId) return { error: "Album atau foto tidak dikenali." };

  // Only a member of the album can be its cover (keeps public pages sane).
  const { data: member } = await supabase
    .from("album_photos")
    .select("photo_id")
    .eq("album_id", albumId)
    .eq("photo_id", photoId)
    .maybeSingle();
  if (!member) return { error: "Foto belum ada di album ini — tambahkan dulu." };

  const { error: updErr } = await supabase
    .from("albums")
    .update({ cover_photo_id: photoId })
    .eq("id", albumId);
  if (updErr) return { error: translateWriteError(updErr.message) };

  revalidateAlbumPaths(albumId);
  return {};
}
