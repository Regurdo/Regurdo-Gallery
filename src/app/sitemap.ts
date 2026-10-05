import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { listAlbums } from "@/lib/queries";

/**
 * Dynamic sitemap: static routes + one entry per album (slugs come straight
 * from the database; falls back to demo albums while Supabase is not set up).
 * Regenerated at most once per hour.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/+$/, "");
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/galeri`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/album`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tentang`, changeFrequency: "yearly", priority: 0.6 },
  ];

  try {
    const albums = await listAlbums();
    return [
      ...staticRoutes,
      ...albums.map((album) => ({
        url: `${base}/album/${album.slug}`,
        lastModified: album.created_at ? new Date(album.created_at) : undefined,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    // Never fail the sitemap because of a transient database hiccup.
    return staticRoutes;
  }
}
