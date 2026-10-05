"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toggleSavedPhotoAction } from "@/lib/actions/saved";

/**
 * The SIMPAN (bookmark) button used in the film-strip KATALOG panel and the
 * lightbox. Toggles optimistically, reverts with an Indonesian toast when
 * the server action fails, and refreshes the server components afterwards
 * so the TERSIMPAN counter in the KOLEKSI bar stays accurate.
 *
 * `initialSaved` comes from server-rendered props (viewer.savedIds); after a
 * refresh the prop changes and the effect re-syncs the local state, keeping
 * every mounted button (panel + lightbox) consistent.
 */
export function SaveButton({
  photoId,
  initialSaved,
  authenticated,
  size = "sm",
  className = "",
}: {
  photoId: string;
  initialSaved: boolean;
  authenticated: boolean;
  /** sm = h-9 (film-strip panel), md = h-10 (lightbox actions row). */
  size?: "sm" | "md";
  className?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  /* Re-sync when the server-rendered prop changes (after router.refresh)
     or when the selected photo changes. React's recommended "adjust state
     during render" pattern — no effect needed. */
  const [prevInitialSaved, setPrevInitialSaved] = useState(initialSaved);
  if (prevInitialSaved !== initialSaved) {
    setPrevInitialSaved(initialSaved);
    setSaved(initialSaved);
  }

  function toggle() {
    if (!authenticated) {
      toast({
        title: "Masuk dulu",
        description: "Masuk untuk menyimpan foto favoritmu — tersinkron di semua perangkat.",
      });
      return;
    }

    const optimistic = !saved;
    setSaved(optimistic);
    startTransition(async () => {
      const res = await toggleSavedPhotoAction(photoId);
      if (res.error || typeof res.saved !== "boolean") {
        setSaved(!optimistic); // revert
        toast({
          title: optimistic ? "Gagal menyimpan" : "Gagal menghapus simpanan",
          description: res.error ?? "Coba lagi sebentar.",
        });
        return;
      }
      setSaved(res.saved);
      router.refresh(); // keep the TERSIMPAN count in the KOLEKSI bar fresh
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Hapus dari tersimpan" : "Simpan foto ini"}
      title={saved ? "Hapus dari tersimpan" : "Simpan foto ini"}
      className={`inline-flex ${size === "md" ? "h-10" : "h-9"} w-full items-center justify-center gap-2 rounded-sm px-3 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-60 ${
        saved
          ? "border border-gold bg-transparent text-gold hover:bg-gold/10"
          : "bg-gold text-background hover:bg-gold-deep"
      } ${className}`}
    >
      <Bookmark className={`size-3.5 ${saved ? "fill-gold" : ""}`} aria-hidden />
      {saved ? "Tersimpan" : "Simpan"}
    </button>
  );
}
