/**
 * Shared photo helpers — safe for BOTH server and client modules:
 * (no env access, no secrets; pure string utils + UI-facing types).
 * NOTE: deliberately NOT marked "server-only" because the admin photo form
 * (client component) imports formatBytes and the types below.
 */

import type { GalleryPhoto } from "@/lib/types";

/**
 * Admin-facing photo row: same data as GalleryPhoto plus category_id and
 * created_at, used by the dashboard, the photo manager, and the edit form.
 */
export type AdminPhoto = GalleryPhoto & {
  category_id: string | null;
  created_at: string;
};

/**
 * UI-facing category option for <select> inputs (admin forms).
 */
export type CategoryOption = { id: string; name: string };

/**
 * Album card used by the public /album page AND the admin album manager:
 * resolved cover URL (cover photo, else the album's first photo), photo
 * count, and — for admin rows — created_at.
 */
export type AdminAlbumCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  photoCount: number;
  coverUrl: string | null;
  created_at: string;
};

/** Album fields for the edit form (slug is immutable once created). */
export type AlbumEditData = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverPhotoId: string | null;
};

/** Turn any title into a URL-safe slug: "Senja di Kota Tua!" -> "senja-di-kota-tua". */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Returns `base`, `base-2`, `base-3`, … the first slug that does not exist
 * in the photos table yet. `exists` is a lookup provided by the caller so
 * this helper stays storage-agnostic (and unit-testable).
 */
export async function buildUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || "foto";
  if (!(await exists(root))) return root;

  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${root}-${n}`;
    if (!(await exists(candidate))) return candidate;
  }
  // Practically unreachable; timestamp fallback keeps uploads working.
  return `${root}-${Date.now()}`;
}

/** Human-readable file size ("2,4 MB") for the upload form. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/* ----------------------- EXIF autofill & quick picks ----------------------- */

/**
 * Normalize an EXIF numeric value: exifr may return a plain number, a
 * rational object { 0: 28, 1: 10 }, or a "28/10" string depending on
 * platform/bundle. Returns the float value, or null when unusable.
 */
export function exifNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const frac = v.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    if (frac) {
      const den = Number(frac[2]);
      if (den !== 0) return Number(frac[1]) / den;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (v && typeof v === "object") {
    const r = v as Record<string, unknown>;
    const num = Number(r[0]);
    const den = Number(r[1]);
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) return num / den;
  }
  return null;
}

/** "f/2.8" from an EXIF FNumber (2.8). Returns null when the value is unusable. */
export function formatAperture(n: number): string | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  return `f/${Number(n.toFixed(1))}`;
}

/** Shutter speed from EXIF ExposureTime seconds: 0.004 -> "1/250 s", 30 -> "30 s". */
export function formatShutter(sec: number): string | null {
  if (!Number.isFinite(sec) || sec <= 0) return null;
  if (sec >= 1) return `${Number(sec.toFixed(1))} s`;
  return `1/${Math.round(1 / sec)} s`;
}

/** Camera display name from EXIF — Model already contains the brand ("Canon EOS R6"). */
export function formatCameraName(model?: string | null): string | null {
  return model?.trim() || null;
}

/** Built-in quick picks for the admin form (merged with the user's own history). */
export const CAMERA_PRESETS = [
  "Poco X6 Pro",
  "Canon EOS R6",
  "Canon 1000D",
  "Sony A7 III",
  "Fujifilm X-T4",
  "Nikon Z6 II",
  "iPhone 15 Pro",
  "iPhone 13",
];

export const LENS_PRESETS = [
  "Kit 18-55mm",
  "23mm f/1.7",
  "RF 24-70mm F2.8",
  "50mm f/1.8",
  "35mm f/1.4",
  "70-200mm f/2.8",
  "11-22mm f/4",
];

/**
 * Merge previously used values with presets: history first (most relevant),
 * case-insensitive dedupe, capped at `max` entries for the suggestion list.
 */
export function mergeOptions(used: string[], presets: string[], max = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of [...used, ...presets]) {
    const trimmed = v.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}
