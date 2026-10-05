import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ImagePlus } from "lucide-react";
import { PhotoRowActions } from "@/components/admin/photo-row-actions";
import { listAdminPhotos } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Kelola Foto",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminFotoPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const photos = await listAdminPhotos();

  const notice =
    sp.upload === "ok"
      ? "Foto berhasil diunggah dan sudah tampil di galeri."
      : sp.update === "ok"
        ? "Perubahan foto berhasil disimpan."
        : null;

  return (
    <>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">Modul Foto</p>
          <h1 className="mt-2 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink">
            Kelola Foto
          </h1>
          <p className="mt-2 font-sans text-xs text-muted-2">
            {photos.length} foto dalam koleksi · urutan di sini menentukan urutan galeri.
          </p>
        </div>
        <Link href="/admin/foto/baru" className="btn-gold inline-flex h-10 items-center gap-2">
          <ImagePlus className="size-4" aria-hidden /> Unggah Foto
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

      {photos.length === 0 ? (
        <section className="mt-10 rounded-sm border border-dashed border-line-strong bg-surface/50 px-6 py-14 text-center">
          <ImagePlus className="mx-auto size-8 text-faint" aria-hidden />
          <h2 className="mt-5 font-display text-2xl font-semibold uppercase tracking-[0.06em] text-ink">
            Belum Ada Foto
          </h2>
          <p className="mx-auto mt-3 max-w-sm font-sans text-xs leading-relaxed text-muted-2">
            Koleksi masih kosong. Unggah foto pertamamu — file langsung masuk ke Storage Supabase
            dan tampil otomatis di galeri.
          </p>
          <Link href="/admin/foto/baru" className="btn-gold mt-7 inline-flex h-10 items-center gap-2">
            <ImagePlus className="size-4" aria-hidden /> Unggah Foto Pertama
          </Link>
        </section>
      ) : (
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-sm border border-line bg-surface">
          {photos.map((p, i) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-4 px-4 py-3.5 sm:flex-nowrap"
            >
              { }
              <img
                src={p.url}
                alt=""
                loading="lazy"
                className="size-14 shrink-0 rounded-sm border border-line object-cover"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-semibold uppercase tracking-[0.04em] text-ink">
                  {p.title}
                </p>
                <p className="label-caps mt-0.5 !text-[9px] !text-faint">
                  {String(i + 1).padStart(2, "0")} · {p.categoryName ?? "Tanpa Kategori"} ·{" "}
                  {p.year ?? "—"} ·{" "}
                  {new Date(p.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>

              <PhotoRowActions
                photoId={p.id}
                photoTitle={p.title}
                isFirst={i === 0}
                isLast={i === photos.length - 1}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
