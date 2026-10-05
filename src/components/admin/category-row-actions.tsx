"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteCategoryAction, updateCategoryAction } from "@/lib/actions/categories";

/**
 * Per-row controls in the category manager: rename via a small dialog and
 * delete with a confirmation. Deleting never touches photos — their
 * category_id is cleared by the database (ON DELETE SET NULL).
 */
export function CategoryRowActions({
  categoryId,
  categoryName,
  photoCount,
}: {
  categoryId: string;
  categoryName: string;
  photoCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [renameOpen, setRenameOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draft, setDraft] = useState(categoryName);

  function openRename() {
    setDraft(categoryName);
    setRenameOpen(true);
  }

  function saveRename() {
    const name = draft.trim();
    if (!name) {
      toast({ title: "Nama tidak boleh kosong", description: "Tulis nama kategori terlebih dahulu." });
      return;
    }
    if (name === categoryName) {
      setRenameOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await updateCategoryAction(categoryId, name);
      if (res.error) {
        toast({ title: "Gagal menyimpan", description: res.error });
        return;
      }
      setRenameOpen(false);
      toast({ title: "Kategori diperbarui", description: `Sekarang tampil sebagai “${name}”.` });
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteCategoryAction(categoryId);
      if (res.error) {
        toast({ title: "Gagal menghapus", description: res.error });
        return;
      }
      setConfirmOpen(false);
      toast({ title: "Kategori dihapus", description: `${categoryName} sudah dihapus.` });
      router.refresh();
    });
  }

  const btn =
    "grid size-8 place-items-center rounded-sm border border-line bg-surface text-muted-2 transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={openRename}
        disabled={pending}
        aria-label={`Ubah nama kategori ${categoryName}`}
        className={btn}
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        aria-label={`Hapus kategori ${categoryName}`}
        className={`${btn} hover:border-destructive/50 hover:text-destructive-foreground`}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      </button>

      {/* ---------- rename dialog ---------- */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="border-line bg-popover sm:rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl uppercase tracking-[0.04em]">
              Ubah Nama Kategori
            </DialogTitle>
            <DialogDescription className="font-sans text-xs leading-relaxed text-muted-2">
              Nama baru langsung tampil di chip KOLEKSI dan label foto. Tautan filter
              (&ldquo;/galeri?kategori=…&rdquo;) tetap berfungsi karena slug tidak berubah.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveRename();
            }}
          >
            <label htmlFor={`rename-${categoryId}`} className="label-caps mb-1.5 block !text-[9px] !text-faint">
              Nama Kategori <span className="ml-1 text-gold">*</span>
            </label>
            <input
              id={`rename-${categoryId}`}
              type="text"
              required
              maxLength={60}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-10 w-full rounded-sm border border-line bg-surface px-3 font-sans text-xs text-ink focus:border-gold/50 focus:outline-none"
            />
            <DialogFooter className="mt-5 gap-2">
              <button
                type="button"
                onClick={() => setRenameOpen(false)}
                className="h-10 rounded-sm border border-line bg-surface px-4 font-sans text-[11px] uppercase tracking-[0.14em] text-soft transition-colors hover:bg-surface-2 hover:text-ink"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={pending}
                className="btn-gold inline-flex h-10 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden /> Menyimpan…
                  </>
                ) : (
                  "Simpan"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------- delete confirmation ---------- */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-line bg-popover sm:rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl uppercase tracking-[0.04em]">
              Hapus kategori ini?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-xs leading-relaxed text-muted-2">
              &ldquo;{categoryName}&rdquo; akan dihapus permanen.{" "}
              {photoCount > 0
                ? `${photoCount} foto yang memakai kategori ini TIDAK ikut terhapus — fotonya tetap ada, hanya kehilangan label (tampil sebagai “Tanpa Kategori”).`
                : "Tidak ada foto yang memakai kategori ini."}
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
