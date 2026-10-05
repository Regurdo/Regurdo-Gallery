"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { Lightbox } from "@/components/galeri/lightbox";
import type { GalleryPhoto, ViewerContext } from "@/lib/types";

/**
 * Edge-to-edge responsive photo grid (2 → 6 columns), fixed 4:5 cells,
 * hover overlay with title + category · year — matching the reference look.
 * Clicking a photo opens the lightbox with its EXIF details (kamera, ISO, …)
 * instead of navigating away.
 */
export function PhotoGrid({
  photos,
  viewer,
}: {
  photos: GalleryPhoto[];
  /** Signed-in context for SIMPAN / KOMENTAR inside the lightbox. */
  viewer?: ViewerContext;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const goPrev = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length)),
    [photos.length],
  );
  const goNext = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i + 1) % photos.length)),
    [photos.length],
  );

  const openPhoto = openIndex === null ? null : (photos[openIndex] ?? null);

  return (
    <>
      <div className="grid grid-cols-2 gap-[2px] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            aria-label={`Buka detail foto ${p.title}`}
            className="group relative block aspect-[4/5] cursor-zoom-in overflow-hidden bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset"
          >
            <Image
              src={p.url}
              alt={`${p.title}${p.categoryName ? ` — ${p.categoryName}` : ""}${p.year ? ` ${p.year}` : ""}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
              priority={i < 6}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.045] group-focus-visible:scale-[1.045]"
            />

            {/* hover overlay */}
            <div
              aria-hidden
              className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-background/95 via-background/25 to-transparent p-3 text-left opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              <span className="label-caps !text-[9px] !text-gold">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="mt-1 font-display text-lg font-semibold uppercase leading-tight tracking-[0.04em] text-ink">
                {p.title}
              </span>
              <span className="label-caps mt-1 !text-[9px] !tracking-[0.18em] !text-soft">
                {p.categoryName ?? "Tanpa Kategori"} · {p.year ?? "—"}
              </span>
            </div>
          </button>
        ))}
      </div>

      {openPhoto && openIndex !== null && (
        <Lightbox
          photo={openPhoto}
          index={openIndex}
          total={photos.length}
          viewer={viewer}
          onClose={() => setOpenIndex(null)}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </>
  );
}
