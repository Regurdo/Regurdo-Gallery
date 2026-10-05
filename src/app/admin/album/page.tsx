import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, FolderPlus, Images } from "lucide-react";
import { AlbumRowActions } from "@/components/admin/album-row-actions";
import { listAlbums } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Kelola Album",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminAlbumPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const albums = await listAlbums();

  const notice =
    sp.update === "ok"
      ? "Perubahan album berhasil disimpan."
      : null;

  return (
    <>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">Modul Album</p>
          <h1 className="mt-2 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink">
            Kelola Album
          </h1>
          <p className="mt-2 font-sans text-xs text-muted-2">
            {albums.length} album · urutan di sini menentukan urutan halaman /album.
          </p>
        </div>
        <Link href="/admin/album/baru" className="btn-gold inline-flex h-10 items-center gap-2">
          <FolderPlus className="size-4" aria-hidden /> Buat Album
        </Link>
      </div>

      {notice && (
        <p
          role="status"
          className="mt-6 flex items-center gap-2 rounded-sm border border-gold/40 bg-gold/10 px-4 py-3 font-sans text-xs text-gold"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden /> {notice}
        </p>
      )}

      {albums.length === 0 ? (
        <section className="mt-10 rounded-sm border border-dashed border-line-strong bg-surface/50 px-6 py-14 text-center">
          <FolderPlus className="mx-auto size-8 text-faint" aria-hidden />
          <h2 className="mt-5 font-display text-2xl font-semibold uppercase tracking-[0.06em] text-ink">
            Belum Ada Album
          </h2>
          <p className="mx-auto mt-3 max-w-sm font-sans text-xs leading-relaxed text-muted-2">
            Album mengelompokkan foto menjadi satu cerita — satu perjalanan, satu proyek, satu
            tema. Foto yang sama boleh masuk beberapa album sekaligus.
          </p>
          <Link href="/admin/album/baru" className="btn-gold mt-7 inline-flex h-10 items-center gap-2">
            <FolderPlus className="size-4" aria-hidden /> Buat Album Pertama
          </Link>
        </section>
      ) : (
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-sm border border-line bg-surface">
          {albums.map((a, i) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-4 px-4 py-3.5 sm:flex-nowrap"
            >
              {a.coverUrl ? (
                <img
                  src={a.coverUrl}
                  alt=""
                  loading="lazy"
                  className="size-14 shrink-0 rounded-sm border border-line object-cover"
                />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-sm border border-dashed border-line bg-surface/60">
                  <Images className="size-5 text-faint" aria-hidden />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-semibold uppercase tracking-[0.04em] text-ink">
                  {a.title}
                </p>
                <p className="label-caps mt-0.5 !text-[9px] !text-faint">
                  {String(i + 1).padStart(2, "0")} · /album/{a.slug} · {a.photoCount} foto ·{" "}
                  {new Date(a.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>

              <AlbumRowActions
                albumId={a.id}
                albumTitle={a.title}
                isFirst={i === 0}
                isLast={i === albums.length - 1}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
