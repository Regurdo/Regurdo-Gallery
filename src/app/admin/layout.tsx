import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";

export const metadata: Metadata = {
  title: "Dasbor Admin",
  robots: { index: false, follow: false },
};

/**
 * Central admin gate — wraps every /admin/* route:
 *  1. proxy.ts already blocks anonymous visitors;
 *  2. here the profile flag is verified server-side (never trust the client);
 *  3. server actions re-verify again before any write (defense in depth).
 *
 * Demo mode exception: when Supabase env is missing there is no auth system
 * at all, so the dashboard renders with demo data and a banner — every write
 * action fails gracefully ("Supabase belum diatur"). As soon as env vars are
 * set, the full gate applies again.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured) {
    const { user, profile } = await getSession();
    if (!user) redirect("/login?next=/admin");

    if (!profile?.is_admin) {
      return <AccessDeniedPanel email={user.email ?? ""} />;
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-12">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-2 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" /> Dasbor Admin
        </Link>
        <Link
          href="/galeri"
          className="inline-flex items-center gap-2 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-2 transition-colors hover:text-ink"
        >
          Lihat Galeri
        </Link>
      </div>
      {children}
    </div>
  );
}

function AccessDeniedPanel({ email }: { email: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <section className="max-w-lg rounded-sm border border-line bg-surface p-8">
        <h1 className="font-display text-3xl font-semibold uppercase tracking-[0.06em] text-ink">
          Akses Ditolak
        </h1>
        <p className="mt-3 font-sans text-xs leading-relaxed text-muted-2">
          Akun <span className="text-soft">{email}</span> belum memiliki peran admin. Jalankan
          pernyataan SQL berikut di Supabase (SQL Editor), ganti email-nya terlebih dahulu:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-sm border border-line bg-background p-4 font-mono text-[11px] leading-relaxed text-gold">
{`insert into public.profiles (id, display_name, is_admin)
select id, split_part(email, '@', 1), true
  from auth.users
 where email = 'EMAIL_ANDA@example.com'
on conflict (id) do update set is_admin = true;`}
        </pre>
        <p className="mt-4 font-sans text-[11px] text-faint">
          Lalu muat ulang halaman ini. Panduan lengkap ada di SETUP.md.
        </p>
      </section>
    </div>
  );
}
