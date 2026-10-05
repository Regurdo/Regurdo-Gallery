import type { NextConfig } from "next";

/**
 * Hosts allowed to POST Server Actions (Next.js CSRF check compares the
 * browser origin against x-forwarded-host).
 *
 * - "*.vercel.app" covers Vercel production + preview deployments;
 * - when NEXT_PUBLIC_SITE_URL is set (e.g. https://regurgo.com) its host is
 *   allowed automatically, so a custom domain needs no code change;
 * - SERVER_ACTIONS_EXTRA_ORIGINS is a comma-separated escape hatch for any
 *   extra host (e.g. "www.regurgo.com,staging.example.com").
 */
const siteUrlHost = (() => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).host;
  } catch {
    return null;
  }
})();

const extraOrigins = (process.env.SERVER_ACTIONS_EXTRA_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  experimental: {
    // Photo uploads travel through Server Actions (formData) — raise the
    // 1 MB default so real camera files (up to ~10 MB) go through.
    // NOTE: Vercel caps request bodies at ~4.5 MB regardless of this value.
    serverActions: {
      bodySizeLimit: "12mb",
      allowedOrigins: [
        "localhost:3000",
        "*.vercel.app",
        // The preview gateway forwards Server Action POSTs with an internal
        // x-forwarded-host that differs from the browser origin.
        "*.space-z.ai",
        "*.fcapp.run",
        ...(siteUrlHost ? [siteUrlHost] : []),
        ...extraOrigins,
      ],
    },
  },
  images: {
    // Photos are served from Supabase Storage (public bucket "photos").
    // picsum.photos powers the demo dataset when Supabase env is missing.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "fastly.picsum.photos", pathname: "/**" },
      // Google OAuth profile photos (lh3/lh4/lh5/... .googleusercontent.com)
      { protocol: "https", hostname: "**.googleusercontent.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
