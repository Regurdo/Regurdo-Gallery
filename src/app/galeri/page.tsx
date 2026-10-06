import type { Metadata } from "next";
import Link from "next/link";
import { ImageOff, SearchX } from "lucide-react";
import { CollectionsBar, type GaleriFilter } from "@/components/layout/collections-bar";
import { GaleriDriftView } from "@/components/galeri/galeri-drift-view";
import { GaleriListView } from "@/components/galeri/galeri-list-view";
import { PhotoGrid } from "@/components/galeri/photo-grid";
import { SiteFooter } from "@/components/layout/site-footer";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import {
  getCategoriesWithCounts,
  getSavedPhotoCount,
  getSavedPhotoIds,
  getTotalPhotoCount,
  listGalleryPhotos,
  listSavedPhotos,
} from "@/lib/queries";
import { ANON_VIEWER, type ViewerContext } from "@/lib/types";

export const metadata: Metadata = {
  title: "Galeri",
  description: "Jelajahi seluruh karya fotografi REGURDO.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function GaleriPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  /* Film strip (list) is the default view — grid & drift must be requested explicitly. */
  const filter: GaleriFilter = {
    q: first(sp.q),
    kategori: first(sp.kategori),
    tersimpan: first(sp.tersimpan) === "1",
    view:
      first(sp.view) === "grid" ? "grid" : first(sp.view) === "drift" ? "drift" : "list",
    foto: first(sp.foto),
  };

  const { user, profile } = await getSession();

  /* "TERSIMPAN" needs a signed-in user (bookmarks are per-user). */
  if (filter.tersimpan && !user) {
    return <TersimpanLoginGate />;
  }

  const [categories, total, photos, savedCount, savedIds] = await Promise.all([
    getCategoriesWithCounts(),
    getTotalPhotoCount(),
    filter.tersimpan && user
      ? listSavedPhotos(user.id)
      : listGalleryPhotos({ category: filter.kategori, q: filter.q }),
    user ? getSavedPhotoCount(user.id) : Promise.resolve(0),
    user ? getSavedPhotoIds(user.id) : Promise.resolve([] as string[]),
  ]);

  const viewer: ViewerContext = user
    ? {
        authenticated: true,
        userId: user.id,
        isAdmin: profile?.is_admin ?? false,
        savedIds,
      }
    : ANON_VIEWER;

  const hasFilters = Boolean(filter.kategori || filter.q || filter.tersimpan);
  const listFoto = filter.foto ?? photos[0]?.slug;
  /* Esc from the film strip returns to the grid, keeping the active filters. */
  const backHref = (() => {
    const p = new URLSearchParams();
    p.set("view", "grid");
    if (filter.kategori) p.set("kategori", filter.kategori);
    if (filter.q) p.set("q", filter.q);
    if (filter.tersimpan) p.set("tersimpan", "1");
    return `/galeri?${p.toString()}`;
  })();

  /*
   * Film strip & drift = one full page: the wrapper is locked to the exact
   * space below the sticky header (64px + 1px border) and clips overflow, so
   * the whole view fits one screen with no page scroll — footer omitted,
   * matching the reference site.
   */
  const fullPage = filter.view !== "grid" && photos.length > 0;

  return (
    <div
      className={
        fullPage
          ? "flex min-h-0 flex-1 flex-col lg:flex-none lg:h-[calc(100dvh_-_65px)] lg:overflow-hidden"
          : "flex flex-1 flex-col"
      }
    >
      <CollectionsBar
        categories={categories}
        total={total}
        savedCount={savedCount}
        filter={filter}
        listFoto={listFoto}
      />

      {!isSupabaseConfigured && <DemoBanner />}

      {photos.length === 0 ? (
        <Centered>
          {filter.tersimpan ? (
            <TersimpanEmpty />
          ) : hasFilters ? (
            <NoResults q={filter.q} />
          ) : (
            <EmptyState />
          )}
        </Centered>
      ) : filter.view === "list" ? (
        <GaleriListView
          photos={photos}
          initialSlug={filter.foto}
          backHref={backHref}
          viewer={viewer}
        />
      ) : filter.view === "drift" ? (
        <GaleriDriftView photos={photos} viewer={viewer} />
      ) : (
        <PhotoGrid photos={photos} viewer={viewer} />
      )}

      {!fullPage && (
        <SiteFooter center={`${photos.length} Foto Ditampilkan`} right={`${total} Karya`} />
      )}
    </div>
  );
}

/* ---------- layout helpers ---------- */

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">{children}</div>;
}

/* ---------- demo mode (Supabase env missing) ---------- */

function DemoBanner() {
  return (
    <div className="flex items-center justify-center gap-2 border-b border-gold/20 bg-gold/5 px-4 py-2 text-center">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-gold" />
      <p className="label-caps !text-[9px] !tracking-[0.18em] !text-gold">
        Mode Demo &mdash; foto contoh. Sambungkan Supabase di .env.local untuk menampilkan karyamu.
      </p>
    </div>
  );
}

/* ---------- empty & search states ---------- */

/** Database connected but no photos uploaded yet. */
function EmptyState() {
  return (
    <section className="max-w-md text-center">
      <ImageOff className="mx-auto size-8 text-faint" aria-hidden />
      <h2 className="mt-6 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink">
        Belum Ada Foto
      </h2>
      <p className="mx-auto mt-4 max-w-sm font-sans text-xs leading-relaxed text-muted-2">
        Koleksi REGURDO masih kosong. Unggah foto pertama lewat Dasbor Admin untuk
        mengisi katalog &mdash; atau buka galeri dalam Mode Demo untuk melihat tampilannya.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link href="/admin" className="btn-gold">
          Unggah Foto
        </Link>
        <Link href="/login" className="btn-ghost-dark">
          Masuk
        </Link>
      </div>
    </section>
  );
}

/** Filters/search active but nothing matched. */
function NoResults({ q }: { q?: string }) {
  return (
    <section className="max-w-md text-center">
      <SearchX className="mx-auto size-8 text-faint" aria-hidden />
      <h2 className="mt-6 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink">
        Tidak Ditemukan
      </h2>
      <p className="mx-auto mt-4 max-w-sm font-sans text-xs leading-relaxed text-muted-2">
        {q ? (
          <>
            Tidak ada karya yang cocok dengan pencarian{" "}
            <span className="text-gold">&ldquo;{q}&rdquo;</span>. Coba kata kunci lain,
            atau hapus filter untuk melihat seluruh koleksi.
          </>
        ) : (
          "Tidak ada karya pada filter ini. Coba kategori lain atau hapus filter."
        )}
      </p>
      <div className="mt-8 flex justify-center">
        <Link href="/galeri" className="btn-ghost-dark">
          Hapus Filter
        </Link>
      </div>
    </section>
  );
}

/* ---------- TERSIMPAN (bookmarks) ---------- */

function TersimpanLoginGate() {
  return (
    <>
      <Centered>
        <section className="max-w-md text-center">
          <ImageOff className="mx-auto size-8 text-faint" aria-hidden />
          <h2 className="mt-6 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink">
            Tersimpan
          </h2>
          <p className="mx-auto mt-4 max-w-sm font-sans text-xs leading-relaxed text-muted-2">
            Masuk dulu untuk melihat foto yang kamu simpan &mdash; koleksi tersimpanmu
            tersinkron otomatis di semua perangkat.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/login?next=%2Fgaleri%3Ftersimpan%3D1" className="btn-gold">
              Masuk
            </Link>
          </div>
        </section>
      </Centered>
      <SiteFooter center={`${0} Foto Ditampilkan`} right={`${0} Karya`} />
    </>
  );
}

function TersimpanEmpty() {
  return (
    <section className="max-w-md text-center">
      <ImageOff className="mx-auto size-8 text-faint" aria-hidden />
      <h2 className="mt-6 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink">
        Belum Ada Foto Tersimpan
      </h2>
      <p className="mx-auto mt-4 max-w-sm font-sans text-xs leading-relaxed text-muted-2">
        Tekan SIMPAN pada foto favoritmu untuk mengumpulkannya di sini. Koleksi
        tersimpanmu ikut tersinkron di semua perangkat.
      </p>
      <div className="mt-8 flex justify-center">
        <Link href="/galeri" className="btn-ghost-dark">
          Jelajahi Koleksi
        </Link>
      </div>
    </section>
  );
}
