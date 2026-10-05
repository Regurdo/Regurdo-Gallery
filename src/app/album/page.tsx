import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Images } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { isSupabaseConfigured } from "@/lib/config";
import { getTotalPhotoCount, listAlbums } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Album",
  description: "Koleksi foto REGURDO yang dikurasi dalam album — jelajahi tiap seri dari awal sampai akhir.",
};

export default async function AlbumIndexPage() {
  const [albums, total] = await Promise.all([listAlbums(), getTotalPhotoCount()]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 pt-10 md:px-6 md:pt-14">
        <p className="label-caps">Koleksi</p>
        <h1 className="mt-2 font-display text-5xl font-semibold uppercase tracking-[0.06em] text-ink md:text-6xl">
          Album
        </h1>
        <p className="mt-3 max-w-xl font-sans text-xs leading-relaxed text-muted-2">
          Seri foto yang dikurasi dalam satu cerita. Pilih album untuk menjelajahi karyanya
          berurutan — lengkap dengan data kamera tiap foto.
        </p>
      </div>

      {!isSupabaseConfigured && <DemoBanner />}

      {albums.length === 0 ? (
        <div className="flex min-h-[50vh] flex-1 items-center justify-center px-4 py-16">
          <section className="max-w-md text-center">
            <Images className="mx-auto size-8 text-faint" aria-hidden />
            <h2 className="mt-6 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink">
              Belum Ada Album
            </h2>
            <p className="mx-auto mt-4 max-w-sm font-sans text-xs leading-relaxed text-muted-2">
              Album berisi rangkaian foto pilihan — misalnya satu perjalanan, satu proyek, atau
              satu tema. Buat album pertama lewat Dasbor Admin.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link href="/admin/album/baru" className="btn-gold">
                Buat Album
              </Link>
              <Link href="/galeri" className="btn-ghost-dark">
                Jelajahi Galeri
              </Link>
            </div>
          </section>
        </div>
      ) : (
        <ul className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-10 sm:grid-cols-2 md:px-6 lg:grid-cols-3">
          {albums.map((album, i) => (
            <li key={album.id}>
              <Link
                href={`/album/${album.slug}`}
                aria-label={`Buka album ${album.title}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-sm border border-line bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                {album.coverUrl ? (
                  <Image
                    src={album.coverUrl}
                    alt={`Sampul album ${album.title}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.045] group-focus-visible:scale-[1.045]"
                  />
                ) : (
                  <span className="grid h-full place-items-center" aria-hidden>
                    <Images className="size-8 text-faint" />
                  </span>
                )}

                <span
                  aria-hidden
                  className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-background/95 via-background/25 to-transparent p-4 text-left"
                >
                  <span className="label-caps !text-[9px] !text-gold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-1.5 font-display text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-ink">
                    {album.title}
                  </span>
                  <span className="label-caps mt-1.5 !text-[9px] !tracking-[0.18em] !text-soft">
                    {album.photoCount} Foto
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <SiteFooter center={`${albums.length} Album`} right={`${total} Karya`} />
    </div>
  );
}

function DemoBanner() {
  return (
    <div className="mx-auto mt-8 w-full max-w-6xl px-4 md:px-6">
      <div className="flex items-center justify-center gap-2 border-b border-gold/20 bg-gold/5 px-4 py-2 text-center">
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-gold" />
        <p className="label-caps !text-[9px] !tracking-[0.18em] !text-gold">
          Mode Demo &mdash; album contoh. Sambungkan Supabase di .env.local untuk menampilkan albummu.
        </p>
      </div>
    </div>
  );
}
