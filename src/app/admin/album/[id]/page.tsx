import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Images } from "lucide-react";
import { updateAlbumAction } from "@/lib/actions/albums";
import { getAlbumForEdit } from "@/lib/queries";
import { AlbumForm } from "@/components/admin/album-form";

export const metadata: Metadata = {
  title: "Sunting Album",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function AdminAlbumEditPage({ params }: { params: Params }) {
  const { id } = await params;
  const album = await getAlbumForEdit(id);
  if (!album) notFound();

  return (
    <>
      <div className="mt-6">
        <p className="label-caps">Modul Album</p>
        <h1 className="mt-2 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink">
          Sunting Album
        </h1>
        <p className="mt-2 max-w-xl font-sans text-xs leading-relaxed text-muted-2">
          Ubah judul dan deskripsi album. Untuk menambah, mengurutkan, atau mengeluarkan foto,
          buka halaman pengelolaan isi.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/admin/album/${album.id}/isi`}
          className="inline-flex h-10 items-center gap-2 rounded-sm border border-gold/40 px-4 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold hover:text-background"
        >
          <Images className="size-4" aria-hidden /> Kelola Isi Album
        </Link>
        <Link
          href={`/album/${album.slug}`}
          className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-2 transition-colors hover:text-ink"
        >
          Lihat halaman publik &nearr;
        </Link>
      </div>

      <AlbumForm mode="edit" action={updateAlbumAction} album={album} />
    </>
  );
}
