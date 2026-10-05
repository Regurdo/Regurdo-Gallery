import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

/**
 * robots.txt — allow everything that matters, hide nothing (admin routes are
 * additionally noindex via their own metadata), and point crawlers at the
 * dynamic sitemap using the canonical site URL.
 */
export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL.replace(/\/+$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${base}/sitemap.xml`,
  };
}
