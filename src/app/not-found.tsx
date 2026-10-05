import Link from "next/link";
import { Compass } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";

/** Global 404 — unknown routes land here (Indonesian, on-brand). */
export default function NotFound() {
  return (
    <>
      <div className="flex min-h-[60vh] flex-1 items-center justify-center px-4 py-16">
        <section className="max-w-md text-center">
          <Compass className="mx-auto size-8 text-faint" aria-hidden />
          <p className="label-caps mt-6 !text-[9px]">Error 404</p>
          <h1 className="mt-2 font-display text-5xl font-semibold uppercase tracking-[0.06em] text-ink">
            Halaman Tidak Ditemukan
          </h1>
          <p className="mx-auto mt-4 max-w-sm font-sans text-xs leading-relaxed text-muted-2">
            Alamat yang kamu buka mungkin sudah dipindah, dihapus, atau memang tidak pernah
            ada. Coba kembali ke galeri untuk melanjutkan menjelajah.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/galeri" className="btn-gold">
              Buka Galeri
            </Link>
            <Link href="/album" className="btn-ghost-dark">
              Lihat Album
            </Link>
          </div>
        </section>
      </div>
      <SiteFooter center="Error 404" right="REGURDO" />
    </>
  );
}
