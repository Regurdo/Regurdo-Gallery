import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Camera, Instagram, Mail, MapPin } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { isSupabaseConfigured } from "@/lib/config";
import { getAboutContent } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Tentang",
  description:
    "Kenalan dengan REGURDO — fotografer di balik galeri ini: perjalanan, perlengkapan, dan cara menghubungi.",
};

/**
 * TENTANG — the photographer's profile page. Content is fully editable from
 * the admin dashboard (/admin/tentang) and stored in site_settings ("about").
 * Live counters (photos / categories) come straight from the database.
 */
export default async function TentangPage() {
  const about = await getAboutContent();
  const since = about.start_year ?? null;
  const activeYears = since ? Math.max(1, new Date().getFullYear() - since + 1) : null;

  const instagramHandle = about.instagram
    ? (about.instagram.replace(/\/+$/, "").split("/").pop() ?? null)
    : null;

  return (
    <>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 md:px-6 md:py-14">
        {/* ---------- hero: portrait + tagline ---------- */}
        <section className="grid items-center gap-8 md:grid-cols-[280px_1fr] md:gap-12">
          <div className="mx-auto w-full max-w-[280px]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm border border-line bg-surface">
              {about.portraitUrl ? (
                <Image
                  src={about.portraitUrl}
                  alt={about.portrait_caption || "Potret fotografer"}
                  fill
                  sizes="(min-width: 768px) 280px, 80vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div
                  aria-hidden
                  className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_35%,rgba(212,169,95,0.16),transparent_65%)]"
                >
                  <Camera className="size-14 text-faint" strokeWidth={1.25} />
                </div>
              )}
            </div>
            {about.portrait_caption && (
              <p className="label-caps mt-2.5 text-center !text-[9px] !text-faint">
                {about.portrait_caption}
              </p>
            )}
          </div>

          <div className="text-center md:text-left">
            <p className="label-caps !text-[9px]">Tentang</p>
            <h1 className="mt-3 font-display text-5xl font-semibold uppercase leading-[0.95] tracking-[0.04em] text-ink md:text-6xl">
              Regurdo
              <span className="text-gold">.</span>
            </h1>
            <p className="mt-4 font-display text-2xl font-medium italic text-gold md:text-3xl">
              &ldquo;{about.tagline}&rdquo;
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 md:justify-start">
              {about.city && (
                <p className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-muted-2">
                  <MapPin className="size-3.5 text-gold" aria-hidden /> {about.city}
                </p>
              )}
              {since && (
                <p className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-muted-2">
                  <Camera className="size-3.5 text-gold" aria-hidden /> Aktif sejak {since}
                </p>
              )}
            </div>

            <p className="mx-auto mt-6 max-w-xl whitespace-pre-wrap font-sans text-sm leading-relaxed text-soft md:mx-0">
              {about.bio}
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              {about.email && (
                <a href={`mailto:${about.email}`} className="btn-gold">
                  <Mail className="size-4" aria-hidden /> Email Saya
                </a>
              )}
              {instagramHandle && (
                <a
                  href={about.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost-dark"
                >
                  <Instagram className="size-4" aria-hidden /> @{instagramHandle}
                </a>
              )}
            </div>
          </div>
        </section>

        {/* ---------- angka (live counters) ---------- */}
        <section className="mt-14">
          <p className="label-caps">Sekilas Angka</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatCard label="Karya Di Galeri" value={String(about.totalPhotos)} />
            <StatCard label="Kategori" value={String(about.totalCategories)} />
            <StatCard
              label="Tahun Aktif"
              value={activeYears ? `${activeYears} Tahun` : "—"}
            />
          </dl>
        </section>

        {/* ---------- perlengkapan ---------- */}
        {about.equipment.length > 0 && (
          <section className="mt-14">
            <p className="label-caps">Perlengkapan</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {about.equipment.map((e, i) => (
                <li
                  key={`${e.name}-${i}`}
                  className="rounded-sm border border-line bg-surface p-5"
                >
                  <p className="font-display text-xl font-semibold uppercase tracking-[0.04em] text-ink">
                    {e.name}
                  </p>
                  <p className="label-caps mt-1.5 !text-[9px] !text-gold">{e.role}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ---------- ajakan ---------- */}
        <section className="mt-14 rounded-sm border border-line bg-surface px-6 py-10 text-center md:px-12">
          <p className="label-caps !text-[9px]">Jelajahi</p>
          <h2 className="mx-auto mt-3 max-w-lg font-display text-3xl font-semibold uppercase leading-[1.05] tracking-[0.04em] text-ink md:text-4xl">
            See The World Through My Lens
          </h2>
          <p className="mx-auto mt-3 max-w-md font-sans text-xs leading-relaxed text-muted-2">
            Behind every photo is a story, a journey, and a moment captured in time. Enjoy the collection.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/galeri" className="btn-gold">
              Buka Galeri
            </Link>
            <Link href="/album" className="btn-ghost-dark">
              Lihat Album
            </Link>
          </div>
        </section>

        {!isSupabaseConfigured && (
          <p className="mt-8 rounded-sm border border-gold/30 bg-gold/5 px-4 py-3 text-center font-sans text-xs leading-relaxed text-gold">
            Mode demo — konten halaman ini memakai data contoh. Sambungkan Supabase dan
            sunting lewat Dasbor Admin untuk menampilkan profilmu sendiri.
          </p>
        )}
      </div>

      <SiteFooter center="Tentang Regurdo" right="Salam Lensa" />
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
