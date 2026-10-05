import type { Metadata } from "next";
import { CheckCircle2, Images, Tags } from "lucide-react";
import { CategoryForm } from "@/components/admin/category-form";
import { CategoryRowActions } from "@/components/admin/category-row-actions";
import { getCategoriesWithCounts } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Kelola Kategori",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Category manager: add, rename, and delete categories. Categories label
 * photos (chip KOLEKSI on the homepage + filter chips on /galeri); albums
 * are a separate curation layer and are managed in their own module.
 */
export default async function AdminKategoriPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const categories = await getCategoriesWithCounts();

  const notice = sp.created === "1" ? "Kategori baru berhasil ditambahkan." : null;
  const totalPhotos = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <>
      <div className="mt-6">
        <p className="label-caps">Modul Kategori</p>
        <h1 className="mt-2 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink">
          Kelola Kategori
        </h1>
        <p className="mt-2 font-sans text-xs text-muted-2">
          {categories.length} kategori · {totalPhotos} foto berlabel · kategori dipakai sebagai
          filter di halaman galeri.
        </p>
      </div>

      {notice && (
        <p
          role="status"
          className="mt-6 flex items-center gap-2 rounded-sm border border-gold/40 bg-gold/10 px-4 py-3 font-sans text-xs text-gold"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden /> {notice}
        </p>
      )}

      <div className="mt-6">
        <CategoryForm />
      </div>

      {categories.length === 0 ? (
        <section className="mt-8 rounded-sm border border-dashed border-line-strong bg-surface/50 px-6 py-14 text-center">
          <Tags className="mx-auto size-8 text-faint" aria-hidden />
          <h2 className="mt-5 font-display text-2xl font-semibold uppercase tracking-[0.06em] text-ink">
            Belum Ada Kategori
          </h2>
          <p className="mx-auto mt-3 max-w-sm font-sans text-xs leading-relaxed text-muted-2">
            Kategori adalah label tema untuk fotomu — misalnya Lanskap, Potret, atau Street.
            Pengunjung memakainya untuk menyaring galeri lewat chip KOLEKSI.
          </p>
          <p className="mt-6 font-sans text-[10px] uppercase tracking-[0.18em] text-faint">
            Gunakan form di atas untuk menambah kategori pertama
          </p>
        </section>
      ) : (
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-sm border border-line bg-surface">
          {categories.map((c, i) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-4 px-4 py-3.5 sm:flex-nowrap"
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-sm border border-dashed border-line bg-surface/60">
                <Tags className="size-5 text-faint" aria-hidden />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-semibold uppercase tracking-[0.04em] text-ink">
                  {c.name}
                </p>
                <p className="label-caps mt-0.5 !text-[9px] !text-faint">
                  {String(i + 1).padStart(2, "0")} · /galeri?kategori={c.slug} ·{" "}
                  <span className="inline-flex items-center gap-1">
                    <Images className="size-3" aria-hidden /> {c.count} foto
                  </span>
                </p>
              </div>

              <CategoryRowActions categoryId={c.id} categoryName={c.name} photoCount={c.count} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
