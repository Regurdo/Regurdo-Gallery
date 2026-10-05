"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Link2, X } from "lucide-react";
import { CommentsSection } from "@/components/galeri/comments-section";
import { SaveButton } from "@/components/galeri/save-button";
import type { GalleryPhoto, ViewerContext } from "@/lib/types";

/**
 * Full-screen lightbox with a KATALOG info panel (camera, lens, ISO,
 * aperture, shutter) — opened from both the grid and the film-strip stage.
 * The panel also hosts the SIMPAN bookmark button and the KOMENTAR section.
 * Keyboard: ← → ↑ ↓ to navigate, Esc to close. Backdrop click closes;
 * body scroll is locked while open.
 */
export function Lightbox({
  photo,
  index,
  total,
  viewer,
  onClose,
  onPrev,
  onNext,
}: {
  photo: GalleryPhoto;
  index: number;
  total: number;
  /** Signed-in context (defaults to anonymous — e.g. demo mode). */
  viewer?: ViewerContext;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { toast } = useToast();
  const ctx: ViewerContext = viewer ?? {
    authenticated: false,
    userId: null,
    isAdmin: false,
    savedIds: [],
  };

  /* Keyboard + scroll lock */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typing) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        onPrev();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        onNext();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onPrev, onNext]);

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

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detail foto: ${photo.title}`}
      className="fixed inset-0 z-[100] flex flex-col bg-background/97 backdrop-blur-sm"
    >
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4 md:px-6">
        <p className="label-caps !text-[10px] !text-soft">
          <span className="text-gold">{pad(index + 1)}</span>
          <span className="text-faint"> / {pad(total)}</span>
          <span className="ml-3 hidden text-muted-2 sm:inline">{photo.title}</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup lightbox"
          className="grid size-10 place-items-center rounded-sm border border-line bg-surface text-muted-2 transition-colors hover:border-line-strong hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Body: stage + KATALOG panel */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Stage */}
        <div
          className="relative min-h-0 flex-1 cursor-zoom-in px-4 pb-4 md:px-6"
          onClick={onClose}
        >
          <div className="absolute inset-x-4 bottom-4 top-0 md:inset-x-6 md:bottom-6">
            <Image
              key={photo.id}
              src={photo.url}
              alt={`${photo.title} — diperbesar`}
              width={photo.width || 1200}
              height={photo.height || 1500}
              priority
              className="mx-auto h-full w-auto max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />
          </div>

          {/* Prev / next zones */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            aria-label="Foto sebelumnya"
            className="group absolute left-1 top-1/2 grid size-14 -translate-y-1/2 place-items-center rounded-sm text-faint transition-colors hover:bg-surface/70 hover:text-gold md:left-2"
          >
            <ChevronLeft className="size-7 transition-transform group-hover:-translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            aria-label="Foto berikutnya"
            className="group absolute right-1 top-1/2 grid size-14 -translate-y-1/2 place-items-center rounded-sm text-faint transition-colors hover:bg-surface/70 hover:text-gold md:right-2"
          >
            <ChevronRight className="size-7 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* KATALOG panel (side on desktop, scrollable bottom sheet on mobile) */}
        <aside
          aria-live="polite"
          className="shrink-0 overflow-y-auto border-t border-line bg-background/60 p-5 md:p-6 lg:w-[320px] lg:border-l lg:border-t-0 xl:w-[340px]"
        >
          <p className="label-caps">Katalog</p>

          <p className="mt-4 font-display leading-none" aria-label={`Foto ${index + 1} dari ${total}`}>
            <span className="text-5xl font-semibold text-gold">{pad(index + 1)}</span>
            <span className="ml-2 text-xl font-medium text-faint">/ {pad(total)}</span>
          </p>

          <div className="mt-4">
            <h2 className="font-display text-2xl font-semibold uppercase leading-[1.05] tracking-[0.04em] text-ink xl:text-[1.7rem]">
              {photo.title}
            </h2>
            <p className="label-caps mt-2 !text-[9px] !tracking-[0.2em] !text-gold">
              {(photo.categoryName ?? "Tanpa Kategori").toUpperCase()} · {photo.year ?? "—"}
            </p>
          </div>

          <dl className="mt-2">
            <ExifRow label="Kamera" value={photo.camera} />
            <ExifRow label="Lensa" value={photo.lens} />
            <ExifRow label="ISO" value={photo.iso} />
            <ExifRow label="Bukaan" value={photo.aperture} />
            <ExifRow label="Rana" value={photo.shutter} />
          </dl>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <SaveButton
              photoId={photo.id}
              initialSaved={ctx.savedIds.includes(photo.id)}
              authenticated={ctx.authenticated}
              size="md"
            />
            <GhostButton onClick={copyLink} label="Salin tautan foto">
              <Link2 className="size-3.5" />
              <span className="hidden sm:inline">Salin Tautan</span>
            </GhostButton>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <GhostButton onClick={onPrev} label="Foto sebelumnya" flex>
              <ChevronLeft className="size-3.5" />
            </GhostButton>
            <GhostButton onClick={onNext} label="Foto berikutnya" flex>
              <ChevronRight className="size-3.5" />
            </GhostButton>
          </div>

          <CommentsSection
            photoId={photo.id}
            viewer={{
              authenticated: ctx.authenticated,
              userId: ctx.userId,
              isAdmin: ctx.isAdmin,
            }}
          />

          <p className="label-caps mt-4 !text-[9px] !text-faint">
            &uarr; &darr; Berpindah foto &nbsp;·&nbsp; Esc Tutup
          </p>
        </aside>
      </div>
    </div>
  );
}

/**
 * Compact two-column EXIF row (matches the film-strip panel): fixed-width
 * label column, value left-aligned right after it, no dashed rules.
 */
function ExifRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline gap-3 py-[7px]">
      <dt className="label-caps w-[80px] shrink-0 !text-[9px] !tracking-[0.2em] !text-faint">{label}</dt>
      <dd className="truncate font-sans text-xs text-soft" title={value ?? undefined}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

function GhostButton({
  onClick,
  label,
  flex,
  children,
}: {
  onClick: () => void;
  label: string;
  flex?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-sm border border-line bg-surface px-3 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-soft transition-colors hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
        flex ? "flex-1" : ""
      }`}
    >
      {children}
    </button>
  );
}
