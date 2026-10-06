"use client";

import { useCallback, useEffect, useState } from "react";
import { Lightbox } from "@/components/galeri/lightbox";
import { DriftWall, type DriftWallItem } from "@/components/galeri/drift-wall";
import type { GalleryPhoto, ViewerContext } from "@/lib/types";

/** Fewer drifting columns on small screens. */
function useColumns(): number {
  const [columns, setColumns] = useState(5);
  useEffect(() => {
    const compute = () =>
      setColumns(window.innerWidth < 640 ? 3 : window.innerWidth < 1024 ? 4 : 5);
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  return columns;
}

/**
 * "Drift" view — the React Bits DriftWall as a third gallery view mode.
 * Photos drift in tilted 3D columns with pointer parallax; clicking a tile
 * opens the same lightbox as the grid. Fills the exact viewport below the
 * header + KOLEKSI bar (page renders it in the fullPage wrapper).
 */
export function GaleriDriftView({
  photos,
  viewer,
}: {
  photos: GalleryPhoto[];
  /** Signed-in context for SIMPAN / KOMENTAR inside the lightbox. */
  viewer?: ViewerContext;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const columns = useColumns();

  const items: DriftWallItem[] = photos.map((p) => ({
    id: p.slug,
    image: p.url,
    title: p.title,
  }));

  const openBySlug = useCallback(
    (item: DriftWallItem) => {
      const idx = photos.findIndex((p) => p.slug === item.id);
      if (idx >= 0) setOpenIndex(idx);
    },
    [photos],
  );

  const goPrev = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length)),
    [photos.length],
  );
  const goNext = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i + 1) % photos.length)),
    [photos.length],
  );

  const openPhoto = openIndex === null ? null : (photos[openIndex] ?? null);

  /* Portrait 4:5 tiles match the grid's proportions. */
  return (
    <div className="relative min-h-0 flex-1">
      <DriftWall
        items={items}
        columns={columns}
        tileWidth={190}
        tileHeight={238}
        gap={16}
        radius={4}
        tilt={14}
        turn={-12}
        perspective={1200}
        depth={110}
        speed={38}
        direction="up"
        variance={0.4}
        parallax={0.6}
        lift={56}
        fade={0.65}
        dim={0.5}
        overlayColor="#0b0b0b"
        onItemClick={openBySlug}
      />
      <p
        aria-hidden
        className="label-caps pointer-events-none absolute bottom-4 left-4 z-10 !text-[9px] !tracking-[0.2em] text-faint"
      >
        Mode Drift &mdash; klik foto untuk detail
      </p>

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
    </div>
  );
}
