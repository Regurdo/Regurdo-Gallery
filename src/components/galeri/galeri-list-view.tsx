"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Link2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommentsSection } from "@/components/galeri/comments-section";
import { Lightbox } from "@/components/galeri/lightbox";
import { SaveButton } from "@/components/galeri/save-button";
import type { GalleryPhoto, ViewerContext } from "@/lib/types";

/**
 * The "list" view from the reference site: numbered thumbnail rail,
 * large stage image (click = lightbox) and the KATALOG info panel
 * (big index, serif title, EXIF rows, prev/next, Simpan / Salin Tautan,
 * KOMENTAR).
 *
 * Photo switching is fully client-side for instant keyboard navigation;
 * the URL is kept in sync (history.replaceState) so every photo stays
 * linkable. Arrow keys ← → ↑ ↓ switch photos, Esc returns to the grid.
 */
export function GaleriListView({
  photos,
  initialSlug,
  backHref,
  viewer,
}: {
  photos: GalleryPhoto[];
  initialSlug?: string;
  backHref: string;
  /** Signed-in context: drives SIMPAN state + the KOMENTAR form. */
  viewer: ViewerContext;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const initialIndex = Math.max(
    0,
    photos.findIndex((p) => p.slug === initialSlug),
  );
  const [index, setIndex] = useState(initialIndex);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const photo = photos[index] ?? photos[0];
  const total = photos.length;
  const pad = (n: number) => String(n).padStart(2, "0");

  const goPrev = useCallback(
    () => setIndex((i) => (i - 1 + photos.length) % photos.length),
    [photos.length],
  );
  const goNext = useCallback(
    () => setIndex((i) => (i + 1) % photos.length),
    [photos.length],
  );

  /* Keep the URL in sync so each photo is directly linkable. */
  useEffect(() => {
    if (!photo) return;
    const sp = new URLSearchParams(window.location.search);
    sp.set("view", "list");
    sp.set("foto", photo.slug);
    window.history.replaceState(null, "", `/galeri?${sp.toString()}`);
  }, [photo]);

  /* Keyboard navigation (when the lightbox is closed — it handles its own). */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typing || lightboxOpen) return;

      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Escape") {
        router.push(backHref);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, goPrev, goNext, router, backHref]);

  /* Scroll the active thumbnail into view. */
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    thumbRefs.current[index]?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }, [index]);

  async function copyLink() {
    const url = `${window.location.origin}/galeri?view=list&foto=${photo.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Tautan disalin", description: "Alamat foto sudah dikopi ke clipboard." });
    } catch {
      toast({
        title: "Gagal menyalin",
        description: "Browser menolak akses clipboard. Salin alamat dari address bar.",
      });
    }
  }

  if (!photo) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[clamp(150px,16vw,240px)_1fr_340px] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[clamp(150px,16vw,240px)_1fr_360px]">
      {/* ---------- Stage (center on desktop, top on mobile) ---------- */}
      <section
        aria-label={`Foto: ${photo.title}`}
        className="relative order-1 min-h-[48vh] flex-1 bg-surface/40 lg:col-start-2 lg:row-start-1 lg:min-h-0"
      >
        <Image
          key={photo.id}
          src={photo.url}
          alt={`${photo.title} — foto utama`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-contain p-4 md:p-6"
        />
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label={`Perbesar foto ${photo.title}`}
          className="absolute inset-0 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/60"
        />
      </section>

      {/* ---------- Thumbnail rail (left column on desktop) ---------- */}
      <nav
        aria-label="Pilih foto"
        className="order-2 border-t border-line lg:col-start-1 lg:row-start-1 lg:overflow-y-auto lg:border-r lg:border-t-0"
      >
        <div className="no-scrollbar flex gap-2 overflow-x-auto p-3 lg:flex-col lg:gap-3 lg:overflow-y-auto lg:p-3">
          {photos.map((p, i) => {
            const active = i === index;
            return (
              <button
                key={p.id}
                ref={(el) => {
                  thumbRefs.current[i] = el;
                }}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Foto ${pad(i + 1)}: ${p.title}`}
                aria-current={active ? "true" : undefined}
                className={`relative w-16 shrink-0 overflow-hidden rounded-sm border transition-all lg:w-full ${
                  active
                    ? "border-gold opacity-100 ring-1 ring-gold"
                    : "border-line opacity-50 hover:opacity-90"
                }`}
              >
                {/*
                  Natural aspect ratio on desktop (film-strip look, like the
                  reference site); square tiles on the mobile horizontal strip.
                */}
                <Image
                  src={p.url}
                  alt=""
                  width={p.width || 900}
                  height={p.height || 1200}
                  sizes="(max-width: 1023px) 64px, 16vw"
                  className="h-16 w-16 object-cover lg:h-auto lg:w-full"
                />
                <span
                  className={`absolute bottom-1.5 left-1.5 rounded-[2px] bg-background/80 px-1 font-sans text-[10px] font-semibold tabular-nums ${
                    active ? "text-gold" : "text-soft"
                  }`}
                >
                  {pad(i + 1)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ---------- KATALOG panel ---------- */}
      <aside
        aria-live="polite"
        className="order-3 flex flex-col gap-4 border-t border-line p-5 md:p-6 lg:col-start-3 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0"
      >
        <p className="label-caps">Katalog</p>

        <p className="font-display leading-none" aria-label={`Foto ${index + 1} dari ${total}`}>
          <span className="text-7xl font-semibold text-gold">{pad(index + 1)}</span>
          <span className="ml-2 text-xl font-medium text-faint">/ {pad(total)}</span>
        </p>

        <div>
          <h1 className="font-display text-3xl font-semibold uppercase leading-[1.05] tracking-[0.04em] text-ink">
            {photo.title}
          </h1>
          <p className="label-caps mt-2 !text-[9px] !tracking-[0.2em] !text-gold">
            {(photo.categoryName ?? "Tanpa Kategori").toUpperCase()} · {photo.year ?? "—"}
          </p>
        </div>

        <dl className="mt-1">
          <ExifRow label="Kamera" value={photo.camera} />
          <ExifRow label="Lensa" value={photo.lens} />
          <ExifRow label="ISO" value={photo.iso} />
          <ExifRow label="Bukaan" value={photo.aperture} />
          <ExifRow label="Rana" value={photo.shutter} />
        </dl>

        <div className="mt-4">
          <CommentsSection
            photoId={photo.id}
            viewer={{
              authenticated: viewer.authenticated,
              userId: viewer.userId,
              isAdmin: viewer.isAdmin,
            }}
          />
        </div>

        <div className="mt-auto flex flex-col gap-2.5 pt-4">
          <div className="flex items-center gap-2">
            <NavIconButton onClick={goPrev} label="Foto sebelumnya">
              <ChevronLeft className="size-4" />
            </NavIconButton>
            <NavIconButton onClick={goNext} label="Foto berikutnya">
              <ChevronRight className="size-4" />
            </NavIconButton>
            <span className="ml-1.5 font-sans text-[11px] tabular-nums tracking-[0.14em] text-faint">
              {pad(index + 1)} / {pad(total)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SaveButton
              photoId={photo.id}
              initialSaved={viewer.savedIds.includes(photo.id)}
              authenticated={viewer.authenticated}
            />
            <CompactGhostButton onClick={copyLink} label="Salin tautan foto">
              <Link2 className="size-3.5" /> Salin Tautan
            </CompactGhostButton>
          </div>
        </div>
      </aside>

      {/* ---------- Lightbox ---------- */}
      {lightboxOpen && (
        <Lightbox
          photo={photo}
          index={index}
          total={total}
          viewer={viewer}
          onClose={() => setLightboxOpen(false)}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </div>
  );
}

/**
 * Compact two-column EXIF row like the reference site: fixed-width label
 * column, value left-aligned right after it (no full-width dashed rules).
 */
function ExifRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline gap-3 py-[7px]">
      <dt className="label-caps w-[88px] shrink-0 !text-[9px] !tracking-[0.2em] !text-faint">{label}</dt>
      <dd className="truncate font-sans text-xs text-soft" title={value ?? undefined}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

/** Small square chevron button used for prev/next under the EXIF rows. */
function NavIconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-9 place-items-center rounded-sm border border-line bg-surface text-soft transition-colors hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {children}
    </button>
  );
}

function CompactGhostButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-sm border border-line bg-surface px-3 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-soft transition-colors hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {children}
    </button>
  );
}
