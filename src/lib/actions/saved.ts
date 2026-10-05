"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/config";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * SIMPAN (bookmark) server action.
 *
 * Writes go through the USER-scoped client so RLS (saved_photos policies:
 * select/insert/delete strictly per auth.uid()) enforces ownership — a user
 * can never touch another user's bookmarks, even by calling this action
 * with a forged photo id.
 */

export type ToggleSavedResult = { saved?: boolean; error?: string };

export async function toggleSavedPhotoAction(photoId: string): Promise<ToggleSavedResult> {
  if (!isSupabaseConfigured) {
    return {
      error:
        "Supabase belum diatur. Isi NEXT_PUBLIC_SUPABASE_URL dan kunci di .env.local, lalu jalankan ulang server.",
    };
  }

  const { user } = await getSession();
  if (!user) {
    return { error: "Masuk dulu untuk menyimpan foto favoritmu." };
  }
  if (!photoId) {
    return { error: "Foto tidak dikenali — muat ulang halaman." };
  }

  const supabase = await createClient();

  // Already saved -> unsave. Otherwise save.
  const { data: existing } = await supabase
    .from("saved_photos")
    .select("photo_id")
    .eq("user_id", user.id)
    .eq("photo_id", photoId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("saved_photos")
      .delete()
      .eq("user_id", user.id)
      .eq("photo_id", photoId);
    if (error) return { error: translateSavedError(error.message) };
    revalidatePath("/galeri");
    return { saved: false };
  }

  const { error } = await supabase
    .from("saved_photos")
    .insert({ user_id: user.id, photo_id: photoId });
  if (error) return { error: translateSavedError(error.message) };

  revalidatePath("/galeri");
  return { saved: true };
}

function translateSavedError(message: string): string {
  if (/row-level security|permission denied/i.test(message))
    return "Database menolak aksi ini. Coba keluar lalu masuk kembali ke akunmu.";
  if (/foreign key/i.test(message))
    return "Foto tidak ditemukan (mungkin sudah dihapus admin).";
  if (/failed to fetch|network/i.test(message))
    return "Tidak dapat menghubungi Supabase. Periksa koneksi atau konfigurasi .env.local.";
  return message;
}
