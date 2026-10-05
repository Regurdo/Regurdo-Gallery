import type { Metadata } from "next";
import { uploadPhotoAction } from "@/lib/actions/photos";
import { getCategoryOptions, getUsedCameraLensOptions } from "@/lib/queries";
import { PhotoForm } from "@/components/admin/photo-form";

export const metadata: Metadata = {
  title: "Unggah Foto",
  robots: { index: false, follow: false },
};

export default async function AdminFotoBaruPage() {
  const [categories, options] = await Promise.all([
    getCategoryOptions(),
    getUsedCameraLensOptions(),
  ]);

  return (
    <>
      <div className="mt-6">
        <p className="label-caps">Modul Foto</p>
        <h1 className="mt-2 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink">
          Unggah Foto
        </h1>
        <p className="mt-2 max-w-xl font-sans text-xs leading-relaxed text-muted-2">
          Pilih file, isi judul dan data kamera. Foto disimpan ke bucket &ldquo;photos&rdquo; di
          Supabase Storage, lalu otomatis muncul di galeri publik.
        </p>
      </div>

      <PhotoForm
        mode="upload"
        action={uploadPhotoAction}
        categories={categories}
        cameraOptions={options.cameras}
        lensOptions={options.lenses}
      />
    </>
  );
}
