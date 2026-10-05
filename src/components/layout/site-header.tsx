"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Keyboard, LogOut, Search, Shield } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { ShortcutsDialog } from "@/components/layout/shortcuts-dialog";

export type HeaderProfile = {
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
} | null;

const NAV_ITEMS = [
  { href: "/galeri", label: "Galeri" },
  { href: "/album", label: "Album" },
  { href: "/tentang", label: "Tentang" },
] as const;

export function SiteHeader({ profile }: { profile: HeaderProfile }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  /* Global keyboard shortcuts: "/" focuses search, "?" opens this modal. */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "?" && !typing) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = searchRef.current?.value.trim();
    router.push(q ? `/galeri?q=${encodeURIComponent(q)}` : "/galeri");
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="relative flex h-16 items-center justify-between gap-3 px-4 md:px-6">
          {/* Logo */}
          <Link
            href="/galeri"
            className="font-display text-[24px] font-semibold leading-none tracking-[0.06em] text-ink transition-colors hover:text-white"
          >
            REGURDO<span className="text-gold">.</span>
          </Link>

          {/* Center nav */}
          <nav aria-label="Navigasi utama" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`relative py-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] transition-colors ${
                  isActive(item.href) ? "text-ink" : "text-muted-2 hover:text-soft"
                }`}
              >
                {item.label}
                <span
                  aria-hidden
                  className={`absolute inset-x-0 -bottom-[1px] h-[2px] bg-gold transition-opacity ${
                    isActive(item.href) ? "opacity-100" : "opacity-0"
                  }`}
                />
              </Link>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            <form onSubmit={submitSearch} role="search" className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
              <input
                ref={searchRef}
                type="search"
                name="q"
                placeholder="Cari karya..."
                aria-label="Cari karya"
                className="h-9 w-44 rounded-sm border border-line bg-surface pl-9 pr-3 font-sans text-xs text-ink placeholder:text-faint focus:border-gold/50 focus:outline-none lg:w-60"
              />
            </form>

            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              aria-label="Pintasan keyboard"
              title="Pintasan keyboard (?)"
              className="grid size-9 shrink-0 place-items-center rounded-sm border border-line bg-surface text-muted-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              <Keyboard className="size-4" />
            </button>

            {profile ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="flex h-9 items-center gap-2 rounded-sm border border-line bg-surface pl-1.5 pr-3 text-xs text-soft transition-colors hover:border-line-strong"
                >
                  <AvatarGlyph name={profile.displayName} url={profile.avatarUrl} />
                  <span className="hidden max-w-28 truncate font-sans lg:inline">
                    {profile.displayName ?? "Fotografer"}
                  </span>
                </button>

                {menuOpen && (
                  <>
                    {/* click-away layer */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(false)}
                      aria-hidden
                    />
                    <div
                      role="menu"
                      className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-sm border border-line bg-popover shadow-xl shadow-black/50"
                    >
                      {profile.isAdmin && (
                        <Link
                          href="/admin"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-3 font-sans text-xs text-gold hover:bg-surface-2"
                        >
                          <Shield className="size-3.5" /> Dasbor Admin
                        </Link>
                      )}
                      <form action={signOutAction}>
                        <button
                          type="submit"
                          role="menuitem"
                          className="flex w-full items-center gap-2.5 px-4 py-3 text-left font-sans text-xs text-soft hover:bg-surface-2"
                        >
                          <LogOut className="size-3.5" /> Keluar
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex h-9 items-center rounded-sm border border-gold/40 bg-transparent px-4 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold hover:text-background"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>

        {/* Mobile nav row */}
        <nav aria-label="Navigasi utama" className="flex items-center justify-center gap-8 pb-3 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`relative pb-1 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] ${
                isActive(item.href) ? "text-ink" : "text-muted-2"
              }`}
            >
              {item.label}
              {isActive(item.href) && (
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-gold" />
              )}
            </Link>
          ))}
        </nav>
      </header>

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}

function AvatarGlyph({ name, url }: { name: string | null; url: string | null }) {
  if (url) {
    return <img src={url} alt="" className="size-6 rounded-full object-cover" />;
  }
  const initial = (name ?? "F").trim().charAt(0).toUpperCase() || "F";
  return (
    <span className="grid size-6 place-items-center rounded-full bg-gold/15 font-sans text-[10px] font-bold text-gold">
      {initial}
    </span>
  );
}
