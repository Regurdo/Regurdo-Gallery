"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Plus,
  Search,
  Star,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  addAlbumPhotoAction,
  moveAlbumPhotoAction,
  removeAlbumPhotoAction,
  setAlbumCoverAction,
  type ActionResult,
} from "@/lib/actions/albums";
import type { AdminPhoto } from "@/lib/photo-utils";

const btn =
  "grid size-8 place-items-center rounded-sm border border-line bg-surface text-muted-2 transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

/**
 * "Isi Album" manager: the album's ordered member list (cover pick, move
 * up/down, remove) plus a searchable pool of photos that are not in the
 * album yet. Every action calls a server action, then router.refresh()
 * re-renders this component with fresh server props.
 */
export function AlbumContentsManager({
  albumId,
  coverPhotoId,
  photos,
  memberIds,
}: {
  albumId: string;
  coverPhotoId: string | null;
  photos: AdminPhoto[];
  /** Ordered photo ids currently in the album (from the database). */
  memberIds: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");

  const byId = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const members = useMemo(
    () => memberIds.map((id) => byId.get(id)).filter((p): p is AdminPhoto => Boolean(p)),
    [memberIds, byId],
  );
  const memberSet = useMemo(() => new Set(memberIds), [memberIds]);
  const remaining = useMemo(() => photos.filter((p) => !memberSet.has(p.id)), [photos, memberSet]);

  const filteredRemaining = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return remaining;
    return remaining.filter((p) => p.title.toLowerCase().includes(q));
  }, [remaining, query]);

  function run(action: () => Promise<ActionResult>, errTitle: string) {
    startTransition(async () => {
      const res = await action();
      if (res.error) {
        toast({ title: errTitle, description: res.error });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-8">
      {/* ---------- foto dalam album ---------- */}
      <section aria-labelledby="isi-album-heading">
        <div className="flex items-end justify-between gap-4">
          <h2 id="isi-album-heading" className="label-caps">
            Foto dalam Album
          </h2>
          <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-faint">
            {members.length} foto · urutan = urutan halaman publik
          </p>
        </div>

        {members.length === 0 ? (
          <div className="mt-4 rounded-sm border border-dashed border-line-strong bg-surface/50 px-6 py-10 text-center">
            <ImagePlus className="mx-auto size-7 text-faint" aria-hidden />
            <p className="mt-4 font-sans text-xs leading-relaxed text-muted-2">
              Album masih kosong. Tambahkan foto dari daftar &ldquo;Tambah Foto&rdquo; di bawah —
              foto pertama otomatis menjadi sampul album.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-sm border border-line bg-surface">
            {members.map((p, i) => {
              const isCover = p.id === coverPhotoId;
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5 sm:flex-nowrap">
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
                      {p.year ?? "—"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={pending || isCover}
                      onClick={() => run(() => setAlbumCoverAction(albumId, p.id), "Gagal menetapkan sampul")}
                      aria-label={isCover ? `Sampul album: ${p.title}` : `Jadikan sampul: ${p.title}`}
                      aria-pressed={isCover}
                      title={isCover ? "Sampul album" : "Jadikan sampul"}
                      className={`${btn} ${
                        isCover
                          ? "border-gold/60 text-gold"
                          : "hover:border-gold/50 hover:text-gold"
                      }`}
                    >
                      <Star className={`size-3.5 ${isCover ? "fill-gold" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => run(() => moveAlbumPhotoAction(albumId, p.id, "up"), "Gagal memindahkan")}
                      disabled={pending || i === 0}
                      aria-label={`Naikkan urutan ${p.title}`}
                      className={btn}
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => run(() => moveAlbumPhotoAction(albumId, p.id, "down"), "Gagal memindahkan")}
                      disabled={pending || i === members.length - 1}
                      aria-label={`Turunkan urutan ${p.title}`}
                      className={btn}
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => run(() => removeAlbumPhotoAction(albumId, p.id), "Gagal menghapus")}
                      disabled={pending}
                      aria-label={`Keluarkan ${p.title} dari album`}
                      title="Keluarkan dari album"
                      className={`${btn} hover:border-destructive/50 hover:text-destructive-foreground`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------- tambah foto ---------- */}
      <section aria-labelledby="tambah-foto-heading" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="tambah-foto-heading" className="label-caps">
              Tambah Foto
            </h2>
            <p className="mt-1.5 font-sans text-[10px] text-faint">
              {remaining.length === 0
                ? "Semua foto sudah masuk album ini."
                : `${remaining.length} foto belum masuk album — klik untuk menambahkan.`}
            </p>
          </div>
          {remaining.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari judul foto..."
                aria-label="Cari foto untuk ditambahkan"
                className="h-9 w-full rounded-sm border border-line bg-surface pl-9 pr-3 font-sans text-xs text-ink placeholder:text-faint focus:border-gold/50 focus:outline-none"
              />
            </div>
          )}
        </div>

        {remaining.length === 0 ? (
          <p className="mt-4 rounded-sm border border-dashed border-line-strong bg-surface/50 px-6 py-8 text-center font-sans text-xs text-muted-2">
            Semua foto koleksi sudah menjadi bagian album ini.
          </p>
        ) : filteredRemaining.length === 0 ? (
          <p className="mt-4 rounded-sm border border-dashed border-line-strong bg-surface/50 px-6 py-8 text-center font-sans text-xs text-muted-2">
            Tidak ada foto yang cocok dengan &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {filteredRemaining.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => addAlbumPhotoAction(albumId, p.id), "Gagal menambahkan")}
                  aria-label={`Tambahkan ${p.title} ke album`}
                  title={`Tambahkan "${p.title}"`}
                  className="group relative block aspect-[4/5] w-full overflow-hidden rounded-sm border border-line bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-wait"
                >
                  <Image
                    src={p.url}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                    className="object-cover opacity-80 transition-all duration-300 group-hover:scale-[1.04] group-hover:opacity-100"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-background/95 via-background/20 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  >
                    <span className="grid size-6 place-items-center rounded-full bg-gold text-background">
                      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    </span>
                    <span className="mt-1 w-full truncate text-center font-sans text-[9px] uppercase tracking-[0.1em] text-ink">
                      {p.title}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
