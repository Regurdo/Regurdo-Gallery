"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["\u2191", "\u2193"], label: "Berpindah foto" },
  { keys: ["\u2190", "\u2192"], label: "Foto sebelumnya / berikutnya" },
  { keys: ["Klik foto"], label: "Perbesar foto (lightbox)" },
  { keys: ["/"], label: "Fokus ke pencarian" },
  { keys: ["Esc"], label: "Tutup lightbox / kembali ke kisi" },
  { keys: ["?"], label: "Buka daftar pintasan ini" },
];

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-line bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold uppercase tracking-[0.08em] text-ink">
            Pintasan Keyboard
          </DialogTitle>
          <DialogDescription className="font-sans text-xs text-muted-2">
            Navigasi galeri lebih cepat tanpa mouse.
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-2 divide-y divide-line">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-4 py-2.5">
              <span className="font-sans text-xs text-soft">{s.label}</span>
              <span className="flex shrink-0 items-center gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="kbd">
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
