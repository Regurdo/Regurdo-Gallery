"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { isSupabaseConfigured } from "@/lib/config";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildUniqueSlug } from "@/lib/photo-utils";

/**
 * Admin photo server actions: upload, edit, delete, reorder.
 *
 * Security model (defense in depth):
 *  - proxy.ts blocks anonymous visitors from /admin routes;
 *  - every action re-verifies the session AND profiles.is_admin server-side;
 *  - writes go through the USER-scoped client, so RLS (is_admin() policies
 *    on photos + storage.objects) enforces the rule a second time.
 */

/** State consumed by <PhotoForm> via useActionState. */
export type PhotoFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

/** Result for plain (non-form) actions invoked from buttons. */
export type ActionResult = { error?: string };

const MAX_FILE_MB = 10;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "avif"]);
const EXT_BY_FORMAT: Record<string, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
};

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

/* ---------- tiny field validators (precise Indonesian messages) ---------- */

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function clipped(value: string, max: number, label: string, errors: Record<string, string>, key: string): string {
  if (value.length > max) {
    errors[key] = `${label} maksimal ${max} karakter.`;
    return value.slice(0, max);
  }
  return value;
}

function parseYear(formData: FormData, errors: Record<string, string>): number | null {
  const raw = text(formData, "year");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1900 || n > 2100) {
    errors.year = "Tahun harus angka antara 1900–2100.";
    return null;
  }
  return n;
}

type DecodedImage = { buffer: Buffer; format: string; width: number; height: number; contentType: string };

/** Read + validate the uploaded image; returns dimensions via sharp. */
async function decodeImage(
  formData: FormData,
  key: string,
  errors: Record<string, string>,
  required: boolean,
): Promise<DecodedImage | null> {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) {
    if (required) errors[key] = "Pilih file foto terlebih dahulu.";
    return null;
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    errors[key] = `Ukuran file maksimal ${MAX_FILE_MB} MB.`;
    return null;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let meta: sharp.Metadata;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    errors[key] = "File tidak dapat dibaca sebagai gambar.";
    return null;
  }

  const format = (meta.format ?? "").toLowerCase();
  if (!ACCEPTED_FORMATS.has(format)) {
    errors[key] = "Format harus JPG, PNG, WebP, atau AVIF.";
    return null;
  }

  return {
    buffer,
    format,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    contentType: `image/${format === "jpeg" ? "jpeg" : format}`,
  };
}

function translateWriteError(message: string): string {
  if (/row-level security|permission denied/i.test(message))
    return "Database menolak aksi ini — pastikan akunmu sudah dijadikan admin (profiles.is_admin).";
  if (/duplicate key/i.test(message))
    return "Foto dengan judul/slug yang sama sudah ada. Coba judul lain.";
  if (/bucket/i.test(message))
    return "Bucket Storage \"photos\" tidak ditemukan. Jalankan ulang migrasi SQL di Supabase.";
  if (/failed to fetch|network/i.test(message))
    return "Tidak dapat menghubungi Supabase. Periksa koneksi atau konfigurasi .env.local.";
  return message;
}

/* ------------------------------- upload ------------------------------- */

export async function uploadPhotoAction(
  _prev: PhotoFormState,
  formData: FormData,
): Promise<PhotoFormState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const { supabase } = auth;

  const errors: Record<string, string> = {};
  const title = clipped(text(formData, "title"), 120, "Judul", errors, "title");
  if (!title) errors.title = "Judul wajib diisi.";
  const year = parseYear(formData, errors);
  const camera = clipped(text(formData, "camera"), 80, "Kamera", errors, "camera");
  const lens = clipped(text(formData, "lens"), 80, "Lensa", errors, "lens");
  const iso = clipped(text(formData, "iso"), 20, "ISO", errors, "iso");
  const aperture = clipped(text(formData, "aperture"), 20, "Bukaan", errors, "aperture");
  const shutter = clipped(text(formData, "shutter"), 40, "Rana", errors, "shutter");
  const image = await decodeImage(formData, "file", errors, true);
  const categoryId = text(formData, "category_id") || null;

  if (Object.keys(errors).length > 0) return { error: "Periksa kembali isian form.", fieldErrors: errors };

  const slug = await buildUniqueSlug(title, async (s) => {
    const { data } = await supabase.from("photos").select("id").eq("slug", s).maybeSingle();
    return Boolean(data);
  });

  const { data: maxRow } = await supabase
    .from("photos")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = (typeof maxRow?.sort_order === "number" ? maxRow.sort_order : 0) + 1;

  const path = `${Date.now()}-${slug}.${EXT_BY_FORMAT[image!.format]}`;
  const { error: upErr } = await supabase.storage
    .from("photos")
    .upload(path, image!.buffer, { contentType: image!.contentType, upsert: false });
  if (upErr) return { error: translateWriteError(upErr.message) };

  const { error: insErr } = await supabase.from("photos").insert({
    slug,
    title,
    category_id: categoryId,
    year,
    camera: camera || null,
    lens: lens || null,
    iso: iso || null,
    aperture: aperture || null,
    shutter: shutter || null,
    storage_path: path,
    width: image!.width,
    height: image!.height,
    sort_order: nextSort,
  });

  if (insErr) {
    await supabase.storage.from("photos").remove([path]); // keep storage clean
    return { error: translateWriteError(insErr.message) };
  }

  revalidatePath("/galeri");
  revalidatePath("/admin");
  revalidatePath("/admin/foto");
  redirect("/admin/foto?upload=ok");
}

/* -------------------------------- edit -------------------------------- */

export async function updatePhotoAction(
  _prev: PhotoFormState,
  formData: FormData,
): Promise<PhotoFormState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const { supabase } = auth;

  const id = text(formData, "id");
  if (!id) return { error: "Foto tidak dikenali — muat ulang halaman." };

  const errors: Record<string, string> = {};
  const title = clipped(text(formData, "title"), 120, "Judul", errors, "title");
  if (!title) errors.title = "Judul wajib diisi.";
  const year = parseYear(formData, errors);
  const camera = clipped(text(formData, "camera"), 80, "Kamera", errors, "camera");
  const lens = clipped(text(formData, "lens"), 80, "Lensa", errors, "lens");
  const iso = clipped(text(formData, "iso"), 20, "ISO", errors, "iso");
  const aperture = clipped(text(formData, "aperture"), 20, "Bukaan", errors, "aperture");
  const shutter = clipped(text(formData, "shutter"), 40, "Rana", errors, "shutter");
  const image = await decodeImage(formData, "file", errors, false); // optional replace
  const categoryId = text(formData, "category_id") || null;

  if (Object.keys(errors).length > 0) return { error: "Periksa kembali isian form.", fieldErrors: errors };

  const { data: existing } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Foto tidak ditemukan (mungkin sudah dihapus)." };

  let newPath: string | null = null;
  if (image) {
    const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "foto";
    newPath = `${Date.now()}-${slugBase}.${EXT_BY_FORMAT[image.format]}`;
    const { error: upErr } = await supabase.storage
      .from("photos")
      .upload(newPath, image.buffer, { contentType: image.contentType, upsert: false });
    if (upErr) return { error: translateWriteError(upErr.message) };
  }

  const { error: updErr } = await supabase
    .from("photos")
    .update({
      title,
      category_id: categoryId,
      year,
      camera: camera || null,
      lens: lens || null,
      iso: iso || null,
      aperture: aperture || null,
      shutter: shutter || null,
      ...(image ? { storage_path: newPath, width: image.width, height: image.height } : {}),
    })
    .eq("id", id);

  if (updErr) {
    if (newPath) await supabase.storage.from("photos").remove([newPath]);
    return { error: translateWriteError(updErr.message) };
  }

  // Success with a replaced image -> drop the old object (best effort).
  if (newPath && existing.storage_path) {
    await supabase.storage.from("photos").remove([existing.storage_path]);
  }

  revalidatePath("/galeri");
  revalidatePath("/admin");
  revalidatePath("/admin/foto");
  redirect("/admin/foto?update=ok");
}

/* ------------------------------- delete ------------------------------- */

export async function deletePhotoAction(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const { supabase } = auth;

  if (!id) return { error: "Foto tidak dikenali." };

  const { data: row } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Foto tidak ditemukan (mungkin sudah dihapus)." };

  const { error: delErr } = await supabase.from("photos").delete().eq("id", id);
  if (delErr) return { error: translateWriteError(delErr.message) };

  if (row.storage_path) {
    await supabase.storage.from("photos").remove([row.storage_path]); // best effort
  }

  revalidatePath("/galeri");
  revalidatePath("/admin");
  revalidatePath("/admin/foto");
  return {};
}

/* ------------------------------- reorder ------------------------------- */

export async function movePhotoAction(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const { supabase } = auth;

  if (!id) return { error: "Foto tidak dikenali." };

  // Order rows exactly like the public gallery does, then swap positions.
  const { data: rows } = await supabase
    .from("photos")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const list = rows ?? [];
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return { error: "Foto tidak ditemukan." };

  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= list.length) return {}; // already at the edge

  const a = list[idx];
  const b = list[swapWith];

  await supabase.from("photos").update({ sort_order: b.sort_order }).eq("id", a.id);
  await supabase.from("photos").update({ sort_order: a.sort_order }).eq("id", b.id);

  revalidatePath("/galeri");
  revalidatePath("/admin/foto");
  return {};
}
