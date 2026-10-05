"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/config";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

/**
 * Admin "about" server action: saves the editable profile page content into
 * site_settings (key "about") and uploads the portrait into the "photos"
 * storage bucket (path prefix tentang/).
 *
 * Security model (same as photo/album actions):
 *  - /admin routes are gated by proxy.ts + the admin layout;
 *  - this action re-verifies session AND profiles.is_admin server-side;
 *  - the site_settings RLS policies (settings_update_admin) enforce it again.
 */

export type AboutFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

const MAX_PORTRAIT_MB = 8;
const ACCEPTED_FORMATS = new Set(["jpeg", "jpg", "png", "webp", "avif"]);
const EXT_BY_FORMAT: Record<string, string> = {
  jpeg: "jpg",
  jpg: "jpg",
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
  if (/bucket/i.test(message))
    return "Bucket Storage \"photos\" tidak ditemukan. Jalankan ulang migrasi SQL di Supabase.";
  if (/failed to fetch|network/i.test(message))
    return "Tidak dapat menghubungi Supabase. Periksa koneksi atau konfigurasi .env.local.";
  return message;
}

/** Read + validate the optional portrait; returns null when absent. */
async function decodePortrait(
  formData: FormData,
  errors: Record<string, string>,
): Promise<{ buffer: Buffer; format: string; contentType: string } | null> {
  const file = formData.get("portrait");
  if (!(file instanceof File) || file.size === 0) return null;

  if (file.size > MAX_PORTRAIT_MB * 1024 * 1024) {
    errors.portrait = `Ukuran file maksimal ${MAX_PORTRAIT_MB} MB.`;
    return null;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let format = "";
  try {
    format = ((await sharp(buffer).metadata()).format ?? "").toLowerCase();
  } catch {
    errors.portrait = "File tidak dapat dibaca sebagai gambar.";
    return null;
  }
  if (!ACCEPTED_FORMATS.has(format)) {
    errors.portrait = "Format harus JPG, PNG, WebP, atau AVIF.";
    return null;
  }
  return { buffer, format, contentType: `image/${format === "jpg" ? "jpeg" : format}` };
}

export async function updateAboutAction(
  _prev: AboutFormState,
  formData: FormData,
): Promise<AboutFormState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const { supabase } = auth;

  const errors: Record<string, string> = {};
  const tagline = clipped(text(formData, "tagline"), 120, "Tagline", errors, "tagline");
  const bio = clipped(text(formData, "bio"), 1200, "Bio", errors, "bio");
  const city = clipped(text(formData, "city"), 80, "Kota", errors, "city");
  const email = clipped(text(formData, "email"), 120, "Email", errors, "email");
  const instagram = clipped(text(formData, "instagram"), 200, "Instagram", errors, "instagram");
  const portraitCaption = clipped(
    text(formData, "portrait_caption"),
    120,
    "Keterangan potret",
    errors,
    "portrait_caption",
  );

  let startYear: number | null = null;
  const yearRaw = text(formData, "start_year");
  if (yearRaw) {
    const n = Number(yearRaw);
    if (!Number.isInteger(n) || n < 1900 || n > 2100) {
      errors.start_year = "Tahun harus angka antara 1900–2100.";
    } else {
      startYear = n;
    }
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Format email tidak valid.";
  }
  if (instagram && !/^https:\/\/(www\.)?instagram\.com\/.+/i.test(instagram)) {
    errors.instagram = "Tautan Instagram harus berupa https://instagram.com/namaakun.";
  }

  // Equipment rows: parallel name[] / role[] inputs from the client form.
  const names = formData.getAll("equipment_name").map((v) => String(v).trim());
  const roles = formData.getAll("equipment_role").map((v) => String(v).trim());
  const equipment = names
    .map((name, i) => ({ name, role: roles[i] ?? "" }))
    .filter((e) => e.name || e.role)
    .slice(0, 12);
  if (equipment.some((e) => e.name.length > 80 || e.role.length > 60)) {
    errors.equipment = "Nama alat maksimal 80 karakter, peran maksimal 60 karakter.";
  }

  const portrait = await decodePortrait(formData, errors);

  if (Object.keys(errors).length > 0) {
    return { error: "Periksa kembali isian form.", fieldErrors: errors };
  }

  // Current row (for the portrait path we may be replacing).
  const { data: current } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "about")
    .maybeSingle();
  const currentPath =
    current?.value && typeof current.value === "object"
      ? String((current.value as Record<string, unknown>).portrait_path ?? "")
      : "";

  let portraitPath = currentPath;
  if (portrait) {
    portraitPath = `tentang/portrait-${Date.now()}.${EXT_BY_FORMAT[portrait.format]}`;
    const { error: upErr } = await supabase.storage
      .from("photos")
      .upload(portraitPath, portrait.buffer, {
        contentType: portrait.contentType,
        upsert: false,
      });
    if (upErr) return { error: translateWriteError(upErr.message) };
  }

  const value = {
    tagline,
    bio,
    start_year: startYear,
    city,
    equipment,
    email,
    instagram,
    portrait_path: portraitPath,
    portrait_caption: portraitCaption,
  };

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "about", value }, { onConflict: "key" });

  if (error) {
    // Keep storage clean when the write fails right after a fresh upload.
    if (portrait && portraitPath !== currentPath) {
      await supabase.storage.from("photos").remove([portraitPath]);
    }
    return { error: translateWriteError(error.message) };
  }

  // Old portrait replaced -> remove the stale file.
  if (portrait && currentPath && currentPath !== portraitPath) {
    await supabase.storage.from("photos").remove([currentPath]);
  }

  revalidatePath("/tentang");
  revalidatePath("/admin/tentang");
  revalidatePath("/admin");
  return { ok: true };
}
