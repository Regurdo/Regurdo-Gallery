"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteCommentAction } from "@/lib/actions/comments";

/**
 * Delete control for one row in the admin comment moderation list.
 * The server action relies on RLS (own comment OR is_admin) for safety.
 */
export function CommentRowActions({ commentId }: { commentId: string }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const res = await deleteCommentAction(commentId);
      if (res.error) {
        toast({ title: "Gagal menghapus", description: res.error });
        return;
      }
      toast({ title: "Komentar dihapus" });
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={pending}
          aria-label="Hapus komentar"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm border border-line bg-surface text-muted-2 transition-colors hover:border-red-500/50 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="size-4" aria-hidden />
          )}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display uppercase tracking-[0.04em]">
            Hapus komentar ini?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Komentar akan dihapus permanen dari galeri. Tindakan ini tidak bisa dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={remove}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Ya, Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
