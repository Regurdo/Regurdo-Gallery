"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { deletePhotoAction, movePhotoAction } from "@/lib/actions/photos";

/**
 * Per-row controls in the photo manager: move up/down (manual sort order),
 * edit link, and delete with a confirmation dialog.
 */
export function PhotoRowActions({
  photoId,
  photoTitle,
  isFirst,
  isLast,
}: {
  photoId: string;
  photoTitle: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function move(direction: "up" | "down") {
    startTransition(async () => {
      const res = await movePhotoAction(photoId, direction);
      if (res.error) {
        toast({ title: "Gagal memindahkan", description: res.error });
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deletePhotoAction(photoId);
      if (res.error) {
        toast({ title: "Gagal menghapus", description: res.error });
        return;
      }
      toast({ title: "Foto dihapus", description: `${photoTitle} sudah dihapus dari galeri.` });
      router.refresh();
    });
  }

  const btn =
    "grid size-8 place-items-center rounded-sm border border-line bg-surface text-muted-2 transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => move("up")}
        disabled={pending || isFirst}
        aria-label={`Naikkan urutan ${photoTitle}`}
        className={btn}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUp className="size-3.5" />}
      </button>
      <button
        type="button"
        onClick={() => move("down")}
        disabled={pending || isLast}
        aria-label={`Turunkan urutan ${photoTitle}`}
        className={btn}
      >
        <ArrowDown className="size-3.5" />
      </button>

      <a
        href={`/admin/foto/${photoId}`}
        aria-label={`Sunting ${photoTitle}`}
        className={btn}
      >
        <Pencil className="size-3.5" />
      </a>

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        aria-label={`Hapus ${photoTitle}`}
        className={`${btn} hover:border-destructive/50 hover:text-destructive-foreground`}
      >
        <Trash2 className="size-3.5" />
      </button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-line bg-popover sm:rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl uppercase tracking-[0.04em]">
              Hapus foto ini?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-xs leading-relaxed text-muted-2">
              &ldquo;{photoTitle}&rdquo; akan dihapus permanen dari galeri beserta file aslinya di
              Storage. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm border-line bg-surface font-sans text-[11px] uppercase tracking-[0.14em] text-soft hover:bg-surface-2 hover:text-ink">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              disabled={pending}
              className="rounded-sm bg-destructive font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-destructive/90"
            >
              {pending ? "Menghapus…" : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
