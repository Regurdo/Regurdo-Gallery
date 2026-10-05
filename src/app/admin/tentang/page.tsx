import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AboutForm } from "@/components/admin/about-form";
import { getAboutContent } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Sunting Halaman Tentang",
  robots: { index: false, follow: false },
};

/**
 * Admin editor for the public /tentang page. Content is one JSONB row in
 * site_settings (key "about"); the portrait lives in the photos bucket
 * under tentang/.
 */
export default async function AdminTentangPage() {
  const about = await getAboutContent();

  return (
    <>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">Modul Tentang</p>
          <h1 className="mt-2 font-display text-4xl font-semibold uppercase tracking-[0.06em] text-ink">
            Sunting Halaman Tentang
          </h1>
          <p className="mt-2 font-sans text-xs text-muted-2">
            Tagline, bio, perlengkapan, kontak, dan potret yang tampil di halaman publik
            /tentang.
          </p>
        </div>
        <Link
          href="/tentang"
          target="_blank"
          className="inline-flex items-center gap-2 rounded-sm border border-line bg-surface px-3.5 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-soft transition-colors hover:border-line-strong hover:text-ink"
        >
          <ExternalLink className="size-3.5" aria-hidden /> Lihat Halaman
        </Link>
      </div>

      <AboutForm about={about} />
    </>
  );
}
