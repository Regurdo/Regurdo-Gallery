import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { getAlbumForEdit, getAlbumMembership, listAdminPhotos } from "@/lib/queries";
import { AlbumContentsManager } from "@/components/admin/album-contents-manager";

export const metadata: Metadata = {
  title: "Isi Album",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function AdminAlbumIsiPage({ params }: { params: Params }) {
  const { id } = await params;
  const [album, photos, memberIds] = await Promise.all([
    getAlbumForEdit(id),
    listAdminPhotos(),
    getAlbumMembership(id),
  ]);
  if (!album) notFound();

  return (
    <>
      <div className="mt-6">
        <Link
          href="/admin/album"
          className="inline-flex items-center gap-2 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-2 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" /> Kelola Album
        </Link>

        <p className="label-caps mt-6">Modul Album</p>
        <h1 className="mt-2 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink">
          Isi Album
        </h1>
        <p className="mt-2 max-w-xl font-sans text-xs leading-relaxed text-muted-2">
          <span className="text-ink">{album.title}</span> &mdash; susun urutan foto, tandai bintang
          untuk memilih sampul, dan keluarkan foto yang tidak diinginkan. Foto tetap aman di
          galeri walau dikeluarkan dari album.
        </p>
      </div>

      <div className="mt-5">
        <Link
          href={`/admin/album/${album.id}`}
          className="inline-flex items-center gap-2 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-gold transition-colors hover:text-ink"
        >
          <Pencil className="size-3" aria-hidden /> Sunting judul &amp; deskripsi
        </Link>
      </div>

      <AlbumContentsManager
        albumId={album.id}
        coverPhotoId={album.coverPhotoId}
        photos={photos}
        memberIds={memberIds}
      />
    </>
  );
}
