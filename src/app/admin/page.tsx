import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  FolderPlus,
  ImagePlus,
  MessageSquare,
  Tags,
  UserPen,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import { getCategoriesWithCounts, getTotalPhotoCount, listAdminPhotos } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Dasbor Admin",
  robots: { index: false, follow: false },
};

const MODULES = [
  { icon: ImagePlus, label: "Foto", desc: "Unggah, sunting, urutkan, dan hapus foto.", href: "/admin/foto", active: true },
  { icon: FolderPlus, label: "Album", desc: "Kelola album dan isi tiap album.", href: "/admin/album", active: true },
  { icon: Tags, label: "Kategori", desc: "Tambah, ubah nama, atau hapus kategori karya.", href: "/admin/kategori", active: true },
  { icon: MessageSquare, label: "Komentar", desc: "Moderasi komentar pengunjung.", href: "/admin/komentar", active: true },
  { icon: UserPen, label: "Tentang", desc: "Perbarui profil, peralatan, dan kontak.", href: "/admin/tentang", active: true },
] as const;

export default async function AdminPage() {
  const { profile } = await getSession();
  const [total, categories, photos] = await Promise.all([
    getTotalPhotoCount(),
    getCategoriesWithCounts(),
    listAdminPhotos(),
  ]);

  const latest = [...photos]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 5);

  return (
    <>
      {/* ---------- heading ---------- */}
      <p className="label-caps mt-6">Dasbor</p>
      <h1 className="mt-2 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink">
        Selamat Datang, {profile?.display_name ?? "Admin"}
      </h1>

      {!isSupabaseConfigured && (
        <p className="mt-6 flex items-start gap-2.5 rounded-sm border border-gold/30 bg-gold/5 px-4 py-3 font-sans text-xs leading-relaxed text-gold">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Mode demo aktif — daftar di bawah memakai foto contoh. Isi .env.local dengan kredensial
            Supabase untuk mulai mengelola koleksi aslimu.
          </span>
        </p>
      )}

      {/* ---------- stats ---------- */}
      <dl className="mt-8 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Foto" value={String(total)} />
        <StatCard label="Kategori" value={String(categories.length)} />
        <StatCard
          label="Terakhir Diperbarui"
          value={
            latest[0]
              ? new Date(latest[0].created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—"
          }
        />
      </dl>

      {/* ---------- modules ---------- */}
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => {
          const card = (
            <>
              <m.icon className="size-5 text-gold" aria-hidden />
              <h2 className="mt-3 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-ink">
                {m.label}
              </h2>
              <p className="mt-1.5 font-sans text-xs leading-relaxed text-muted-2">{m.desc}</p>
              <p className="mt-3 font-sans text-[10px] uppercase tracking-[0.18em] text-faint">
                {m.active ? "Buka modul" : "Segera hadir"}
              </p>
            </>
          );
          return (
            <li key={m.label} className="contents">
              {m.active ? (
                <Link
                  href={m.href}
                  className="group rounded-sm border border-line bg-surface p-5 transition-colors hover:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                >
                  {card}
                </Link>
              ) : (
                <div className="rounded-sm border border-line bg-surface p-5 opacity-70">{card}</div>
              )}
            </li>
          );
        })}
      </ul>

      {/* ---------- latest uploads ---------- */}
      {latest.length > 0 && (
        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <h2 className="label-caps">Terbaru Diunggah</h2>
            <Link
              href="/admin/foto"
              className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-gold transition-colors hover:text-ink"
            >
              Kelola Semua Foto
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line rounded-sm border border-line bg-surface">
            {latest.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/foto/${p.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2"
                >
                  { }
                  <img
                    src={p.url}
                    alt=""
                    className="size-12 shrink-0 rounded-sm border border-line object-cover"
                    loading="lazy"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base font-semibold uppercase tracking-[0.04em] text-ink">
                      {p.title}
                    </span>
                    <span className="label-caps mt-0.5 block !text-[9px] !text-faint">
                      {p.categoryName ?? "Tanpa Kategori"} · {p.year ?? "—"}
                    </span>
                  </span>
                  <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-gold">
                    Sunting
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-line bg-surface p-5">
      <dt className="label-caps !text-[9px] !text-faint">{label}</dt>
      <dd className="mt-2 font-display text-3xl font-semibold text-gold">{value}</dd>
    </div>
  );
}
