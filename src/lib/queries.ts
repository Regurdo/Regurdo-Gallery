import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/config";
import {
  DEMO_ALBUMS,
  DEMO_CATEGORIES,
  DEMO_COMMENTS,
  DEMO_PHOTOS,
  demoCommentsForPhoto,
  filterDemoPhotos,
} from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import type { CategoryWithCount, CommentWithAuthor, GalleryPhoto } from "@/lib/types";
import type { AdminAlbumCard, AdminPhoto, AlbumEditData, CategoryOption } from "@/lib/photo-utils";

/**
 * Read-only data helpers used by Server Components.
 * All queries respect RLS — anonymous visitors only ever see public rows.
 *
 * Every helper transparently falls back to a small demo dataset when the
 * Supabase env vars are missing, so the gallery stays explorable in a fresh
 * clone / preview sandbox.
 */

export async function getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  if (!isSupabaseConfigured) return DEMO_CATEGORIES;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, photos(count)")
    .order("name", { ascending: true });

  if (error) {
    console.error("[queries] getCategoriesWithCounts:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as {
      id: string;
      name: string;
      slug: string;
      photos: { count: number }[] | null;
    };
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      count: r.photos?.[0]?.count ?? 0,
    };
  });
}

export async function getTotalPhotoCount(): Promise<number> {
  if (!isSupabaseConfigured) return filterDemoPhotos({}).length;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("[queries] getTotalPhotoCount:", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function getSavedPhotoCount(userId: string): Promise<number> {
  if (!isSupabaseConfigured) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("saved_photos")
    .select("photo_id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("[queries] getSavedPhotoCount:", error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Ids of the photos the user has saved (SIMPAN) — fed into the gallery
 * client components so the bookmark buttons render the right state.
 */
export async function getSavedPhotoIds(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_photos")
    .select("photo_id")
    .eq("user_id", userId);

  if (error) {
    console.error("[queries] getSavedPhotoIds:", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.photo_id as string);
}

/**
 * The user's saved photos, newest bookmark first. Photos deleted by the
 * admin disappear automatically (saved_photos has ON DELETE CASCADE).
 */
export async function listSavedPhotos(userId: string): Promise<GalleryPhoto[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const { data: saved, error } = await supabase
    .from("saved_photos")
    .select("photo_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[queries] listSavedPhotos:", error.message);
    return [];
  }
  const ids = (saved ?? []).map((s) => s.photo_id as string);
  if (ids.length === 0) return [];

  const { data, error: photoErr } = await supabase
    .from("photos")
    .select(
      "id, slug, title, year, camera, lens, iso, aperture, shutter, storage_path, width, height, categories(name, slug)",
    )
    .in("id", ids);
  if (photoErr) {
    console.error("[queries] listSavedPhotos photos:", photoErr.message);
    return [];
  }

  const byId = new Map<string, GalleryPhoto>(
    ((data ?? []) as unknown as PhotoRowWithCategory[]).map((r) => [
      r.id,
      rowToGalleryPhoto(r, (path) =>
        supabase.storage.from("photos").getPublicUrl(path).data.publicUrl,
      ),
    ]),
  );
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is GalleryPhoto => Boolean(p));
}

type PhotoRowWithCategory = {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  camera: string | null;
  lens: string | null;
  iso: string | null;
  aperture: string | null;
  shutter: string | null;
  storage_path: string;
  width: number;
  height: number;
  /* PostgREST embeds many-to-one as an object, but older server builds may
     return an array — accept both so the mapping never breaks. */
  categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

function rowToGalleryPhoto(
  row: PhotoRowWithCategory,
  publicUrl: (storagePath: string) => string,
): GalleryPhoto {
  const raw = row.categories;
  const cat = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    categorySlug: cat?.slug ?? null,
    categoryName: cat?.name ?? null,
    year: row.year,
    camera: row.camera,
    lens: row.lens,
    iso: row.iso,
    aperture: row.aperture,
    shutter: row.shutter,
    url: publicUrl(row.storage_path),
    width: row.width,
    height: row.height,
  };
}

/**
 * Photos for the gallery views, ordered like the catalog:
 * manual sort_order first, newest within the same position.
 * Optionally filtered by category slug and a search term (title match).
 */
export async function listGalleryPhotos(opts: {
  category?: string;
  q?: string;
}): Promise<GalleryPhoto[]> {
  if (!isSupabaseConfigured) {
    return filterDemoPhotos({ category: opts.category, q: opts.q });
  }

  const supabase = await createClient();
  let query = supabase
    .from("photos")
    .select("id, slug, title, year, camera, lens, iso, aperture, shutter, storage_path, width, height, categories(name, slug)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (opts.category) {
    // PostgREST "many-to-one" filter on the embedded category.
    query = query.eq("categories.slug", opts.category);
  }
  const q = opts.q?.trim();
  if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[queries] listGalleryPhotos:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as PhotoRowWithCategory[]).map((row) =>
    rowToGalleryPhoto(row, (path) =>
      supabase.storage.from("photos").getPublicUrl(path).data.publicUrl,
    ),
  );
}

/* ------------------------------ admin queries ------------------------------ */

/** Category list for admin <select> inputs (demo fallback included). */
export async function getCategoryOptions(): Promise<CategoryOption[]> {
  if (!isSupabaseConfigured) {
    return DEMO_CATEGORIES.map((c) => ({ id: c.id, name: c.name }));
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("[queries] getCategoryOptions:", error.message);
    return [];
  }
  return data ?? [];
}

type AdminPhotoRow = {
  id: string;
  slug: string;
  title: string;
  category_id: string | null;
  year: number | null;
  camera: string | null;
  lens: string | null;
  iso: string | null;
  aperture: string | null;
  shutter: string | null;
  storage_path: string;
  width: number;
  height: number;
  created_at: string;
  categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

function adminRowToPhoto(
  row: AdminPhotoRow,
  publicUrl: (storagePath: string) => string,
): AdminPhoto {
  const raw = row.categories;
  const cat = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category_id: row.category_id,
    categorySlug: cat?.slug ?? null,
    categoryName: cat?.name ?? null,
    year: row.year,
    camera: row.camera,
    lens: row.lens,
    iso: row.iso,
    aperture: row.aperture,
    shutter: row.shutter,
    url: publicUrl(row.storage_path),
    width: row.width,
    height: row.height,
    created_at: row.created_at,
  };
}

const DEMO_CREATED_AT = "2024-06-01T08:00:00.000Z";

/** All photos for the admin manager, ordered exactly like the gallery. */
export async function listAdminPhotos(): Promise<AdminPhoto[]> {
  if (!isSupabaseConfigured) {
    return DEMO_PHOTOS.map((p, i) => ({
      ...p,
      category_id: DEMO_CATEGORIES.find((c) => c.slug === p.categorySlug)?.id ?? null,
      created_at: new Date(Date.parse(DEMO_CREATED_AT) - i * 86_400_000).toISOString(),
    }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .select(
      "id, slug, title, category_id, year, camera, lens, iso, aperture, shutter, storage_path, width, height, created_at, categories(name, slug)",
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[queries] listAdminPhotos:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as AdminPhotoRow[]).map((row) =>
    adminRowToPhoto(row, (path) =>
      supabase.storage.from("photos").getPublicUrl(path).data.publicUrl,
    ),
  );
}

/** Single photo for the edit form. */
export async function getPhotoForEdit(id: string): Promise<AdminPhoto | null> {
  if (!isSupabaseConfigured) {
    const demo = DEMO_PHOTOS.find((p) => p.id === id);
    if (!demo) return null;
    return {
      ...demo,
      category_id: DEMO_CATEGORIES.find((c) => c.slug === demo.categorySlug)?.id ?? null,
      created_at: DEMO_CREATED_AT,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .select(
      "id, slug, title, category_id, year, camera, lens, iso, aperture, shutter, storage_path, width, height, created_at, categories(name, slug)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[queries] getPhotoForEdit:", error.message);
    return null;
  }
  if (!data) return null;

  return adminRowToPhoto(data as unknown as AdminPhotoRow, (path) =>
    supabase.storage.from("photos").getPublicUrl(path).data.publicUrl,
  );
}

/**
 * Distinct camera / lens values already used by the admin's photos —
 * fed into the upload & edit forms as quick-pick suggestions.
 */
export async function getUsedCameraLensOptions(): Promise<{
  cameras: string[];
  lenses: string[];
}> {
  const photos = await listAdminPhotos();
  const uniqSorted = (values: (string | null)[]) =>
    Array.from(
      new Set(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v))),
    ).sort((a, b) => a.localeCompare(b, "id"));

  return {
    cameras: uniqSorted(photos.map((p) => p.camera)),
    lenses: uniqSorted(photos.map((p) => p.lens)),
  };
}

/* ------------------------------ album queries ------------------------------ */

const DEMO_ALBUM_CREATED_AT = "2024-05-01T08:00:00.000Z";

function demoAlbumCards(): AdminAlbumCard[] {
  return DEMO_ALBUMS.map((a) => {
    const inAlbum = a.photoIds
      .map((id) => DEMO_PHOTOS.find((p) => p.id === id))
      .filter((p): p is GalleryPhoto => Boolean(p));
    const cover =
      inAlbum.find((p) => p.id === a.coverPhotoId) ?? inAlbum[0] ?? null;
    return {
      id: a.id,
      slug: a.slug,
      title: a.title,
      description: a.description,
      photoCount: inAlbum.length,
      coverUrl: cover?.url ?? null,
      created_at: DEMO_ALBUM_CREATED_AT,
    };
  });
}

type AlbumRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_photo_id: string | null;
  created_at: string;
};

/**
 * Resolve the album cover: the chosen cover photo when it is still a member
 * of the album, otherwise the album's first photo. Returns the resolved
 * cover photo id (or null for an empty album).
 */
function resolveCoverId(album: { cover_photo_id: string | null }, memberIds: string[]): string | null {
  if (album.cover_photo_id && memberIds.includes(album.cover_photo_id)) {
    return album.cover_photo_id;
  }
  return memberIds[0] ?? null;
}

/**
 * All albums (public + admin list), ordered by manual sort_order then age.
 * Cover URLs are resolved in a second small query so we never depend on
 * PostgREST embed naming.
 */
export async function listAlbums(): Promise<AdminAlbumCard[]> {
  if (!isSupabaseConfigured) return demoAlbumCards();

  const supabase = await createClient();
  const { data: albums, error } = await supabase
    .from("albums")
    .select("id, slug, title, description, cover_photo_id, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[queries] listAlbums:", error.message);
    return [];
  }
  const rows = (albums ?? []) as AlbumRow[];
  if (rows.length === 0) return [];

  const { data: memberships } = await supabase
    .from("album_photos")
    .select("album_id, photo_id, sort_order");

  const byAlbum = new Map<string, { photo_id: string; sort_order: number }[]>();
  for (const m of memberships ?? []) {
    const list = byAlbum.get(m.album_id) ?? [];
    list.push({ photo_id: m.photo_id, sort_order: m.sort_order });
    byAlbum.set(m.album_id, list);
  }
  const orderedMembers = (albumId: string): string[] =>
    (byAlbum.get(albumId) ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => m.photo_id);

  const coverIds = new Set<string>();
  for (const row of rows) {
    const cover = resolveCoverId(row, orderedMembers(row.id));
    if (cover) coverIds.add(cover);
  }

  const urlById = new Map<string, string>();
  if (coverIds.size > 0) {
    const { data: covers } = await supabase
      .from("photos")
      .select("id, storage_path")
      .in("id", [...coverIds]);
    for (const p of covers ?? []) {
      urlById.set(
        p.id,
        supabase.storage.from("photos").getPublicUrl(p.storage_path).data.publicUrl,
      );
    }
  }

  return rows.map((row) => {
    const memberIds = orderedMembers(row.id);
    const cover = resolveCoverId(row, memberIds);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      photoCount: memberIds.length,
      coverUrl: cover ? (urlById.get(cover) ?? null) : null,
      created_at: row.created_at,
    };
  });
}

/** Public album detail: album card + its photos in album order. */
export async function getAlbumBySlug(
  slug: string,
): Promise<{ album: AdminAlbumCard; photos: GalleryPhoto[] } | null> {
  if (!isSupabaseConfigured) {
    const demo = DEMO_ALBUMS.find((a) => a.slug === slug);
    if (!demo) return null;
    const photos = demo.photoIds
      .map((id) => DEMO_PHOTOS.find((p) => p.id === id))
      .filter((p): p is GalleryPhoto => Boolean(p));
    const card = demoAlbumCards().find((c) => c.id === demo.id);
    return card ? { album: card, photos } : null;
  }

  const supabase = await createClient();
  const { data: album } = await supabase
    .from("albums")
    .select("id, slug, title, description, cover_photo_id, created_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!album) return null;
  const row = album as AlbumRow;

  const { data: memberships } = await supabase
    .from("album_photos")
    .select("photo_id, sort_order")
    .eq("album_id", row.id)
    .order("sort_order", { ascending: true });
  const memberIds = (memberships ?? []).map((m) => m.photo_id as string);

  let photos: GalleryPhoto[] = [];
  if (memberIds.length > 0) {
    const { data, error } = await supabase
      .from("photos")
      .select(
        "id, slug, title, year, camera, lens, iso, aperture, shutter, storage_path, width, height, categories(name, slug)",
      )
      .in("id", memberIds);
    if (error) {
      console.error("[queries] getAlbumBySlug photos:", error.message);
    } else {
      const byId = new Map<string, GalleryPhoto>(
        ((data ?? []) as unknown as PhotoRowWithCategory[]).map((r) => [
          r.id,
          rowToGalleryPhoto(r, (path) =>
            supabase.storage.from("photos").getPublicUrl(path).data.publicUrl,
          ),
        ]),
      );
      photos = memberIds
        .map((id) => byId.get(id))
        .filter((p): p is GalleryPhoto => Boolean(p));
    }
  }

  const cover = resolveCoverId(row, memberIds);
  let coverUrl: string | null = null;
  if (cover) {
    const { data: coverPhoto } = await supabase
      .from("photos")
      .select("storage_path")
      .eq("id", cover)
      .maybeSingle();
    if (coverPhoto) {
      coverUrl = supabase.storage
        .from("photos")
        .getPublicUrl(coverPhoto.storage_path)
        .data.publicUrl;
    }
  }

  return {
    album: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      photoCount: memberIds.length,
      coverUrl,
      created_at: row.created_at,
    },
    photos,
  };
}

/** Single album for the edit form. */
export async function getAlbumForEdit(id: string): Promise<AlbumEditData | null> {
  if (!isSupabaseConfigured) {
    const demo = DEMO_ALBUMS.find((a) => a.id === id);
    if (!demo) return null;
    return {
      id: demo.id,
      slug: demo.slug,
      title: demo.title,
      description: demo.description,
      coverPhotoId: demo.coverPhotoId,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("albums")
    .select("id, slug, title, description, cover_photo_id")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    description: data.description,
    coverPhotoId: data.cover_photo_id,
  };
}

/** Ordered member photo ids of an album (for the "isi album" manager). */
export async function getAlbumMembership(albumId: string): Promise<string[]> {
  if (!isSupabaseConfigured) {
    return DEMO_ALBUMS.find((a) => a.id === albumId)?.photoIds ?? [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("album_photos")
    .select("photo_id, sort_order")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: true });
  return (data ?? []).map((m) => m.photo_id as string);
}

/* ------------------------------ comment queries ----------------------------- */

/**
 * Comments for one photo, oldest first, joined with the author's profile.
 * profiles is resolved in a second query — comments.user_id points at
 * auth.users (not exposed to PostgREST), so a direct embed is not possible.
 */
export async function getPhotoComments(photoId: string): Promise<CommentWithAuthor[]> {
  if (!isSupabaseConfigured) return demoCommentsForPhoto(photoId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, photo_id, user_id, parent_id, body, created_at")
    .eq("photo_id", photoId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[queries] getPhotoComments:", error.message);
    return [];
  }
  return attachAuthors(supabase, data ?? []);
}

/** Admin moderation row: comment + resolved photo & parent info. */
export type AdminCommentRow = CommentWithAuthor & {
  photoTitle: string | null;
  photoSlug: string | null;
  /** Display name of the parent comment's author (null for root comments). */
  parentAuthor: string | null;
};

/** All comments for the admin moderation list, newest first. */
export async function listAllComments(): Promise<AdminCommentRow[]> {
  if (!isSupabaseConfigured) {
    return DEMO_COMMENTS.map((c) => {
      const photo = DEMO_PHOTOS.find((p) => p.id === c.photo_id);
      const parent = c.parent_id
        ? DEMO_COMMENTS.find((d) => d.id === c.parent_id) ?? null
        : null;
      return {
        ...c,
        photoTitle: photo?.title ?? null,
        photoSlug: photo?.slug ?? null,
        parentAuthor: parent?.authorName ?? null,
      };
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, photo_id, user_id, parent_id, body, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[queries] listAllComments:", error.message);
    return [];
  }

  const withAuthors = await attachAuthors(supabase, data ?? []);

  // Resolve photo title/slug in one extra query.
  const photoIds = [...new Set(withAuthors.map((c) => c.photo_id))];
  const byPhoto = new Map<string, { title: string; slug: string }>();
  if (photoIds.length > 0) {
    const { data: photos } = await supabase
      .from("photos")
      .select("id, title, slug")
      .in("id", photoIds);
    for (const p of photos ?? []) {
      byPhoto.set(p.id, { title: p.title, slug: p.slug });
    }
  }

  // Resolve the parent comment's author for "membalas @nama" chips.
  const byId = new Map(withAuthors.map((c) => [c.id, c]));

  return withAuthors.map((c) => {
    const photo = byPhoto.get(c.photo_id);
    const parent = c.parent_id ? byId.get(c.parent_id) : undefined;
    return {
      ...c,
      photoTitle: photo?.title ?? null,
      photoSlug: photo?.slug ?? null,
      parentAuthor: parent?.authorName ?? null,
    };
  });
}

/**
 * Attach author display names / avatars to raw comment rows.
 * Runs one profiles query per call (user_ids -> .in lookup).
 */
async function attachAuthors(
  supabase: SupabaseClient,
  rows: {
    id: string;
    photo_id: string;
    user_id: string;
    parent_id: string | null;
    body: string;
    created_at: string;
  }[],
): Promise<CommentWithAuthor[]> {
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const profiles = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  if (userIds.length > 0) {
    const { data: authors } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);
    for (const p of authors ?? []) {
      profiles.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
    }
  }
  return rows.map((r) => {
    const author = profiles.get(r.user_id);
    return {
      id: r.id,
      photo_id: r.photo_id,
      user_id: r.user_id,
      parent_id: r.parent_id,
      body: r.body,
      created_at: r.created_at,
      authorName: author?.display_name ?? null,
      authorAvatar: author?.avatar_url ?? null,
    };
  });
}

/* ------------------------------- about page -------------------------------- */

export type AboutEquipment = { name: string; role: string };

export type AboutContent = {
  tagline: string;
  bio: string;
  start_year: number | null;
  city: string;
  equipment: AboutEquipment[];
  email: string;
  instagram: string;
  /** Storage path in the "photos" bucket ("" = no portrait uploaded yet). */
  portrait_path: string;
  portrait_caption: string;
};

export type AboutView = AboutContent & {
  /** Ready-to-render portrait URL (null when not set / demo placeholder). */
  portraitUrl: string | null;
  /** Filled from the live database, so the page can show live counters. */
  totalPhotos: number;
  totalCategories: number;
};

const DEMO_ABOUT: AboutContent = {
  tagline: "Yang penting moto",
  bio: "Orang biasa yang suka moto moto ajah.",
  start_year: 2022,
  city: "Probolinggo",
  equipment: [
    { name: "Poco X6 Pro", role: "Main Camera" },
    { name: "Tripod Inbex", role: "Tripod" },
    { name: "Acer Nitro V15", role: "Editing" },
  ],
  email: "dafafatian@gmail.com",
  instagram: "https://instagram.com/regurdo_",
  portrait_path: "",
  portrait_caption: "Photographer — Regurdo",
};

/**
 * Editable "about" page content from site_settings (key "about"), joined
 * with live counters and the resolved portrait URL. Falls back to the seed
 * content when Supabase is not connected.
 */
export async function getAboutContent(): Promise<AboutView> {
  let content: AboutContent = DEMO_ABOUT;
  let portraitUrl: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "about")
      .maybeSingle();
    if (data?.value && typeof data.value === "object") {
      const v = data.value as Record<string, unknown>;
      content = {
        tagline: typeof v.tagline === "string" ? v.tagline : DEMO_ABOUT.tagline,
        bio: typeof v.bio === "string" ? v.bio : DEMO_ABOUT.bio,
        start_year: typeof v.start_year === "number" ? v.start_year : null,
        city: typeof v.city === "string" ? v.city : "",
        equipment: Array.isArray(v.equipment)
          ? (v.equipment as unknown[])
              .map((e) => {
                const item = e as Record<string, unknown>;
                return {
                  name: typeof item.name === "string" ? item.name : "",
                  role: typeof item.role === "string" ? item.role : "",
                };
              })
              .filter((e) => e.name || e.role)
          : [],
        email: typeof v.email === "string" ? v.email : "",
        instagram: typeof v.instagram === "string" ? v.instagram : "",
        portrait_path: typeof v.portrait_path === "string" ? v.portrait_path : "",
        portrait_caption:
          typeof v.portrait_caption === "string" ? v.portrait_caption : "",
      };
    }
    if (content.portrait_path) {
      portraitUrl = supabase.storage
        .from("photos")
        .getPublicUrl(content.portrait_path).data.publicUrl;
    }
  }

  const [totalPhotos, categories] = await Promise.all([
    getTotalPhotoCount(),
    getCategoriesWithCounts(),
  ]);

  return { ...content, portraitUrl, totalPhotos, totalCategories: categories.length };
}
