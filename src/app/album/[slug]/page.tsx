import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ImageOff } from "lucide-react";
import { PhotoGrid } from "@/components/galeri/photo-grid";
import { SiteFooter } from "@/components/layout/site-footer";
import { getSession } from "@/lib/auth";
import { getAlbumBySlug, getSavedPhotoIds } from "@/lib/queries";
import { ANON_VIEWER, type ViewerContext } from "@/lib/types";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getAlbumBySlug(slug);
  if (!data) return { title: "Album Tidak Ditemukan" };

  const title = `${data.album.title} — Album`;
  const description =
    data.album.description ?? `Kumpulan ${data.photos.length} foto dalam album ${data.album.title}.`;

  /* The album OG image is rendered by opengraph-image.tsx (cover photo card);
     these config values title/describe it for crawlers that read og:title. */
  return {
    title,
    description,
    openGraph: {
      title: `${data.album.title} — Album REGURGO`,
      description,
      type: "website",
    },
    twitter: {
      title: `${data.album.title} — Album REGURGO`,
      description,
    },
  };
}

export default async function AlbumDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getAlbumBySlug(slug);
  if (!data) notFound();

  const { album, photos } = data;

  /* Viewer context so SIMPAN / KOMENTAR work inside the album lightbox too. */
  const { user, profile } = await getSession();
  const viewer: ViewerContext = user
    ? {
        authenticated: true,
        userId: user.id,
        isAdmin: profile?.is_admin ?? false,
        savedIds: await getSavedPhotoIds(user.id),
      }
    : ANON_VIEWER;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 pt-8 md:px-6 md:pt-12">
        <Link
          href="/album"
          className="inline-flex items-center gap-2 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-2 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" /> Album
        </Link>

        <p className="label-caps mt-7">Album</p>
        <h1 className="mt-2 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink md:text-5xl">
          {album.title}
        </h1>
        {album.description && (
          <p className="mt-4 max-w-2xl font-sans text-xs leading-relaxed text-muted-2">
            {album.description}
          </p>
        )}
        <p className="label-caps mt-4 !text-[9px] !text-faint">
          {photos.length} Foto &mdash; klik foto untuk detail EXIF
        </p>
      </div>

      <div className="mt-8 flex-1">
        {photos.length === 0 ? (
          <div className="flex min-h-[45vh] items-center justify-center px-4 py-16">
            <section className="max-w-md text-center">
              <ImageOff className="mx-auto size-8 text-faint" aria-hidden />
              <h2 className="mt-6 font-display text-3xl font-semibold uppercase tracking-[0.06em] text-ink">
                Album Ini Masih Kosong
              </h2>
              <p className="mx-auto mt-4 max-w-sm font-sans text-xs leading-relaxed text-muted-2">
                Belum ada foto di dalam album ini. Tambahkan foto lewat Dasbor Admin &mdash;
                menu Album, lalu &ldquo;Kelola isi&rdquo;.
              </p>
            </section>
          </div>
        ) : (
          <PhotoGrid photos={photos} viewer={viewer} />
        )}
      </div>

      <SiteFooter center={`${photos.length} Foto Ditampilkan`} right={album.title} />
    </div>
  );
}
