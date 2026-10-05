import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke galeri REGURDO untuk menyimpan karya dan berkomentar.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const nextParam = first(sp.next) ?? "/galeri";
  // Only in-app paths are allowed as post-login destinations.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/galeri";
  const error = first(sp.error);

  // Already signed in? Straight to the destination.
  const { user } = await getSession();
  if (user) redirect(next);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Link
            href="/galeri"
            className="font-display text-3xl font-semibold tracking-[0.06em] text-ink"
          >
            REGURDO<span className="text-gold">.</span>
          </Link>
          <p className="label-caps mt-3">Masuk ke galeri</p>
        </div>

        <LoginForm next={next} initialError={error} />

        <p className="mt-6 text-center font-sans text-[11px] leading-relaxed text-faint">
          Masuk diperlukan untuk menyimpan karya dan menulis komentar.
          <br />
          <Link href="/galeri" className="text-muted-2 underline-offset-4 hover:text-gold hover:underline">
            Kembali ke galeri
          </Link>
        </p>
      </div>
    </div>
  );
}
