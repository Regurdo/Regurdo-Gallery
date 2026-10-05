/**
 * Browser-side photo compression for admin uploads.
 *
 * Strategy (runs entirely in the visitor's browser, before the Server Action):
 *  1. Files already ≤ 1 MB pass through UNTOUCHED — no needless quality loss.
 *  2. Larger files are decoded, downscaled to ≤ 2560 px on the longest edge,
 *     and re-encoded as JPEG with a descending quality ladder until the blob
 *     fits in 1 MB; if the quality floor is reached, dimensions shrink a
 *     step and the ladder restarts (a few iterations are always enough).
 *  3. If the browser cannot decode/re-encode the file (rare, since the form
 *     only accepts JPG/PNG/WebP/AVIF), the ORIGINAL file is returned so the
 *     upload still behaves exactly like before this helper existed.
 *
 * Notes:
 *  - EXIF orientation is baked in by the browser when decoding, so rotated
 *    phone photos come out upright. EXIF metadata itself is dropped (the
 *    admin fills camera data in the form; smaller files, no location leak).
 *  - Transparency (PNG/WebP) is flattened onto white — JPEG has no alpha.
 *  - The server re-measures dimensions with sharp, so nothing server-side
 *    needs to trust these numbers.
 */

import { formatBytes } from "@/lib/photo-utils";

/** Hard ceiling for the compressed file. */
const TARGET_BYTES = 1024 * 1024; // 1 MB
/** Longest edge cap before encoding (portrait & landscape alike). */
const MAX_DIMENSION = 2560;
/** JPEG quality ladder. */
const START_QUALITY = 0.92;
const MIN_QUALITY = 0.5;
const QUALITY_STEP = 0.06;
/** Dimension multiplier once the quality floor is reached. */
const SHRINK_STEP = 0.85;
/** Safety bound for the (quality × shrink) loop. */
const MAX_ATTEMPTS = 16;

export type CompressResult = {
  /** Compressed file — or the ORIGINAL when untouched / not compressible. */
  file: File;
  /** True when the file was re-encoded. */
  compressed: boolean;
  /** Indonesian status line for the form UI. */
  note: string;
};

type Decoded = {
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
};

async function decodeImage(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file); // EXIF orientation applied
      return { source: bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      // fall through to <img> decoding
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode-gagal"));
      img.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url); // decode is complete — safe to revoke
  }
}

async function encodeJpeg(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-tidak-tersedia");
  ctx.fillStyle = "#ffffff"; // flatten transparency — JPEG has no alpha
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob-gagal"))),
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Compress `file` for upload. Never throws — on any failure the original
 * file comes back with an explanatory note, so the upload flow keeps
 * working exactly as before.
 */
export async function compressImage(file: File): Promise<CompressResult> {
  const passthrough = (note: string): CompressResult => ({
    file,
    compressed: false,
    note,
  });

  if (file.size <= TARGET_BYTES) {
    return passthrough("Sudah di bawah 1 MB — dikirim apa adanya (tanpa kompresi).");
  }

  let decoded: Decoded;
  try {
    decoded = await decodeImage(file);
  } catch {
    return passthrough("Browser tidak dapat memproses foto ini — diunggah apa adanya.");
  }

  try {
    const { width, height } = decoded;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    let outW = Math.max(1, Math.round(width * scale));
    let outH = Math.max(1, Math.round(height * scale));
    let quality = START_QUALITY;

    let blob = await encodeJpeg(decoded.source, outW, outH, quality);
    for (let attempt = 1; blob.size > TARGET_BYTES && attempt < MAX_ATTEMPTS; attempt += 1) {
      if (quality - QUALITY_STEP >= MIN_QUALITY) {
        quality = Math.round((quality - QUALITY_STEP) * 100) / 100;
      } else {
        // Quality floor reached — shrink a step, restart the ladder higher.
        outW = Math.max(1, Math.round(outW * SHRINK_STEP));
        outH = Math.max(1, Math.round(outH * SHRINK_STEP));
        quality = 0.82;
      }
      blob = await encodeJpeg(decoded.source, outW, outH, quality);
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "foto";
    const out = new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    const resized = outW !== width || outH !== height;
    const note =
      `Dikompres otomatis: ${formatBytes(file.size)} → ${formatBytes(out.size)}` +
      (resized ? ` (JPG ${outW}×${outH}px)` : " (JPG)") +
      ".";

    return { file: out, compressed: true, note };
  } catch {
    return passthrough("Browser tidak mendukung kompresi — diunggah apa adanya.");
  }
}
