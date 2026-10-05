import type { Metadata } from "next";
import { createAlbumAction } from "@/lib/actions/albums";
import { AlbumForm } from "@/components/admin/album-form";

export const metadata: Metadata = {
  title: "Buat Album",
  robots: { index: false, follow: false },
};

export default function AdminAlbumBaruPage() {
  return (
    <>
      <div className="mt-6">
        <p className="label-caps">Modul Album</p>
        <h1 className="mt-2 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink">
          Buat Album
        </h1>
        <p className="mt-2 max-w-xl font-sans text-xs leading-relaxed text-muted-2">
          Beri judul dan deskripsi singkat. Setelah album dibuat, kamu langsung diarahkan ke
          halaman pengelolaan isi untuk memilih foto-fotonya.
        </p>
      </div>

      <AlbumForm mode="create" action={createAlbumAction} />
    </>
  );
}
