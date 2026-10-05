"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CornerDownRight, Loader2, LogIn, Trash2 } from "lucide-react";
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
import { addCommentAction, deleteCommentAction, getCommentsAction } from "@/lib/actions/comments";
import type { CommentThread, CommentWithAuthor, ViewerCommentIdentity } from "@/lib/comment-view";
import { MAX_COMMENT_BODY } from "@/lib/comment-view";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * KOMENTAR section rendered inside the KATALOG panel (film strip) and the
 * lightbox aside. Comments are fetched per photo via a server action, so the
 * section follows photo switching inside the client-side gallery without a
 * full navigation. Threads are one level deep: root comment + its replies.
 */
export function CommentsSection({
  photoId,
  viewer,
}: {
  photoId: string;
  viewer: ViewerCommentIdentity;
}) {
  const { toast } = useToast();
  const pathname = usePathname();
  const loginHref = `/login?next=${encodeURIComponent(pathname || "/galeri")}`;

  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [body, setBody] = useState("");
  /** Root comment id being replied to (null = the main composer). */
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  /** Photo id whose comments have been loaded — derived spinner state. */
  const [loadedPhotoId, setLoadedPhotoId] = useState<string | null>(null);
  const loading = loadedPhotoId !== photoId;
  const [pending, startTransition] = useTransition();
  /** Guards against out-of-order responses when the user switches photos fast. */
  const requestSeq = useRef(0);
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);

  const total = threads.reduce((n, t) => n + 1 + t.replies.length, 0);

  useEffect(() => {
    const seq = ++requestSeq.current;
    getCommentsAction(photoId)
      .then((res) => {
        if (seq !== requestSeq.current) return; // a newer photo was selected
        setThreads(res.error ? [] : (res.comments ?? []));
        setLoadedPhotoId(photoId);
        setReplyTo(null);
        setReplyBody("");
        if (res.error) {
          toast({ title: "Gagal memuat komentar", description: res.error });
        }
      })
      .catch(() => {
        if (seq !== requestSeq.current) return;
        setThreads([]);
        setLoadedPhotoId(photoId);
        toast({
          title: "Gagal memuat komentar",
          description: "Koneksi bermasalah. Coba muat ulang halaman.",
        });
      });
  }, [photoId, toast]);

  // Focus the inline reply form as soon as it opens.
  useEffect(() => {
    if (replyTo) replyInputRef.current?.focus();
  }, [replyTo]);

  function submit() {
    const text = body.trim();
    if (!text || pending) return;
    startTransition(async () => {
      const res = await addCommentAction(photoId, text);
      if (res.error || !res.comment) {
        toast({ title: "Gagal mengirim komentar", description: res.error ?? "Coba lagi." });
        return;
      }
      const created = res.comment;
      if (created.parent_id) {
        setThreads((prev) =>
          prev.map((t) => (t.id === created.parent_id ? { ...t, replies: [...t.replies, created] } : t)),
        );
      } else {
        setThreads((prev) => [...prev, { ...created, replies: [] }]);
      }
      setBody("");
    });
  }

  function submitReply() {
    const text = replyBody.trim();
    if (!text || !replyTo || pending) return;
    startTransition(async () => {
      const res = await addCommentAction(photoId, text, replyTo);
      if (res.error || !res.comment) {
        toast({ title: "Gagal mengirim balasan", description: res.error ?? "Coba lagi." });
        return;
      }
      const created = res.comment;
      setThreads((prev) =>
        prev.map((t) => (t.id === created.parent_id ? { ...t, replies: [...t.replies, created] } : t)),
      );
      setReplyTo(null);
      setReplyBody("");
      toast({ title: "Balasan terkirim" });
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteCommentAction(id);
      if (res.error) {
        toast({ title: "Gagal menghapus", description: res.error });
        return;
      }
      setThreads((prev) =>
        prev
          // Root deletion cascades to its replies in the DB (ON DELETE CASCADE).
          .filter((t) => t.id !== id)
          // Reply deletion just drops the reply from its thread.
          .map((t) => ({ ...t, replies: t.replies.filter((r) => r.id !== id) })),
      );
      // Clear the composer if the comment being replied to is gone.
      if (replyTo === id) {
        setReplyTo(null);
        setReplyBody("");
      }
      toast({ title: "Komentar dihapus" });
    });
  }

  function beginReply(rootId: string) {
    setReplyTo((cur) => (cur === rootId ? null : rootId));
    setReplyBody("");
  }

  return (
    <section aria-label="Komentar" className="border-t border-line pt-4">
      <p className="label-caps !text-[9px] !tracking-[0.2em]">
        Komentar <span className="text-faint">· {total}</span>
      </p>

      {/* ---------- list ---------- */}
      {loading ? (
        <p className="flex items-center gap-2 py-4 font-sans text-[11px] text-faint">
          <Loader2 className="size-3.5 animate-spin" aria-hidden /> Memuat komentar&hellip;
        </p>
      ) : threads.length === 0 ? (
        <p className="py-4 font-sans text-[11px] leading-relaxed text-faint">
          Belum ada komentar. Jadi yang pertama memberi apresiasi.
        </p>
      ) : (
        <ul className="mt-3 space-y-4">
          {threads.map((t) => (
            <li key={t.id}>
              <CommentItem
                c={t}
                viewer={viewer}
                pending={pending}
                onDelete={() => remove(t.id)}
                onReply={viewer.authenticated ? () => beginReply(t.id) : undefined}
                replying={replyTo === t.id}
                hasReplies={t.replies.length > 0}
              />

              {/* ---------- replies (one level deep) ---------- */}
              {t.replies.length > 0 && (
                <ul className="mt-2.5 space-y-2.5 border-l border-line pl-4 ml-3.5">
                  {t.replies.map((r) => (
                    <li key={r.id}>
                      <CommentItem
                        c={r}
                        viewer={viewer}
                        pending={pending}
                        onDelete={() => remove(r.id)}
                        isReply
                      />
                    </li>
                  ))}
                </ul>
              )}

              {/* ---------- inline reply form ---------- */}
              {replyTo === t.id && viewer.authenticated && (
                <div className="mt-2.5 ml-3.5 border-l border-gold/40 pl-4">
                  <p className="label-caps !text-[8px] !tracking-[0.2em] !text-gold">
                    Membalas {t.authorName ?? "Pengunjung"}
                  </p>
                  <textarea
                    ref={replyInputRef}
                    value={replyBody}
                    maxLength={MAX_COMMENT_BODY}
                    onChange={(e) => setReplyBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitReply();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setReplyTo(null);
                      }
                    }}
                    placeholder={`Balas ${t.authorName ?? "komentar ini"}\u2026`}
                    rows={2}
                    className="mt-1.5 w-full resize-none rounded-sm border border-line bg-surface px-3 py-2 font-sans text-[11px] leading-relaxed text-ink placeholder:text-faint focus-visible:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span
                      className={`font-sans text-[9px] tabular-nums ${
                        replyBody.length >= MAX_COMMENT_BODY ? "text-gold" : "text-faint"
                      }`}
                    >
                      {replyBody.length}/{MAX_COMMENT_BODY}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyTo(null)}
                        disabled={pending}
                        className="inline-flex h-7 items-center rounded-sm border border-line bg-surface px-3 font-sans text-[9px] font-semibold uppercase tracking-[0.14em] text-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={submitReply}
                        disabled={pending || !replyBody.trim()}
                        className="inline-flex h-7 items-center gap-1.5 rounded-sm bg-gold px-3.5 font-sans text-[9px] font-semibold uppercase tracking-[0.14em] text-background transition-colors hover:bg-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50"
                      >
                        {pending && <Loader2 className="size-3 animate-spin" aria-hidden />}
                        Balas
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ---------- form / login prompt ---------- */}
      {viewer.authenticated ? (
        <div className="mt-4 border-t border-line pt-3">
          <label htmlFor={`komentar-${photoId}`} className="sr-only">
            Tulis komentar
          </label>
          <textarea
            id={`komentar-${photoId}`}
            value={body}
            maxLength={MAX_COMMENT_BODY}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter makes a new line (lightbox keeps its
              // own typing guard, and the film strip ignores keys while typing).
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Tulis komentar&hellip;"
            rows={3}
            className="w-full resize-none rounded-sm border border-line bg-surface px-3 py-2.5 font-sans text-[11px] leading-relaxed text-ink placeholder:text-faint focus-visible:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span
              className={`font-sans text-[9px] tabular-nums ${
                body.length >= MAX_COMMENT_BODY ? "text-gold" : "text-faint"
              }`}
            >
              {body.length}/{MAX_COMMENT_BODY}
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !body.trim()}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-gold px-4 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-background transition-colors hover:bg-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50"
            >
              {pending && <Loader2 className="size-3 animate-spin" aria-hidden />}
              Kirim
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 border-t border-line pt-3">
          <Link
            href={loginHref}
            className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-sm border border-line bg-surface font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-soft transition-colors hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <LogIn className="size-3.5" aria-hidden /> Masuk untuk berkomentar
          </Link>
        </div>
      )}
    </section>
  );
}

/** One comment bubble: avatar, name, date, body, actions (reply / delete). */
function CommentItem({
  c,
  viewer,
  pending,
  onDelete,
  onReply,
  replying = false,
  isReply = false,
  hasReplies = false,
}: {
  c: CommentWithAuthor;
  viewer: ViewerCommentIdentity;
  pending: boolean;
  onDelete: () => void;
  /** Present only on root comments of a signed-in viewer. */
  onReply?: () => void;
  replying?: boolean;
  isReply?: boolean;
  hasReplies?: boolean;
}) {
  return (
    <div className="flex gap-2.5">
      <CommentAvatar name={c.authorName} avatarUrl={c.authorAvatar} small={isReply} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-sans text-[11px] font-semibold text-ink">
            {c.authorName ?? "Pengunjung"}
          </p>
          <time
            dateTime={c.created_at}
            className="shrink-0 font-sans text-[9px] tabular-nums text-faint"
          >
            {formatDate(c.created_at)}
          </time>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words font-sans text-[11px] leading-relaxed text-soft">
          {c.body}
        </p>
        <div className="flex items-center gap-3">
          {onReply && (
            <button
              type="button"
              onClick={onReply}
              disabled={pending}
              aria-expanded={replying}
              className="mt-1 inline-flex items-center gap-1 rounded-sm font-sans text-[9px] uppercase tracking-[0.14em] text-faint transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
            >
              <CornerDownRight className="size-3" aria-hidden /> Balas
            </button>
          )}
          {(viewer.isAdmin || c.user_id === viewer.userId) && (
            <DeleteCommentButton
              disabled={pending}
              hasReplies={!isReply && hasReplies ? true : undefined}
              onConfirm={onDelete}
              own={c.user_id === viewer.userId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Round avatar: Google photo when available, otherwise the initial letter. */
function CommentAvatar({
  name,
  avatarUrl,
  small = false,
}: {
  name: string | null;
  avatarUrl: string | null;
  small?: boolean;
}) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase();
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={small ? 20 : 28}
        height={small ? 20 : 28}
        className={`${small ? "size-5" : "size-7"} shrink-0 rounded-full border border-line object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`grid ${small ? "size-5" : "size-7"} shrink-0 place-items-center rounded-full border border-line bg-surface font-display ${
        small ? "text-[9px]" : "text-[11px]"
      } font-semibold text-gold`}
    >
      {initial}
    </span>
  );
}

/** Small trash icon + AlertDialog confirmation (own comment or admin). */
function DeleteCommentButton({
  own,
  disabled,
  hasReplies,
  onConfirm,
}: {
  own: boolean;
  disabled: boolean;
  /** Known by the caller: root comment currently has replies (warns about cascade). */
  hasReplies?: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-label={own ? "Hapus komentar ini" : "Hapus komentar ini sebagai admin"}
        title={own ? "Hapus komentar" : "Hapus komentar (admin)"}
        className="mt-1 inline-flex items-center gap-1 rounded-sm px-0 py-0.5 font-sans text-[9px] uppercase tracking-[0.14em] text-faint transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
      >
        <Trash2 className="size-3" aria-hidden /> Hapus
      </button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display uppercase tracking-[0.04em]">
            Hapus komentar ini?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hasReplies
              ? "Komentar ini memiliki balasan. Menghapusnya juga akan menghapus seluruh balasannya. Tindakan ini permanen."
              : own
                ? "Komentarmu akan dihapus permanen dari foto ini."
                : "Kamu menghapus komentar pengunjung lain sebagai admin. Tindakan ini permanen."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Ya, Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
