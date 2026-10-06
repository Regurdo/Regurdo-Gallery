import Link from "next/link";
import { Bookmark, LayoutGrid, List } from "lucide-react";
import type { CategoryWithCount } from "@/lib/types";

export type GaleriFilter = {
  q?: string;
  kategori?: string;
  tersimpan?: boolean;
  view: "grid" | "list";
  /** Active photo slug in list view. */
  foto?: string;
};

/**
 * Builds a /galeri href while preserving the active filter.
 * `listFoto` is the slug used when toggling INTO list view (first visible photo).
 */
function buildHref(filter: GaleriFilter, overrides: Partial<GaleriFilter>, listFoto?: string): string {
  const merged = { ...filter, ...overrides };
  const sp = new URLSearchParams();
  if (merged.q) sp.set("q", merged.q);
  if (merged.kategori) sp.set("kategori", merged.kategori);
  if (merged.tersimpan) sp.set("tersimpan", "1");
  if (merged.view === "grid") {
    sp.set("view", "grid");
  } else {
    /* Film strip is the default view — only the active photo goes in the URL. */
    const foto = merged.foto ?? listFoto;
    if (foto) sp.set("foto", foto);
  }
  const qs = sp.toString();
  return qs ? `/galeri?${qs}` : "/galeri";
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

type ChipProps = {
  href: string;
  active: boolean;
  children: React.ReactNode;
  dashed?: boolean;
};

function Chip({ href, active, children, dashed }: ChipProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={[
        "inline-flex h-8 shrink-0 items-center gap-2 rounded-sm px-3.5 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors",
        dashed ? "border border-dashed" : "border",
        active
          ? "border-gold bg-gold text-background"
          : [
              "bg-surface text-muted-2 hover:border-line-strong hover:text-ink",
              dashed ? "border-line-strong" : "border-line",
            ].join(" "),
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function Count({ value, active }: { value: number; active: boolean }) {
  return (
    <span
      className={[
        "font-sans text-[9px] font-bold tabular-nums",
        active ? "text-background/70" : "text-faint",
      ].join(" ")}
    >
      {pad2(value)}
    </span>
  );
}

/**
 * The KOLEKSI bar under the header: "SEMUA KARYA" + category chips +
 * the dashed "TERSIMPAN" chip, with the grid/list toggle on the right.
 */
export function CollectionsBar({
  categories,
  total,
  savedCount,
  filter,
  listFoto,
}: {
  categories: CategoryWithCount[];
  total: number;
  savedCount: number;
  filter: GaleriFilter;
  /** Slug used when toggling to list view (first photo of the current set). */
  listFoto?: string;
}) {
  return (
    <div className="border-b border-line bg-background">
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        <span className="label-caps hidden shrink-0 sm:inline">Koleksi</span>

        <div className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto py-2">
          <Chip
            href={buildHref(filter, { kategori: undefined, tersimpan: false, foto: undefined })}
            active={!filter.kategori && !filter.tersimpan}
          >
            Semua Karya
            <Count value={total} active={!filter.kategori && !filter.tersimpan} />
          </Chip>

          {categories.map((c) => {
            const active = filter.kategori === c.slug;
            return (
              <Chip
                key={c.id}
                href={buildHref(filter, {
                  kategori: c.slug,
                  tersimpan: false,
                  foto: filter.kategori === c.slug ? filter.foto : undefined,
                })}
                active={active}
              >
                {c.name}
                <Count value={c.count} active={active} />
              </Chip>
            );
          })}

          <Chip
            href={buildHref(filter, { tersimpan: true, kategori: undefined, foto: undefined })}
            active={Boolean(filter.tersimpan)}
            dashed
          >
            <Bookmark className={`size-3 ${filter.tersimpan ? "fill-background/40" : "text-gold"}`} />
            <span className={filter.tersimpan ? "" : "text-gold"}>Tersimpan</span>
            <Count value={savedCount} active={Boolean(filter.tersimpan)} />
          </Chip>
        </div>

        {/* View toggle */}
        <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Mode tampilan">
          <Link
            href={buildHref(filter, { view: "list" }, listFoto)}
            aria-label="Tampilan daftar"
            aria-current={filter.view === "list" ? "true" : undefined}
            className={`grid size-8 place-items-center rounded-sm border transition-colors ${
              filter.view === "list"
                ? "border-gold bg-gold text-background"
                : "border-line bg-surface text-muted-2 hover:text-ink"
            }`}
          >
            <List className="size-3.5" />
          </Link>
          <Link
            href={buildHref(filter, { view: "grid", foto: undefined })}
            aria-label="Tampilan kisi"
            aria-current={filter.view === "grid" ? "true" : undefined}
            className={`grid size-8 place-items-center rounded-sm border transition-colors ${
              filter.view === "grid"
                ? "border-gold bg-gold text-background"
                : "border-line bg-surface text-muted-2 hover:text-ink"
            }`}
          >
            <LayoutGrid className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
