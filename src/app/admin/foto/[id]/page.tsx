import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { PhotoForm } from "@/components/admin/photo-form";
import { updatePhotoAction } from "@/lib/actions/photos";
import { getCategoryOptions, getPhotoForEdit, getUsedCameraLensOptions } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Sunting Foto",
  robots: { index: false, follow: false },
};

export default async function AdminFotoEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [photo, categories, options] = await Promise.all([
    getPhotoForEdit(id),
    getCategoryOptions(),
    getUsedCameraLensOptions(),
  ]);

  if (!photo) notFound();

  return (
    <>
      <div className="mt-6">
        <p className="label-caps">Modul Foto</p>
        <h1 className="mt-2 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink">
          Sunting Foto
        </h1>
        <p className="mt-2 max-w-xl font-sans text-xs leading-relaxed text-muted-2">
          Perbarui judul, kategori, atau data kamera. Untuk menghapus foto ini, gunakan tombol hapus
          pada daftar Kelola Foto.
        </p>
      </div>

      <PhotoForm
        mode="edit"
        action={updatePhotoAction}
        categories={categories}
        photo={photo}
        cameraOptions={options.cameras}
        lensOptions={options.lenses}
      />

      <p className="mt-6 flex items-center gap-2 font-sans text-[10px] uppercase tracking-[0.16em] text-faint">
        <Trash2 className="size-3.5" aria-hidden /> slug permanen: /galeri?foto={photo.slug}
      </p>
    </>
  );
}
