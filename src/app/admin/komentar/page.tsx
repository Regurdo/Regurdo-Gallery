import type { Metadata } from "next";
import Link from "next/link";
import { CornerDownRight, MessageSquareOff } from "lucide-react";
import { CommentRowActions } from "@/components/admin/comment-row-actions";
import { isSupabaseConfigured } from "@/lib/config";
import { listAllComments } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Moderasi Komentar",
  robots: { index: false, follow: false },
};

/**
 * Admin comment moderation: every comment across the gallery, newest first,
 * with its photo and author. Delete goes through the same RLS-backed server
 * action the public panel uses (comments_delete_admin policy).
 */
export default async function AdminKomentarPage() {
  const comments = await listAllComments();

  return (
    <>
      <div className="mt-6">
        <p className="label-caps">Modul Komentar</p>
        <h1 className="mt-2 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink">
          Moderasi Komentar
        </h1>
        <p className="mt-2 font-sans text-xs text-muted-2">
          {comments.length} komentar dari pengunjung · kamu bisa menghapus komentar siapa pun
          sebagai admin.
        </p>
      </div>

      {!isSupabaseConfigured && (
        <p className="mt-6 rounded-sm border border-gold/30 bg-gold/5 px-4 py-3 font-sans text-xs leading-relaxed text-gold">
          Mode demo aktif — daftar memakai komentar contoh. Aksi hapus akan gagal sampai Supabase
          disambungkan di .env.local.
        </p>
      )}

      {comments.length === 0 ? (
        <section className="mt-10 rounded-sm border border-dashed border-line-strong bg-surface/50 px-6 py-14 text-center">
          <MessageSquareOff className="mx-auto size-8 text-faint" aria-hidden />
          <h2 className="mt-5 font-display text-2xl font-semibold uppercase tracking-[0.06em] text-ink">
            Belum Ada Komentar
          </h2>
          <p className="mx-auto mt-3 max-w-sm font-sans text-xs leading-relaxed text-muted-2">
            Pengunjung yang masuk bisa memberi komentar pada setiap foto lewat panel KATALOG atau
            lightbox. Komentar baru akan muncul di sini untuk dimoderasi.
          </p>
        </section>
      ) : (
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-sm border border-line bg-surface">
          {comments.map((c) => (
            <li key={c.id} className="flex flex-wrap items-start gap-4 px-4 py-4 sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                {c.parentAuthor && (
                  <p className="mb-1 inline-flex items-center gap-1 rounded-sm border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[9px] uppercase tracking-[0.12em] text-gold">
                    <CornerDownRight className="size-3" aria-hidden /> Membalas {c.parentAuthor}
                  </p>
                )}
                <p className="font-sans text-xs leading-relaxed text-ink">{c.body}</p>
                <p className="label-caps mt-1.5 !text-[9px] !text-faint">
                  {c.authorName ?? "Pengunjung"} ·{" "}
                  {new Date(c.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {c.photoSlug ? (
                    <>
                      {" "}
                      ·{" "}
                      <Link
                        href={`/galeri?view=list&foto=${c.photoSlug}`}
                        className="!text-gold transition-colors hover:!text-ink"
                      >
                        {c.photoTitle ?? "Lihat foto"}
                      </Link>
                    </>
                  ) : (
                    " · Foto terhapus"
                  )}
                </p>
              </div>

              <CommentRowActions commentId={c.id} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
